import re
import uuid
from datetime import datetime
from typing import Dict, Any
from agent.state import LeadState
from services import crm, geocoding, slack, calendar_svc, gmail_svc
from agent import llm
from verticals import it_services, saas, digital_marketing, b2b, recruitment

def log_activity(state: Dict[str, Any], message: str):
    """Appends a timestamped message to the activity log."""
    now_str = datetime.utcnow().isoformat() + "Z"
    if "activity_log" not in state or state["activity_log"] is None:
        state["activity_log"] = []
    state["activity_log"].append(f"{now_str} — {message}")

def node_dedupe(state: LeadState) -> LeadState:
    """Deduplication check against existing leads by email."""
    print("Node: Deduplicate")
    tenant_id = state.get("tenant_id")
    email = state.get("email")
    
    if not email:
        state["is_duplicate"] = False
        log_activity(state, "No email found for deduplication check")
        return state
        
    existing = crm.get_lead_by_email(tenant_id, email)
    if existing and existing.get("lead_id") != state.get("lead_id"):
        state["is_duplicate"] = True
        state["lead_id"] = existing.get("lead_id")  # Link to existing ID
        state["status"] = "duplicate"
        state["agent_action"] = "ignored"
        log_activity(state, f"Duplicate lead detected. Existing ID: {existing.get('lead_id')}. Merging details.")
    else:
        state["is_duplicate"] = False
        log_activity(state, "Deduplication check passed: No duplicate email found")
        
    return state

def node_extract(state: LeadState) -> LeadState:
    """Extracts lead fields. If source is Gmail, uses Gemini to parse body."""
    print("Node: Extract")
    source = state.get("source", "")
    
    # Generate lead_id if missing
    if not state.get("lead_id"):
        state["lead_id"] = f"lead_{uuid.uuid4().hex[:6]}"
        
    if "Gmail" in source or "Outlook" in source:
        # Run email body parser
        email_body = state.get("business_requirement", "")
        if email_body:
            extracted = llm.extract_lead_from_email(email_body)
            state["name"] = extracted.get("name", state.get("name", "Prospect"))
            state["company"] = extracted.get("company", state.get("company", "N/A"))
            state["budget_range"] = extracted.get("budget_range", state.get("budget_range", "unknown"))
            state["business_requirement"] = extracted.get("business_requirement", email_body)
            state["location"] = extracted.get("location", state.get("location", "Unknown"))
            if extracted.get("employees") and extracted.get("employees") > 0:
                state["employees"] = extracted.get("employees")
            log_activity(state, f"Extracted details from email using LLM: {state['name']} @ {state['company']}")
        else:
            log_activity(state, "Ingested empty email body. Extraction skipped.")
    else:
        # Check defaults
        if not state.get("name"):
            state["name"] = "Prospect"
        if not state.get("company"):
            state["company"] = "N/A"
        if not state.get("budget_range"):
            state["budget_range"] = "unknown"
        log_activity(state, f"Ingested lead fields from web/CRM: {state.get('name')} ({state.get('company')})")
        
    return state

def node_score(state: LeadState) -> LeadState:
    """Calculates lead priority score from 0 to 100."""
    print("Node: Score")
    score = 0
    reasons = []
    
    # 1. Budget (+20 max)
    budget = state.get("budget_range", "").lower()
    if "100k" in budget or "100,000" in budget:
        score += 20
        reasons.append("High budget range >= $100k (+20)")
    elif "50k" in budget or "50,000" in budget:
        score += 15
        reasons.append("Medium budget range >= $50k (+15)")
    elif "25k" in budget or "25,000" in budget:
        score += 10
        reasons.append("Standard budget range >= $25k (+10)")
    elif "10k" in budget or "10,000" in budget:
        score += 5
        reasons.append("Lower budget range >= $10k (+5)")
    else:
        score += 0
        
    # 2. Corporate email domain (+15)
    email = state.get("email", "").lower()
    free_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "protonmail.com", "mail.com", "aol.com"]
    domain = email.split("@")[-1] if "@" in email else ""
    if domain and domain not in free_domains:
        score += 15
        state["email_domain_quality"] = "corporate"
        reasons.append("Corporate email domain verified (+15)")
    else:
        state["email_domain_quality"] = "free"
        reasons.append("Free email domain checked (+0)")
        
    # 3. Industry match (+20)
    tenant = state.get("tenant", {})
    services = tenant.get("services_offered", [])
    industry = state.get("industry", "").lower()
    req = state.get("business_requirement", "").lower()
    
    # Check if industry matches or requirements mention services
    matched_services = [s for s in services if s.lower() in req or s.lower() in industry]
    if len(matched_services) > 0:
        score += 20
        reasons.append(f"Direct match with services offered: {matched_services[0]} (+20)")
    else:
        # LLM fallback match
        services_str = ", ".join(services)
        prompt = f"""
Does this business requirement match any of these agency services?
Agency services: {services_str}
Lead requirement: {state.get('business_requirement')}

Reply ONLY 'yes' or 'no'. No explanation.
"""
        try:
            match_res = llm.call_llm(prompt, "You are a sales classification assistant.").strip().lower()
            if "yes" in match_res:
                score += 20
                reasons.append("AI determined requirement matches services offered (+20)")
            else:
                reasons.append("No service offering match (+0)")
        except Exception:
            reasons.append("Services match skipped (+0)")
            
    # 4. Clear Business Requirement (+25)
    req_len = len(state.get("business_requirement", ""))
    if req_len > 80:
        score += 25
        reasons.append("Highly detailed business requirement provided (+25)")
    elif req_len > 40:
        score += 15
        reasons.append("Moderate details in business requirement (+15)")
    else:
        reasons.append("Very brief requirement description (+0)")
        
    # 5. Urgency keyword check (+20)
    urgency_kw = ["urgent", "asap", "immediately", "deadline", "critical", "soon as possible", "right away", "rush"]
    if any(kw in req for kw in urgency_kw) or state.get("urgency") is True:
        score += 20
        state["urgency"] = True
        reasons.append("Urgency keywords detected in inquiry (+20)")
    else:
        state["urgency"] = False
        reasons.append("Standard timeline/no urgency keywords (+0)")
        
    state["score"] = score
    log_activity(state, f"Lead scoring complete: {score}/100. Reasons: {', '.join(reasons)}")
    return state

def node_classify(state: LeadState) -> LeadState:
    """Classifies lead into categories: high_value, valid, neutral/low_value, incomplete, spam, fake."""
    print("Node: Classify")
    score = state.get("score", 0)
    name = state.get("name", "").lower()
    email = state.get("email", "").lower()
    req = state.get("business_requirement", "").lower()
    company = state.get("company", "").lower()
    
    # Check for spam or fake
    is_fake = "test" in name or "test" in email or "test" in company or "xyz" in email
    is_spam = "viagra" in req or "casino" in req or "crypto wealth" in req or "seo backlink" in req
    is_incomplete = len(req) < 15 or email == ""
    
    if is_fake:
        classification = "fake"
        state["is_fake"] = True
        status = "ignored"
        agent_action = "ignored"
    elif is_spam:
        classification = "spam"
        status = "ignored"
        agent_action = "ignored"
    elif is_incomplete:
        classification = "incomplete"
        status = "pending_info"
        agent_action = "draft_created"
    elif score >= 80:
        classification = "high_value"
        status = "qualified"
        agent_action = "booking_flow"
    elif score >= 50:
        classification = "valid"
        status = "qualified"
        agent_action = "booking_flow"
    else:
        classification = "neutral/low_value"
        status = "unqualified"
        agent_action = "draft_created"
        
    state["classification"] = classification
    state["status"] = status
    state["agent_action"] = agent_action
    
    log_activity(state, f"Lead classified as: {classification} (Status: {status}, Action: {agent_action})")
    return state

def node_enrich(state: LeadState) -> LeadState:
    """Enriches lead with coordinates and checks website validity."""
    print("Node: Enrich")
    location = state.get("location", "")
    website = state.get("website", "")
    
    # Geocode
    lat, lng = geocoding.geocode_location(location)
    state["lat"] = lat
    state["lng"] = lng
    
    # Check domain quality
    email = state.get("email", "")
    if "test" in email or "xyz" in email:
        state["email_domain_quality"] = "low_quality"
    
    log_activity(state, f"Enriched lead location: {location} -> ({lat}, {lng})")
    return state

def node_vertical(state: LeadState) -> LeadState:
    """Executes vertical specific features."""
    print("Node: Vertical")
    tenant = state.get("tenant", {})
    category = tenant.get("category", "")
    
    vertical_result = {}
    
    if category == "IT service companies":
        vertical_result = it_services.run(state, tenant)
    elif category == "SaaS startups":
        vertical_result = saas.run(state, tenant)
    elif category == "Digital marketing agencies":
        vertical_result = digital_marketing.run(state, tenant)
    elif category == "B2B companies":
        vertical_result = b2b.run(state, tenant)
    elif category == "Recruitment agencies":
        vertical_result = recruitment.run(state, tenant)
        # Update recruitment status flags
        state["is_candidate"] = vertical_result.get("is_candidate", False)
        
    state["vertical_result"] = vertical_result
    log_activity(state, f"Vertical analysis complete: {vertical_result.get('vertical', 'General')}")
    return state

def node_respond(state: LeadState) -> LeadState:
    """Drafts reply email."""
    print("Node: Respond")
    tenant = state.get("tenant", {})
    
    subject, body = llm.generate_reply_email(state, tenant)
    state["draft_subject"] = subject
    state["draft_email"] = body
    
    manual_approval = tenant.get("manual_approval", True)
    
    if state.get("classification") in ["spam", "fake"]:
        log_activity(state, "Outbound response bypassed for spam/fake lead")
        state["email_sent"] = False
        return state
        
    if manual_approval:
        # Save as draft in Google Gmail
        success = gmail_svc.save_draft(state.get("email"), subject, body)
        state["email_sent"] = False
        state["agent_action"] = "draft_created"
        log_activity(state, f"Email draft saved to Gmail (manual approval queue): {subject}")
    else:
        # Auto send
        success = gmail_svc.send_email(state.get("email"), subject, body)
        state["email_sent"] = success
        state["agent_action"] = "email_sent"
        log_activity(state, f"Auto-response sent to prospect: {subject}")
        
    return state

def node_book(state: LeadState) -> LeadState:
    """Books calendar event if lead is high_value or valid."""
    print("Node: Book")
    classification = state.get("classification")
    is_candidate = state.get("is_candidate", False)
    
    if classification in ["high_value", "valid"] and not is_candidate:
        preferred_time = state.get("preferred_meeting_time", "")
        book_res = calendar_svc.book_meeting(
            tenant_id=state.get("tenant_id"),
            lead_name=state.get("name"),
            lead_email=state.get("email"),
            preferred_time_str=preferred_time
        )
        
        if book_res.get("success"):
            state["meeting_time"] = book_res.get("meeting_time")
            state["calendar_event_id"] = book_res.get("event_id")
            state["status"] = "qualified_booked"
            state["agent_action"] = "booked"
            
            # Inject meeting link in draft email if we generated one
            meeting_link = book_res.get("meeting_link", "")
            if meeting_link and state.get("draft_email"):
                state["draft_email"] = state["draft_email"].replace("[BOOKING_LINK]", meeting_link)
                
            log_activity(state, f"Successfully booked calendar invite. Meet Link: {meeting_link}")
        else:
            log_activity(state, f"Calendar booking failed: {book_res.get('error', 'unknown error')}")
    else:
        log_activity(state, "Calendar booking skipped: Lead unqualified or candidate exception applies")
        
    return state

def node_notify(state: LeadState) -> LeadState:
    """Triggers Slack alerts for booked/high_value leads."""
    print("Node: Notify")
    classification = state.get("classification")
    status = state.get("status")
    
    if classification == "high_value" and status == "qualified_booked":
        msg = f"🔥 HIGH VALUE LEAD BOOKED: {state.get('name')} from {state.get('company')} ({state.get('score')} points). Budget: {state.get('budget_range')}."
        slack.notify_slack(msg, state.get("tenant_id"))
        log_activity(state, f"Slack notification broadcasted for high-value booking")
    return state

def node_audit(state: LeadState) -> LeadState:
    """Writes final state to the JSON CRM database."""
    print("Node: Audit")
    log_activity(state, "Audit trail verified. Writing lead state to crm_database.json.")
    
    # Save to JSON
    # Remove large non-serializable objects or internal keys to avoid database bloat
    clean_state = dict(state)
    if "tenant" in clean_state:
        del clean_state["tenant"]
        
    crm.upsert_lead(clean_state)
    return state
