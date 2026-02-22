import db from './db.js';

// Clear existing leads (for fresh seed)
db.exec(`DELETE FROM lead_to_case_mapping; DELETE FROM lead_followups; DELETE FROM lead_calls; DELETE FROM lead_notes; DELETE FROM lead_qualification; DELETE FROM leads;`);

const staffs = db.prepare("SELECT id, name FROM users WHERE role = 'super_admin' LIMIT 3").all();
const staffId = staffs[0]?.id || 1;
const staff2  = staffs[1]?.id || staffId;
const staff3  = staffs[2]?.id || staffId;

const leadsData = [
  { id:'LEAD-001', full_name:'Varun Kumar',     phone_e164:'+918848087657', email:'varun@email.com',     city:'Kozhikode',  source:'META',    campaign_name:'UK-Feb-Camp1', country:'UK',        course:'MSc Data Science',       loan_amount_paise:2500000000, stage:'CONNECTED',      priority:'HIGH',   assigned_staff_id: staffId,  next_followup_at: new Date(Date.now() + 2*60*60*1000).toISOString() },
  { id:'LEAD-002', full_name:'Priya Sharma',    phone_e164:'+919876543210', email:'priya@email.com',     city:'Mumbai',     source:'GOOGLE',  campaign_name:'Canada-Jan',   country:'Canada',    course:'MBA Finance',            loan_amount_paise:3500000000, stage:'QUALIFIED',      priority:'HIGH',   assigned_staff_id: staff2,   next_followup_at: new Date(Date.now() - 1*60*60*1000).toISOString() },
  { id:'LEAD-003', full_name:'Arjun Mehta',     phone_e164:'+918765432101', email:'arjun@email.com',     city:'Pune',       source:'META',    campaign_name:'UK-Feb-Camp1', country:'UK',        course:'MSc Computer Science',   loan_amount_paise:2000000000, stage:'NEW',            priority:'NORMAL', assigned_staff_id: null,     next_followup_at: null },
  { id:'LEAD-004', full_name:'Divya Nair',      phone_e164:'+917654321012', email:'divya@email.com',     city:'Kochi',      source:'WEBSITE', campaign_name:null,           country:'Australia', course:'BEng Civil Engineering', loan_amount_paise:1800000000, stage:'CONTACT_ATTEMPTED', priority:'NORMAL', assigned_staff_id: staff3, next_followup_at: new Date(Date.now() - 45*60*1000).toISOString() },
  { id:'LEAD-005', full_name:'Rahul Singh',     phone_e164:'+916543210123', email:'rahul@email.com',     city:'Delhi',      source:'REFERRAL',campaign_name:null,           country:'USA',       course:'MS Computer Science',    loan_amount_paise:4000000000, stage:'DOCS_REQUESTED', priority:'URGENT', assigned_staff_id: staffId,  next_followup_at: new Date(Date.now() + 24*60*60*1000).toISOString() },
  { id:'LEAD-006', full_name:'Sneha Patel',     phone_e164:'+915432101234', email:'sneha@email.com',     city:'Ahmedabad',  source:'META',    campaign_name:'UK-Feb-Camp1', country:'UK',        course:'MSc Finance',            loan_amount_paise:2200000000, stage:'DOCS_RECEIVED',  priority:'HIGH',   assigned_staff_id: staff2,   next_followup_at: null },
  { id:'LEAD-007', full_name:'Kiran Reddy',     phone_e164:'+914321012345', email:'kiran@email.com',     city:'Hyderabad',  source:'GOOGLE',  campaign_name:'IE-Camp1',     country:'Ireland',   course:'MSc Business Analytics', loan_amount_paise:2800000000, stage:'CASE_CREATED',   priority:'HIGH',   assigned_staff_id: staff3,   next_followup_at: null },
  { id:'LEAD-008', full_name:'Ananya Joshi',    phone_e164:'+913210123456', email:'ananya@email.com',    city:'Bangalore',  source:'META',    campaign_name:'Germany-Camp', country:'Germany',   course:'MSc Engineering',        loan_amount_paise:1500000000, stage:'DROPPED',        priority:'NORMAL', assigned_staff_id: staffId,  next_followup_at: null },
  { id:'LEAD-009', full_name:'Rohan Verma',     phone_e164:'+912109876543', email:'rohan@email.com',     city:'Chennai',    source:'WEBSITE', campaign_name:null,           country:'Canada',    course:'MBA Marketing',          loan_amount_paise:3200000000, stage:'NEW',            priority:'HIGH',   assigned_staff_id: staff2,   next_followup_at: null },
  { id:'LEAD-010', full_name:'Meera Krishnan',  phone_e164:'+911098765432', email:'meera@email.com',     city:'Trivandrum', source:'META',    campaign_name:'UK-Feb-Camp1', country:'UK',        course:'MSc Psychology',         loan_amount_paise:2100000000, stage:'CONNECTED',      priority:'NORMAL', assigned_staff_id: staff3,   next_followup_at: new Date(Date.now() + 3*60*60*1000).toISOString() },
  { id:'LEAD-011', full_name:'Amit Gupta',      phone_e164:'+910987654321', email:'amit@email.com',      city:'Jaipur',     source:'GOOGLE',  campaign_name:'USA-Camp1',    country:'USA',       course:'MS Electrical Eng',      loan_amount_paise:3800000000, stage:'QUALIFIED',      priority:'URGENT', assigned_staff_id: staffId,  next_followup_at: new Date(Date.now() - 2*60*60*1000).toISOString() },
  { id:'LEAD-012', full_name:'Lakshmi Iyer',    phone_e164:'+919988776655', email:'lakshmi@email.com',   city:'Chennai',    source:'REFERRAL',campaign_name:null,           country:'Australia', course:'BBA',                    loan_amount_paise:1200000000, stage:'NEW',            priority:'NORMAL', assigned_staff_id: null,     next_followup_at: null },
];

const now = new Date().toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();

const insertLead = db.prepare(`
  INSERT INTO leads (id, full_name, phone_e164, email, city, source, campaign_name, country, course, loan_amount_paise, stage, priority, assigned_staff_id, next_followup_at, last_activity_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const l of leadsData) {
  insertLead.run(l.id, l.full_name, l.phone_e164, l.email, l.city, l.source, l.campaign_name || null, l.country, l.course, l.loan_amount_paise, l.stage, l.priority, l.assigned_staff_id || null, l.next_followup_at || null, l.stage !== 'NEW' ? yesterday : null, yesterday, now);
}

// Add qualification for QUALIFIED+ leads
const qualInsert = db.prepare(`INSERT INTO lead_qualification (id, lead_id, admission_received, university, country, coapp_income_paise, collateral_available, cibil_known, visa_urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
qualInsert.run('QUAL-001', 'LEAD-002', 1, 'University of Toronto', 'Canada', 900000000, 0, 0, 'NORMAL');
qualInsert.run('QUAL-002', 'LEAD-005', 1, 'MIT', 'USA', 1200000000, 1, 1, 'URGENT');
qualInsert.run('QUAL-003', 'LEAD-006', 1, 'University of Manchester', 'UK', 800000000, 0, 1, 'NORMAL');
qualInsert.run('QUAL-004', 'LEAD-007', 1, 'Trinity College Dublin', 'Ireland', 950000000, 0, 0, 'NORMAL');
qualInsert.run('QUAL-005', 'LEAD-011', 1, 'Purdue University', 'USA', 1100000000, 1, 1, 'URGENT');

// Add some notes / timeline
const noteInsert = db.prepare(`INSERT INTO lead_notes (id, lead_id, staff_id, staff_name, note_text) VALUES (?, ?, ?, ?, ?)`);
noteInsert.run('NOTE-001', 'LEAD-001', staffId, staffs[0]?.name || 'Admin', '[CREATED] Lead created');
noteInsert.run('NOTE-002', 'LEAD-001', staffId, staffs[0]?.name || 'Admin', '[CALL] Call CONNECTED (180s) — Connected, explained process');
noteInsert.run('NOTE-003', 'LEAD-001', staffId, staffs[0]?.name || 'Admin', '[STAGE_CHANGE] Stage changed from NEW to CONNECTED');
noteInsert.run('NOTE-004', 'LEAD-002', staff2, staffs[1]?.name || 'Admin', '[CREATED] Lead created');
noteInsert.run('NOTE-005', 'LEAD-002', staff2, staffs[1]?.name || 'Admin', '[QUALIFIED] Lead marked as QUALIFIED');
noteInsert.run('NOTE-006', 'LEAD-005', staffId, staffs[0]?.name || 'Admin', '[CREATED] Lead created from referral');
noteInsert.run('NOTE-007', 'LEAD-005', staffId, staffs[0]?.name || 'Admin', '[STAGE_CHANGE] Stage changed to DOCS_REQUESTED');

// Add followups
const fupInsert = db.prepare(`INSERT INTO lead_followups (id, lead_id, staff_id, type, scheduled_at, note, status) VALUES (?, ?, ?, ?, ?, ?, ?)`);
fupInsert.run('FUP-001', 'LEAD-001', staffId, 'CALL', new Date(Date.now() + 2*60*60*1000).toISOString(), 'Call back at 5 PM today', 'SCHEDULED');
fupInsert.run('FUP-002', 'LEAD-002', staff2, 'WHATSAPP', new Date(Date.now() - 1*60*60*1000).toISOString(), 'Send document checklist', 'SCHEDULED');
fupInsert.run('FUP-003', 'LEAD-010', staff3, 'CALL', new Date(Date.now() + 3*60*60*1000).toISOString(), 'Follow-up call', 'SCHEDULED');

// Create a case mapping for LEAD-007
const caseRows = db.prepare('SELECT id FROM applications LIMIT 1').get();
if (caseRows) {
  db.prepare(`INSERT OR IGNORE INTO lead_to_case_mapping (id, lead_id, case_id, converted_by_staff_id, converted_by_staff_name) VALUES (?, ?, ?, ?, ?)`).run('MAP-001', 'LEAD-007', caseRows.id, staffId, staffs[0]?.name || 'Admin');
}

console.log(`✅ Seeded ${leadsData.length} leads with qualification, notes, and follow-ups.`);
