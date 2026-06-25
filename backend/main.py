import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from services.crm import init_db
from routers import webhook, leads, tenants, oauth, metrics

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB (copy json files to data folder if not exist)
    init_db()
    print("Database files initialized.")
    yield

app = FastAPI(
    title="LeadPulse AI Backend",
    description="AI-Powered Vertical Lead Qualification Agent API Engine",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(webhook.router)
app.include_router(leads.router)
app.include_router(tenants.router)
app.include_router(oauth.router)
app.include_router(metrics.router)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "message": "LeadPulse AI Backend Engine is fully operational."
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
