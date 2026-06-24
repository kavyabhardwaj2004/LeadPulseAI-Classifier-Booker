from typing import Dict, Any

def run(state: Dict[str, Any], tenant: Dict[str, Any]) -> Dict[str, Any]:
    """SaaS Vertical: Competitor Detection."""
    req = state.get("business_requirement", "").lower()
    company = state.get("company", "").lower()
    
    competitors = tenant.get("competitors", [])
    competitors_mentioned = []
    
    for comp in competitors:
        comp_lower = comp.lower()
        if comp_lower in req or comp_lower in company:
            competitors_mentioned.append(comp)
            
    competitor_detected = len(competitors_mentioned) > 0
    
    return {
        "vertical": "SaaS Startups",
        "competitor_detected": competitor_detected,
        "competitors_mentioned": competitors_mentioned
    }
