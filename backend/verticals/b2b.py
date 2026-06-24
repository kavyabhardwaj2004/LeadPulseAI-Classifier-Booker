from typing import Dict, Any

def run(state: Dict[str, Any], tenant: Dict[str, Any]) -> Dict[str, Any]:
    """B2B Vertical: Account-Based Routing & OOO Detection."""
    employees = int(state.get("employees", 0) or 0)
    req = state.get("business_requirement", "").lower()
    
    # Account-based routing tier
    abm_tier = "Tier-3 (SMB)"
    if employees > 500:
        abm_tier = "Tier-1 (Enterprise)"
    elif employees > 200:
        abm_tier = "Tier-2 (Mid-Market)"
        
    # OOO Detection
    ooo_keywords = ["out of office", "ooo", "auto-reply", "vacation", "annual leave", "away from my desk"]
    ooo_detected = any(kw in req for kw in ooo_keywords)
    
    return {
        "vertical": "B2B",
        "abm_tier": abm_tier,
        "ooo_detected": ooo_detected
    }
