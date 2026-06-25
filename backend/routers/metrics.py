from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime, timezone
from services import crm, tenants_svc

router = APIRouter(prefix="/metrics", tags=["Metrics"])

def parse_iso(time_str: str) -> datetime:
    """Parses ISO timestamp supporting Z modifier."""
    if not time_str:
        return datetime.now(timezone.utc) if hasattr(datetime, 'now') else datetime.utcnow()
    # Replace Z with UTC offset representation
    clean_str = time_str.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(clean_str)
    except Exception:
        return datetime.now(timezone.utc) if hasattr(datetime, 'now') else datetime.utcnow()

@router.get("/{tenant_id}")
def get_tenant_metrics(tenant_id: str):
    """Calculates KPI metrics from CRM data for a specific tenant."""
    tenant = tenants_svc.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    leads = crm.get_leads(tenant_id)
    
    total_leads = len(leads)
    if total_leads == 0:
        return {
            "lead_response_time_avg": 0,
            "qualification_accuracy": 0,
            "meeting_booking_rate": 0,
            "false_positive_rate": 0,
            "crm_entry_success_rate": 0,
            "total_leads": 0,
            "by_classification": {},
            "by_source": {}
        }
        
    # Classifications and sources aggregations
    by_class = {}
    by_source = {}
    
    # Qualification metrics
    high_value_leads = []
    qualified_leads = []
    booked_count = 0
    crm_success_count = 0
    response_time_sum = 0
    response_time_count = 0
    
    for lead in leads:
        # Grouping
        cls = lead.get("classification", "unknown")
        by_class[cls] = by_class.get(cls, 0) + 1
        
        src = lead.get("source", "unknown")
        by_source[src] = by_source.get(src, 0) + 1
        
        # Qualification stats
        if cls == "high_value":
            high_value_leads.append(lead)
        if cls in ["high_value", "valid"]:
            qualified_leads.append(lead)
            
        if lead.get("meeting_time") is not None or lead.get("calendar_event_id") is not None:
            booked_count += 1
            
        if lead.get("activity_log") and len(lead.get("activity_log", [])) > 0:
            crm_success_count += 1
            
        # Response time: avg updated_at - created_at for leads with agent_action != 'ignored'
        if lead.get("agent_action") != "ignored":
            created = parse_iso(lead.get("created_at"))
            updated = parse_iso(lead.get("updated_at"))
            diff_seconds = (updated - created).total_seconds()
            if diff_seconds > 0:
                response_time_sum += diff_seconds
                response_time_count += 1
                
    # 1. Lead response time avg
    lead_response_time_avg = int(response_time_sum / response_time_count) if response_time_count > 0 else 0
    
    # 2. Qualification accuracy: % of high_value leads that resulted in status='qualified_booked'
    total_high_value = len(high_value_leads)
    high_value_booked = sum(1 for l in high_value_leads if l.get("status") in ["qualified_booked", "qualified"])
    qualification_accuracy = int((high_value_booked / total_high_value) * 100) if total_high_value > 0 else 0
    
    # 3. Meeting booking rate: booked_count / total_qualified_count
    total_qualified = len(qualified_leads)
    meeting_booking_rate = int((booked_count / total_qualified) * 100) if total_qualified > 0 else 0
    
    # 4. False positive rate: % of high_value with agent_action='ignored' after manual review
    high_value_ignored = sum(1 for l in high_value_leads if l.get("agent_action") == "ignored")
    false_positive_rate = int((high_value_ignored / total_high_value) * 100) if total_high_value > 0 else 0
    
    # 5. CRM entry success rate: % of leads with activity_log len > 0
    crm_entry_success_rate = int((crm_success_count / total_leads) * 100)
    
    return {
        "lead_response_time_avg": lead_response_time_avg,
        "qualification_accuracy": qualification_accuracy,
        "meeting_booking_rate": meeting_booking_rate,
        "false_positive_rate": false_positive_rate,
        "crm_entry_success_rate": crm_entry_success_rate,
        "total_leads": total_leads,
        "by_classification": by_class,
        "by_source": by_source
    }
