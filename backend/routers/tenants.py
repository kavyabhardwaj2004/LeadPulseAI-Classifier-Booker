from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from pydantic import BaseModel
from services import tenants_svc

router = APIRouter(prefix="/tenants", tags=["Tenants"])

class CreateTenantPayload(BaseModel):
    company_name: str
    category: str
    website: str = ""
    employees: int = 1
    industry: str = ""
    services_offered: List[str] = []
    competitors: List[str] = []
    portfolio_tags: List[str] = []
    escalation_email: str = ""
    timezone: str = "UTC"
    oauth_gmail: bool = False
    oauth_calendar: bool = False
    manual_approval: bool = True
    active_sources: List[str] = [
        "Gmail or Outlook inbox",
        "Website contact forms",
        "CRM lead forms",
        "Chatbot conversations",
        "Landing pages",
        "LinkedIn lead forms"
    ]

@router.get("")
def read_tenants():
    """Lists all onboarded agency tenants."""
    return {"tenants": tenants_svc.get_all_tenants()}

@router.get("/{tenant_id}")
def read_tenant(tenant_id: str):
    """Retrieves a single onboarded agency details."""
    tenant = tenants_svc.get_tenant(tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant

@router.post("")
def onboarding_tenant(payload: CreateTenantPayload):
    """Onboards a new agency tenant and configures settings."""
    tenant = tenants_svc.create_tenant(payload.model_dump())
    return tenant

@router.put("/{tenant_id}")
def update_tenant_settings(tenant_id: str, payload: CreateTenantPayload):
    """Updates settings for an onboarded agency tenant."""
    updated = tenants_svc.update_tenant(tenant_id, payload.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return updated
