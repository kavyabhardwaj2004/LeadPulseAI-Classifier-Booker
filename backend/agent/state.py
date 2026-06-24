from typing import TypedDict, List, Optional, Dict, Any

class LeadState(TypedDict, total=False):
    lead_id: str
    tenant_id: str
    created_at: str
    updated_at: str
    source: str
    category: str
    name: str
    email: str
    phone: str
    company: str
    website: str
    employees: int
    industry: str
    business_requirement: str
    budget_range: str
    location: str
    lat: Optional[float]
    lng: Optional[float]
    timezone: str
    preferred_meeting_time: Optional[str]
    urgency: bool
    decision_maker: bool
    email_domain_quality: str
    score: int
    classification: str
    status: str
    agent_action: str
    meeting_time: Optional[str]
    calendar_event_id: Optional[str]
    email_sent: bool
    email_thread_id: Optional[str]
    activity_log: List[str]
    
    # Internal agent pipeline state flags
    is_duplicate: bool
    is_fake: bool
    is_candidate: bool
    vertical_result: Dict[str, Any]
    draft_email: str
    draft_subject: str
    error: str
    tenant: Dict[str, Any]
