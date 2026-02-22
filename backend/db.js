import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'nexthara.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_phone TEXT,
    bank TEXT NOT NULL,
    university TEXT NOT NULL,
    course TEXT NOT NULL,
    country TEXT,
    intake TEXT,
    loan_amount_requested REAL,
    collateral TEXT DEFAULT 'NA',
    loan_type TEXT DEFAULT 'NA',
    status TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    sub_status TEXT DEFAULT '-',
    awaiting_from TEXT DEFAULT 'Nexthara',
    sla_days INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'Normal',
    last_update_source TEXT DEFAULT 'Portal',
    confidence_score INTEGER,
    bank_application_ref TEXT,
    sanction_amount REAL,
    roi REAL,
    tenure INTEGER,
    processing_fee REAL,
    margin_percent REAL,
    sanction_accepted_date TEXT,
    agreement_date TEXT,
    disbursement_request_date TEXT,
    disbursed_amount REAL,
    disbursed_date TEXT,
    disbursement_mode TEXT,
    rejection_reason TEXT,
    relook_possible TEXT,
    close_reason TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    status TEXT NOT NULL,
    sub_status TEXT,
    awaiting_from TEXT,
    changed_by TEXT DEFAULT 'System',
    entry_type TEXT DEFAULT 'status',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id)
  );

  CREATE INDEX IF NOT EXISTS idx_app_status ON applications(status);
  CREATE INDEX IF NOT EXISTS idx_app_awaiting ON applications(awaiting_from);
  CREATE INDEX IF NOT EXISTS idx_app_priority ON applications(priority);
  CREATE INDEX IF NOT EXISTS idx_app_bank ON applications(bank);
  CREATE INDEX IF NOT EXISTS idx_history_app ON status_history(application_id);

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'bank_user',
    bank TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    doc_name TEXT NOT NULL,
    doc_category TEXT NOT NULL DEFAULT 'Other',
    owner TEXT DEFAULT 'Student',
    status TEXT DEFAULT 'Missing',
    remarks TEXT,
    uploaded_by TEXT,
    uploaded_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id)
  );

  CREATE TABLE IF NOT EXISTS co_applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    name TEXT NOT NULL,
    relation TEXT,
    phone TEXT,
    email TEXT,
    income REAL,
    employment_type TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id)
  );
`);

// Migrations: add new columns to existing applications table if they don't exist
const existingAppCols = db.prepare("PRAGMA table_info(applications)").all().map(c => c.name);
const newAppCols = [
  ["student_phone", "TEXT"],
  ["country", "TEXT"],
  ["intake", "TEXT"],
  ["loan_amount_requested", "REAL"],
  ["collateral", "TEXT DEFAULT 'NA'"],
  ["loan_type", "TEXT DEFAULT 'NA'"],
  ["sanction_accepted_date", "TEXT"],
  ["agreement_date", "TEXT"],
  ["disbursement_request_date", "TEXT"],
  ["close_reason", "TEXT"],
];
for (const [col, def] of newAppCols) {
  if (!existingAppCols.includes(col)) {
    db.exec(`ALTER TABLE applications ADD COLUMN ${col} ${def}`);
  }
}

// Migration: add entry_type to status_history
const existingHistoryCols = db.prepare("PRAGMA table_info(status_history)").all().map(c => c.name);
if (!existingHistoryCols.includes('entry_type')) {
  db.exec(`ALTER TABLE status_history ADD COLUMN entry_type TEXT DEFAULT 'status'`);
}

// Migration: add file storage columns to documents
const existingDocCols = db.prepare("PRAGMA table_info(documents)").all().map(c => c.name);
const newDocCols = [
  ["file_path", "TEXT"],
  ["file_size", "INTEGER"],
  ["mime_type", "TEXT"],
  ["label", "TEXT"],
  ["share_with_lender", "INTEGER DEFAULT 0"],
];
for (const [col, def] of newDocCols) {
  if (!existingDocCols.includes(col)) {
    db.exec(`ALTER TABLE documents ADD COLUMN ${col} ${def}`);
  }
}

// Migration: add tags column to applications
if (!existingAppCols.includes('tags')) {
  db.exec(`ALTER TABLE applications ADD COLUMN tags TEXT DEFAULT '[]'`);
}

// Migration: add assigned_to column to applications
if (!existingAppCols.includes('assigned_to')) {
  db.exec(`ALTER TABLE applications ADD COLUMN assigned_to TEXT`);
}

// Pack history table
db.exec(`
  CREATE TABLE IF NOT EXISTS pack_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    generated_by TEXT DEFAULT 'Staff',
    lender TEXT,
    docs_count INTEGER DEFAULT 0,
    sent_via TEXT DEFAULT 'Email',
    sent_to TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (application_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_pack_app ON pack_history(application_id);
`);

// ─── Student Portal Tables ───────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS student_auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_e164 TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    is_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS student_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL,
    channel TEXT DEFAULT 'IN_APP',
    message_text TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );

  CREATE INDEX IF NOT EXISTS idx_student_notif_case ON student_notifications(case_id);
`);

// ─── Lead Panel Tables ────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    email TEXT,
    city TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    campaign_name TEXT,
    ad_id TEXT,
    country TEXT,
    course TEXT,
    intake TEXT,
    loan_amount_paise INTEGER,
    assigned_staff_id INTEGER,
    stage TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT DEFAULT 'NORMAL',
    next_followup_at TEXT,
    last_activity_at TEXT,
    is_locked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
  CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(next_followup_at);
  CREATE INDEX IF NOT EXISTS idx_leads_staff ON leads(assigned_staff_id);

  CREATE TABLE IF NOT EXISTS lead_qualification (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    admission_received INTEGER DEFAULT 0,
    university TEXT,
    country TEXT,
    course TEXT,
    loan_amount_paise INTEGER,
    coapp_income_paise INTEGER,
    collateral_available INTEGER DEFAULT 0,
    cibil_known INTEGER DEFAULT 0,
    visa_urgency TEXT DEFAULT 'NORMAL',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_notes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    staff_id INTEGER,
    staff_name TEXT,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_calls (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    staff_id INTEGER,
    staff_name TEXT,
    call_status TEXT NOT NULL DEFAULT 'ATTEMPTED',
    duration_seconds INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_followups (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    staff_id INTEGER,
    type TEXT NOT NULL DEFAULT 'CALL',
    scheduled_at TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_to_case_mapping (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    case_id TEXT NOT NULL,
    converted_by_staff_id INTEGER,
    converted_by_staff_name TEXT,
    converted_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lead_reminder_rules (
    id TEXT PRIMARY KEY,
    trigger_stage TEXT NOT NULL,
    condition_type TEXT NOT NULL,
    condition_value INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    escalation_level INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lead_escalations (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    level INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT
  );

  CREATE TABLE IF NOT EXISTS lead_notifications (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id),
    recipient_staff_id INTEGER,
    channel TEXT DEFAULT 'IN_APP',
    message TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Communication & Follow-up Engine Tables ─────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS next_actions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    bank_application_id TEXT,
    owner_type TEXT NOT NULL DEFAULT 'NEXTHARA',
    action_code TEXT NOT NULL DEFAULT 'REVIEW',
    title TEXT NOT NULL,
    description TEXT,
    due_at TEXT,
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_next_actions_case ON next_actions(case_id);
  CREATE INDEX IF NOT EXISTS idx_next_actions_status ON next_actions(status);

  CREATE TABLE IF NOT EXISTS reminder_rules (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'STUDENT',
    trigger_type TEXT NOT NULL DEFAULT 'AWAITING',
    condition TEXT NOT NULL DEFAULT '{}',
    template_name TEXT NOT NULL,
    send_after_minutes INTEGER NOT NULL DEFAULT 1440,
    repeat_every_minutes INTEGER,
    max_retries INTEGER NOT NULL DEFAULT 3,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reminder_jobs (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    bank_application_id TEXT,
    to_type TEXT NOT NULL DEFAULT 'STUDENT',
    to_address TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'IN_APP',
    template_name TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    scheduled_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_reminder_jobs_case ON reminder_jobs(case_id);
  CREATE INDEX IF NOT EXISTS idx_reminder_jobs_status ON reminder_jobs(status);
  CREATE INDEX IF NOT EXISTS idx_reminder_jobs_scheduled ON reminder_jobs(scheduled_at);

  CREATE TABLE IF NOT EXISTS message_log (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    bank_application_id TEXT,
    audience TEXT NOT NULL DEFAULT 'STUDENT',
    channel TEXT NOT NULL DEFAULT 'IN_APP',
    direction TEXT NOT NULL DEFAULT 'OUTBOUND',
    to_address TEXT,
    from_address TEXT,
    template_name TEXT,
    message_text TEXT,
    payload TEXT,
    provider_message_id TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'QUEUED',
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_message_log_case ON message_log(case_id);

  CREATE TABLE IF NOT EXISTS stage_expectations (
    id TEXT PRIMARY KEY,
    bank_id TEXT,
    main_status TEXT NOT NULL,
    expected_min_days INTEGER NOT NULL DEFAULT 1,
    expected_max_days INTEGER NOT NULL DEFAULT 7,
    student_text TEXT NOT NULL,
    staff_text TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS escalations (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    bank_application_id TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL DEFAULT 'SLA_BREACH',
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    resolved_by_staff_id TEXT,
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_escalations_case ON escalations(case_id);
`);

// Seed default reminder rules for the loan CRM (if none exist)
const crmRuleCount = db.prepare("SELECT COUNT(*) as c FROM reminder_rules").get().c;
if (crmRuleCount === 0) {
  const defaultRules = [
    { id: 'RR-1', scope: 'STUDENT', trigger_type: 'AWAITING', condition: JSON.stringify({ awaiting_from: 'Student', age_hours: 24 }), template_name: 'student_docs_reminder_24h', send_after_minutes: 1440, repeat_every_minutes: 1440, max_retries: 3 },
    { id: 'RR-2', scope: 'STUDENT', trigger_type: 'AWAITING', condition: JSON.stringify({ awaiting_from: 'Student', age_hours: 72 }), template_name: 'student_docs_reminder_72h', send_after_minutes: 4320, repeat_every_minutes: null, max_retries: 1 },
    { id: 'RR-3', scope: 'BANK',    trigger_type: 'SLA',      condition: JSON.stringify({ awaiting_from: 'Bank', sla_breach: true }), template_name: 'bank_sla_breach_reminder', send_after_minutes: 2880, repeat_every_minutes: 1440, max_retries: 3 },
    { id: 'RR-4', scope: 'STAFF',   trigger_type: 'SLA',      condition: JSON.stringify({ awaiting_from: 'Nexthara', age_hours: 48 }), template_name: 'staff_internal_overdue', send_after_minutes: 2880, repeat_every_minutes: null, max_retries: 1 },
  ];
  const ins = db.prepare(`INSERT INTO reminder_rules (id, scope, trigger_type, condition, template_name, send_after_minutes, repeat_every_minutes, max_retries) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const r of defaultRules) {
    ins.run(r.id, r.scope, r.trigger_type, r.condition, r.template_name, r.send_after_minutes, r.repeat_every_minutes ?? null, r.max_retries);
  }
}

// Seed default stage expectations (if none exist)
const expCount = db.prepare("SELECT COUNT(*) as c FROM stage_expectations").get().c;
if (expCount === 0) {
  const expectations = [
    { id: 'SE-1', main_status: 'NOT_CONNECTED',    min: 1, max: 2, student: 'We are connecting with your bank. Usually takes 1–2 working days.', staff: 'Initiate bank contact within 1 day. Escalate if >2 days.' },
    { id: 'SE-2', main_status: 'LOGIN_SUBMITTED',   min: 1, max: 3, student: 'Your application has been submitted to the bank. Usually takes 1–3 working days.', staff: 'Follow up with bank after 2 days if no response.' },
    { id: 'SE-3', main_status: 'DOCS_PENDING',      min: 1, max: 4, student: 'Please upload the requested documents. The sooner you upload, the faster we proceed.', staff: 'Send doc reminder after 24 hours. Escalate after 3 days.' },
    { id: 'SE-4', main_status: 'UNDER_REVIEW',      min: 3, max: 7, student: 'Your documents are under review at the bank. Usually takes 3–7 working days.', staff: 'Ping bank after day 5. Escalate if no update by day 7.' },
    { id: 'SE-5', main_status: 'QUERY_RAISED',      min: 1, max: 5, student: 'The bank has raised a query. Please respond as soon as possible to avoid delays.', staff: 'Student must respond within 2 days. Escalate if >4 days.' },
    { id: 'SE-6', main_status: 'SANCTIONED',        min: 1, max: 2, student: 'Your loan has been sanctioned! Please review and accept the sanction letter.', staff: 'Confirm sanction acceptance within 2 days.' },
    { id: 'SE-7', main_status: 'AGREEMENT_SIGNED',  min: 1, max: 5, student: 'Agreement received. Disbursement is being processed. Usually takes 2–5 working days.', staff: 'Follow up on disbursement. Escalate if >5 days.' },
    { id: 'SE-8', main_status: 'DISBURSEMENT_PENDING', min: 1, max: 7, student: 'Disbursement is pending. Funds will be transferred to the university shortly.', staff: 'Ping bank for disbursement confirmation. Escalate after day 5.' },
  ];
  const ins = db.prepare(`INSERT INTO stage_expectations (id, bank_id, main_status, expected_min_days, expected_max_days, student_text, staff_text, is_active) VALUES (?, NULL, ?, ?, ?, ?, ?, 1)`);
  for (const e of expectations) {
    ins.run(e.id, e.main_status, e.min, e.max, e.student, e.staff);
  }
}

// ─── Lead Intelligence Engine: migrate new columns ────────────────────────────
const existingLeadCols = db.prepare("PRAGMA table_info(leads)").all().map(c => c.name);
const newLeadCols = [
  ['lead_source_type',      "TEXT DEFAULT 'MANUAL_ENTRY'"],
  ['source_reference_id',   'TEXT'],
  ['meta_campaign_id',      'TEXT'],
  ['meta_adset_id',         'TEXT'],
  ['meta_ad_id',            'TEXT'],
  ['meta_form_id',          'TEXT'],
  ['utm_source',            'TEXT'],
  ['utm_campaign',          'TEXT'],
  ['utm_medium',            'TEXT'],
  ['admission_case_id',     'TEXT'],
  ['admission_sync_status', "TEXT DEFAULT 'NONE'"],
  ['event_registration_id', 'TEXT'],
  ['intent_score',          'INTEGER DEFAULT 50'],
  ['tags',                  "TEXT DEFAULT '[]'"],
  ['assignment_mode',       "TEXT DEFAULT 'MANUAL'"],
  ['assigned_at',           'TEXT'],
];
for (const [col, def] of newLeadCols) {
  if (!existingLeadCols.includes(col)) {
    db.exec(`ALTER TABLE leads ADD COLUMN ${col} ${def}`);
  }
}

// Campaign performance cache table
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_performance_cache (
    campaign_id TEXT PRIMARY KEY,
    leads_count INTEGER DEFAULT 0,
    connected_count INTEGER DEFAULT 0,
    qualified_count INTEGER DEFAULT 0,
    cases_count INTEGER DEFAULT 0,
    cpl_paise INTEGER DEFAULT 0,
    cost_paise INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Agent Panel (B2B) Tables ────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,
    gstin TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    plan_id TEXT DEFAULT 'STARTER',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    city TEXT,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);

  CREATE TABLE IF NOT EXISTS agent_users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    branch_id TEXT REFERENCES branches(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone_e164 TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'COUNSELOR',
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agent_users_org ON agent_users(organization_id);

  CREATE TABLE IF NOT EXISTS agent_leads (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    branch_id TEXT REFERENCES branches(id),
    submitted_by TEXT REFERENCES agent_users(id),
    full_name TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    email TEXT,
    city TEXT,
    country TEXT,
    course TEXT,
    university TEXT,
    intake TEXT,
    loan_amount_paise INTEGER,
    stage TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT DEFAULT 'NORMAL',
    source TEXT DEFAULT 'AGENT_SUBMITTED',
    notes TEXT,
    internal_lead_id TEXT,
    internal_case_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agent_leads_org ON agent_leads(organization_id);
  CREATE INDEX IF NOT EXISTS idx_agent_leads_stage ON agent_leads(stage);

  CREATE TABLE IF NOT EXISTS agent_lead_notes (
    id TEXT PRIMARY KEY,
    agent_lead_id TEXT NOT NULL REFERENCES agent_leads(id),
    agent_user_id TEXT REFERENCES agent_users(id),
    agent_user_name TEXT,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agent_lead_notes_lead ON agent_lead_notes(agent_lead_id);

  CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    agent_lead_id TEXT REFERENCES agent_leads(id),
    case_id TEXT,
    bank_application_id TEXT,
    sanction_amount_paise INTEGER DEFAULT 0,
    commission_percent REAL DEFAULT 0,
    commission_amount_paise INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    invoice_number TEXT,
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_commissions_org ON commissions(organization_id);
  CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);

  CREATE TABLE IF NOT EXISTS agent_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id TEXT,
    actor_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_agent_audit_org ON agent_audit_log(organization_id);
`);

// ─── Bank Partner Portal (NBPP) Tables ───────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    country TEXT DEFAULT 'India',
    is_active INTEGER DEFAULT 1,
    default_sla_days INTEGER DEFAULT 7,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_banks_active ON banks(is_active);

  CREATE TABLE IF NOT EXISTS bank_products (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    product_name TEXT NOT NULL,
    loan_type TEXT DEFAULT 'UNSECURED',
    min_amount_paise INTEGER DEFAULT 0,
    max_amount_paise INTEGER DEFAULT 0,
    interest_range TEXT,
    tenure_range TEXT,
    processing_fee_percent REAL DEFAULT 0,
    collateral_required INTEGER DEFAULT 0,
    coapp_required INTEGER DEFAULT 0,
    countries_supported TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bank_products_bank ON bank_products(bank_id);

  CREATE TABLE IF NOT EXISTS bank_product_criteria (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES bank_products(id),
    criteria_type TEXT NOT NULL,
    criteria_value TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_bpc_product ON bank_product_criteria(product_id);

  CREATE TABLE IF NOT EXISTS bank_product_documents (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES bank_products(id),
    doc_code TEXT NOT NULL,
    mandatory INTEGER DEFAULT 1,
    order_no INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_bpd_product ON bank_product_documents(product_id);

  CREATE TABLE IF NOT EXISTS bank_branches (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    region TEXT,
    state TEXT,
    city TEXT,
    branch_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bank_branches_bank ON bank_branches(bank_id);

  CREATE TABLE IF NOT EXISTS bank_portal_users (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    branch_id TEXT REFERENCES bank_branches(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'OFFICER',
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    assigned_states TEXT DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bpu_bank ON bank_portal_users(bank_id);
  CREATE INDEX IF NOT EXISTS idx_bpu_branch ON bank_portal_users(branch_id);

  CREATE TABLE IF NOT EXISTS bank_announcements (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    created_by TEXT,
    title TEXT NOT NULL,
    description TEXT,
    attachment_url TEXT,
    visible_to TEXT DEFAULT 'ALL',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bank_ann_bank ON bank_announcements(bank_id);

  CREATE TABLE IF NOT EXISTS bank_api_keys (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    api_key TEXT NOT NULL UNIQUE,
    label TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bak_bank ON bank_api_keys(bank_id);

  CREATE TABLE IF NOT EXISTS bank_application_events (
    id TEXT PRIMARY KEY,
    bank_id TEXT,
    user_id TEXT,
    event_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bae_bank ON bank_application_events(bank_id);
  CREATE INDEX IF NOT EXISTS idx_bae_entity ON bank_application_events(entity_id);

  CREATE TABLE IF NOT EXISTS bank_regions (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    region_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bank_regions_bank ON bank_regions(bank_id);

  CREATE TABLE IF NOT EXISTS bank_applications (
    id TEXT PRIMARY KEY,
    bank_id TEXT NOT NULL REFERENCES banks(id),
    bank_branch_id TEXT REFERENCES bank_branches(id),
    bank_product_id TEXT REFERENCES bank_products(id),
    case_id TEXT,
    assigned_to_bank_user_id TEXT REFERENCES bank_portal_users(id),
    student_name TEXT,
    student_phone TEXT,
    student_email TEXT,
    country TEXT,
    university TEXT,
    course TEXT,
    intake TEXT,
    loan_amount_paise INTEGER,
    status TEXT DEFAULT 'INITIATED',
    awaiting_from TEXT DEFAULT 'BANK',
    priority TEXT DEFAULT 'NORMAL',
    submitted_at TEXT DEFAULT (datetime('now')),
    sla_due_at TEXT,
    last_bank_update_at TEXT,
    sanction_amount_paise INTEGER,
    disbursed_amount_paise INTEGER,
    roi_final REAL,
    rejection_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bapp_bank ON bank_applications(bank_id);
  CREATE INDEX IF NOT EXISTS idx_bapp_branch ON bank_applications(bank_branch_id);
  CREATE INDEX IF NOT EXISTS idx_bapp_status ON bank_applications(status);
  CREATE INDEX IF NOT EXISTS idx_bapp_case ON bank_applications(case_id);

  CREATE TABLE IF NOT EXISTS bank_queries (
    id TEXT PRIMARY KEY,
    bank_application_id TEXT NOT NULL REFERENCES bank_applications(id),
    bank_id TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    raised_by_actor_type TEXT NOT NULL,
    raised_by_id TEXT NOT NULL,
    raised_by_name TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_bq_app ON bank_queries(bank_application_id);
  CREATE INDEX IF NOT EXISTS idx_bq_bank ON bank_queries(bank_id);

  CREATE TABLE IF NOT EXISTS bank_query_messages (
    id TEXT PRIMARY KEY,
    bank_query_id TEXT NOT NULL REFERENCES bank_queries(id),
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    message TEXT NOT NULL,
    attachment_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bqm_query ON bank_query_messages(bank_query_id);

  CREATE TABLE IF NOT EXISTS bank_application_proofs (
    id TEXT PRIMARY KEY,
    bank_application_id TEXT NOT NULL REFERENCES bank_applications(id),
    proof_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by_actor_type TEXT NOT NULL,
    uploaded_by_id TEXT NOT NULL,
    uploaded_by_name TEXT,
    status TEXT DEFAULT 'PENDING_VERIFY',
    verified_by_user_id TEXT,
    verified_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bap_app ON bank_application_proofs(bank_application_id);

  CREATE TABLE IF NOT EXISTS bank_product_policy_versions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES bank_products(id),
    version_no INTEGER NOT NULL DEFAULT 1,
    change_summary TEXT,
    changed_by_bank_user_id TEXT REFERENCES bank_portal_users(id),
    changed_by_name TEXT,
    changed_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bppv_product ON bank_product_policy_versions(product_id);

  CREATE TABLE IF NOT EXISTS document_rejection_reasons_master (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bank_doc_reviews (
    id TEXT PRIMARY KEY,
    bank_application_id TEXT NOT NULL REFERENCES bank_applications(id),
    doc_code TEXT NOT NULL,
    document_id TEXT,
    action TEXT NOT NULL,
    rejection_reason_code TEXT REFERENCES document_rejection_reasons_master(code),
    rejection_note TEXT,
    reviewed_by_bank_user_id TEXT REFERENCES bank_portal_users(id),
    reviewed_by_name TEXT,
    reviewed_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bdr_app ON bank_doc_reviews(bank_application_id);

  -- ─────────────────────────────────────────────────────────────
  -- EVENT PANEL TABLES
  -- ─────────────────────────────────────────────────────────────

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    branch_id TEXT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    banner_url TEXT,
    event_start_at TEXT NOT NULL,
    event_end_at TEXT NOT NULL,
    timezone TEXT DEFAULT 'Asia/Kolkata',
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    map_url TEXT,
    capacity_total INTEGER NOT NULL DEFAULT 0,
    capacity_reserved INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    owner_user_id TEXT,
    event_cost_paise INTEGER DEFAULT 0,
    created_by_user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
  CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
  CREATE INDEX IF NOT EXISTS idx_events_start ON events(event_start_at);

  CREATE TABLE IF NOT EXISTS event_ticket_types (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    name TEXT NOT NULL,
    price_paise INTEGER NOT NULL DEFAULT 0,
    max_quantity INTEGER,
    benefits TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX IF NOT EXISTS idx_ett_event ON event_ticket_types(event_id);

  CREATE TABLE IF NOT EXISTS event_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    organization_id TEXT,
    full_name TEXT NOT NULL,
    phone_e164 TEXT NOT NULL,
    email TEXT,
    ticket_type_id TEXT REFERENCES event_ticket_types(id),
    ticket_code TEXT UNIQUE NOT NULL,
    qr_payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REGISTERED',
    registered_at TEXT DEFAULT (datetime('now')),
    confirmed_at TEXT,
    checked_in_at TEXT,
    source TEXT DEFAULT 'LINK',
    utm_source TEXT,
    utm_campaign TEXT,
    utm_medium TEXT,
    utm_term TEXT,
    utm_content TEXT,
    extra_answers TEXT DEFAULT '{}',
    meta_lead_id TEXT,
    meta_form_id TEXT,
    meta_ad_id TEXT,
    meta_adset_id TEXT,
    meta_campaign_id TEXT,
    meta_platform TEXT DEFAULT 'META',
    meta_raw_payload TEXT,
    intent_score INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]',
    whatsapp_opt_in INTEGER DEFAULT 1,
    last_message_at TEXT,
    last_message_status TEXT,
    landing_page_url TEXT,
    referrer_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_er_event_status ON event_registrations(event_id, status);
  CREATE INDEX IF NOT EXISTS idx_er_event_phone ON event_registrations(event_id, phone_e164);
  CREATE INDEX IF NOT EXISTS idx_er_event_campaign ON event_registrations(event_id, meta_campaign_id);
  CREATE INDEX IF NOT EXISTS idx_er_ticket_code ON event_registrations(ticket_code);

  CREATE TABLE IF NOT EXISTS event_checkins (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    registration_id TEXT NOT NULL REFERENCES event_registrations(id),
    checked_in_by_user_id TEXT,
    method TEXT NOT NULL DEFAULT 'QR_SCAN',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ec_event ON event_checkins(event_id);
  CREATE INDEX IF NOT EXISTS idx_ec_reg ON event_checkins(registration_id);

  CREATE TABLE IF NOT EXISTS event_messages (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    audience_filter TEXT DEFAULT '{}',
    channel TEXT NOT NULL DEFAULT 'WHATSAPP',
    template_name TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    scheduled_at TEXT,
    sent_at TEXT,
    created_by_user_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_em_event ON event_messages(event_id);

  CREATE TABLE IF NOT EXISTS event_message_delivery (
    id TEXT PRIMARY KEY,
    event_message_id TEXT NOT NULL REFERENCES event_messages(id),
    registration_id TEXT NOT NULL REFERENCES event_registrations(id),
    to_address TEXT NOT NULL,
    provider_message_id TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'QUEUED',
    error_text TEXT,
    delivered_at TEXT,
    read_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_emd_message ON event_message_delivery(event_message_id);
  CREATE INDEX IF NOT EXISTS idx_emd_reg ON event_message_delivery(registration_id);

  CREATE TABLE IF NOT EXISTS event_lead_links (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    registration_id TEXT NOT NULL REFERENCES event_registrations(id),
    lead_id TEXT,
    case_id TEXT,
    converted_by_user_id TEXT,
    converted_at TEXT,
    conversion_status TEXT NOT NULL DEFAULT 'NONE',
    conversion_reason TEXT,
    assigned_user_id TEXT,
    assigned_branch_id TEXT,
    intent_score INTEGER,
    converted_stage TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_ell_event ON event_lead_links(event_id);
  CREATE INDEX IF NOT EXISTS idx_ell_reg ON event_lead_links(registration_id);
  CREATE INDEX IF NOT EXISTS idx_ell_lead ON event_lead_links(lead_id);

  CREATE TABLE IF NOT EXISTS event_conversion_jobs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    registration_id TEXT NOT NULL REFERENCES event_registrations(id),
    job_type TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    scheduled_at TEXT DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'QUEUED',
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ecj_event ON event_conversion_jobs(event_id);
  CREATE INDEX IF NOT EXISTS idx_ecj_status ON event_conversion_jobs(status);

  CREATE TABLE IF NOT EXISTS meta_event_mappings (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id),
    meta_form_id TEXT,
    meta_campaign_id TEXT,
    meta_adset_id TEXT,
    meta_ad_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_mem_event ON meta_event_mappings(event_id);
  CREATE INDEX IF NOT EXISTS idx_mem_form ON meta_event_mappings(meta_form_id);
  CREATE INDEX IF NOT EXISTS idx_mem_campaign ON meta_event_mappings(meta_campaign_id);

  CREATE TABLE IF NOT EXISTS integration_webhook_logs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    external_id TEXT,
    status TEXT NOT NULL DEFAULT 'RECEIVED',
    message TEXT,
    payload TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_iwl_provider ON integration_webhook_logs(provider);
  CREATE INDEX IF NOT EXISTS idx_iwl_status ON integration_webhook_logs(status);

  CREATE TABLE IF NOT EXISTS integration_errors (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ie_provider ON integration_errors(provider);
`);

// ── Master Brain: New tables ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    conditions TEXT NOT NULL DEFAULT '{}',
    actions TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    channel TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    body TEXT NOT NULL,
    variables_json TEXT DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS communication_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    template_name TEXT,
    payload TEXT DEFAULT '{}',
    recipient TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'PENDING',
    provider_id TEXT,
    error TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_clog_entity ON communication_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_clog_status ON communication_log(delivery_status);

  CREATE TABLE IF NOT EXISTS notifications_outbox (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    entity_type TEXT,
    entity_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications_outbox(user_id, status);

  CREATE TABLE IF NOT EXISTS universities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    intake_months TEXT DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS country_master (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS document_master (
    id TEXT PRIMARY KEY,
    document_name TEXT NOT NULL,
    doc_code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL DEFAULT 'STUDENT',
    mandatory INTEGER NOT NULL DEFAULT 1,
    visible_in_stage TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS stage_master (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    stage_key TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    allowed_transitions TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS loss_reason_master (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    label TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS lead_loss_reasons (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS super_admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ad_spend_daily (
    id TEXT PRIMARY KEY,
    meta_campaign_id TEXT,
    meta_adset_id TEXT,
    meta_ad_id TEXT,
    date TEXT NOT NULL,
    spend_paise INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed automation rules
const arCount = db.prepare('SELECT COUNT(*) as c FROM automation_rules').get().c;
if (arCount === 0) {
  const arRules = [
    { id: 'AR-001', name: 'New META Lead — Assign & Follow-up', scope: 'LEAD', trigger_type: 'ON_CREATE', conditions: '{"stage":"NEW","source_type":"META_LEAD_FORM"}', actions: '[{"type":"ASSIGN_ROUND_ROBIN"},{"type":"CREATE_FOLLOWUP","delay_min":10},{"type":"SEND_WHATSAPP","template":"nx_lead_intro"},{"type":"NOTIFY_EXECUTIVE"}]', priority: 1 },
    { id: 'AR-002', name: 'Lead Not Contacted 15min Alert', scope: 'LEAD', trigger_type: 'TIME_BASED', conditions: '{"stage":"NEW","age_minutes":15}', actions: '[{"type":"NOTIFY_EXECUTIVE"},{"type":"ADD_BADGE","color":"red"}]', priority: 2 },
    { id: 'AR-003', name: 'Lead Not Contacted 30min Escalate', scope: 'LEAD', trigger_type: 'TIME_BASED', conditions: '{"stage":"NEW","age_minutes":30}', actions: '[{"type":"ESCALATE","to":"LOAN_HEAD","level":2}]', priority: 3 },
    { id: 'AR-004', name: 'Connected Not Qualified 24h Reminder', scope: 'LEAD', trigger_type: 'TIME_BASED', conditions: '{"stage":"CONNECTED","age_hours":24}', actions: '[{"type":"REMIND_EXECUTIVE"},{"type":"FLAG_STUCK"}]', priority: 4 },
    { id: 'AR-005', name: 'Qualified No Case 24h Notify', scope: 'LEAD', trigger_type: 'TIME_BASED', conditions: '{"stage":"QUALIFIED","age_hours":24}', actions: '[{"type":"REMIND_EXECUTIVE"},{"type":"NOTIFY_LOAN_HEAD"}]', priority: 5 },
    { id: 'AR-006', name: 'Case Created — Doc Checklist', scope: 'CASE', trigger_type: 'ON_CREATE', conditions: '{}', actions: '[{"type":"CREATE_DOC_CHECKLIST"},{"type":"SET_NEXT_ACTION","text":"Collect Docs"},{"type":"SEND_DOC_UPLOAD_LINK"}]', priority: 1 },
    { id: 'AR-007', name: 'Docs Not Uploaded 24h WhatsApp', scope: 'CASE', trigger_type: 'TIME_BASED', conditions: '{"docs_pending":true,"age_hours":24}', actions: '[{"type":"WHATSAPP_STUDENT","template":"docs_reminder"},{"type":"NOTIFY_EXECUTIVE"}]', priority: 2 },
    { id: 'AR-008', name: 'Bank SLA Breach — Escalate', scope: 'BANK_APP', trigger_type: 'SLA_BREACH', conditions: '{}', actions: '[{"type":"NOTIFY_LOAN_HEAD"},{"type":"FLAG_RED"},{"type":"ADD_TO_SLA_DASHBOARD"}]', priority: 1 },
  ];
  const arIns = db.prepare('INSERT OR IGNORE INTO automation_rules (id,name,scope,trigger_type,conditions,actions,priority) VALUES (?,?,?,?,?,?,?)');
  for (const r of arRules) arIns.run(r.id, r.name, r.scope, r.trigger_type, r.conditions, r.actions, r.priority);
}

// Seed message templates
const mtCount = db.prepare('SELECT COUNT(*) as c FROM message_templates').get().c;
if (mtCount === 0) {
  const tpls = [
    { id: 'TPL-001', name: 'nx_lead_intro', category: 'LEAD', channel: 'WHATSAPP', body: 'Hi {{name}}, thank you for your interest. Your executive {{executive_name}} will contact you shortly. Upload docs: {{doc_link}}', vars: '["name","executive_name","doc_link"]' },
    { id: 'TPL-002', name: 'docs_reminder', category: 'CASE', channel: 'WHATSAPP', body: 'Dear {{name}}, your documents are pending. Please upload them here: {{doc_link}}', vars: '["name","doc_link"]' },
    { id: 'TPL-003', name: 'bank_assigned', category: 'CASE', channel: 'WHATSAPP', body: 'Great news {{name}}! Your application has been forwarded to {{bank_name}}. Expected response in {{sla_days}} days.', vars: '["name","bank_name","sla_days"]' },
    { id: 'TPL-004', name: 'sanction_received', category: 'CASE', channel: 'WHATSAPP', body: 'Congratulations {{name}}! Your loan of ₹{{amount}} has been sanctioned by {{bank_name}} at {{roi}}% ROI.', vars: '["name","amount","bank_name","roi"]' },
    { id: 'TPL-005', name: 'lead_received_email', category: 'LEAD', channel: 'EMAIL', body: 'Dear {{name}}, we have received your education loan enquiry. Our team will reach out within 15 minutes.', vars: '["name"]' },
  ];
  const tplIns = db.prepare('INSERT OR IGNORE INTO message_templates (id,name,category,channel,body,variables_json) VALUES (?,?,?,?,?,?)');
  for (const t of tpls) tplIns.run(t.id, t.name, t.category, t.channel, t.body, t.vars);
}

// Seed super_admin_settings
const settingPairs = [
  ['enable_auto_whatsapp','true'],['enable_sla_escalation','true'],
  ['enable_auto_case_from_event','false'],['enable_admission_auto_sync','false'],
  ['enable_bank_auto_pack','true'],['daily_report_email','admin@nexthara.com'],
  ['escalation_l1_email','executive@nexthara.com'],['escalation_l2_email','loanhead@nexthara.com'],
  ['escalation_l3_email','superadmin@nexthara.com'],
];
for (const [k, v] of settingPairs) {
  try { db.prepare('INSERT OR IGNORE INTO super_admin_settings (key,value) VALUES (?,?)').run(k, v); } catch(e) {}
}

// Seed country_master
const cntCount = db.prepare('SELECT COUNT(*) as c FROM country_master').get().c;
if (cntCount === 0) {
  const countries = [['CNT-001','USA','US'],['CNT-002','United Kingdom','GB'],['CNT-003','Canada','CA'],['CNT-004','Australia','AU'],['CNT-005','Germany','DE'],['CNT-006','Ireland','IE'],['CNT-007','New Zealand','NZ'],['CNT-008','France','FR'],['CNT-009','Singapore','SG'],['CNT-010','Netherlands','NL']];
  const cntIns = db.prepare('INSERT OR IGNORE INTO country_master (id,name,code) VALUES (?,?,?)');
  for (const [id, name, code] of countries) cntIns.run(id, name, code);
}

// Seed document_master
const dmCount = db.prepare('SELECT COUNT(*) as c FROM document_master').get().c;
if (dmCount === 0) {
  const docs = [
    ['DM-001','Passport','PASSPORT','STUDENT',1,'DOCS_REQUESTED',1],['DM-002','10th Marksheet','MARKSHEET_10','STUDENT',1,'DOCS_REQUESTED',2],
    ['DM-003','12th Marksheet','MARKSHEET_12','STUDENT',1,'DOCS_REQUESTED',3],['DM-004','Graduation Marksheets','GRAD_MARKSHEETS','STUDENT',1,'DOCS_REQUESTED',4],
    ['DM-005','Admission Letter','ADMISSION_LETTER','STUDENT',1,'DOCS_REQUESTED',5],['DM-006','Bank Statements 6M','BANK_STMT_6M','COAPPLICANT',1,'DOCS_REQUESTED',6],
    ['DM-007','ITR 2 Years','ITR_2Y','COAPPLICANT',1,'DOCS_REQUESTED',7],['DM-008','Salary Slips 3M','SALARY_SLIPS','COAPPLICANT',0,'DOCS_REQUESTED',8],
    ['DM-009','Property Papers','PROPERTY_PAPERS','COLLATERAL',0,'DOCS_REQUESTED',9],['DM-010','Aadhaar Card','AADHAAR','STUDENT',1,'NEW',10],
    ['DM-011','PAN Card','PAN','STUDENT',1,'NEW',11],['DM-012','GRE/GMAT Score','GRE_GMAT','STUDENT',0,'QUALIFIED',12],
  ];
  const dmIns = db.prepare('INSERT OR IGNORE INTO document_master (id,document_name,doc_code,category,mandatory,visible_in_stage,sort_order) VALUES (?,?,?,?,?,?,?)');
  for (const d of docs) dmIns.run(...d);
}

// Seed loss_reason_master
const lrmCount = db.prepare('SELECT COUNT(*) as c FROM loss_reason_master').get().c;
if (lrmCount === 0) {
  const lrReasons = [
    ['LR-001','LEAD','NOT_REACHABLE','Not reachable after multiple attempts'],['LR-002','LEAD','NO_INTEREST','Student not interested'],
    ['LR-003','LEAD','COMPETITOR','Went with competitor'],['LR-004','LEAD','NOT_ELIGIBLE','Not eligible for loan'],
    ['LR-005','LEAD','VISA_REJECTED','Visa rejected'],['LR-006','CASE','BANK_REJECTED','Bank rejected the application'],
    ['LR-007','CASE','STUDENT_WITHDREW','Student withdrew application'],['LR-008','CASE','DOCS_INCOMPLETE','Documents incomplete'],
    ['LR-009','BANK_APP','CREDIT_FAIL','Credit score too low'],['LR-010','BANK_APP','COLLATERAL_FAIL','Collateral insufficient'],
  ];
  const lrIns = db.prepare('INSERT OR IGNORE INTO loss_reason_master (id,scope,reason_code,label) VALUES (?,?,?,?)');
  for (const r of lrReasons) lrIns.run(...r);
}

// Seed document rejection reasons
const seedReasons = [
  ['BLURRY', 'Document is blurry or unreadable'],
  ['INCOMPLETE', 'Document is incomplete'],
  ['EXPIRED', 'Document has expired'],
  ['MISMATCH', 'Details do not match application'],
  ['WRONG_DOC', 'Wrong document uploaded'],
  ['LOW_QUALITY', 'Image quality too low'],
  ['MISSING_SIGN', 'Signature missing'],
  ['NOTARIZED', 'Notarization required'],
];
for (const [code, label] of seedReasons) {
  try { db.prepare('INSERT OR IGNORE INTO document_rejection_reasons_master (code, label) VALUES (?, ?)').run(code, label); } catch(e) {}
}

// Add new columns to existing tables (safe — ignore if already exist)
const alterStmts = [
  'ALTER TABLE bank_branches ADD COLUMN branch_code TEXT',
  'ALTER TABLE bank_branches ADD COLUMN address TEXT',
  'ALTER TABLE bank_products ADD COLUMN roi_min REAL',
  'ALTER TABLE bank_products ADD COLUMN roi_max REAL',
  'ALTER TABLE bank_products ADD COLUMN tenure_min_months INTEGER',
  'ALTER TABLE bank_products ADD COLUMN tenure_max_months INTEGER',
  'ALTER TABLE bank_products ADD COLUMN sla_days INTEGER DEFAULT 7',
  'ALTER TABLE bank_portal_users ADD COLUMN region_id TEXT',
];
for (const stmt of alterStmts) {
  try { db.exec(stmt); } catch(e) {}
}

// Seed default reminder rules if none exist
const ruleCount = db.prepare('SELECT COUNT(*) as c FROM lead_reminder_rules').get().c;
if (ruleCount === 0) {
  const rules = [
    { trigger_stage: 'NEW',       condition_type: 'age_minutes',    condition_value: 15,   action_type: 'NOTIFY_STAFF',   escalation_level: 1 },
    { trigger_stage: 'NEW',       condition_type: 'age_minutes',    condition_value: 60,   action_type: 'ESCALATE',       escalation_level: 2 },
    { trigger_stage: 'QUALIFIED', condition_type: 'age_hours',      condition_value: 24,   action_type: 'NOTIFY_MANAGER', escalation_level: 2 },
    { trigger_stage: 'ANY',       condition_type: 'followup_overdue', condition_value: 0,  action_type: 'MARK_OVERDUE',   escalation_level: 1 },
  ];
  const insert = db.prepare(`INSERT INTO lead_reminder_rules (id, trigger_stage, condition_type, condition_value, action_type, escalation_level) VALUES (?, ?, ?, ?, ?, ?)`);
  let ruleIdx = 1;
  for (const r of rules) {
    insert.run(`RULE-${ruleIdx++}`, r.trigger_stage, r.condition_type, r.condition_value, r.action_type, r.escalation_level);
  }
}

// ─── Final Step: New CRM Tables ───────────────────────────────────────────────

// Extend co_applicants with new columns from PDF spec
const existingCoAppCols = db.prepare("PRAGMA table_info(co_applicants)").all().map(c => c.name);
const newCoAppCols = [
  ['coapp_type', "TEXT DEFAULT 'INDIA_SALARIED'"],
  ['age', 'INTEGER'],
  ['income_source', 'TEXT'],
  ['monthly_income', 'REAL'],
  ['last_drawn_salary', 'REAL'],
  ['active_loans_summary', 'TEXT'],
  ['cibil_status', "TEXT DEFAULT 'UNKNOWN'"],
  ['cibil_score', 'INTEGER'],
  ['is_primary', 'INTEGER DEFAULT 0'],
  ['updated_at', "TEXT DEFAULT (datetime('now'))"],
];
for (const [col, def] of newCoAppCols) {
  if (!existingCoAppCols.includes(col)) {
    try { db.exec(`ALTER TABLE co_applicants ADD COLUMN ${col} ${def}`); } catch(e) {}
  }
}

// Extend applications with student profile fields from PDF spec
const existingAppCols2 = db.prepare("PRAGMA table_info(applications)").all().map(c => c.name);
const newStudentProfileCols = [
  ['admit_status', "TEXT DEFAULT 'NOT_APPLIED'"],
  ['exams', "TEXT DEFAULT '[]'"],
  ['degree', 'TEXT'],
  ['duration_years', 'INTEGER'],
  ['student_age', 'INTEGER'],
  ['year_of_graduation', 'INTEGER'],
  ['work_experience_months', 'INTEGER'],
  ['active_loans', 'INTEGER DEFAULT 0'],
  ['active_loans_details', 'TEXT'],
  ['student_cibil_status', "TEXT DEFAULT 'UNKNOWN'"],
  ['student_cibil_score', 'INTEGER'],
];
for (const [col, def] of newStudentProfileCols) {
  if (!existingAppCols2.includes(col)) {
    try { db.exec(`ALTER TABLE applications ADD COLUMN ${col} ${def}`); } catch(e) {}
  }
}

// Extend document_master with new columns from PDF spec (it exists with old schema)
const existingDMCols = db.prepare("PRAGMA table_info(document_master)").all().map(c => c.name);
const newDMCols = [
  ['display_name', 'TEXT'],
  ['description', 'TEXT'],
  ['owner_type', "TEXT DEFAULT 'STUDENT'"],
  ['coapp_type_scope', 'TEXT'],
  ['default_required', 'INTEGER DEFAULT 0'],
  ['visible_to_student', 'INTEGER DEFAULT 1'],
  ['visible_to_bank', 'INTEGER DEFAULT 1'],
  ['file_rules', 'TEXT'],
  ['stage_visibility', "TEXT DEFAULT 'CASE'"],
  ['bank_scope', "TEXT DEFAULT 'ALL'"],
];
for (const [col, def] of newDMCols) {
  if (!existingDMCols.includes(col)) {
    try { db.exec(`ALTER TABLE document_master ADD COLUMN ${col} ${def}`); } catch(e) {}
  }
}

// Back-fill owner_type + display_name on existing document_master rows
try {
  db.exec(`
    UPDATE document_master SET owner_type = category, display_name = document_name
    WHERE owner_type IS NULL OR owner_type = '';
    UPDATE document_master SET default_required = mandatory WHERE default_required = 0 AND mandatory = 1;
  `);
} catch(e) {}

// New tables from PDF spec
db.exec(`
  -- Case references (2 refs per case, no docs needed)
  CREATE TABLE IF NOT EXISTS case_references (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    ref_order INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_case_refs_case ON case_references(case_id);

  -- Per-case document checklist with status tracking
  CREATE TABLE IF NOT EXISTS case_document_checklist_items (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    doc_code TEXT NOT NULL,
    display_name TEXT NOT NULL,
    owner_entity_type TEXT NOT NULL DEFAULT 'STUDENT',
    owner_entity_id TEXT,
    requirement_level TEXT NOT NULL DEFAULT 'REQUIRED',
    status TEXT NOT NULL DEFAULT 'PENDING',
    required_by TEXT NOT NULL DEFAULT 'SYSTEM',
    bank_id TEXT,
    bank_application_id TEXT,
    due_at TEXT,
    last_requested_at TEXT,
    notes TEXT,
    rejection_reason TEXT,
    document_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_cdci_case ON case_document_checklist_items(case_id);
  CREATE INDEX IF NOT EXISTS idx_cdci_bankapp ON case_document_checklist_items(bank_application_id);
  CREATE INDEX IF NOT EXISTS idx_cdci_due ON case_document_checklist_items(case_id, due_at);
  CREATE INDEX IF NOT EXISTS idx_cdci_status ON case_document_checklist_items(case_id, status);

  -- Bank-by-bank doc requirement overrides
  CREATE TABLE IF NOT EXISTS bank_requirement_overrides (
    id TEXT PRIMARY KEY,
    bank_application_id TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    override_type TEXT NOT NULL,
    doc_code TEXT NOT NULL,
    owner_entity_type TEXT NOT NULL DEFAULT 'STUDENT',
    owner_entity_id TEXT,
    reason TEXT,
    created_by_user_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_bro_bankapp ON bank_requirement_overrides(bank_application_id);

  -- Query threads (bank <-> staff <-> student structured queries)
  CREATE TABLE IF NOT EXISTS query_threads (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'CASE',
    case_id TEXT NOT NULL,
    bank_application_id TEXT,
    raised_by_party TEXT NOT NULL DEFAULT 'STAFF',
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    due_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (case_id) REFERENCES applications(id)
  );
  CREATE INDEX IF NOT EXISTS idx_qt_case ON query_threads(case_id, status);
  CREATE INDEX IF NOT EXISTS idx_qt_bankapp ON query_threads(bank_application_id);

  CREATE TABLE IF NOT EXISTS query_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES query_threads(id),
    sender_party TEXT NOT NULL DEFAULT 'STAFF',
    sender_user_id TEXT,
    sender_name TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_qm_thread ON query_messages(thread_id, created_at);

  CREATE TABLE IF NOT EXISTS query_attachments (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES query_threads(id),
    message_id TEXT REFERENCES query_messages(id),
    file_url TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_qa_thread ON query_attachments(thread_id);

  -- Unified task engine (staff / student / bank "What next")
  CREATE TABLE IF NOT EXISTS task_next_actions (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'CASE',
    case_id TEXT,
    bank_application_id TEXT,
    lead_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    action_type TEXT NOT NULL DEFAULT 'OTHER',
    owner_party TEXT NOT NULL DEFAULT 'STAFF',
    owner_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    due_at TEXT,
    completed_at TEXT,
    related_checklist_item_id TEXT,
    related_query_thread_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_tna_case ON task_next_actions(case_id, status);
  CREATE INDEX IF NOT EXISTS idx_tna_owner ON task_next_actions(owner_party, owner_user_id, due_at);
  CREATE INDEX IF NOT EXISTS idx_tna_lead ON task_next_actions(lead_id, status);
`);

// Seed enhanced document_master baseline docs for the Checklist Engine
// Uses the PDF-spec structure: doc_code PK, owner_type, coapp_type_scope, default_required
const existingDocCodes = db.prepare("SELECT doc_code FROM document_master").all().map(r => r.doc_code);
const baselineDocs = [
  // Student docs
  { id:'DM-101', doc_code:'STU_AADHAAR',         display_name:'Aadhaar Card',              description:'Student Aadhaar card (front+back)',    category:'IDENTITY',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:101 },
  { id:'DM-102', doc_code:'STU_PAN',              display_name:'PAN Card',                  description:'Student PAN card',                     category:'IDENTITY',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:102 },
  { id:'DM-103', doc_code:'STU_PHOTO',            display_name:'Passport Size Photo',       description:'Recent passport size photo',           category:'IDENTITY',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:103 },
  { id:'DM-104', doc_code:'STU_PASSPORT',         display_name:'Passport Copy',             description:'Valid passport (all pages)',           category:'IDENTITY',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:104 },
  { id:'DM-105', doc_code:'STU_10TH',             display_name:'10th Marksheet',            description:'Class 10 mark sheet + certificate',   category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:105 },
  { id:'DM-106', doc_code:'STU_12TH',             display_name:'12th Marksheet',            description:'Class 12 mark sheet + certificate',   category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:106 },
  { id:'DM-107', doc_code:'STU_GRADUATION',       display_name:'Graduation Documents',      description:'Degree + all semester marksheets',    category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:107 },
  { id:'DM-108', doc_code:'STU_RESUME',           display_name:'Resume / CV',               description:'Updated resume',                      category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:0, sort_order:108 },
  { id:'DM-109', doc_code:'STU_WORK_PROOF',       display_name:'Work Experience Proof',     description:'Experience letter / appointment letter', category:'ACADEMIC', owner_type:'STUDENT',       coapp_type_scope:null,   default_required:0, sort_order:109 },
  { id:'DM-110', doc_code:'STU_EXAM_SCORES',      display_name:'Exam Score Cards',          description:'IELTS/TOEFL/GRE/GMAT score card',     category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:0, sort_order:110 },
  { id:'DM-111', doc_code:'STU_OFFER_LETTER',     display_name:'Offer/Admission Letter',    description:'University admission/offer letter',   category:'ACADEMIC',   owner_type:'STUDENT',       coapp_type_scope:null,   default_required:1, sort_order:111 },
  // Co-app India Salaried
  { id:'DM-201', doc_code:'COAPP_IND_AADHAAR',    display_name:'Co-App Aadhaar Card',       description:'Co-applicant Aadhaar (front+back)',   category:'IDENTITY',   owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED","INDIA_SELF_EMPLOYED","NRI_SALARIED","NON_FINANCIAL"]', default_required:1, sort_order:201 },
  { id:'DM-202', doc_code:'COAPP_IND_PAN',        display_name:'Co-App PAN Card',           description:'Co-applicant PAN card',               category:'IDENTITY',   owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED","INDIA_SELF_EMPLOYED","NRI_SALARIED","NON_FINANCIAL"]', default_required:1, sort_order:202 },
  { id:'DM-203', doc_code:'COAPP_IND_PHOTO',      display_name:'Co-App Photo',              description:'Co-applicant passport size photo',    category:'IDENTITY',   owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED","INDIA_SELF_EMPLOYED","NRI_SALARIED","NON_FINANCIAL"]', default_required:1, sort_order:203 },
  { id:'DM-210', doc_code:'COAPP_SAL_PAYSLIPS',   display_name:'Payslips (3 months)',       description:'Last 3 months salary slips',          category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED"]', default_required:1, sort_order:210 },
  { id:'DM-211', doc_code:'COAPP_SAL_CERT',       display_name:'Salary Certificate',        description:'Salary certificate from employer',   category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED"]', default_required:0, sort_order:211 },
  { id:'DM-212', doc_code:'COAPP_SAL_CREDITS',    display_name:'Salary Credit Statements',  description:'Bank stmt showing salary credits (6M)', category:'FINANCIAL', owner_type:'COAPPLICANT',  coapp_type_scope:'["INDIA_SALARIED"]', default_required:1, sort_order:212 },
  { id:'DM-213', doc_code:'COAPP_SAL_ITR',        display_name:'ITR / Form 16',             description:'ITR last 2 years or Form 16',         category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SALARIED"]', default_required:1, sort_order:213 },
  // Co-app India Business
  { id:'DM-220', doc_code:'COAPP_BIZ_PROOF',      display_name:'Business Proof (GST etc.)', description:'GST registration / business license', category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SELF_EMPLOYED"]', default_required:1, sort_order:220 },
  { id:'DM-221', doc_code:'COAPP_BIZ_ITR',        display_name:'ITR Full Set (3 years)',    description:'ITR for last 3 assessment years',     category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SELF_EMPLOYED"]', default_required:1, sort_order:221 },
  { id:'DM-222', doc_code:'COAPP_BIZ_BANKSTMT',   display_name:'Business Bank Statements',  description:'Last 12 months bank statements',      category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["INDIA_SELF_EMPLOYED"]', default_required:1, sort_order:222 },
  // Co-app NRI Salaried
  { id:'DM-230', doc_code:'COAPP_NRI_PASSPORT',   display_name:'NRI Passport',              description:'Valid passport with visa/PR stamp',   category:'IMMIGRATION', owner_type:'COAPPLICANT',  coapp_type_scope:'["NRI_SALARIED"]', default_required:1, sort_order:230 },
  { id:'DM-231', doc_code:'COAPP_NRI_VISA',       display_name:'Visa / PR Copy',            description:'Current visa or PR document',         category:'IMMIGRATION', owner_type:'COAPPLICANT',  coapp_type_scope:'["NRI_SALARIED"]', default_required:1, sort_order:231 },
  { id:'DM-232', doc_code:'COAPP_NRI_ADDRESS',    display_name:'Abroad Address Proof',      description:'Abroad residence address proof',      category:'IMMIGRATION', owner_type:'COAPPLICANT',  coapp_type_scope:'["NRI_SALARIED"]', default_required:1, sort_order:232 },
  { id:'DM-233', doc_code:'COAPP_NRI_ABROAD_CIBIL', display_name:'Abroad CIBIL / Credit Report', description:'Credit report from abroad country', category:'FINANCIAL', owner_type:'COAPPLICANT', coapp_type_scope:'["NRI_SALARIED"]', default_required:0, sort_order:233 },
  { id:'DM-234', doc_code:'COAPP_NRI_SAL_CREDITS', display_name:'NRI Salary Credit Stmt',  description:'NRI account salary credit statement', category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["NRI_SALARIED"]', default_required:1, sort_order:234 },
  { id:'DM-235', doc_code:'COAPP_NRI_ACCT_STMT',  display_name:'NRI Account Statement',    description:'NRI bank account statement (6M)',     category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["NRI_SALARIED"]', default_required:1, sort_order:235 },
  { id:'DM-236', doc_code:'COAPP_NRI_PAYSLIPS',   display_name:'NRI Payslips (3M)',         description:'Last 3 months overseas salary slips', category:'FINANCIAL',  owner_type:'COAPPLICANT',   coapp_type_scope:'["NRI_SALARIED"]', default_required:0, sort_order:236 },
  // Non-financial co-app
  { id:'DM-240', doc_code:'COAPP_NONFIN_HOUSE',   display_name:'House Ownership Proof',    description:'Property tax receipt / sale deed',   category:'IDENTITY',   owner_type:'COAPPLICANT',   coapp_type_scope:'["NON_FINANCIAL","COLLATERAL_OWNER_ONLY"]', default_required:1, sort_order:240 },
  // Collateral
  { id:'DM-301', doc_code:'COLL_PROPERTY_DEED',   display_name:'Property Sale Deed',       description:'Original sale deed / title deed',    category:'COLLATERAL', owner_type:'COLLATERAL',    coapp_type_scope:null, default_required:0, sort_order:301 },
  { id:'DM-302', doc_code:'COLL_PROPERTY_TAX',    display_name:'Property Tax Receipt',     description:'Latest property tax paid receipt',   category:'COLLATERAL', owner_type:'COLLATERAL',    coapp_type_scope:null, default_required:0, sort_order:302 },
  { id:'DM-303', doc_code:'COLL_ENCUMBRANCE',     display_name:'Encumbrance Certificate',  description:'EC for last 13 / 30 years',          category:'COLLATERAL', owner_type:'COLLATERAL',    coapp_type_scope:null, default_required:0, sort_order:303 },
];
const dmInsExt = db.prepare(`INSERT OR IGNORE INTO document_master
  (id, doc_code, document_name, display_name, description, category, owner_type, coapp_type_scope, mandatory, default_required, visible_to_student, visible_to_bank, is_active, sort_order, stage_visibility)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, 'CASE')`);
for (const d of baselineDocs) {
  if (!existingDocCodes.includes(d.doc_code)) {
    dmInsExt.run(d.id, d.doc_code, d.display_name, d.display_name, d.description || null, d.category, d.owner_type, d.coapp_type_scope || null, d.default_required, d.default_required, d.sort_order);
  }
}

// ─── SUPER ADMIN PORTAL MIGRATIONS ───────────────────────────────────────────

// Feature Flags
try { db.exec(`CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT
)`); } catch(e) {}

// Report Subscriptions
try { db.exec(`CREATE TABLE IF NOT EXISTS report_subscriptions (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  user_id TEXT,
  schedule TEXT DEFAULT 'WEEKLY',
  filters TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
)`); } catch(e) {}

// Report Runs
try { db.exec(`CREATE TABLE IF NOT EXISTS report_runs (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  filters TEXT DEFAULT '{}',
  status TEXT DEFAULT 'PENDING',
  result_url TEXT,
  created_by TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`); } catch(e) {}

// Admin Audit Log (compliance-grade, separate from agent_audit_log)
try { db.exec(`CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  bank_id TEXT,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`); } catch(e) {}

// System Incidents (for Control Room)
try { db.exec(`CREATE TABLE IF NOT EXISTS system_incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'OPEN',
  description TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`); } catch(e) {}

// Seed default feature flags
try {
  const flags = [
    { key: 'whatsapp_enabled', label: 'WhatsApp Messaging', description: 'Enable WhatsApp notifications via WATI', enabled: 1 },
    { key: 'meta_leads_enabled', label: 'Meta Lead Ads', description: 'Accept leads from Meta Lead Forms webhook', enabled: 1 },
    { key: 'agent_portal_enabled', label: 'Agent B2B Portal', description: 'Allow agent organization login and portal access', enabled: 1 },
    { key: 'student_portal_enabled', label: 'Student Portal', description: 'Student self-service portal access', enabled: 1 },
    { key: 'event_registration_enabled', label: 'Event Registration', description: 'Public event registration pages', enabled: 1 },
    { key: 'bank_portal_enabled', label: 'Bank Partner Portal', description: 'Bank portal login and application review', enabled: 1 },
    { key: 'automation_engine_enabled', label: 'Automation Engine', description: 'Run automation rules and SLA checks', enabled: 1 },
    { key: 'checklist_auto_generate', label: 'Auto Checklist Generation', description: 'Auto-generate document checklist on case creation', enabled: 0 },
    { key: 'multi_bank_simultaneous', label: 'Multi-Bank Simultaneous', description: 'Allow submitting to multiple banks simultaneously', enabled: 1 },
    { key: 'document_ai_verification', label: 'AI Doc Verification', description: 'Experimental AI-based document verification', enabled: 0 },
  ];
  const ins = db.prepare(`INSERT OR IGNORE INTO feature_flags (key, label, description, enabled) VALUES (?, ?, ?, ?)`);
  for (const f of flags) ins.run(f.key, f.label, f.description, f.enabled);
} catch(e) {}

// ── Schema Migrations ────────────────────────────────────────────────────────
// SLA: track when status/awaiting_from last changed so sla_days grows between updates
try { db.exec(`ALTER TABLE applications ADD COLUMN status_changed_at DATETIME`); } catch(e) {}
try { db.exec(`UPDATE applications SET status_changed_at = updated_at WHERE status_changed_at IS NULL`); } catch(e) {}
// Document quality assessment
try { db.exec(`ALTER TABLE documents ADD COLUMN quality TEXT DEFAULT 'OK'`); } catch(e) {}
// Lender conditions / special terms field
try { db.exec(`ALTER TABLE applications ADD COLUMN lender_conditions TEXT`); } catch(e) {}

export default db;

