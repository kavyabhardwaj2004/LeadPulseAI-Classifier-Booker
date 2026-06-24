@echo off
echo ==========================================
echo  LeadPulse AI Backend - Starting Server
echo ==========================================
cd /d "%~dp0"
python -m uvicorn backend.main:app --reload --port 8000
pause
