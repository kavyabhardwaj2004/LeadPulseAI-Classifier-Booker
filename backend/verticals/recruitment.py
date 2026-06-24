from typing import Dict, Any
from backend.agent import llm
from backend.services import crm

def run(state: Dict[str, Any], tenant: Dict[str, Any]) -> Dict[str, Any]:
    """Recruitment Vertical: Intent Classifier (Candidate vs. Client) and ATS resume scoring."""
    req = state.get("business_requirement", "").lower()
    
    # Classify intent via LLM
    prompt = f"""
Analyze the lead description and classify if this person is a Candidate (job seeker looking for a job) or a Client (company/employer looking to hire/outsource staffing).
Lead description: "{state.get('business_requirement')}"

Return ONLY 'candidate' or 'client'. No punctuation, lowercase.
"""
    intent = llm.call_llm(prompt, "You are a recruitment agency intake coordinator.").strip().lower()
    
    is_candidate = "candidate" in intent
    
    # Update lead status in state dict to track candidate status
    ats_score = "N/A"
    resume_rating = "C_player"
    candidate_id = None
    
    if is_candidate:
        # Check if they have a matching record in resume_bank (candidates.json) by email
        candidates = crm.get_candidates(tenant.get("tenant_id"))
        matched_cand = None
        for c in candidates:
            if c.get("email", "").lower() == state.get("email", "").lower():
                matched_cand = c
                break
                
        if matched_cand:
            candidate_id = matched_cand.get("candidate_id")
            resume_rating = matched_cand.get("resume_score", "C_player")
            # Calculate a mock ATS score based on rating
            score_map = {"A_player": 95, "B_player": 75, "C_player": 45}
            ats_score = score_map.get(resume_rating, 50)
            
            # Update state with candidate details
            state["status"] = "qualified_candidate"
            state["agent_action"] = "shortlisted"
        else:
            # Create a mock candidate record in the candidates.json
            import uuid
            candidate_id = f"cand_{uuid.uuid4().hex[:6]}"
            ats_score = 65  # Default baseline
            resume_rating = "B_player"
            
            new_cand = {
                "candidate_id": candidate_id,
                "tenant_id": tenant.get("tenant_id"),
                "name": state.get("name"),
                "email": state.get("email"),
                "phone": state.get("phone", ""),
                "skills": ["Communication", "General Management"],
                "years_exp": 2,
                "past_companies": ["N/A"],
                "current_role": "Applicant",
                "location": state.get("location", "Unknown"),
                "resume_score": resume_rating,
                "linked_lead_id": state.get("lead_id"),
                "created_at": state.get("created_at")
            }
            crm.upsert_candidate(new_cand)
            state["status"] = "qualified_candidate"
            state["agent_action"] = "shortlisted"
            
    # Modify state's is_candidate flag
    state["is_candidate"] = is_candidate
    
    return {
        "vertical": "Recruitment",
        "intent": "candidate" if is_candidate else "client",
        "is_candidate": is_candidate,
        "ats_score": ats_score,
        "resume_rating": resume_rating,
        "candidate_id": candidate_id
    }
