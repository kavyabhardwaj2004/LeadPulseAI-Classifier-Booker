from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from backend.services import crm, gmail_svc, tenants_svc
from backend.agent.nodes import log_activity

router = APIRouter(prefix="/leads", tags=["Leads"])

@router.get("")
def read_leads(
    tenant_id: str = Query(..., description="Tenant ID to filter by"),
    classification: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None
):
    """Retrieves all leads, filtered by tenant and optional classification/source/status."""
    # Ensure tenant exists
    tenant = tenants_svc.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    leads = crm.get_leads(tenant_id, classification, source, status)
    return {"leads": leads}

@router.get("/map/{tenant_id}")
def read_map_leads(tenant_id: str):
    """Retrieves leads for map visualization, ensuring they have lat/lng."""
    tenant = tenants_svc.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    leads = crm.get_leads(tenant_id)
    
    # Return all leads. Frontend will plot them if lat/lng exists.
    return {"leads": leads}

@router.get("/{lead_id}")
def read_lead(lead_id: str, tenant_id: str):
    """Retrieves a single lead detail."""
    lead = crm.get_lead(tenant_id, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found or access denied")
    return lead

@router.put("/{lead_id}/approve-email")
def approve_email(lead_id: str, tenant_id: str):
    """Approve a draft email to be sent immediately."""
    lead = crm.get_lead(tenant_id, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    if lead.get("email_sent"):
        return {"status": "ignored", "message": "Email already sent"}
        
    draft_subject = lead.get("draft_subject", "Inquiry follow-up")
    draft_body = lead.get("draft_email", "")
    email = lead.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Lead does not have a valid email address")
        
    # Send email
    success = gmail_svc.send_email(email, draft_subject, draft_body, thread_id=lead.get("email_thread_id"))
    
    if success:
        lead["email_sent"] = True
        lead["agent_action"] = "email_sent"
        
        # Append activity log
        log_activity(lead, f"Outbound email manually approved and sent: {draft_subject}")
        crm.upsert_lead(lead)
        
        return {"status": "success", "message": "Email approved and sent successfully"}
    else:
        # Save as manual sent log if Gmail API is offline/not configured
        lead["email_sent"] = True
        lead["agent_action"] = "email_sent"
        log_activity(lead, f"[Demo Mode] Manual email approval processed (Google API offline): {draft_subject}")
        crm.upsert_lead(lead)
        return {"status": "success", "message": "Processed in demo mode (simulated send)"}
