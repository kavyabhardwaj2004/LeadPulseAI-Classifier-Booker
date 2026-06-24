import os
import json
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.config import get_settings

settings = get_settings()
_tenants_lock = threading.Lock()

TENANTS_PATH = os.path.join(settings.DATA_DIR, "tenants.json")

def _read_tenants() -> Dict[str, Any]:
    with _tenants_lock:
        if not os.path.exists(TENANTS_PATH):
            return {"tenants": []}
        try:
            with open(TENANTS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {"tenants": []}

def _write_tenants(data: Dict[str, Any]):
    with _tenants_lock:
        with open(TENANTS_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

def get_all_tenants() -> List[Dict[str, Any]]:
    return _read_tenants().get("tenants", [])

def get_tenant(tenant_id: str) -> Optional[Dict[str, Any]]:
    tenants = get_all_tenants()
    for t in tenants:
        if t.get("tenant_id") == tenant_id:
            return t
    return None

def create_tenant(data: Dict[str, Any]) -> Dict[str, Any]:
    db = _read_tenants()
    tenants = db.get("tenants", [])
    
    # Generate tenant_id agency_XXX
    max_num = 0
    for t in tenants:
        tid = t.get("tenant_id", "")
        if tid.startswith("agency_"):
            try:
                num = int(tid.replace("agency_", ""))
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
                
    new_id = f"agency_{max_num + 1:03d}"
    
    now_str = datetime.utcnow().isoformat() + "Z"
    new_tenant = {
        "tenant_id": new_id,
        "company_name": data.get("company_name", ""),
        "category": data.get("category", ""),
        "website": data.get("website", ""),
        "employees": int(data.get("employees", 1)),
        "industry": data.get("industry", ""),
        "services_offered": data.get("services_offered", []),
        "competitors": data.get("competitors", []),
        "portfolio_tags": data.get("portfolio_tags", []),
        "escalation_email": data.get("escalation_email", ""),
        "timezone": data.get("timezone", "UTC"),
        "oauth_gmail": data.get("oauth_gmail", False),
        "oauth_calendar": data.get("oauth_calendar", False),
        "manual_approval": data.get("manual_approval", settings.MANUAL_APPROVAL_DEFAULT),
        "active_sources": data.get("active_sources", [
            "Gmail or Outlook inbox",
            "Website contact forms",
            "CRM lead forms",
            "Chatbot conversations",
            "Landing pages",
            "LinkedIn lead forms"
        ]),
        "created_at": now_str
    }
    
    tenants.append(new_tenant)
    db["tenants"] = tenants
    _write_tenants(db)
    return new_tenant

def update_tenant(tenant_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = _read_tenants()
    tenants = db.get("tenants", [])
    
    target_idx = -1
    for idx, t in enumerate(tenants):
        if t.get("tenant_id") == tenant_id:
            target_idx = idx
            break
            
    if target_idx == -1:
        return None
        
    current = tenants[target_idx]
    
    # Fields allowed to update
    for k in ["company_name", "category", "website", "employees", "industry", 
              "services_offered", "competitors", "portfolio_tags", "escalation_email", 
              "timezone", "oauth_gmail", "oauth_calendar", "manual_approval", "active_sources"]:
        if k in data:
            current[k] = data[k]
            
    tenants[target_idx] = current
    db["tenants"] = tenants
    _write_tenants(db)
    return current
