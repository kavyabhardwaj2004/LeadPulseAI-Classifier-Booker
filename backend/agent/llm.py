import json
import httpx
import google.generativeai as genai
from typing import Dict, Any, Optional, Tuple, List
from backend.config import get_settings

settings = get_settings()

# Initialize Gemini
try:
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    print(f"Failed to configure Gemini API: {e}")

def call_gemini(prompt: str, system: Optional[str] = None) -> str:
    """Invokes Google Gemini 1.5 Flash."""
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set.")
        
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=system
    )
    response = model.generate_content(prompt)
    return response.text

def call_ollama(prompt: str, system: Optional[str] = None) -> str:
    """Invokes local Ollama fallback."""
    url = f"{settings.OLLAMA_BASE_URL}/api/generate"
    
    # Combine system prompt with main prompt for Ollama if needed
    full_prompt = prompt
    if system:
        full_prompt = f"System: {system}\n\nUser: {prompt}"
        
    payload = {
        "model": settings.OLLAMA_MODEL,
        "prompt": full_prompt,
        "stream": False
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                raise Exception(f"Ollama returned status code {response.status_code}")
    except Exception as e:
        print(f"Ollama call failed: {e}")
        raise e

def call_llm(prompt: str, system: Optional[str] = None) -> str:
    """Tries Gemini first, falls back to Ollama on failure."""
    try:
        print("LLM Call: Trying Gemini 1.5 Flash...")
        return call_gemini(prompt, system)
    except Exception as e:
        print(f"Gemini failed: {e}. Falling back to Ollama ({settings.OLLAMA_MODEL})...")
        try:
            return call_ollama(prompt, system)
        except Exception as oe:
            print(f"All LLMs failed: {oe}")
            # Safe text-based fallback to avoid total pipeline crash
            return "Fallback response: The system is currently undergoing maintenance. We will review your inquiry shortly."

def extract_lead_from_email(email_body: str) -> Dict[str, Any]:
    """Uses LLM to parse key details from a lead email."""
    system = "You are an AI lead extraction parser. Extract structured fields from the email text and return ONLY valid JSON."
    prompt = f"""
Analyze the following email body and extract these fields:
- name: Contact person's full name (fallback to email prefix if not found)
- company: Company name (fallback to domain or 'N/A')
- budget_range: Any budget mentioned, e.g. '$20k-50k', 'unknown'
- business_requirement: The core request or project description
- location: City, state, or country if mentioned (fallback to 'Unknown')
- employees: Number of employees if mentioned or guessed, return -1 if unknown

Return ONLY a JSON block with these keys. No explanation, no markdown tags.
Email text:
\"\"\"
{email_body}
\"\"\"
"""
    response_text = call_llm(prompt, system)
    
    # Clean output
    clean_text = response_text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(clean_text)
    except Exception as e:
        print(f"Failed to parse LLM JSON response: {clean_text}. Error: {e}")
        # Manual extraction fallback
        return {
            "name": "Prospect",
            "company": "N/A",
            "budget_range": "unknown",
            "business_requirement": email_body[:200],
            "location": "Unknown",
            "employees": -1
        }

def score_lead_reasoning(lead_state: Dict[str, Any]) -> str:
    """Generates a 2-3 sentence explanation of the lead's qualification score."""
    prompt = f"""
Generate a short 2-3 sentence summary explaining why this lead received a score of {lead_state.get('score')}/100.
Lead Details:
- Name: {lead_state.get('name')}
- Company: {lead_state.get('company')} (Size: {lead_state.get('employees')} employees)
- Industry: {lead_state.get('industry')}
- Budget: {lead_state.get('budget_range')}
- Req: {lead_state.get('business_requirement')}
- Email Domain: {lead_state.get('email')} ({lead_state.get('email_domain_quality')})
- Urgency: {lead_state.get('urgency')}

Keep it professional, direct, and concise for an agency CRM dashboard.
"""
    return call_llm(prompt, "You are a sales operations analyst.")

def generate_reply_email(lead_state: Dict[str, Any], tenant: Dict[str, Any]) -> Tuple[str, str]:
    """Generates email subject and body for a prospect."""
    prompt = f"""
Draft a professional email reply to {lead_state.get('name')} from {tenant.get('company_name')}.
We are in the '{tenant.get('category')}' industry.
Lead requirement: {lead_state.get('business_requirement')}
Classification: {lead_state.get('classification')}
Score: {lead_state.get('score')}

Instructions:
- If classification is 'high_value' or 'valid', make the email highly engaging, address their requirement, and include a placeholder link '[BOOKING_LINK]' to schedule a call.
- If classification is 'neutral/low_value' or 'incomplete', thank them and ask 1-2 follow-up questions to qualify them. Do not include the booking link.
- If classification is 'spam' or 'fake', write a brief rejection or skip entirely (just write a short polite decline).
- Provide the subject on the first line starting with 'Subject: '
- Then the email body.

Example format:
Subject: Inquire from Veridian Systems
Hi [Name],
...
"""
    resp = call_llm(prompt, "You are an expert sales representative.")
    lines = resp.split("\n")
    
    subject = "Inquiry follow-up"
    body_lines = []
    
    for line in lines:
        if line.startswith("Subject:"):
            subject = line.replace("Subject:", "").strip()
        else:
            body_lines.append(line)
            
    body = "\n".join(body_lines).strip()
    return subject, body
