import re
import threading
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from backend.services import tenants_svc, crm, gmail_svc
from backend.agent.graph import run_lead_pipeline

router = APIRouter(prefix="/webhook", tags=["Webhooks"])

class NewLeadPayload(BaseModel):
    tenant_id: str
    source: str = "Website contact forms"
    name: str = "Prospect"
    email: str
    phone: str = ""
    company: str = "N/A"
    website: str = ""
    employees: int = 1
    industry: str = ""
    business_requirement: str = ""
    budget_range: str = "unknown"
    location: str = "Unknown"
    preferred_meeting_time: str = ""

def _run_pipeline_background(lead_data: dict, tenant: dict):
    """Runs lead pipeline in a background thread (non-blocking)."""
    try:
        run_lead_pipeline(lead_data, tenant)
    except Exception as e:
        print(f"[Background Pipeline Error] tenant={tenant.get('tenant_id')} error={e}")

@router.post("/new-lead")
def ingest_new_lead(payload: NewLeadPayload, background_tasks: BackgroundTasks):
    """Webhook for website contact forms, CRM forms, chatbots, etc.
    Returns 202 immediately and processes the lead pipeline in the background.
    """
    tenant = tenants_svc.get_tenant(payload.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Tenant {payload.tenant_id} not found.")
        
    # Check active sources - if source not in tenant, auto-pick the first available source
    active_sources = tenant.get("active_sources", [])
    source = payload.source
    if source not in active_sources:
        if active_sources:
            source = active_sources[0]  # Fall back to first active source
        else:
            return JSONResponse(status_code=400, content={
                "status": "error",
                "reason": f"Tenant has no active sources configured."
            })
    
    lead_data = payload.model_dump()
    lead_data["source"] = source  # Ensure correct source is used
    
    # Fire-and-forget: run pipeline in background thread
    # This returns 202 immediately so the browser doesn't timeout
    background_tasks.add_task(_run_pipeline_background, lead_data, tenant)
    
    return JSONResponse(status_code=202, content={
        "status": "queued",
        "message": "Lead received. Processing in background. Refresh dashboard in a few seconds.",
        "tenant_id": tenant.get("tenant_id"),
        "source_used": source
    })

@router.post("/linkedin")
def linkedin_webhook(payload: List[Dict[str, Any]], background_tasks: BackgroundTasks):
    """LinkedIn Lead Gen Forms webhook simulation."""
    processed = []
    
    # Load all tenants to match by capability / active_sources
    tenants = tenants_svc.get_all_tenants()
    
    # Filter tenants that support LinkedIn
    linkedin_tenants = [t for t in tenants if "LinkedIn lead forms" in t.get("active_sources", [])]
    if not linkedin_tenants:
        raise HTTPException(status_code=400, detail="No tenants have 'LinkedIn lead forms' enabled.")
        
    for item in payload:
        # Parse answers
        answers_list = item.get("answers", [])
        answers_map = {ans.get("question").lower(): ans.get("answer") for ans in answers_list}
        
        name = answers_map.get("full name", "LinkedIn Prospect")
        email = answers_map.get("email", "")
        company = answers_map.get("company name", "N/A")
        job_title = answers_map.get("job title", "N/A")
        requirement = answers_map.get("what are you interested in?", "")
        
        # Parse employee size e.g. "201-500"
        size_str = answers_map.get("company size", "1")
        employees = 1
        size_nums = re.findall(r"\d+", size_str)
        if len(size_nums) == 2:
            employees = int(size_nums[1])
        elif len(size_nums) == 1:
            employees = int(size_nums[0])
            
        budget = answers_map.get("budget", "unknown")
        
        # Build combined requirement including job title
        combined_req = f"Job Title: {job_title}. Inquiry: {requirement}"
        
        lead_data = {
            "source": "LinkedIn lead forms",
            "name": name,
            "email": email,
            "phone": "",
            "company": company,
            "website": "",
            "employees": employees,
            "industry": "Technology",
            "business_requirement": combined_req,
            "budget_range": budget,
            "location": "New York, NY",  # Default mock location
        }
        
        # Smart routing: check which linkedin-supporting tenant offers matching services
        target_tenant = linkedin_tenants[0]  # Fallback
        req_lower = requirement.lower()
        
        for t in linkedin_tenants:
            # Check services_offered matching keywords
            services = t.get("services_offered", [])
            for s in services:
                if s.lower() in req_lower:
                    target_tenant = t
                    break
            
            # Category match keywords
            category = t.get("category", "").lower()
            if "recruiting" in category or "staffing" in category:
                if "candidate" in req_lower or "job" in req_lower or "hiring" in req_lower:
                    target_tenant = t
            elif "saas" in category:
                if "platform" in req_lower or "software" in req_lower or "survey" in req_lower:
                    target_tenant = t
            elif "it service" in category:
                if "cloud" in req_lower or "devops" in req_lower or "infrastructure" in req_lower:
                    target_tenant = t
                    
        # Run pipeline
        res = run_lead_pipeline(lead_data, target_tenant)
        processed.append({
            "leadId": item.get("leadId"),
            "assigned_tenant": target_tenant.get("tenant_id"),
            "company_name": target_tenant.get("company_name"),
            "classification": res.get("classification"),
            "score": res.get("score")
        })
        
    return {"status": "success", "processed_count": len(processed), "results": processed}

@router.post("/gmail-poll")
def gmail_poll(tenant_id: str):
    """Triggers Gmail polling for new unread messages for a given tenant."""
    tenant = tenants_svc.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
        
    # Check if Gmail source is enabled
    if "Gmail or Outlook inbox" not in tenant.get("active_sources", []):
        return {"status": "ignored", "reason": "Gmail source is disabled for this tenant."}
        
    # List new emails
    new_msgs = gmail_svc.list_new_emails(max_results=5)
    if not new_msgs:
        return {"status": "success", "processed_count": 0, "message": "No new unread messages."}
        
    processed = []
    for msg in new_msgs:
        detail = gmail_svc.get_email_body(msg.get("id"))
        if not detail:
            continue
            
        # Structure lead fields
        lead_data = {
            "source": "Gmail or Outlook inbox",
            "name": detail.get("from").split("<")[0].strip(),
            "email": re.search(r"[\w\.-]+@[\w\.-]+", detail.get("from")).group(0) if re.search(r"[\w\.-]+@[\w\.-]+", detail.get("from")) else detail.get("from"),
            "phone": "",
            "company": "Unknown",
            "website": "",
            "employees": 1,
            "industry": "Unknown",
            "business_requirement": detail.get("body", ""),
            "budget_range": "unknown",
            "location": "Unknown",
            "preferred_meeting_time": "",
            "email_thread_id": detail.get("threadId")
        }
        
        # Run pipeline
        res = run_lead_pipeline(lead_data, tenant)
        processed.append({
            "threadId": detail.get("threadId"),
            "subject": detail.get("subject"),
            "classification": res.get("classification"),
            "score": res.get("score")
        })
        
    return {"status": "success", "processed_count": len(processed), "results": processed}
