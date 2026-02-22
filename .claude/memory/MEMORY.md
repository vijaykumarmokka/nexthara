# Nexthara Dashboard — Project Memory

## Stack
- Backend: Express.js + SQLite (better-sqlite3), port 5001
- Frontend: React 18 + Vite, proxy to backend at /api
- student-portal: minimal, separate from frontend
- DB file: backend/nexthara.db

## Key Routes
- /api/applications — main CRM CRUD
- /api/leads — lead management
- /api/communication — Communication & Follow-up Engine (added 2026-02)
- /api/auth, /api/users, /api/student

## DB Tables (all)
applications, status_history, users, documents, co_applicants, pack_history,
student_auth_sessions, student_notifications,
leads, lead_qualification, lead_notes, lead_calls, lead_followups,
lead_to_case_mapping, lead_reminder_rules, lead_escalations, lead_notifications,
next_actions, reminder_rules, reminder_jobs, message_log, stage_expectations, escalations

## Communication & Follow-up Engine (added from PDF)
5 modules added per "Loan Portal (Advanced add ons).pdf":
1. next_actions — auto-created on status/awaiting change (in applications.js PUT route)
2. reminder_rules + reminder_jobs — configurable reminders
3. message_log — unified delivery proof log
4. stage_expectations — per-status timeline text (8 seeded)
5. escalations — SLA breach escalation ladder (auto creates URGENT next_action)

## Frontend Components Added
- frontend/src/components/Communication/FollowUpPanel.jsx
- Added to BankApplicationDetail (bank portal "Follow-up" tab)
- Added to ApplicationDetail (super-admin "Follow-up" tab in TABS array)
- communicationApi added to frontend/src/api.js
