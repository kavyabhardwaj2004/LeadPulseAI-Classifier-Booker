from typing import Dict, Any
from services import scraper

def run(state: Dict[str, Any], tenant: Dict[str, Any]) -> Dict[str, Any]:
    """Digital Marketing Vertical: Scrape lead website and check tags match."""
    website = state.get("website", "")
    portfolio_tags = tenant.get("portfolio_tags", [])
    
    scan_res = scraper.scan_portfolio_fit(website, portfolio_tags)
    
    return {
        "vertical": "Digital Marketing",
        "portfolio_fit_score": scan_res.get("fit_score", 0),
        "matched_tags": scan_res.get("matched_tags", []),
        "is_accessible": scan_res.get("is_accessible", False),
        "page_title": scan_res.get("page_title", "")
    }
