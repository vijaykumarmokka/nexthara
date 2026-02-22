/**
 * seed-all.js — Comprehensive dummy data for all Nexthara tables
 * Run: node --experimental-vm-modules seed-all.js  OR  node seed-all.js
 * (requires ESM: "type":"module" in package.json)
 */
import bcrypt from 'bcryptjs';
import db from './db.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const rand  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const uid   = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const ago   = days => new Date(Date.now() - days * 86400000).toISOString().replace('T', ' ').slice(0, 19);
const agoH  = hrs  => new Date(Date.now() - hrs  * 3600000 ).toISOString().replace('T', ' ').slice(0, 19);
const future = days => new Date(Date.now() + days * 86400000).toISOString().replace('T', ' ').slice(0, 19);

// ─── Shared lookup arrays ─────────────────────────────────────────────────────
const BANKS_LIST    = ['SBI', 'HDFC Credila', 'ICICI Bank', 'Axis Bank', 'Prodigy Finance', 'Avanse'];
const COUNTRIES     = ['USA', 'UK', 'Canada', 'Germany', 'Australia', 'Singapore'];
const COURSES       = ['MS Computer Science', 'MBA Finance', 'MS Data Science', 'MEng Mechanical', 'MS AI/ML', 'LLM International Law'];
const UNIVERSITIES  = ['MIT', 'Stanford', 'University of Toronto', 'UCL London', 'TU Munich', 'NUS Singapore'];
const INTAKES       = ['Jan 2025', 'Sep 2025', 'Jan 2026', 'Sep 2026'];
const STUDENT_NAMES = ['Rahul Sharma','Priya Patel','Arjun Mehta','Sneha Reddy','Vikram Singh','Ananya Gupta','Rohit Jain','Kavya Nair','Aditya Verma','Meera Iyer','Siddharth Das','Pooja Bansal','Nikhil Kumar','Shreya Chopra','Karthik Rao','Divya Agarwal','Aman Tiwari','Riya Saxena','Varun Bhatt','Nisha Pandey'];
const PHONES        = ['+919876543210','+919812345678','+919988776655','+919123456789','+919765432198','+919654321987','+919543219876','+919432198765','+919321987654','+919219876543','+919111222333','+919222333444','+919333444555','+919444555666','+919555666777','+919666777888','+919777888999','+919888999000','+919001122334','+919002233445'];

console.log('🌱 Starting comprehensive seed...\n');

// ──────────────────────────────────────────────────────────────────────────────
// 1. USERS (super admin + staff users)
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding users...');
const staffUsers = [
  { name: 'Super Admin',     email: 'admin@nexthara.com',   password: 'admin123',    role: 'super_admin', bank: null },
  { name: 'Amit Kumar',      email: 'amit@nexthara.com',    password: 'staff123',    role: 'staff',       bank: null },
  { name: 'Priya Shah',      email: 'priya@nexthara.com',   password: 'staff123',    role: 'staff',       bank: null },
  { name: 'Ravi Menon',      email: 'ravi@nexthara.com',    password: 'staff123',    role: 'staff',       bank: null },
  { name: 'SBI Manager',     email: 'sbi@nexthara.com',     password: 'bank123',     role: 'bank_user',   bank: 'SBI' },
  { name: 'HDFC Manager',    email: 'hdfc@nexthara.com',    password: 'bank123',     role: 'bank_user',   bank: 'HDFC Credila' },
  { name: 'ICICI Manager',   email: 'icici@nexthara.com',   password: 'bank123',     role: 'bank_user',   bank: 'ICICI Bank' },
];
const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, role, bank) VALUES (?,?,?,?,?)');
for (const u of staffUsers) {
  insertUser.run(u.name, u.email, bcrypt.hashSync(u.password, 10), u.role, u.bank);
}
console.log(`  ✓ ${staffUsers.length} users`);

// ──────────────────────────────────────────────────────────────────────────────
// 2. APPLICATIONS (50 cases — clear and re-seed)
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding applications...');
db.pragma('foreign_keys = OFF');
db.exec('DELETE FROM status_history; DELETE FROM documents; DELETE FROM co_applicants; DELETE FROM applications;');
db.pragma('foreign_keys = ON');

const APP_STATUSES = ['NOT_CONNECTED','LOGIN_SUBMITTED','DOCS_PENDING','UNDER_REVIEW','QUERY_RAISED','SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED','REJECTED','CLOSED','DROPPED'];
const AWAITING_MAP  = { NOT_CONNECTED:'Nexthara', LOGIN_SUBMITTED:'Bank', DOCS_PENDING:'Student', UNDER_REVIEW:'Bank', QUERY_RAISED:'Student', SANCTIONED:'Student', CONDITIONAL_SANCTION:'Student', SANCTION_ACCEPTED:'Bank', AGREEMENT_SIGNED:'Bank', DISBURSEMENT_PENDING:'Bank', DISBURSED:'Closed', REJECTED:'Nexthara', CLOSED:'Closed', DROPPED:'Closed' };

const appInsert = db.prepare(`INSERT INTO applications (id,student_name,student_email,student_phone,bank,university,course,country,intake,loan_amount_requested,collateral,loan_type,status,sub_status,awaiting_from,sla_days,priority,last_update_source,confidence_score,bank_application_ref,sanction_amount,roi,tenure,processing_fee,margin_percent,sanction_accepted_date,agreement_date,disbursement_request_date,disbursed_amount,disbursed_date,disbursement_mode,rejection_reason,relook_possible,close_reason,notes,created_at,updated_at,assigned_to) VALUES (@id,@student_name,@student_email,@student_phone,@bank,@university,@course,@country,@intake,@loan_amount_requested,@collateral,@loan_type,@status,@sub_status,@awaiting_from,@sla_days,@priority,@last_update_source,@confidence_score,@bank_application_ref,@sanction_amount,@roi,@tenure,@processing_fee,@margin_percent,@sanction_accepted_date,@agreement_date,@disbursement_request_date,@disbursed_amount,@disbursed_date,@disbursement_mode,@rejection_reason,@relook_possible,@close_reason,@notes,@created_at,@updated_at,@assigned_to)`);
const histInsert = db.prepare(`INSERT INTO status_history (application_id,status,sub_status,awaiting_from,changed_by,entry_type,notes,created_at) VALUES (@application_id,@status,@sub_status,@awaiting_from,@changed_by,@entry_type,@notes,@created_at)`);
const docInsert  = db.prepare(`INSERT INTO documents (application_id,doc_name,doc_category,owner,status,uploaded_by,uploaded_at,created_at) VALUES (@application_id,@doc_name,@doc_category,@owner,@status,@uploaded_by,@uploaded_at,@created_at)`);
const coaInsert  = db.prepare(`INSERT INTO co_applicants (application_id,name,relation,phone,email,income,employment_type) VALUES (@application_id,@name,@relation,@phone,@email,@income,@employment_type)`);

const APP_IDS = [];
const seedApps = db.transaction(() => {
  for (let i = 0; i < 50; i++) {
    const status  = APP_STATUSES[i % APP_STATUSES.length];
    const student = STUDENT_NAMES[i % STUDENT_NAMES.length];
    const email   = student.toLowerCase().replace(' ', '.') + `${i}@gmail.com`;
    const hasSanc = ['SANCTIONED','CONDITIONAL_SANCTION','SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'].includes(status);
    const hasDisb = ['DISBURSED'].includes(status);
    const isClosed= ['CLOSED','DROPPED','REJECTED'].includes(status);
    const id      = `NX-2026-${String(1000+i).padStart(4,'0')}`;
    APP_IDS.push(id);
    const daysAgo = rand(1, 40);
    appInsert.run({
      id, student_name: student, student_email: email,
      student_phone: PHONES[i % PHONES.length].replace('+91',''),
      bank: BANKS_LIST[i % BANKS_LIST.length],
      university: UNIVERSITIES[i % UNIVERSITIES.length],
      course: COURSES[i % COURSES.length],
      country: COUNTRIES[i % COUNTRIES.length],
      intake: INTAKES[i % INTAKES.length],
      loan_amount_requested: rand(500000, 5000000),
      collateral: pick(['Yes','No','NA']),
      loan_type: pick(['Secured','Unsecured','NA']),
      status, sub_status: '-',
      awaiting_from: AWAITING_MAP[status] || 'Nexthara',
      sla_days: rand(0, 14),
      priority: pick(['Normal','Normal','High','Urgent']),
      last_update_source: pick(['Portal','Bank_WABA','Staff']),
      confidence_score: hasSanc ? rand(70, 99) : null,
      bank_application_ref: ['NOT_CONNECTED'].includes(status) ? null : `BK${rand(100000,999999)}`,
      sanction_amount: hasSanc ? rand(500000, 4500000) : null,
      roi: hasSanc ? parseFloat((8.5 + Math.random()*4).toFixed(2)) : null,
      tenure: hasSanc ? pick([24,36,48,60,84]) : null,
      processing_fee: hasSanc ? parseFloat((0.5 + Math.random()).toFixed(2)) : null,
      margin_percent: hasSanc ? rand(5,25) : null,
      sanction_accepted_date: ['SANCTION_ACCEPTED','AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'].includes(status) ? ago(rand(5,20)) : null,
      agreement_date: ['AGREEMENT_SIGNED','DISBURSEMENT_PENDING','DISBURSED'].includes(status) ? ago(rand(2,10)) : null,
      disbursement_request_date: ['DISBURSEMENT_PENDING','DISBURSED'].includes(status) ? ago(rand(1,5)) : null,
      disbursed_amount: hasDisb ? rand(400000, 4000000) : null,
      disbursed_date: hasDisb ? ago(rand(0,5)) : null,
      disbursement_mode: hasDisb ? pick(['University','Student Account']) : null,
      rejection_reason: status === 'REJECTED' ? pick(['Low CIBIL','Low FOIR','Incomplete docs','Policy mismatch']) : null,
      relook_possible: status === 'REJECTED' ? pick(['Yes','No']) : null,
      close_reason: isClosed ? pick(['Student withdrew','Visa rejected','Chose another bank','Intake deferred']) : null,
      notes: null, created_at: ago(daysAgo + rand(5,30)), updated_at: ago(daysAgo),
      assigned_to: pick(['Amit Kumar','Priya Shah','Ravi Menon']),
    });
    // Status history
    const steps = ['NOT_CONNECTED','LOGIN_SUBMITTED','DOCS_PENDING','UNDER_REVIEW'].slice(0, rand(1,4));
    if (!steps.includes(status)) steps.push(status);
    steps.forEach((s,idx) => {
      histInsert.run({ application_id:id, status:s, sub_status:'-', awaiting_from: AWAITING_MAP[s]||'Nexthara', changed_by: pick(['Amit Kumar','Priya Shah','System']), entry_type:'status', notes: s===status?'Current status':'Completed', created_at: ago(daysAgo + (steps.length-idx)*3) });
    });
    // Documents
    const docList = [['Offer Letter','Admission Docs'],['Passport Copy','Student KYC'],['ITR (2 years)','Financial Docs'],['Salary Slips (3 months)','Financial Docs'],['Bank Statement (6 months)','Financial Docs'],['Co-applicant KYC','Co-applicant Docs'],['CIBIL Report','Other']];
    docList.forEach(([doc_name, doc_category]) => {
      const docStatus = pick(['Missing','Missing','Received','Verified','Invalid']);
      docInsert.run({ application_id:id, doc_name, doc_category, owner:'Student', status: docStatus, uploaded_by: ['Received','Verified'].includes(docStatus) ? 'Priya Shah' : null, uploaded_at: ['Received','Verified'].includes(docStatus) ? ago(rand(1,10)) : null, created_at: ago(daysAgo+2) });
    });
    // Co-applicant
    if (Math.random() > 0.35) {
      coaInsert.run({ application_id:id, name: pick(['Suresh Kumar','Sunita Devi','Ramesh Patel','Kavitha Reddy']), relation: pick(['Father','Mother','Spouse','Sibling']), phone: PHONES[(i+5)%PHONES.length].replace('+91',''), email:`co.${email}`, income: rand(400000,2000000), employment_type: pick(['Salaried','Self-Employed','Business Owner']) });
    }
  }
});
seedApps();
console.log('  ✓ 50 applications + history + docs + co-applicants');

// ──────────────────────────────────────────────────────────────────────────────
// 3. LEADS
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding leads...');
try { db.pragma('foreign_keys = OFF'); db.exec('DELETE FROM lead_escalations; DELETE FROM lead_notifications; DELETE FROM lead_followups; DELETE FROM lead_calls; DELETE FROM lead_notes; DELETE FROM lead_qualification; DELETE FROM lead_to_case_mapping; DELETE FROM leads;'); db.pragma('foreign_keys = ON'); } catch(e) {}

const LEAD_STAGES   = ['NEW','CONTACT_ATTEMPTED','CONNECTED','QUALIFIED','DOCS_REQUESTED','DOCS_RECEIVED','CASE_CREATED','DROPPED','LOST'];
const LEAD_SOURCES  = ['MANUAL_ENTRY','META_LEAD_FORM','WEBSITE_FORM','EVENT','REFERRAL','WALK_IN'];
const leadInsert    = db.prepare(`INSERT INTO leads (id,full_name,phone_e164,email,city,country,course,intake,loan_amount_paise,stage,lead_source_type,intent_score,tags,assignment_mode,assigned_at,created_at,updated_at) VALUES (@id,@full_name,@phone_e164,@email,@city,@country,@course,@intake,@loan_amount_paise,@stage,@lead_source_type,@intent_score,@tags,@assignment_mode,@assigned_at,@created_at,@updated_at)`);

const LEAD_IDS = [];
const seedLeads = db.transaction(() => {
  for (let i = 0; i < 30; i++) {
    const id    = `LD-${uid()}`;
    const name  = STUDENT_NAMES[i % STUDENT_NAMES.length];
    const stage = LEAD_STAGES[i % LEAD_STAGES.length];
    LEAD_IDS.push(id);
    leadInsert.run({
      id, full_name: name,
      phone_e164: PHONES[i % PHONES.length],
      email: name.toLowerCase().replace(' ','.') + `${i}@gmail.com`,
      city: pick(['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune']),
      country: COUNTRIES[i%COUNTRIES.length],
      course: COURSES[i%COURSES.length],
      intake: INTAKES[i%INTAKES.length],
      loan_amount_paise: rand(500000, 5000000) * 100,
      stage, lead_source_type: LEAD_SOURCES[i%LEAD_SOURCES.length],
      intent_score: rand(20, 95),
      tags: JSON.stringify(pick([['hot'],['vip'],['urgent'],['cold'],[]])),
      assignment_mode: 'MANUAL',
      assigned_at: ago(rand(1,10)),
      created_at: ago(rand(5,60)), updated_at: ago(rand(1,5)),
    });
  }
});
seedLeads();

// Lead notes
const leadNoteIns = db.prepare(`INSERT INTO lead_notes (id,lead_id,staff_id,staff_name,note_text,created_at) VALUES (?,?,?,?,?,?)`);
LEAD_IDS.slice(0,20).forEach(lid => {
  const staffName = pick(['Amit Kumar','Priya Shah','Ravi Menon']);
  leadNoteIns.run(`LN-${uid()}`, lid, 'staff-001', staffName, pick(['Called, no answer','Interested, wants brochure','Follow-up next week','Documents shared','Connected on WhatsApp']), ago(rand(1,10)));
});

// Lead calls
try {
  const leadCallIns = db.prepare(`INSERT INTO lead_calls (id,lead_id,staff_id,staff_name,call_status,duration_seconds,notes,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  LEAD_IDS.slice(0,15).forEach(lid => {
    const staffName = pick(['Amit Kumar','Priya Shah']);
    leadCallIns.run(`LC-${uid()}`, lid, 'staff-001', staffName, pick(['ANSWERED','NO_ANSWER','BUSY','CALLBACK_REQUESTED']), rand(30,600), pick(['Discussed loan options','Student interested','Call back requested',null]), ago(rand(1,15)));
  });
} catch(e) { console.log('  ⚠ lead_calls skip:', e.message.slice(0,80)); }

// Lead qualification
try {
  const lqIns = db.prepare(`INSERT INTO lead_qualification (id,lead_id,university,country,course,loan_amount_paise,coapp_income_paise,collateral_available,cibil_known,admission_received,visa_urgency,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  LEAD_IDS.slice(0,12).forEach((lid,i) => {
    lqIns.run(`LQ-${uid()}`, lid, UNIVERSITIES[i%UNIVERSITIES.length], COUNTRIES[i%COUNTRIES.length], COURSES[i%COURSES.length], rand(500000,5000000)*100, rand(40000,200000)*100, rand(0,1), rand(0,1), rand(0,1), pick(['LOW','MEDIUM','HIGH']), ago(rand(1,20)), ago(rand(0,5)));
  });
} catch(e) { console.log('  ⚠ lead_qualification skip:', e.message.slice(0,80)); }

// Lead to case mapping
try {
  const ltcIns = db.prepare(`INSERT INTO lead_to_case_mapping (id,lead_id,case_id,converted_by_staff_id,converted_by_staff_name,converted_at) VALUES (?,?,?,?,?,?)`);
  LEAD_IDS.filter((_,i)=>i<5).forEach((lid,i) => {
    ltcIns.run(`LTC-${uid()}`, lid, APP_IDS[i], 'staff-001', 'Amit Kumar', ago(rand(1,10)));
  });
} catch(e) { console.log('  ⚠ lead_to_case_mapping skip:', e.message.slice(0,80)); }

console.log('  ✓ 30 leads + notes + calls + qualification');

// ──────────────────────────────────────────────────────────────────────────────
// 4. COMMUNICATION ENGINE
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding communication engine...');
try { db.pragma('foreign_keys = OFF'); db.exec('DELETE FROM escalations; DELETE FROM message_log; DELETE FROM next_actions;'); db.pragma('foreign_keys = ON'); } catch(e) {}

// Next actions
try {
  const naIns = db.prepare(`INSERT INTO next_actions (id,case_id,owner_type,action_code,title,description,priority,status,due_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  APP_IDS.slice(0,15).forEach((cid) => {
    naIns.run(`NA-${uid()}`, cid, pick(['STAFF','STUDENT','BANK']), pick(['CALL','EMAIL','DOCUMENT','FOLLOW_UP']), pick(['Follow up with student','Request ITR documents','Send sanction letter','Ping bank for update','Collect co-applicant docs']), 'Please complete this action at the earliest.', pick(['NORMAL','HIGH','URGENT']), pick(['PENDING','PENDING','IN_PROGRESS','DONE']), future(rand(1,7)), ago(rand(1,10)));
  });
} catch(e) { console.log('  ⚠ next_actions skip:', e.message.slice(0,60)); }

// Message log
try {
  const mlIns = db.prepare(`INSERT INTO message_log (id,entity_type,entity_id,channel,recipient,template_name,status,delivered_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  APP_IDS.slice(0,20).forEach(cid => {
    mlIns.run(`ML-${uid()}`, 'CASE', cid, pick(['WHATSAPP','EMAIL','SMS']), PHONES[rand(0,PHONES.length-1)], pick(['STATUS_UPDATE','DOC_REQUEST','SANCTION_ALERT','REMINDER']), pick(['DELIVERED','DELIVERED','READ','FAILED']), ago(rand(0,5)), ago(rand(1,10)));
  });
} catch(e) {}

// Escalations
try {
  const escIns = db.prepare(`INSERT INTO escalations (id,entity_type,entity_id,reason,level,status,created_at) VALUES (?,?,?,?,?,?,?)`);
  APP_IDS.slice(0,5).forEach(cid => {
    escIns.run(`ESC-${uid()}`, 'CASE', cid, pick(['SLA breached','Bank not responding','Student non-responsive','Document mismatch']), rand(1,3), pick(['OPEN','OPEN','RESOLVED']), ago(rand(1,10)));
  });
} catch(e) {}

console.log('  ✓ next_actions + message_log + escalations');

// ──────────────────────────────────────────────────────────────────────────────
// 5. TASK NEXT ACTIONS (CRM tasks/notes per case)
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding tasks & notes...');
try {
  db.pragma('foreign_keys = OFF');
  db.exec('DELETE FROM task_next_actions;');
  db.pragma('foreign_keys = ON');
  const tnaIns = db.prepare(`INSERT INTO task_next_actions (id,scope,case_id,action_type,title,description,owner_party,status,priority,due_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  APP_IDS.slice(0,20).forEach(cid => {
    // 1-3 tasks per case
    for (let t = 0; t < rand(1,3); t++) {
      tnaIns.run(`TNA-${uid()}`, 'CASE', cid, pick(['CALL','EMAIL','DOCUMENT','FOLLOW_UP']), pick(['Call student for update','Request ITR docs','Send reminder','Bank follow-up required','Collect co-applicant income proof']), 'Action required at the earliest.', 'STAFF', pick(['PENDING','PENDING','IN_PROGRESS','DONE']), pick(['NORMAL','HIGH','URGENT']), future(rand(1,7)), ago(rand(1,14)));
    }
    // 1 note
    tnaIns.run(`TNA-${uid()}`, 'CASE', cid, 'NOTE', pick(['Student called, will share docs by EOD','Bank replied - under review','Co-applicant visiting branch tomorrow','Sanction expected next week','All clear, pending disbursement']), null, 'STAFF', 'DONE', 'NORMAL', null, ago(rand(0,5)));
  });
} catch(e) { console.log('  ⚠ task_next_actions skip:', e.message.slice(0,60)); }
console.log('  ✓ tasks + notes per case');

// ──────────────────────────────────────────────────────────────────────────────
// 6. CRM — REFERENCES & CHECKLIST ITEMS
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding CRM references & checklist...');
try {
  db.pragma('foreign_keys = OFF');
  db.exec('DELETE FROM case_references;');
  db.pragma('foreign_keys = ON');
  const refIns = db.prepare(`INSERT INTO case_references (id,case_id,full_name,phone,email,ref_order,created_at) VALUES (?,?,?,?,?,?,?)`);
  APP_IDS.slice(0,15).forEach((cid,i) => {
    refIns.run(`REF-${uid()}`, cid, pick(['Dr. Anand Kumar','Ms. Sunita Rao','Mr. Vijay Sharma','Prof. Rekha Menon']), PHONES[(i+3)%PHONES.length], `ref${i}@gmail.com`, 1, ago(rand(5,20)));
  });
} catch(e) {}

try {
  db.pragma('foreign_keys = OFF');
  db.exec('DELETE FROM case_document_checklist_items;');
  db.pragma('foreign_keys = ON');
  const cliIns = db.prepare(`INSERT INTO case_document_checklist_items (id,case_id,doc_code,display_name,owner_entity_type,requirement_level,status,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  const docCodes = [['STU_PASSPORT','Passport Copy','STUDENT'],['STU_OFFER_LETTER','Offer Letter','STUDENT'],['STU_ITR_2Y','ITR (2 Years)','STUDENT'],['STU_BANK_STMT_6M','Bank Statement (6M)','STUDENT'],['STU_CIBIL','CIBIL Report','STUDENT'],['COAPP_PAN','Co-applicant PAN Card','CO_APPLICANT'],['COAPP_ITR_2Y','Co-applicant ITR (2Y)','CO_APPLICANT'],['COAPP_SALARY_SLIP_3M','Co-applicant Salary Slips','CO_APPLICANT']];
  APP_IDS.slice(0,20).forEach(cid => {
    docCodes.forEach(([code, name, ownerType]) => {
      cliIns.run(`CLI-${uid()}`, cid, code, name, ownerType, pick(['MANDATORY','MANDATORY','OPTIONAL']), pick(['PENDING','RECEIVED','VERIFIED','WAIVED']), null, ago(rand(1,15)));
    });
  });
} catch(e) { console.log('  ⚠ checklist skip:', e.message.slice(0,60)); }
console.log('  ✓ references + checklist items');

// ──────────────────────────────────────────────────────────────────────────────
// 7. ORGANIZATIONS + AGENT PORTAL
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding agent organizations...');
try { db.pragma('foreign_keys = OFF'); db.exec('DELETE FROM agent_audit_log; DELETE FROM commissions; DELETE FROM agent_lead_notes; DELETE FROM agent_leads; DELETE FROM agent_users; DELETE FROM branches; DELETE FROM organizations;'); db.pragma('foreign_keys = ON'); } catch(e) {}

const orgs = [
  { id: 'ORG-001', name: 'EduLoan Advisors Pvt Ltd', legal_name: 'EduLoan Advisors Private Limited', gstin: '27AABCE1234F1Z5', status: 'ACTIVE', plan_id: 'PRO' },
  { id: 'ORG-002', name: 'GlobalStudy Finance Hub',  legal_name: 'GlobalStudy Finance Hub LLP',       gstin: '29AABCE5678G2Z8', status: 'ACTIVE', plan_id: 'STARTER' },
];
const orgIns = db.prepare(`INSERT OR IGNORE INTO organizations (id,name,legal_name,gstin,status,plan_id,created_at) VALUES (?,?,?,?,?,?,?)`);
orgs.forEach(o => orgIns.run(o.id, o.name, o.legal_name, o.gstin, o.status, o.plan_id, ago(rand(30,180))));

const orgBranches = [
  { id:'BR-001', organization_id:'ORG-001', name:'Mumbai HQ',      city:'Mumbai' },
  { id:'BR-002', organization_id:'ORG-001', name:'Delhi Branch',   city:'Delhi'  },
  { id:'BR-003', organization_id:'ORG-001', name:'Bangalore Office',city:'Bangalore'},
  { id:'BR-004', organization_id:'ORG-002', name:'Chennai Office', city:'Chennai' },
  { id:'BR-005', organization_id:'ORG-002', name:'Hyderabad Office',city:'Hyderabad'},
];
const branchIns = db.prepare(`INSERT OR IGNORE INTO branches (id,organization_id,name,city,created_at) VALUES (?,?,?,?,?)`);
orgBranches.forEach(b => branchIns.run(b.id, b.organization_id, b.name, b.city, ago(rand(20,120))));

const agentUserDefs = [
  { id:'AU-001', organization_id:'ORG-001', branch_id:'BR-001', name:'Deepak Malhotra', email:'deepak@eduloan.com',   role:'ADMIN'    },
  { id:'AU-002', organization_id:'ORG-001', branch_id:'BR-001', name:'Sonia Kapoor',    email:'sonia@eduloan.com',    role:'COUNSELOR' },
  { id:'AU-003', organization_id:'ORG-001', branch_id:'BR-002', name:'Rajiv Bhatia',    email:'rajiv@eduloan.com',    role:'COUNSELOR' },
  { id:'AU-004', organization_id:'ORG-002', branch_id:'BR-004', name:'Kavitha Suresh',  email:'kavitha@globalstudy.com',role:'ADMIN'  },
  { id:'AU-005', organization_id:'ORG-002', branch_id:'BR-005', name:'Nitin Rao',       email:'nitin@globalstudy.com',  role:'COUNSELOR'},
];
const auIns = db.prepare(`INSERT OR IGNORE INTO agent_users (id,organization_id,branch_id,name,email,phone_e164,password_hash,role,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)`);
agentUserDefs.forEach(u => auIns.run(u.id, u.organization_id, u.branch_id, u.name, u.email, PHONES[rand(0,PHONES.length-1)], bcrypt.hashSync('agent123',10), u.role, ago(rand(10,90))));

// Agent leads
const AGENT_LEAD_STAGES = ['NEW','CONTACTED','DOCS_PENDING','QUALIFIED','CONVERTED','DROPPED'];
const agLeadIns = db.prepare(`INSERT INTO agent_leads (id,organization_id,branch_id,submitted_by,full_name,phone_e164,email,city,country,course,university,intake,loan_amount_paise,stage,priority,source,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const AGENT_LEAD_IDS = [];
const agLeadData = db.transaction(() => {
  for (let i = 0; i < 20; i++) {
    const id   = `AGL-${uid()}`;
    const org  = i < 12 ? 'ORG-001' : 'ORG-002';
    const br   = i < 12 ? pick(['BR-001','BR-002','BR-003']) : pick(['BR-004','BR-005']);
    const sub  = i < 12 ? pick(['AU-001','AU-002','AU-003']) : pick(['AU-004','AU-005']);
    const name = STUDENT_NAMES[i % STUDENT_NAMES.length];
    AGENT_LEAD_IDS.push({ id, org });
    agLeadIns.run(id, org, br, sub, name, PHONES[i%PHONES.length], `${name.toLowerCase().replace(' ','.')}${i}@gmail.com`, pick(['Mumbai','Delhi','Bangalore','Chennai']), COUNTRIES[i%COUNTRIES.length], COURSES[i%COURSES.length], UNIVERSITIES[i%UNIVERSITIES.length], INTAKES[i%INTAKES.length], rand(5000000,50000000), AGENT_LEAD_STAGES[i%AGENT_LEAD_STAGES.length], pick(['NORMAL','HIGH']), 'AGENT_SUBMITTED', pick(['Referred by colleague','Met at education fair','Walk-in enquiry',null]), ago(rand(1,60)), ago(rand(0,5)));
  }
});
agLeadData();

// Agent lead notes
const agnIns = db.prepare(`INSERT INTO agent_lead_notes (id,agent_lead_id,agent_user_id,agent_user_name,note_text,created_at) VALUES (?,?,?,?,?,?)`);
AGENT_LEAD_IDS.slice(0,12).forEach(({id:lid, org}) => {
  const user = org==='ORG-001' ? pick([{id:'AU-001',name:'Deepak Malhotra'},{id:'AU-002',name:'Sonia Kapoor'}]) : {id:'AU-004',name:'Kavitha Suresh'};
  agnIns.run(`AGN-${uid()}`, lid, user.id, user.name, pick(['Called student, interested','Documents requested via WhatsApp','Student visiting office next week','Loan amount confirmed at ₹20L','Co-applicant details collected']), ago(rand(0,10)));
});

// Commissions
const commIns = db.prepare(`INSERT INTO commissions (id,organization_id,agent_lead_id,case_id,sanction_amount_paise,commission_percent,commission_amount_paise,status,invoice_number,paid_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
AGENT_LEAD_IDS.slice(0,8).forEach(({id:lid, org},i) => {
  const sanctAmt = rand(1000000,5000000) * 100;
  const pct = parseFloat((0.5 + Math.random()).toFixed(2));
  const commAmt = Math.round(sanctAmt * pct / 100);
  const status = i < 3 ? 'PAID' : i < 6 ? 'APPROVED' : 'PENDING';
  commIns.run(`COM-${uid()}`, org, lid, APP_IDS[i%APP_IDS.length], sanctAmt, pct, commAmt, status, status==='PAID' ? `INV-2026-${String(100+i).padStart(4,'0')}` : null, status==='PAID' ? ago(rand(1,30)) : null, ago(rand(1,60)));
});

// Agent audit log
const aauIns = db.prepare(`INSERT INTO agent_audit_log (organization_id,actor_id,action,entity_type,entity_id,created_at) VALUES (?,?,?,?,?,?)`);
AGENT_LEAD_IDS.slice(0,10).forEach(({id:lid, org},i) => {
  aauIns.run(org, i<5?'AU-001':'AU-004', pick(['CREATE_LEAD','UPDATE_LEAD','CONVERT_LEAD','ADD_NOTE']), 'agent_lead', lid, ago(rand(0,20)));
});
console.log('  ✓ 2 orgs + 5 branches + 5 users + 20 leads + commissions');

// ──────────────────────────────────────────────────────────────────────────────
// 8. BANKS + BANK ADMIN PORTAL
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding bank portal data...');
try { db.pragma('foreign_keys = OFF'); db.exec('DELETE FROM bank_doc_reviews; DELETE FROM bank_application_proofs; DELETE FROM bank_query_messages; DELETE FROM bank_queries; DELETE FROM bank_application_events; DELETE FROM bank_applications; DELETE FROM bank_product_policy_versions; DELETE FROM bank_product_documents; DELETE FROM bank_product_criteria; DELETE FROM bank_products; DELETE FROM bank_api_keys; DELETE FROM bank_announcements; DELETE FROM bank_portal_users; DELETE FROM bank_branches; DELETE FROM bank_regions; DELETE FROM banks;'); db.pragma('foreign_keys = ON'); } catch(e) {}

const bankDefs = [
  { id:'BANK-SBI',   name:'State Bank of India',  country:'India',  sla:7  },
  { id:'BANK-HDFC',  name:'HDFC Credila',          country:'India',  sla:5  },
  { id:'BANK-ICICI', name:'ICICI Bank',             country:'India',  sla:6  },
];
const bankIns = db.prepare(`INSERT INTO banks (id,name,country,is_active,default_sla_days,created_at) VALUES (?,?,?,1,?,?)`);
bankDefs.forEach(b => bankIns.run(b.id, b.name, b.country, b.sla, ago(rand(60,180))));

// Bank regions
const regionIns = db.prepare(`INSERT INTO bank_regions (id,bank_id,region_name,created_at) VALUES (?,?,?,?)`);
const regDefs = [
  {id:'REG-001',bank_id:'BANK-SBI', region_name:'North India'},{id:'REG-002',bank_id:'BANK-SBI', region_name:'South India'},
  {id:'REG-003',bank_id:'BANK-HDFC',region_name:'West India'}, {id:'REG-004',bank_id:'BANK-ICICI',region_name:'East India'},
];
regDefs.forEach(r => regionIns.run(r.id, r.bank_id, r.region_name, ago(rand(30,120))));

// Bank branches
const bbIns = db.prepare(`INSERT INTO bank_branches (id,bank_id,region,state,city,branch_name,is_active,created_at) VALUES (?,?,?,?,?,?,1,?)`);
const bbDefs = [
  {id:'BB-001',bank_id:'BANK-SBI', region:'North',state:'Delhi',  city:'New Delhi',  branch_name:'Connaught Place Branch'},
  {id:'BB-002',bank_id:'BANK-SBI', region:'South',state:'Tamil Nadu',city:'Chennai',branch_name:'Anna Salai Branch'},
  {id:'BB-003',bank_id:'BANK-HDFC',region:'West', state:'Maharashtra',city:'Mumbai', branch_name:'Bandra Kurla Branch'},
  {id:'BB-004',bank_id:'BANK-HDFC',region:'West', state:'Maharashtra',city:'Pune',   branch_name:'Pune Main Branch'},
  {id:'BB-005',bank_id:'BANK-ICICI',region:'South',state:'Karnataka',city:'Bangalore',branch_name:'MG Road Branch'},
];
bbDefs.forEach(b => bbIns.run(b.id, b.bank_id, b.region, b.state, b.city, b.branch_name, ago(rand(20,90))));

// Bank portal users
const bpuIns = db.prepare(`INSERT INTO bank_portal_users (id,bank_id,branch_id,name,role,email,phone,password_hash,assigned_states,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,?)`);
const bpuDefs = [
  {id:'BPU-001',bank_id:'BANK-SBI', branch_id:null,   name:'Arun Joshi',    role:'SUPER_ADMIN',    email:'arun@sbi.co.in'},
  {id:'BPU-002',bank_id:'BANK-SBI', branch_id:'BB-001',name:'Meena Sharma',  role:'BRANCH_MANAGER', email:'meena@sbi.co.in'},
  {id:'BPU-003',bank_id:'BANK-SBI', branch_id:'BB-001',name:'Rajan Verma',   role:'OFFICER',        email:'rajan@sbi.co.in'},
  {id:'BPU-004',bank_id:'BANK-HDFC',branch_id:null,    name:'Nita Desai',    role:'SUPER_ADMIN',    email:'nita@hdfccredila.com'},
  {id:'BPU-005',bank_id:'BANK-HDFC',branch_id:'BB-003',name:'Suresh Pillai', role:'OFFICER',        email:'suresh@hdfccredila.com'},
  {id:'BPU-006',bank_id:'BANK-ICICI',branch_id:null,   name:'Pradeep Nair',  role:'SUPER_ADMIN',    email:'pradeep@icicibank.com'},
  {id:'BPU-007',bank_id:'BANK-ICICI',branch_id:'BB-005',name:'Anita Rao',    role:'OFFICER',        email:'anita@icicibank.com'},
];
bpuDefs.forEach(u => bpuIns.run(u.id, u.bank_id, u.branch_id||null, u.name, u.role, u.email, PHONES[rand(0,PHONES.length-1)], bcrypt.hashSync('Nexthara@123',10), '[]', ago(rand(10,60))));

// Bank products
const bpIns = db.prepare(`INSERT INTO bank_products (id,bank_id,product_name,loan_type,min_amount_paise,max_amount_paise,interest_range,tenure_range,processing_fee_percent,collateral_required,coapp_required,countries_supported,is_active,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?)`);
const bpDefs = [
  {id:'BP-001',bank_id:'BANK-SBI', product_name:'SBI Global Ed-Vantage',     loan_type:'SECURED',  min:2000000,max:150000000,ir:'8.65-10.5%',tr:'15 years',pf:0,cr:1,cor:1,cs:['USA','UK','Canada','Australia']},
  {id:'BP-002',bank_id:'BANK-SBI', product_name:'SBI Student Loan Scheme',    loan_type:'UNSECURED',min:500000, max:7500000, ir:'10.5-12%',  tr:'7 years', pf:0,cr:0,cor:1,cs:['India']},
  {id:'BP-003',bank_id:'BANK-HDFC',product_name:'HDFC Credila Education Loan',loan_type:'SECURED',  min:1000000,max:200000000,ir:'9.5-12%',  tr:'12 years',pf:1,cr:1,cor:1,cs:['USA','UK','Canada','Germany','Australia']},
  {id:'BP-004',bank_id:'BANK-ICICI',product_name:'ICICI Bank Education Loan', loan_type:'UNSECURED',min:500000, max:10000000,ir:'10.25-12.5%',tr:'7 years',pf:0.5,cr:0,cor:1,cs:['USA','UK','Canada','Singapore']},
];
bpDefs.forEach(p => bpIns.run(p.id, p.bank_id, p.product_name, p.loan_type, p.min*100, p.max*100, p.ir, p.tr, p.pf, p.cr, p.cor, JSON.stringify(p.cs), ago(rand(30,120))));

// Product criteria
const bpcIns = db.prepare(`INSERT INTO bank_product_criteria (id,product_id,criteria_type,criteria_value) VALUES (?,?,?,?)`);
[
  ['BP-001','MIN_CIBIL','{"score":700}'],['BP-001','MIN_INCOME','{"monthly_paise":5000000}'],['BP-001','COURSE_TYPES','{"allowed":["MS","MBA","PhD"]}'],
  ['BP-003','MIN_CIBIL','{"score":720}'],['BP-003','CO_APP_REQUIRED','{"mandatory":true}'],
  ['BP-004','MIN_CIBIL','{"score":680}'],['BP-004','MIN_INCOME','{"monthly_paise":4000000}'],
].forEach(([pid,ct,cv]) => bpcIns.run(`BPC-${uid()}`, pid, ct, cv));

// Product documents
const bpdIns = db.prepare(`INSERT INTO bank_product_documents (id,product_id,doc_code,mandatory,order_no) VALUES (?,?,?,?,?)`);
['STU_PASSPORT','STU_OFFER_LETTER','STU_ITR_2Y','COAPP_PAN','COAPP_ITR_2Y','COAPP_SALARY_SLIP_3M'].forEach((code,i) => {
  ['BP-001','BP-003','BP-004'].forEach(pid => bpdIns.run(`BPD-${uid()}`, pid, code, 1, i));
});

// Policy versions
const bppvIns = db.prepare(`INSERT INTO bank_product_policy_versions (id,product_id,version_no,change_summary,changed_by_name,changed_at) VALUES (?,?,?,?,?,?)`);
['BP-001','BP-003'].forEach(pid => {
  bppvIns.run(`BPPV-${uid()}`, pid, 1, 'Initial policy document uploaded', 'Arun Joshi', ago(rand(60,120)));
  bppvIns.run(`BPPV-${uid()}`, pid, 2, 'Updated interest rate band and processing fee structure', 'Arun Joshi', ago(rand(10,30)));
});

// Document rejection reasons master
try {
  const drrIns = db.prepare(`INSERT OR IGNORE INTO document_rejection_reasons_master (code,label) VALUES (?,?)`);
  [['BLURRY','Document is blurry or unreadable'],['EXPIRED','Document is expired'],['MISMATCH','Name/details do not match application'],['INCOMPLETE','Document is incomplete or missing pages'],['INVALID_FORMAT','Invalid file format — PDF or JPG required'],['TAMPERED','Document appears to be tampered or edited']].forEach(([code,label]) => drrIns.run(code, label));
} catch(e) {}

// Announcements
const annIns = db.prepare(`INSERT INTO bank_announcements (id,bank_id,created_by,title,description,visible_to,created_at) VALUES (?,?,?,?,?,?,?)`);
[
  {bank:'BANK-SBI', by:'Arun Joshi',  title:'New Interest Rate Effective Feb 2026',       desc:'Please note SBI Ed-Vantage rates revised to 8.65% p.a. effective Feb 1.',     vt:'ALL'},
  {bank:'BANK-SBI', by:'Meena Sharma',title:'Document Checklist Updated',                 desc:'Collateral documents now require notarized copies. Update your checklists.',  vt:'BRANCH'},
  {bank:'BANK-HDFC',by:'Nita Desai',  title:'Faster Processing for USA Applications',     desc:'TAT for USA study loans reduced to 5 working days for complete applications.', vt:'ALL'},
  {bank:'BANK-ICICI',by:'Pradeep Nair',title:'New Countries Added — Netherlands & France',desc:'ICICI education loans now available for Netherlands and France programmes.',    vt:'ALL'},
].forEach(a => annIns.run(`ANN-${uid()}`, a.bank, a.by, a.title, a.desc, a.vt, ago(rand(1,30))));

// API keys
const akIns = db.prepare(`INSERT INTO bank_api_keys (id,bank_id,label,api_key,is_active,created_at) VALUES (?,?,?,?,1,?)`);
['BANK-SBI','BANK-HDFC','BANK-ICICI'].forEach(bid => {
  const key = `nxk_${uid()}${uid()}`;
  akIns.run(`AK-${uid()}`, bid, 'Production API Key', key, ago(rand(10,60)));
});

// Bank applications
const baIns = db.prepare(`INSERT INTO bank_applications (id,bank_id,bank_branch_id,bank_product_id,case_id,assigned_to_bank_user_id,student_name,student_phone,student_email,country,university,course,intake,loan_amount_paise,status,awaiting_from,priority,submitted_at,sla_due_at,last_bank_update_at,sanction_amount_paise,disbursed_amount_paise,roi_final,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const BA_STATUSES = ['INITIATED','DOCS_PENDING','UNDER_REVIEW','SANCTIONED','DISBURSED','REJECTED','CLOSED'];
const BA_IDS = [];
for (let i = 0; i < 20; i++) {
  const id = `BA-${uid()}`;
  BA_IDS.push(id);
  const bank = bankDefs[i%bankDefs.length];
  const status = BA_STATUSES[i%BA_STATUSES.length];
  const hasSanc = ['SANCTIONED','DISBURSED'].includes(status);
  const hasDisb = status === 'DISBURSED';
  const sub = agoH(rand(1,200));
  const sladue = future(rand(1,10));
  baIns.run(id, bank.id, bbDefs.find(b=>b.bank_id===bank.id)?.id||null, bpDefs.find(p=>p.bank_id===bank.id)?.id||null, APP_IDS[i%APP_IDS.length], bpuDefs.find(u=>u.bank_id===bank.id)?.id||null, STUDENT_NAMES[i%STUDENT_NAMES.length], PHONES[i%PHONES.length], `stu${i}@gmail.com`, COUNTRIES[i%COUNTRIES.length], UNIVERSITIES[i%UNIVERSITIES.length], COURSES[i%COURSES.length], INTAKES[i%INTAKES.length], rand(500000,5000000)*100, status, pick(['BANK','STUDENT','NEXTHARA']), pick(['NORMAL','HIGH','URGENT']), sub, sladue, ago(rand(0,3)), hasSanc ? rand(500000,4500000)*100 : null, hasDisb ? rand(400000,4000000)*100 : null, hasSanc ? parseFloat((8.5+Math.random()*4).toFixed(2)) : null, sub, ago(rand(0,3)));
}

// Bank queries
const bqIns = db.prepare(`INSERT INTO bank_queries (id,bank_application_id,bank_id,status,raised_by_actor_type,raised_by_id,raised_by_name,title,message,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
const bqmIns= db.prepare(`INSERT INTO bank_query_messages (id,bank_query_id,actor_type,actor_id,actor_name,message,created_at) VALUES (?,?,?,?,?,?,?)`);
const BQ_IDS = [];
BA_IDS.slice(0,10).forEach((baid,i) => {
  const qid = `BQ-${uid()}`;
  BQ_IDS.push({qid, bank_id: bankDefs[i%bankDefs.length].id});
  const status = i < 6 ? 'OPEN' : 'CLOSED';
  bqIns.run(qid, baid, bankDefs[i%bankDefs.length].id, status, 'NEXTHARA', 'BPU-001', 'Nexthara Team', pick(['Additional income proof required','Property valuation document needed','Please clarify co-applicant relationship','University ranking confirmation','GRE score card required']), pick(['Please provide the requested documents at the earliest so we can proceed with the review.','We need additional clarity on the co-applicant employment status.','Kindly share the notarized copy of the collateral document.']), ago(rand(1,15)));
  // Reply
  bqmIns.run(`BQM-${uid()}`, qid, 'BANK', bpuDefs[i%bpuDefs.length].id, bpuDefs[i%bpuDefs.length].name, pick(['Documents noted. We will process within 2 working days.','Thank you. Please also provide the bank statement.','Received. Review in progress.']), ago(rand(0,5)));
});

// Bank application proofs
const bapIns = db.prepare(`INSERT INTO bank_application_proofs (id,bank_application_id,proof_type,file_url,uploaded_by_actor_type,uploaded_by_id,uploaded_by_name,status,verified_by_user_id,verified_at,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
BA_IDS.slice(0,8).forEach((baid,i) => {
  const status = i < 4 ? 'VERIFIED' : 'PENDING_VERIFY';
  bapIns.run(`BAP-${uid()}`, baid, pick(['SANCTION_LETTER','DISBURSEMENT_PROOF','OFFER_LETTER_COPY']), `https://cdn.nexthara.com/proofs/proof-${uid()}.pdf`, 'BANK', 'BPU-001', 'Arun Joshi', status, status==='VERIFIED'?'BPU-001':null, status==='VERIFIED'?ago(rand(0,5)):null, status==='VERIFIED'?'Verified and accepted':null, ago(rand(1,10)));
});

// Bank application events (timeline)
const baeIns = db.prepare(`INSERT INTO bank_application_events (id,bank_id,user_id,event_type,entity_id,details,created_at) VALUES (?,?,?,?,?,?,?)`);
BA_IDS.slice(0,15).forEach((baid,i) => {
  baeIns.run(`BAE-${uid()}`, bankDefs[i%bankDefs.length].id, 'BPU-001', pick(['STATUS_CHANGED','DOCUMENT_UPLOADED','QUERY_RAISED','PROOF_UPLOADED','ASSIGNED']), baid, JSON.stringify({status: BA_STATUSES[i%BA_STATUSES.length]}), ago(rand(0,10)));
});

// Doc reviews
try {
  const bdrIns = db.prepare(`INSERT INTO bank_doc_reviews (id,bank_application_id,doc_code,action,rejection_reason_code,rejection_note,reviewed_by_bank_user_id,reviewed_by_name,reviewed_at) VALUES (?,?,?,?,?,?,?,?,?)`);
  BA_IDS.slice(0,6).forEach((baid,i) => {
    const action = i < 4 ? 'VERIFIED' : 'REJECTED';
    bdrIns.run(`BDR-${uid()}`, baid, pick(['STU_PASSPORT','STU_OFFER_LETTER','COAPP_PAN']), action, action==='REJECTED'?'BLURRY':null, action==='REJECTED'?'Document is not clearly readable':null, 'BPU-001', 'Arun Joshi', ago(rand(0,5)));
  });
} catch(e) {}
console.log('  ✓ 3 banks + branches + users + products + 20 bank applications + queries + proofs');

// ──────────────────────────────────────────────────────────────────────────────
// 9. EVENTS
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding events...');
try { db.pragma('foreign_keys = OFF'); db.exec('DELETE FROM event_message_delivery; DELETE FROM event_messages; DELETE FROM event_checkins; DELETE FROM event_lead_links; DELETE FROM event_registrations; DELETE FROM event_ticket_types; DELETE FROM events;'); db.pragma('foreign_keys = ON'); } catch(e) {}

const eventDefs = [
  { id:'EVT-001', title:'Nexthara Study Abroad Expo 2026 — Mumbai', slug:'nexthara-expo-mumbai-2026', desc:'Meet 30+ universities and get your education loan pre-approved on the spot.', venue:'Bombay Exhibition Centre, NSE Complex', venue_addr:'MMRDA Grounds, BKC, Mumbai 400051', start: future(15), end: future(15), capacity:500, status:'PUBLISHED' },
  { id:'EVT-002', title:'Canada & UK Loan Masterclass — Delhi', slug:'canada-uk-masterclass-delhi-2026', desc:'Deep-dive session on HDFC Credila and SBI loans for Canada/UK. Limited seats.', venue:'The Lalit Hotel, Delhi', venue_addr:'Barakhamba Avenue, Connaught Place, New Delhi 110001', start: future(30), end: future(30), capacity:150, status:'PUBLISHED' },
  { id:'EVT-003', title:'Nexthara Counselling Camp — Bangalore', slug:'nexthara-counselling-bangalore-2026', desc:'Free one-on-one counselling sessions on education loans and visa guidance.', venue:'Marriott Whitefield, Bangalore', venue_addr:'8, ITPB Road, Whitefield, Bengaluru 560066', start: ago(5), end: ago(5), capacity:200, status:'COMPLETED' },
];
const evtIns = db.prepare(`INSERT INTO events (id,title,slug,description,event_start_at,event_end_at,venue_name,venue_address,capacity_total,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
eventDefs.forEach(e => evtIns.run(e.id, e.title, e.slug, e.desc, e.start, e.end, e.venue, e.venue_addr, e.capacity, e.status, ago(rand(10,30))));

// Ticket types
const ettIns = db.prepare(`INSERT INTO event_ticket_types (id,event_id,name,price_paise,max_quantity,benefits,is_active) VALUES (?,?,?,?,?,?,?)`);
eventDefs.forEach(e => {
  ettIns.run(`ETT-${uid()}`, e.id, 'General Entry', 0,        e.capacity,                  'Access to all sessions',                   1);
  ettIns.run(`ETT-${uid()}`, e.id, 'VIP Pass',      5000000,  Math.round(e.capacity*0.1),  'Priority seating, lunch, 1:1 counselling', 1);
});

// Registrations
const erIns = db.prepare(`INSERT INTO event_registrations (id,event_id,full_name,phone_e164,email,ticket_code,qr_payload,status,registered_at,checked_in_at,source,intent_score,tags,whatsapp_opt_in) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`);
const ecIns = db.prepare(`INSERT INTO event_checkins (id,event_id,registration_id,method,created_at) VALUES (?,?,?,?,?)`);
const ER_IDS = {};
eventDefs.forEach(evt => { ER_IDS[evt.id] = []; });

const seedRegs = db.transaction(() => {
  eventDefs.forEach(evt => {
    for (let i = 0; i < rand(12,20); i++) {
      const rid = `ER-${uid()}`;
      const code = `TC${uid()}`;
      const checkedIn = evt.status === 'COMPLETED' ? (Math.random() > 0.35) : false;
      ER_IDS[evt.id].push(rid);
      erIns.run(rid, evt.id, STUDENT_NAMES[i%STUDENT_NAMES.length], PHONES[i%PHONES.length], `reg${i}@gmail.com`, code, `${evt.id}:${code}`, checkedIn?'CHECKED_IN':'REGISTERED', ago(rand(1,25)), checkedIn?ago(5):null, pick(['LINK','WHATSAPP','REFERRAL','WALK_IN']), rand(25,90), JSON.stringify(pick([['loan_interest'],['visa_ready'],['vip'],[]])));
      if (checkedIn) {
        ecIns.run(`EC-${uid()}`, evt.id, rid, 'QR_SCAN', ago(5));
      }
    }
  });
});
seedRegs();

// Event messages
const emIns = db.prepare(`INSERT INTO event_messages (id,event_id,channel,template_name,status,scheduled_at,sent_at,created_at) VALUES (?,?,?,?,?,?,?,?)`);
eventDefs.forEach(evt => {
  emIns.run(`EM-${uid()}`, evt.id, 'WHATSAPP', 'EVENT_REMINDER',    'SENT', null, ago(rand(1,3)), ago(rand(5,10)));
  emIns.run(`EM-${uid()}`, evt.id, 'EMAIL',    'EVENT_CONFIRMATION','SENT', null, ago(rand(1,5)), ago(rand(5,15)));
});

// Event lead links (for completed event)
try {
  const ellIns = db.prepare(`INSERT INTO event_lead_links (id,event_id,registration_id,lead_id,converted_by_user_id,converted_at,conversion_status) VALUES (?,?,?,?,?,?,?)`);
  ER_IDS['EVT-003'].slice(0,5).forEach((rid,i) => {
    if (LEAD_IDS[i]) ellIns.run(`ELL-${uid()}`, 'EVT-003', rid, LEAD_IDS[i], 'staff-001', ago(rand(1,5)), 'CONVERTED');
  });
} catch(e) {}
console.log('  ✓ 3 events + ticket types + registrations + check-ins + messages');

// ──────────────────────────────────────────────────────────────────────────────
// 10. SUPER ADMIN — MASTER DATA
// ──────────────────────────────────────────────────────────────────────────────
console.log('📦 Seeding super admin master data...');

// Universities
try {
  const univIns = db.prepare(`INSERT OR IGNORE INTO universities (id,name,country,is_active,created_at) VALUES (?,?,?,1,?)`);
  [['UNIV-001','Massachusetts Institute of Technology','USA'],['UNIV-002','Stanford University','USA'],['UNIV-003','University of Toronto','Canada'],['UNIV-004','University College London','UK'],['UNIV-005','TU Munich','Germany'],['UNIV-006','NUS Singapore','Singapore'],['UNIV-007','University of Melbourne','Australia'],['UNIV-008','ETH Zurich','Germany'],['UNIV-009','Columbia University','USA'],['UNIV-010','University of Oxford','UK']].forEach(([id,name,country]) => univIns.run(id, name, country, ago(rand(30,180))));
} catch(e) { console.error('universities seed error:', e.message); }

// Courses
try {
  const courseIns = db.prepare(`INSERT OR IGNORE INTO courses (id,name,intake_months,is_active,created_at) VALUES (?,?,?,1,?)`);
  [['CRS-001','MS Computer Science'],['CRS-002','MBA Finance'],['CRS-003','MS Data Science'],['CRS-004','MEng Mechanical'],['CRS-005','MS AI/ML'],['CRS-006','LLM International Law'],['CRS-007','MBA General'],['CRS-008','MS Biotechnology'],['CRS-009','PhD Physics'],['CRS-010','MS Electrical Engineering']].forEach(([id,name]) => courseIns.run(id, name, JSON.stringify([1,9]), ago(rand(30,180))));
} catch(e) { console.error('courses seed error:', e.message); }

// Countries
try {
  const countryIns = db.prepare(`INSERT OR IGNORE INTO country_master (id,name,code,currency,is_active,created_at) VALUES (?,?,?,?,1,?)`);
  [['CTR-001','USA','US','USD'],['CTR-002','United Kingdom','GB','GBP'],['CTR-003','Canada','CA','CAD'],['CTR-004','Germany','DE','EUR'],['CTR-005','Australia','AU','AUD'],['CTR-006','Singapore','SG','SGD'],['CTR-007','Netherlands','NL','EUR'],['CTR-008','Ireland','IE','EUR'],['CTR-009','New Zealand','NZ','NZD'],['CTR-010','France','FR','EUR']].forEach(([id,name,code,curr]) => countryIns.run(id, name, code, curr, ago(rand(30,180))));
} catch(e) {}

// Loss reasons
try {
  const lrIns = db.prepare(`INSERT OR IGNORE INTO loss_reason_master (id,scope,reason_code,label,is_active,created_at) VALUES (?,?,?,?,1,?)`);
  [['LR-001','LEAD','NOT_REACHABLE','Student not reachable'],['LR-002','LEAD','NO_INTEREST','Student lost interest'],['LR-003','LEAD','SELF_FUNDED','Student opted for self-funding'],['LR-004','LEAD','OTHER_PROVIDER','Chose another loan provider'],['LR-005','CASE','VISA_REJECTED','Visa application rejected'],['LR-006','CASE','ADMISSION_CANCELLED','Admission cancelled by university'],['LR-007','CASE','INTAKE_DEFERRED','Student deferred intake'],['LR-008','CASE','BANK_REJECTED','Bank rejected the application']].forEach(([id,scope,code,label]) => lrIns.run(id, scope, code, label, ago(rand(30,180))));
} catch(e) {}

// Automation rules
try {
  const arIns = db.prepare(`INSERT OR IGNORE INTO automation_rules (id,name,scope,trigger_type,conditions,actions,is_active,created_at) VALUES (?,?,?,?,?,?,1,?)`);
  [
    ['AR-001','SLA Breach Alert','CASE','SLA_BREACHED','{"sla_days_exceeded":7}','{"notify":"STAFF","channel":"WHATSAPP","template":"SLA_BREACH_ALERT"}'],
    ['AR-002','Query Auto-Remind','CASE','QUERY_PENDING','{"days_since_raised":3}','{"notify":"STUDENT","channel":"WHATSAPP","template":"QUERY_REMINDER"}'],
    ['AR-003','Sanction Received Alert','CASE','STATUS_CHANGED','{"to_status":"SANCTIONED"}','{"notify":"STUDENT","channel":"WHATSAPP","template":"SANCTION_ALERT"}'],
    ['AR-004','Disbursement Followup','CASE','STATUS_CHANGED','{"to_status":"DISBURSEMENT_PENDING"}','{"notify":"STAFF","channel":"EMAIL","template":"DISBURSE_FOLLOWUP"}'],
    ['AR-005','New Lead Auto-Assign','LEAD','LEAD_CREATED','{"source":"META_LEAD_FORM"}','{"action":"AUTO_ASSIGN","pool":"ROUND_ROBIN"}'],
    ['AR-006','Connected Lead Reminder','LEAD','STAGE_STALE','{"stage":"CONNECTED","days_stale":3}','{"notify":"STAFF","channel":"WHATSAPP","template":"LEAD_FOLLOWUP"}'],
    ['AR-007','Docs Pending 48h Alert','CASE','DOCS_PENDING','{"hours":48}','{"notify":"STAFF","channel":"EMAIL","template":"DOC_REQUEST"}'],
    ['AR-008','Event Registration Welcome','EVENT','REGISTRATION_CREATED','{}','{"notify":"STUDENT","channel":"WHATSAPP","template":"EVENT_REMINDER"}'],
  ].forEach(([id,name,scope,trigger,cond,act]) => arIns.run(id, name, scope, trigger, cond, act, ago(rand(20,90))));
} catch(e) { console.error('automation_rules seed error:', e.message); }

// Message templates
try {
  const mtIns = db.prepare(`INSERT OR IGNORE INTO message_templates (id,name,channel,category,language,variables_json,body,is_active,created_at) VALUES (?,?,?,?,?,?,?,1,?)`);
  [
    ['MT-001','SLA_BREACH_ALERT','WHATSAPP','UTILITY','en','["student_name","bank_name","sla_days"]','Dear {{staff_name}}, application for {{student_name}} with {{bank_name}} has exceeded SLA by {{sla_days}} days. Immediate action required.'],
    ['MT-002','SANCTION_ALERT','WHATSAPP','MARKETING','en','["student_name","bank_name","amount","roi"]','Congratulations {{student_name}}! {{bank_name}} has sanctioned your education loan of Rs {{amount}} at {{roi}}% p.a. Please review and accept.'],
    ['MT-003','QUERY_REMINDER','WHATSAPP','UTILITY','en','["student_name","query_text","due_date"]','Hi {{student_name}}, your bank has raised a query: "{{query_text}}". Please respond by {{due_date}} to avoid delays.'],
    ['MT-004','DOC_REQUEST','EMAIL','UTILITY','en','["student_name","doc_list"]','Dear {{student_name}}, your loan application requires the following documents: {{doc_list}}. Please upload at the earliest.'],
    ['MT-005','EVENT_REMINDER','WHATSAPP','MARKETING','en','["name","event_title","date","venue"]','Hi {{name}}! Reminder: You are registered for {{event_title}} on {{date}} at {{venue}}. We look forward to seeing you!'],
    ['MT-006','LEAD_FOLLOWUP','WHATSAPP','UTILITY','en','["staff_name","lead_name"]','Hi {{staff_name}}, lead {{lead_name}} has been in CONNECTED stage for 3+ days without progress. Please follow up.'],
    ['MT-007','DISBURSE_FOLLOWUP','EMAIL','UTILITY','en','["student_name","bank_name"]','Dear team, {{student_name}}\'s disbursement with {{bank_name}} is pending. Please initiate disbursement process.'],
  ].forEach(([id,name,ch,cat,lang,vars,body]) => mtIns.run(id, name, ch, cat, lang, vars, body, ago(rand(20,90))));
} catch(e) { console.error('message_templates seed error:', e.message); }

// Feature flags
try {
  const ffIns = db.prepare(`INSERT OR IGNORE INTO feature_flags (key,label,description,enabled,updated_by,updated_at) VALUES (?,?,?,?,?,?)`);
  [
    ['WHATSAPP_NOTIFICATIONS','WhatsApp Notifications','Send automated WhatsApp messages to students and staff',1],
    ['EMAIL_NOTIFICATIONS','Email Notifications','Send automated email notifications for all events',1],
    ['AUTO_LEAD_ASSIGN','Auto Lead Assignment','Automatically assign new leads using round-robin',1],
    ['META_WEBHOOK','Meta Lead Webhook','Accept and process leads from Meta/Facebook ad forms',1],
    ['EVENT_MODULE','Events Module','Enable the events and exhibition management module',1],
    ['AGENT_PORTAL','Agent/B2B Portal','Enable the B2B agent partner portal',1],
    ['BANK_EXTERNAL_API','Bank External API','Allow banks to connect via external API keys',1],
    ['STUDENT_PORTAL','Student Portal','Enable the student self-service portal',0],
    ['AI_INTENT_SCORING','AI Intent Scoring','Use AI model to auto-score lead intent on creation',0],
    ['BULK_IMPORT','Bulk CSV Import','Allow bulk lead import via CSV upload',1],
  ].forEach(([key,label,desc,enabled]) => ffIns.run(key, label, desc, enabled, 'admin@nexthara.com', ago(rand(1,30))));
} catch(e) {}

// System incidents
try {
  db.pragma('foreign_keys = OFF');
  db.exec("DELETE FROM system_incidents;");
  db.pragma('foreign_keys = ON');
  const siIns = db.prepare(`INSERT INTO system_incidents (id,title,severity,description,status,resolved_by,resolved_at,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  [
    ['INC-001','WhatsApp delivery failure — 47 messages not delivered','HIGH','Meta API returned 400 errors from 14:00–15:30 IST. Retries failed. Root cause: API rate limit.','RESOLVED','Ravi Menon',ago(2),ago(3)],
    ['INC-002','Slow dashboard load (>8s) during peak hours','MEDIUM','Dashboard queries timing out due to missing index on status_history table.','RESOLVED','Amit Kumar',ago(5),ago(7)],
    ['INC-003','Bank external API — HDFC webhook failures','HIGH','HDFC reported 503 errors on our external API endpoint for 2 hours.','INVESTIGATING',null,null,ago(1)],
    ['INC-004','Meta lead webhook not processing','MEDIUM','New Meta leads not being created due to missing required field validation change.','OPEN',null,null,agoH(6)],
  ].forEach(([id,title,sev,desc,status,res_by,res_at,cr]) => siIns.run(id, title, sev, desc, status, res_by, res_at, cr));
} catch(e) {}

// Admin audit log
try {
  const aalIns = db.prepare(`INSERT INTO admin_audit_log (actor_id,actor_name,actor_role,action,entity_type,entity_id,new_value,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  [
    ['admin@nexthara.com','Super Admin','super_admin','BANK_CREATED','bank','BANK-SBI','State Bank of India',ago(90)],
    ['admin@nexthara.com','Super Admin','super_admin','BANK_CREATED','bank','BANK-HDFC','HDFC Credila',ago(88)],
    ['admin@nexthara.com','Super Admin','super_admin','FEATURE_FLAG_TOGGLE','feature_flag','AGENT_PORTAL','true',ago(30)],
    ['admin@nexthara.com','Super Admin','super_admin','REASSIGN','CASE',APP_IDS[0],'{"new_owner":"Priya Shah"}',ago(10)],
    ['admin@nexthara.com','Super Admin','super_admin','TRIGGER_REMINDER','CASE',APP_IDS[1],null,ago(5)],
    ['admin@nexthara.com','Super Admin','super_admin','FLAG_ESCALATE','CASE',APP_IDS[2],null,ago(3)],
    ['admin@nexthara.com','Super Admin','super_admin','FEATURE_FLAG_TOGGLE','feature_flag','STUDENT_PORTAL','false',ago(2)],
  ].forEach(([aid,an,ar,act,et,eid,nv,cr]) => aalIns.run(aid, an, ar, act, et, eid, nv, cr));
} catch(e) {}

// Report subscriptions
try {
  const rsIns = db.prepare(`INSERT OR IGNORE INTO report_subscriptions (id,report_type,user_id,schedule,filters,is_active,created_at) VALUES (?,?,?,?,?,1,?)`);
  [
    ['RS-001','LEADS',   'admin@nexthara.com','DAILY',  '{}'],
    ['RS-002','CASES',   'admin@nexthara.com','WEEKLY', '{}'],
    ['RS-003','BANKS',   'admin@nexthara.com','MONTHLY','{}'],
    ['RS-004','STAFF',   'admin@nexthara.com','WEEKLY', '{}'],
    ['RS-005','CAMPAIGNS','admin@nexthara.com','MONTHLY','{}'],
  ].forEach(([id,rt,uid_,sched,filt]) => rsIns.run(id, rt, uid_, sched, filt, ago(rand(10,60))));
} catch(e) {}

// Report runs
try {
  const rrIns = db.prepare(`INSERT OR IGNORE INTO report_runs (id,report_type,status,result_url,created_by,started_at,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  [
    ['RR-001','LEADS','COMPLETED','https://cdn.nexthara.com/reports/leads-daily-20260220.pdf',ago(1),ago(1),ago(1)],
    ['RR-002','CASES','COMPLETED','https://cdn.nexthara.com/reports/cases-weekly-20260217.xlsx',ago(4),ago(4),ago(4)],
    ['RR-003','BANKS','COMPLETED','https://cdn.nexthara.com/reports/banks-monthly-20260201.pdf',ago(21),ago(21),ago(21)],
    ['RR-004','LEADS','COMPLETED','https://cdn.nexthara.com/reports/leads-daily-20260219.pdf',ago(2),ago(2),ago(2)],
  ].forEach(([id,rt,status,url,st,ct,cr]) => rrIns.run(id, rt, status, url, 'admin@nexthara.com', st, ct, cr));
} catch(e) {}

// Ad spend daily
try {
  const adIns = db.prepare(`INSERT OR IGNORE INTO ad_spend_daily (date,platform,campaign_id,campaign_name,spend_paise,impressions,clicks,leads_count,cases_count) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (let d = 0; d < 14; d++) {
    ['META','GOOGLE'].forEach(platform => {
      adIns.run(ago(d).slice(0,10), platform, `CAM-${platform.slice(0,3)}-001`, `${platform} Study Abroad Leads`, rand(5000,25000)*100, rand(5000,50000), rand(200,2000), rand(5,50), rand(0,5));
    });
  }
} catch(e) {}

console.log('  ✓ Universities, courses, countries, templates, feature flags, incidents, audit logs, report subs');

// ──────────────────────────────────────────────────────────────────────────────
// 11. STAGE MASTER (if not already seeded by db.js)
// ──────────────────────────────────────────────────────────────────────────────
try {
  const smIns = db.prepare(`INSERT OR IGNORE INTO stage_master (id,scope,stage_key,label,sort_order,is_active,allowed_transitions) VALUES (?,?,?,?,?,1,?)`);
  [
    ['SM-L01','LEAD','NEW','New Lead',1,'["CONTACT_ATTEMPTED","DROPPED"]'],
    ['SM-L02','LEAD','CONTACT_ATTEMPTED','Contact Attempted',2,'["CONNECTED","DROPPED","LOST"]'],
    ['SM-L03','LEAD','CONNECTED','Connected',3,'["QUALIFIED","DROPPED"]'],
    ['SM-L04','LEAD','QUALIFIED','Qualified',4,'["DOCS_REQUESTED","DROPPED"]'],
    ['SM-L05','LEAD','DOCS_REQUESTED','Docs Requested',5,'["DOCS_RECEIVED","DROPPED"]'],
    ['SM-L06','LEAD','DOCS_RECEIVED','Docs Received',6,'["CASE_CREATED","DROPPED"]'],
    ['SM-L07','LEAD','CASE_CREATED','Case Created',7,'[]'],
    ['SM-L08','LEAD','DROPPED','Dropped',8,'[]'],
    ['SM-L09','LEAD','LOST','Lost',9,'[]'],
    ['SM-C01','CASE','NOT_CONNECTED','Not Connected',1,'["LOGIN_SUBMITTED","DROPPED"]'],
    ['SM-C02','CASE','LOGIN_SUBMITTED','Login Submitted',2,'["DOCS_PENDING","UNDER_REVIEW"]'],
    ['SM-C03','CASE','DOCS_PENDING','Docs Pending',3,'["UNDER_REVIEW","LOGIN_SUBMITTED"]'],
    ['SM-C04','CASE','UNDER_REVIEW','Under Review',4,'["QUERY_RAISED","SANCTIONED","REJECTED"]'],
    ['SM-C05','CASE','QUERY_RAISED','Query Raised',5,'["UNDER_REVIEW"]'],
    ['SM-C06','CASE','SANCTIONED','Sanctioned',6,'["SANCTION_ACCEPTED","CONDITIONAL_SANCTION"]'],
    ['SM-C07','CASE','SANCTION_ACCEPTED','Sanction Accepted',7,'["AGREEMENT_SIGNED"]'],
    ['SM-C08','CASE','AGREEMENT_SIGNED','Agreement Signed',8,'["DISBURSEMENT_PENDING"]'],
    ['SM-C09','CASE','DISBURSEMENT_PENDING','Disbursement Pending',9,'["DISBURSED"]'],
    ['SM-C10','CASE','DISBURSED','Disbursed',10,'[]'],
    ['SM-C11','CASE','REJECTED','Rejected',11,'[]'],
    ['SM-C12','CASE','CLOSED','Closed',12,'[]'],
    ['SM-B01','BANK_APP','INITIATED','Initiated',1,'["DOCS_PENDING","UNDER_REVIEW"]'],
    ['SM-B02','BANK_APP','DOCS_PENDING','Docs Pending',2,'["UNDER_REVIEW"]'],
    ['SM-B03','BANK_APP','UNDER_REVIEW','Under Review',3,'["SANCTIONED","REJECTED"]'],
    ['SM-B04','BANK_APP','SANCTIONED','Sanctioned',4,'["DISBURSED","REJECTED"]'],
    ['SM-B05','BANK_APP','DISBURSED','Disbursed',5,'[]'],
    ['SM-B06','BANK_APP','REJECTED','Rejected',6,'[]'],
    ['SM-B07','BANK_APP','CLOSED','Closed',7,'[]'],
  ].forEach(([id,scope,key,label,order,trans]) => smIns.run(id, scope, key, label, order, trans));
} catch(e) {}

// ──────────────────────────────────────────────────────────────────────────────
// 12. STAGE EXPECTATIONS
// ──────────────────────────────────────────────────────────────────────────────
try {
  const seIns = db.prepare(`INSERT OR IGNORE INTO stage_expectations (id,main_status,expected_min_days,expected_max_days,student_text,staff_text,is_active) VALUES (?,?,?,?,?,?,1)`);
  [
    ['SE-001','UNDER_REVIEW',3,7,'Your application is currently under review with the bank. This typically takes 3–7 working days. We will notify you of any update.','Check bank portal daily. If no update in 5 days, escalate via ping.'],
    ['SE-002','DOCS_PENDING',1,3,'Please upload the requested documents within 3 days to avoid delays in processing.','Chase student daily via WhatsApp. Escalate if no response in 3 days.'],
    ['SE-003','SANCTIONED',2,5,'Congratulations! Your loan has been sanctioned. Please review the sanction letter and accept within 5 days.','Ensure student reviews and accepts. Send sanction acceptance link immediately.'],
    ['SE-004','QUERY_RAISED',1,2,'The bank has raised a query. Please respond within 48 hours to avoid processing delays.','Coordinate with student urgently. Query response must go to bank within 48 hours.'],
    ['SE-005','AGREEMENT_SIGNED',3,7,'Your loan agreement has been signed. Disbursement is now being processed. Expected within 5–7 working days.','Track disbursement daily with bank. Initiate fee payment coordination with university.'],
    ['SE-006','DISBURSEMENT_PENDING',2,5,'Your loan disbursement is pending. Funds will be transferred to your university within 2–5 working days.','Confirm university fee payment deadline. Coordinate with bank operations team.'],
    ['SE-007','LOGIN_SUBMITTED',2,5,'Your application has been submitted to the bank. Initial review takes 2–5 working days.','Check for early rejection signals. If no update in 5 days, contact bank RM.'],
    ['SE-008','CONDITIONAL_SANCTION',3,7,'The bank has given a conditional sanction. Please review the conditions and take the required action within 7 days.','Explain conditions to student clearly. Help arrange additional collateral or co-applicant if needed.'],
  ].forEach(([id,status,min,max,st,stf]) => seIns.run(id, status, min, max, st, stf));
} catch(e) {}

console.log('  ✓ Stage master + stage expectations');

// ──────────────────────────────────────────────────────────────────────────────
// DONE
// ──────────────────────────────────────────────────────────────────────────────
console.log('\n✅ Comprehensive seed complete!\n');
console.log('─────────────────────────────────────────────────');
console.log('LOGIN CREDENTIALS:');
console.log('');
console.log('  🔷 Super Admin    admin@nexthara.com     / admin123');
console.log('  🔷 Staff (Amit)   amit@nexthara.com      / staff123');
console.log('  🔷 Staff (Priya)  priya@nexthara.com     / staff123');
console.log('');
console.log('  🟢 Bank Admin (SBI)    arun@sbi.co.in          / Nexthara@123');
console.log('  🟢 Bank Admin (HDFC)   nita@hdfccredila.com     / Nexthara@123');
console.log('  🟢 Bank Admin (ICICI)  pradeep@icicibank.com    / Nexthara@123');
console.log('  🟢 Bank Officer (SBI)  meena@sbi.co.in          / Nexthara@123');
console.log('');
console.log('  🟡 Agent Admin    deepak@eduloan.com     / agent123');
console.log('  🟡 Agent Officer  sonia@eduloan.com      / agent123');
console.log('  🟡 Agent Admin    kavitha@globalstudy.com/ agent123');
console.log('─────────────────────────────────────────────────');
