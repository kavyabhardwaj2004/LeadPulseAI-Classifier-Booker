<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-06B6D4?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/LangGraph-FF6F00?style=for-the-badge&logo=langchain&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" />
</p>

<h1 align="center">🎯 LeadPulse AI — Classifier & Booker</h1>

<p align="center">
  <b>An AI-powered, multi-tenant lead qualification engine that classifies, scores, enriches, and auto-books meetings — all in one autonomous pipeline.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-D4AF37?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
  <img src="https://img.shields.io/badge/status-production--ready-brightgreen?style=flat-square" />
</p>

---

## 📌 Overview

**LeadPulse AI** is a full-stack SaaS application that acts as an autonomous AI agent for B2B lead qualification. It ingests raw leads from multiple sources (webhooks, contact forms, LinkedIn, email inboxes), runs them through an intelligent 10-node LangGraph pipeline powered by **Google Gemini**, and outputs fully qualified, scored, and classified leads — complete with auto-drafted emails and Google Calendar bookings.

Each tenant (agency/workspace) operates independently with its own configuration, industry vertical, active sources, and CRM database — making this a true **multi-tenant revenue intelligence platform**.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)              │
│  ┌─────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Home   │  │ Dashboard │  │ Metrics  │  │ LeadMap │ │
│  │ (SaaS   │  │ (per-     │  │ (Charts  │  │(Leaflet)│ │
│  │ Landing)│  │  tenant)  │  │  & KPIs) │  │         │ │
│  └─────────┘  └───────────┘  └──────────┘  └─────────┘ │
└──────────────────────┬───────────────────────────────────┘
                       │ REST API (Axios)
┌──────────────────────▼───────────────────────────────────┐
│                   BACKEND (FastAPI + Python)              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │            LangGraph AI Pipeline (10 Nodes)        │  │
│  │                                                    │  │
│  │  Dedupe → Extract → Score → Classify → Enrich     │  │
│  │     → Vertical → Respond → Book → Notify → Audit  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │ Gemini   │ │ Google   │ │ Google   │ │ Geocoding  │  │
│  │ LLM API  │ │ Gmail API│ │ Calendar │ │ (Geopy)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🤖 AI-Powered Lead Qualification Pipeline
- **10-node LangGraph state machine** processes every lead through a deterministic, auditable pipeline
- **Google Gemini** (or local Ollama fallback) powers all NLP tasks: scoring, classification, email drafting, and entity extraction
- Leads are classified into `high_value`, `medium_value`, `low_value`, `spam`, or `fake` with full reasoning traces

### 🏢 Multi-Tenant Architecture
- **8+ independent workspaces** (agencies), each with its own company profile, industry vertical, services, timezone, and CRM
- Tenant onboarding via the Home page — create new workspaces with company details, competitors, and active lead sources
- Per-tenant OAuth toggles for Gmail and Google Calendar integration

### 📊 Intelligent Lead Scoring
- **Composite scoring algorithm** evaluating:
  - Budget range (weighted)
  - Company size / employee count
  - Email domain quality (corporate vs. freemail)
  - Business requirement depth & urgency keywords
  - Decision-maker authority
  - Service alignment with tenant offerings
- Score thresholds drive automated classification (0–100 scale)

### 🏭 Industry Vertical Modules
Each tenant is matched to a specialized vertical processing module:

| Vertical | File | Specialization |
|----------|------|----------------|
| IT Services | `verticals/it_services.py` | Cloud, DevOps, Cybersecurity, Managed IT |
| SaaS Startups | `verticals/saas.py` | Product-led growth, ARR analysis |
| Digital Marketing | `verticals/digital_marketing.py` | Paid media, SEO, CRO campaigns |
| B2B Solutions | `verticals/b2b.py` | Enterprise sales, ABM, RevOps |
| Recruitment | `verticals/recruitment.py` | Talent placement, resume matching, candidate screening |

### 📧 Gmail Integration (OAuth 2.0)
- Full OAuth 2.0 flow with Google — authenticate once, send emails automatically
- AI-drafted personalized response emails using Gemini
- Email thread tracking with `email_thread_id` stored in CRM
- Owner email (`OWNER_EMAIL`) added as CC on all outbound correspondence

### 📅 Google Calendar Auto-Booking
- Automatically schedules discovery calls for `high_value` leads
- Creates Google Calendar events with:
  - Lead name, company, and business context in the description
  - Tenant timezone-aware scheduling
  - Owner email as a mandatory attendee
  - Future-dated bookings only (never in the past)
- Calendar event IDs stored in CRM for traceability

### 🗺️ Geographic Intelligence
- **Geopy geocoding** converts lead locations to lat/lng coordinates
- **Leaflet.js interactive map** plots all leads geographically on the dashboard
- Cluster visualization for lead density analysis

### 📈 Analytics & Metrics Dashboard
- **Recharts-powered** data visualizations:
  - Lead classification distribution (pie chart)
  - Leads over time (area chart)
  - Score distribution histogram
  - Source channel breakdown
  - Conversion funnel metrics
- Real-time KPI cards: total leads, high-value count, avg score, conversion rate

### 🔄 Webhook Simulation Engine
- Built-in **"Simulate Lead"** modal for testing the full AI pipeline
- Fires a webhook event that triggers the async background pipeline
- Real-time polling with a live **"Lead Pipeline Running…"** toast notification
- Source channel auto-detection from tenant's active sources

### 🔍 Lead Inspection Panel
- Click any lead row to open a detailed **side panel** with:
  - Full AI activity log (timestamped pipeline trace)
  - Classification badge with color coding
  - Score breakdown
  - Business requirement analysis
  - Meeting details (if booked)
  - Email draft preview
  - Geographic coordinates

### 🛡️ Deduplication & Spam Detection
- Email-based deduplication across the entire tenant CRM
- Gemini-powered spam/fake detection with reasoning
- Freemail domain flagging (gmail.com, yahoo.com → lower trust)

### 🎨 Premium UI Theme
- **"Enterprise Revenue Intelligence"** dark theme
- Color palette: Deep black (`#0A0A0A`) + Gold accent (`#D4AF37`) + Amber highlights
- Glassmorphism cards with `backdrop-filter: blur(12px)`
- Smooth micro-animations and hover effects
- Responsive layout across all screen sizes

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.11+** | Core runtime |
| **FastAPI** | REST API framework with async support |
| **LangGraph** | Stateful AI agent pipeline (10-node directed graph) |
| **LangChain Core** | LLM abstraction layer |
| **Google Gemini API** | Primary LLM for scoring, classification, email drafting |
| **Ollama** | Local LLM fallback (Gemma 3 4B) |
| **Google OAuth 2.0** | Gmail + Calendar authentication |
| **Google Gmail API** | Automated email sending |
| **Google Calendar API** | Meeting auto-booking |
| **Geopy** | Geocoding (location → coordinates) |
| **BeautifulSoup4** | Web scraping for lead enrichment |
| **Pydantic v2** | Data validation and settings management |
| **HTTPX** | Async HTTP client |
| **Uvicorn** | ASGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **Recharts** | Data visualization (charts, graphs) |
| **Leaflet.js** | Interactive geographic maps |
| **React-Leaflet** | React bindings for Leaflet |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and manipulation |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **JSON file-based CRM** | Lightweight data persistence (no DB dependency) |
| **BackgroundTasks (FastAPI)** | Async pipeline execution |
| **Threading Locks** | Concurrent file access safety |

---

## 📁 Project Structure

```
LeadPulseAI-Classifier-Booker/
├── backend/
│   ├── agent/
│   │   ├── graph.py          # LangGraph pipeline definition (10 nodes)
│   │   ├── llm.py            # Gemini / Ollama LLM integration
│   │   ├── nodes.py          # All pipeline node functions
│   │   └── state.py          # LeadState TypedDict schema
│   ├── data/
│   │   ├── crm_database.json       # Lead CRM storage (per-tenant)
│   │   ├── tenants.json             # Multi-tenant configurations
│   │   ├── resume_bank.json         # Candidate resume bank (recruitment)
│   │   └── mock_linkedin_webhook.json # Sample LinkedIn webhook payloads
│   ├── routers/
│   │   ├── webhook.py        # Webhook ingestion + async pipeline trigger
│   │   ├── leads.py          # CRUD endpoints for leads
│   │   ├── tenants.py        # Tenant management endpoints
│   │   ├── oauth.py          # Google OAuth 2.0 flow
│   │   └── metrics.py        # Analytics and KPI endpoints
│   ├── services/
│   │   ├── calendar_svc.py   # Google Calendar booking service
│   │   ├── gmail_svc.py      # Gmail sending service
│   │   ├── crm.py            # CRM data access layer
│   │   ├── geocoding.py      # Location geocoding
│   │   ├── scraper.py        # Web enrichment scraper
│   │   ├── tenants_svc.py    # Tenant CRUD operations
│   │   └── slack.py          # Slack notification stub
│   ├── verticals/
│   │   ├── it_services.py    # IT services vertical logic
│   │   ├── saas.py           # SaaS startup vertical logic
│   │   ├── digital_marketing.py # Digital marketing vertical logic
│   │   ├── b2b.py            # B2B solutions vertical logic
│   │   └── recruitment.py    # Recruitment vertical + resume matching
│   ├── config.py             # Pydantic settings (env-driven)
│   ├── main.py               # FastAPI app entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js     # Axios API client
│   │   ├── components/
│   │   │   ├── LeadSidePanel.jsx  # Lead detail inspection panel
│   │   │   ├── LeafletMap.jsx     # Geographic lead map
│   │   │   ├── MetricsTab.jsx     # Analytics charts
│   │   │   └── RadarLoader.jsx    # Animated loading indicator
│   │   ├── pages/
│   │   │   ├── Home.jsx      # SaaS landing + tenant management
│   │   │   └── Dashboard.jsx # Per-tenant lead dashboard
│   │   ├── styles/
│   │   │   └── index.css     # Global styles (dark premium theme)
│   │   ├── App.jsx           # Router setup
│   │   └── main.jsx          # React entry point
│   ├── index.html            # HTML shell
│   ├── vite.config.js        # Vite configuration
│   └── package.json          # Node dependencies
├── candidates.json           # Root candidate data
├── leads.json                # Root lead seed data
├── start_backend.bat         # Windows backend launcher
├── render.yaml               # Render deployment config
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and npm
- **Google Cloud Console** project with Gmail API and Calendar API enabled
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/kavyabhardwaj2004/LeadPulseAI-Classifier-Booker.git
cd LeadPulseAI-Classifier-Booker
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### 4. Google OAuth Setup (Optional — for Gmail & Calendar)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Gmail API** and **Google Calendar API**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Set redirect URI to `http://localhost:8000/oauth/callback`
6. Copy Client ID and Client Secret to `backend/.env`

### 5. Run the Application
```bash
# Terminal 1 — Backend
cd backend
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🧪 Testing the Pipeline

1. Navigate to any agency dashboard (e.g., `/dashboard/agency_001`)
2. Click **"Simulate Lead"** in the top-right
3. Fill in lead details and click **"Fire Webhook Event"**
4. Watch the AI pipeline process the lead in real-time
5. The lead will appear in the dashboard with its classification, score, and AI activity log

### Sample High-Value Lead (for testing)
```
Name:        James Whitfield
Email:       j.whitfield@novacorp-global.com
Company:     NovaCorp Global
Employees:   300
Budget:      $100k+
Location:    London, UK
Requirement: We urgently need a consulting partner to lead our
             digital transformation across 5 business units,
             including process optimization and change management.
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API key for LLM inference | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID (Gmail/Calendar) | For email/calendar features |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret | For email/calendar features |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Default: `http://localhost:8000/oauth/callback` |
| `MANUAL_APPROVAL_DEFAULT` | Require manual approval for actions | Default: `true` |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | Optional |
| `OLLAMA_BASE_URL` | Local Ollama server URL | Default: `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name | Default: `gemma3:4b` |

---

## 📜 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/{tenant_id}` | Ingest a new lead (triggers AI pipeline) |
| `GET` | `/leads/{tenant_id}` | Fetch all leads for a tenant |
| `GET` | `/leads/{tenant_id}/{lead_id}` | Fetch a specific lead |
| `PUT` | `/leads/{tenant_id}/{lead_id}` | Update a lead |
| `GET` | `/tenants` | List all tenants |
| `POST` | `/tenants` | Create a new tenant |
| `PUT` | `/tenants/{tenant_id}` | Update tenant config |
| `GET` | `/metrics/{tenant_id}` | Get analytics for a tenant |
| `GET` | `/oauth/authorize/{tenant_id}` | Start OAuth flow |
| `GET` | `/oauth/callback` | OAuth callback handler |
| `GET` | `/health` | Health check |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/kavyabhardwaj2004">Kavya Bhardwaj</a>
</p>
