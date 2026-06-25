import os
import json
import shutil
import threading
from typing import List, Dict, Any, Optional
from datetime import datetime
from config import get_settings

settings = get_settings()
_file_lock = threading.Lock()

# File paths
CRM_PATH = os.path.join(settings.DATA_DIR, "crm_database.json")
SOURCE_CRM_PATH = os.path.join(settings.PARENT_DIR, "leads.json")

RESUME_BANK_PATH = os.path.join(settings.DATA_DIR, "resume_bank.json")
SOURCE_RESUME_PATH = os.path.join(settings.PARENT_DIR, "candidates.json")

def init_db():
    """Initializes the data folder and copies initial source json files if needed."""
    os.makedirs(settings.DATA_DIR, exist_ok=True)
    
    with _file_lock:
        if not os.path.exists(CRM_PATH):
            if os.path.exists(SOURCE_CRM_PATH):
                shutil.copy(SOURCE_CRM_PATH, CRM_PATH)
            else:
                # Create empty template if leads.json doesn't exist
                with open(CRM_PATH, "w", encoding="utf-8") as f:
                    json.dump({"leads": []}, f, indent=2)
                    
        if not os.path.exists(RESUME_BANK_PATH):
            if os.path.exists(SOURCE_RESUME_PATH):
                shutil.copy(SOURCE_RESUME_PATH, RESUME_BANK_PATH)
            else:
                with open(RESUME_BANK_PATH, "w", encoding="utf-8") as f:
                    json.dump({"candidates": []}, f, indent=2)

init_db()

def _read_crm() -> Dict[str, Any]:
    with _file_lock:
        if not os.path.exists(CRM_PATH):
            return {"leads": []}
        try:
            with open(CRM_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {"leads": []}

def _write_crm(data: Dict[str, Any]):
    with _file_lock:
        with open(CRM_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

def _read_resume_bank() -> Dict[str, Any]:
    with _file_lock:
        if not os.path.exists(RESUME_BANK_PATH):
            return {"candidates": []}
        try:
            with open(RESUME_BANK_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {"candidates": []}

def _write_resume_bank(data: Dict[str, Any]):
    with _file_lock:
        with open(RESUME_BANK_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

# Leads Operations
def get_leads(
    tenant_id: str, 
    classification: Optional[str] = None, 
    source: Optional[str] = None, 
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    data = _read_crm()
    leads = data.get("leads", [])
    
    # Filter by tenant_id
    filtered = [l for l in leads if l.get("tenant_id") == tenant_id]
    
    # Additional filters
    if classification:
        filtered = [l for l in filtered if l.get("classification") == classification]
    if source:
        filtered = [l for l in filtered if l.get("source") == source]
    if status:
        filtered = [l for l in filtered if l.get("status") == status]
        
    return filtered

def get_lead(tenant_id: str, lead_id: str) -> Optional[Dict[str, Any]]:
    data = _read_crm()
    for lead in data.get("leads", []):
        if lead.get("lead_id") == lead_id and lead.get("tenant_id") == tenant_id:
            return lead
    return None

def get_lead_by_email(tenant_id: str, email: str) -> Optional[Dict[str, Any]]:
    data = _read_crm()
    for lead in data.get("leads", []):
        if lead.get("email") == email and lead.get("tenant_id") == tenant_id:
            return lead
    return None

def upsert_lead(lead_dict: Dict[str, Any]) -> Dict[str, Any]:
    data = _read_crm()
    leads = data.get("leads", [])
    lead_id = lead_dict.get("lead_id")
    tenant_id = lead_dict.get("tenant_id")
    
    now_str = datetime.utcnow().isoformat() + "Z"
    
    # Check if lead exists
    exists = False
    for i, lead in enumerate(leads):
        if lead.get("lead_id") == lead_id:
            # Maintain created_at if already exists
            lead_dict["created_at"] = lead.get("created_at", now_str)
            lead_dict["updated_at"] = now_str
            # Keep original fields if not overwritten
            merged = {**lead, **lead_dict}
            leads[i] = merged
            exists = True
            lead_dict = merged
            break
            
    if not exists:
        if "created_at" not in lead_dict:
            lead_dict["created_at"] = now_str
        lead_dict["updated_at"] = now_str
        # Default meeting/email fields if missing
        if "activity_log" not in lead_dict:
            lead_dict["activity_log"] = []
        leads.append(lead_dict)
        
    data["leads"] = leads
    _write_crm(data)
    return lead_dict

def append_activity(lead_id: str, message: str):
    data = _read_crm()
    leads = data.get("leads", [])
    
    now_str = datetime.utcnow().isoformat() + "Z"
    formatted_msg = f"{now_str} — {message}"
    
    for lead in leads:
        if lead.get("lead_id") == lead_id:
            if "activity_log" not in lead:
                lead["activity_log"] = []
            lead["activity_log"].append(formatted_msg)
            lead["updated_at"] = now_str
            break
            
    data["leads"] = leads
    _write_crm(data)

# Candidates Operations
def get_candidates(tenant_id: str) -> List[Dict[str, Any]]:
    data = _read_resume_bank()
    candidates = data.get("candidates", [])
    return [c for c in candidates if c.get("tenant_id") == tenant_id]

def get_candidate(tenant_id: str, candidate_id: str) -> Optional[Dict[str, Any]]:
    data = _read_resume_bank()
    for cand in data.get("candidates", []):
        if cand.get("candidate_id") == candidate_id and cand.get("tenant_id") == tenant_id:
            return cand
    return None

def upsert_candidate(cand_dict: Dict[str, Any]) -> Dict[str, Any]:
    data = _read_resume_bank()
    candidates = data.get("candidates", [])
    candidate_id = cand_dict.get("candidate_id")
    
    now_str = datetime.utcnow().isoformat() + "Z"
    
    exists = False
    for i, cand in enumerate(candidates):
        if cand.get("candidate_id") == candidate_id:
            cand_dict["created_at"] = cand.get("created_at", now_str)
            merged = {**cand, **cand_dict}
            candidates[i] = merged
            exists = True
            cand_dict = merged
            break
            
    if not exists:
        if "created_at" not in cand_dict:
            cand_dict["created_at"] = now_str
        candidates.append(cand_dict)
        
    data["candidates"] = candidates
    _write_resume_bank(data)
    return cand_dict
