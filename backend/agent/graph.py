from langgraph.graph import StateGraph, END
from agent.state import LeadState
from agent.nodes import (
    node_dedupe, node_extract, node_score, node_classify, 
    node_enrich, node_vertical, node_respond, node_book, 
    node_notify, node_audit
)

# Define routing conditional functions
def route_after_classify(state: LeadState) -> str:
    """If lead is duplicate, spam, or fake, bypass the pipeline straight to audit."""
    if state.get("is_duplicate") or state.get("classification") in ["spam", "fake"]:
        return "audit"
    return "enrich"

def route_after_respond(state: LeadState) -> str:
    """Recruitment candidates bypass the meeting booking step."""
    if state.get("is_candidate"):
        return "audit"
    return "book"

def route_after_book(state: LeadState) -> str:
    """Only high-value booked leads trigger Slack alerts."""
    if state.get("meeting_time") and state.get("classification") == "high_value":
        return "notify"
    return "audit"

# Construct the graph
workflow = StateGraph(LeadState)

# Add all nodes
workflow.add_node("dedupe", node_dedupe)
workflow.add_node("extract", node_extract)
workflow.add_node("score_lead", node_score)
workflow.add_node("classify", node_classify)
workflow.add_node("enrich", node_enrich)
workflow.add_node("vertical", node_vertical)
workflow.add_node("respond", node_respond)
workflow.add_node("book", node_book)
workflow.add_node("notify", node_notify)
workflow.add_node("audit", node_audit)

# Set entry point
workflow.set_entry_point("dedupe")

# Add straight transitions
workflow.add_edge("dedupe", "extract")
workflow.add_edge("extract", "score_lead")
workflow.add_edge("score_lead", "classify")
workflow.add_edge("enrich", "vertical")
workflow.add_edge("vertical", "respond")
workflow.add_edge("notify", "audit")
workflow.add_edge("audit", END)

# Add conditional routing edges
workflow.add_conditional_edges(
    "classify",
    route_after_classify,
    {
        "audit": "audit",
        "enrich": "enrich"
    }
)

workflow.add_conditional_edges(
    "respond",
    route_after_respond,
    {
        "audit": "audit",
        "book": "book"
    }
)

workflow.add_conditional_edges(
    "book",
    route_after_book,
    {
        "notify": "notify",
        "audit": "audit"
    }
)

# Compile the graph
app_graph = workflow.compile()

def run_lead_pipeline(lead_data: dict, tenant: dict) -> dict:
    """Runs a lead through the full qualification graph and returns the final state."""
    # Build initial state
    initial_state = LeadState(
        lead_id=lead_data.get("lead_id"),
        tenant_id=tenant.get("tenant_id"),
        source=lead_data.get("source"),
        category=tenant.get("category"),
        name=lead_data.get("name", ""),
        email=lead_data.get("email", ""),
        phone=lead_data.get("phone", ""),
        company=lead_data.get("company", ""),
        website=lead_data.get("website", ""),
        employees=lead_data.get("employees", 1),
        industry=lead_data.get("industry", ""),
        business_requirement=lead_data.get("business_requirement", ""),
        budget_range=lead_data.get("budget_range", ""),
        location=lead_data.get("location", ""),
        preferred_meeting_time=lead_data.get("preferred_meeting_time"),
        urgency=lead_data.get("urgency", False),
        decision_maker=lead_data.get("decision_maker", True),
        activity_log=lead_data.get("activity_log", []),
        tenant=tenant
    )
    
    # Run the state graph
    final_output = app_graph.invoke(initial_state)
    return dict(final_output)
