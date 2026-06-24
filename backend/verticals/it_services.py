import re
from typing import Dict, Any

def run(state: Dict[str, Any], tenant: Dict[str, Any]) -> Dict[str, Any]:
    """IT Services Vertical: RFP parsing & Escalation Rules."""
    req = state.get("business_requirement", "").lower()
    employees = int(state.get("employees", 0) or 0)
    budget = state.get("budget_range", "").lower()
    
    # Check for RFP / SOW keywords
    rfp_keywords = ["rfp", "request for proposal", "sow", "statement of work", "tender", "bid", "proposal request"]
    rfp_detected = any(kw in req for kw in rfp_keywords)
    
    # Check escalation rules: employees > 500 or budget > $100k
    escalation_triggered = False
    escalation_reason = []
    
    if employees > 500:
        escalation_triggered = True
        escalation_reason.append(f"Large corporate employee count: {employees} (> 500)")
        
    # Parse budget containing $100k or 100,000 or greater
    budget_digits = re.findall(r"\d+", budget.replace(",", ""))
    budget_val = 0
    if budget_digits:
        try:
            # Check if 'k' is used, e.g., $100k -> 100 * 1000
            is_k = "k" in budget
            base_val = int(budget_digits[0])
            budget_val = base_val * 1000 if is_k else base_val
        except ValueError:
            pass
            
    # Also manual check for $100k+ strings
    if "100k" in budget or "$100k+" in budget or budget_val >= 100000:
        escalation_triggered = True
        escalation_reason.append(f"High-value budget: {state.get('budget_range')} (>= $100k)")
        
    return {
        "vertical": "IT Services",
        "rfp_detected": rfp_detected,
        "escalation_triggered": escalation_triggered,
        "escalation_reason": "; ".join(escalation_reason) if escalation_triggered else None
    }
