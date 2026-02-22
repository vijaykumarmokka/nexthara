import db from './db.js';

const STATUS_CONFIG = {
  NOT_CONNECTED:           { stage: 1, awaiting: 'Nexthara' },
  CONTACTED:               { stage: 1, awaiting: 'Bank' },
  YET_TO_CONNECT:          { stage: 1, awaiting: 'Bank' },
  LOGIN_SUBMITTED:         { stage: 2, awaiting: 'Bank' },
  LOGIN_IN_PROGRESS:       { stage: 2, awaiting: 'Bank' },
  LOGIN_REJECTED:          { stage: 2, awaiting: 'Nexthara' },
  DUPLICATE_LOGIN:         { stage: 2, awaiting: 'Nexthara' },
  DOCS_PENDING:            { stage: 3, awaiting: 'Student' },
  DOCS_SUBMITTED:          { stage: 3, awaiting: 'Bank' },
  DOCS_VERIFICATION:       { stage: 3, awaiting: 'Bank' },
  UNDER_REVIEW:            { stage: 4, awaiting: 'Bank' },
  CREDIT_CHECK_IN_PROGRESS:{ stage: 4, awaiting: 'Bank' },
  FIELD_VERIFICATION:      { stage: 4, awaiting: 'Bank' },
  QUERY_RAISED:            { stage: 4, awaiting: 'Student' },
  SANCTIONED:              { stage: 5, awaiting: 'Student' },
  CONDITIONAL_SANCTION:    { stage: 5, awaiting: 'Student' },
  REJECTED:                { stage: 5, awaiting: 'Nexthara' },
  SANCTION_ACCEPTED:       { stage: 6, awaiting: 'Bank' },
  AGREEMENT_SIGNED:        { stage: 6, awaiting: 'Bank' },
  DISBURSEMENT_PENDING:    { stage: 6, awaiting: 'Bank' },
  DISBURSED:               { stage: 6, awaiting: 'Closed' },
  CLOSED:                  { stage: 7, awaiting: 'Closed' },
  DROPPED:                 { stage: 7, awaiting: 'Closed' },
  EXPIRED:                 { stage: 7, awaiting: 'Closed' },
};

const SUB_STATUS_MAP = {
  DOCS_PENDING: ['ITR (2 years)', 'Bank Statement (6 months)', 'Salary Slips', 'Passport Copy', 'Offer Letter', 'CIBIL Report', 'Collateral Documents'],
  LOGIN_REJECTED: ['Country not supported', 'Course not eligible', 'Income below threshold', 'Policy mismatch'],
  QUERY_RAISED: ['Income clarification', 'Co-applicant relation proof', 'Property valuation mismatch', 'Employment proof needed'],
  REJECTED: ['Low FOIR', 'Low CIBIL', 'Incomplete documentation', 'Employer not acceptable', 'Course risk', 'Bank internal policy'],
  CONDITIONAL_SANCTION: ['Additional collateral needed', 'Co-applicant required', 'Higher margin deposit'],
  DROPPED: ['Student not responding', 'Intake deferred', 'Visa rejected', 'Admission cancelled', 'Student self-funded', 'Student chose other bank'],
};

const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IDFC First', 'Kotak', 'Prodigy Finance', 'MPOWER', 'Credila', 'Avanse', 'InCred'];
const COURSES = ['MS Computer Science', 'MBA Finance', 'MS Data Science', 'MEng Mechanical', 'MS AI/ML', 'MBA General', 'MS Biotechnology', 'LLM International Law', 'MS Electrical Eng', 'PhD Physics'];
const UNIVERSITIES = ['MIT', 'Stanford', 'University of Toronto', 'UCL London', 'TU Munich', 'NUS Singapore', 'University of Melbourne', 'ETH Zurich', 'Columbia University', 'University of Oxford'];
const COUNTRIES = ['USA', 'UK', 'Canada', 'Germany', 'Australia', 'Singapore', 'Netherlands', 'Ireland', 'New Zealand', 'France'];
const INTAKES = ['Jan 2025', 'May 2025', 'Sep 2025', 'Jan 2026', 'May 2026', 'Sep 2026'];
const PHONES = ['9876543210','9812345678','9988776655','9123456789','9765432198','9654321987','9543219876','9432198765','9321987654','9219876543'];
const COLLATERALS = ['Yes', 'No', 'NA'];
const LOAN_TYPES = ['Secured', 'Unsecured', 'NA'];
const CLOSE_REASONS = ['Student withdrew', 'Visa rejected', 'Intake deferred', 'Moved to another bank', 'Admission cancelled', 'Internal policy', 'Loan not required'];
const STUDENTS = [
  { name: 'Rahul Sharma', email: 'rahul.s@email.com' },
  { name: 'Priya Patel', email: 'priya.p@email.com' },
  { name: 'Arjun Mehta', email: 'arjun.m@email.com' },
  { name: 'Sneha Reddy', email: 'sneha.r@email.com' },
  { name: 'Vikram Singh', email: 'vikram.s@email.com' },
  { name: 'Ananya Gupta', email: 'ananya.g@email.com' },
  { name: 'Rohit Jain', email: 'rohit.j@email.com' },
  { name: 'Kavya Nair', email: 'kavya.n@email.com' },
  { name: 'Aditya Verma', email: 'aditya.v@email.com' },
  { name: 'Meera Iyer', email: 'meera.i@email.com' },
  { name: 'Siddharth Das', email: 'sid.d@email.com' },
  { name: 'Pooja Bansal', email: 'pooja.b@email.com' },
  { name: 'Nikhil Kumar', email: 'nikhil.k@email.com' },
  { name: 'Shreya Chopra', email: 'shreya.c@email.com' },
  { name: 'Karthik Rao', email: 'karthik.r@email.com' },
  { name: 'Divya Agarwal', email: 'divya.a@email.com' },
  { name: 'Aman Tiwari', email: 'aman.t@email.com' },
  { name: 'Riya Saxena', email: 'riya.s@email.com' },
  { name: 'Varun Bhatt', email: 'varun.b@email.com' },
  { name: 'Nisha Pandey', email: 'nisha.p@email.com' },
  { name: 'Ishaan Malik', email: 'ishaan.m@email.com' },
  { name: 'Tanvi Desai', email: 'tanvi.d@email.com' },
  { name: 'Abhinav Roy', email: 'abhinav.r@email.com' },
  { name: 'Simran Kaur', email: 'simran.k@email.com' },
  { name: 'Deepak Mishra', email: 'deepak.m@email.com' },
  { name: 'Lakshmi Menon', email: 'lakshmi.m@email.com' },
  { name: 'Harish Gowda', email: 'harish.g@email.com' },
  { name: 'Sanya Joshi', email: 'sanya.j@email.com' },
  { name: 'Rajesh Pillai', email: 'rajesh.p@email.com' },
  { name: 'Ankita Sen', email: 'ankita.s@email.com' },
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgoISO(d) {
  return new Date(Date.now() - d * 86400000).toISOString().replace('T', ' ').slice(0, 19);
}

// Clear existing data
db.exec('DELETE FROM status_history');
db.exec('DELETE FROM applications');
db.exec('DELETE FROM documents');
db.exec('DELETE FROM co_applicants');

const insertApp = db.prepare(`
  INSERT INTO applications (
    id, student_name, student_email, student_phone, bank, university, course,
    country, intake, loan_amount_requested, collateral, loan_type,
    status, sub_status, awaiting_from, sla_days, priority,
    last_update_source, confidence_score, bank_application_ref,
    sanction_amount, roi, tenure, processing_fee, margin_percent,
    sanction_accepted_date, agreement_date, disbursement_request_date,
    disbursed_amount, disbursed_date, disbursement_mode,
    rejection_reason, relook_possible, close_reason, notes, created_at, updated_at
  ) VALUES (
    @id, @student_name, @student_email, @student_phone, @bank, @university, @course,
    @country, @intake, @loan_amount_requested, @collateral, @loan_type,
    @status, @sub_status, @awaiting_from, @sla_days, @priority,
    @last_update_source, @confidence_score, @bank_application_ref,
    @sanction_amount, @roi, @tenure, @processing_fee, @margin_percent,
    @sanction_accepted_date, @agreement_date, @disbursement_request_date,
    @disbursed_amount, @disbursed_date, @disbursement_mode,
    @rejection_reason, @relook_possible, @close_reason, @notes, @created_at, @updated_at
  )
`);

const insertHistory = db.prepare(`
  INSERT INTO status_history (application_id, status, sub_status, awaiting_from, changed_by, entry_type, notes, created_at)
  VALUES (@application_id, @status, @sub_status, @awaiting_from, @changed_by, @entry_type, @notes, @created_at)
`);

const insertDoc = db.prepare(`
  INSERT INTO documents (application_id, doc_name, doc_category, owner, status, uploaded_by, uploaded_at, created_at)
  VALUES (@application_id, @doc_name, @doc_category, @owner, @status, @uploaded_by, @uploaded_at, @created_at)
`);

const insertCoApplicant = db.prepare(`
  INSERT INTO co_applicants (application_id, name, relation, phone, email, income, employment_type)
  VALUES (@application_id, @name, @relation, @phone, @email, @income, @employment_type)
`);

const DOC_TEMPLATES = {
  'Admission Docs': ['Offer Letter / Admission Letter', 'I-20 / CAS Letter', 'Course Details / Brochure'],
  'Student KYC': ['Passport Copy', 'Aadhaar Card', 'PAN Card', 'Photograph'],
  'Financial Docs': ['ITR (2 years)', 'Bank Statement (6 months)', 'Salary Slips (3 months)', 'Form 16'],
  'Co-applicant Docs': ['Co-applicant KYC', 'Co-applicant Income Proof', 'Relationship Certificate'],
  'Other': ['Property Valuation Report', 'CIBIL Report', 'Employment Proof', 'Collateral Documents'],
};
const DOC_STATUSES = ['Missing', 'Missing', 'Received', 'Received', 'Verified', 'Invalid'];
const RELATIONS = ['Father', 'Mother', 'Spouse', 'Sibling', 'Guardian'];
const CO_NAMES = ['Suresh Kumar', 'Sunita Devi', 'Ramesh Patel', 'Kavitha Reddy', 'Mahesh Singh'];
const EMPLOYMENTS = ['Salaried', 'Self-Employed', 'Business Owner', 'Retired'];

const priorities = ['Normal', 'Normal', 'Normal', 'Normal', 'High', 'High', 'Urgent'];
const sources = ['Bank_WABA', 'Staff', 'Portal'];
const statuses = Object.keys(STATUS_CONFIG);

const insertAll = db.transaction(() => {
  for (let i = 0; i < 50; i++) {
    const status = pick(statuses);
    const config = STATUS_CONFIG[status];
    const student = STUDENTS[i % STUDENTS.length];
    const daysAgo = rand(0, 25);
    const slaDays = rand(0, 14);
    const subStatuses = SUB_STATUS_MAP[status];
    const subStatus = subStatuses ? pick(subStatuses) : '-';
    const hasSanction = ['SANCTIONED', 'CONDITIONAL_SANCTION', 'SANCTION_ACCEPTED', 'AGREEMENT_SIGNED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED'].includes(status);
    const hasDisbursed = ['DISBURSED', 'CLOSED'].includes(status);
    const isRejected = ['LOGIN_REJECTED', 'REJECTED'].includes(status);

    const id = `NX-2026-${String(1000 + i).padStart(4, '0')}`;

    const isClosed = ['CLOSED', 'DROPPED', 'EXPIRED', 'REJECTED', 'LOGIN_REJECTED'].includes(status);
    const hasSanctionAccepted = ['SANCTION_ACCEPTED', 'AGREEMENT_SIGNED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED'].includes(status);
    const hasAgreement = ['AGREEMENT_SIGNED', 'DISBURSEMENT_PENDING', 'DISBURSED', 'CLOSED'].includes(status);
    const hasDisbReq = ['DISBURSEMENT_PENDING', 'DISBURSED'].includes(status);
    const bank = pick(BANKS);

    insertApp.run({
      id,
      student_name: student.name,
      student_email: student.email,
      student_phone: PHONES[i % PHONES.length],
      bank,
      university: pick(UNIVERSITIES),
      course: pick(COURSES),
      country: pick(COUNTRIES),
      intake: pick(INTAKES),
      loan_amount_requested: rand(300000, 5000000),
      collateral: pick(COLLATERALS),
      loan_type: pick(LOAN_TYPES),
      status,
      sub_status: subStatus,
      awaiting_from: config.awaiting,
      sla_days: slaDays,
      priority: pick(priorities),
      last_update_source: pick(sources),
      confidence_score: status === 'SANCTIONED' ? rand(80, 99) : null,
      bank_application_ref: !['NOT_CONNECTED', 'CONTACTED', 'YET_TO_CONNECT'].includes(status) ? `BK${rand(100000, 999999)}` : null,
      sanction_amount: hasSanction ? rand(500000, 5000000) : null,
      roi: hasSanction ? (8.5 + Math.random() * 4).toFixed(2) : null,
      tenure: hasSanction ? pick([12, 24, 36, 48, 60]) : null,
      processing_fee: hasSanction ? (0.5 + Math.random() * 1.5).toFixed(2) : null,
      margin_percent: hasSanction ? rand(5, 25) : null,
      sanction_accepted_date: hasSanctionAccepted ? daysAgoISO(rand(5, 20)) : null,
      agreement_date: hasAgreement ? daysAgoISO(rand(3, 15)) : null,
      disbursement_request_date: hasDisbReq ? daysAgoISO(rand(1, 10)) : null,
      disbursed_amount: hasDisbursed ? rand(400000, 4500000) : null,
      disbursed_date: hasDisbursed ? daysAgoISO(rand(0, 10)) : null,
      disbursement_mode: hasDisbursed ? pick(['University', 'Student Account']) : null,
      rejection_reason: isRejected ? pick(SUB_STATUS_MAP[status] || ['Policy mismatch']) : null,
      relook_possible: isRejected ? pick(['Yes', 'No']) : null,
      close_reason: isClosed ? pick(CLOSE_REASONS) : null,
      notes: null,
      created_at: daysAgoISO(daysAgo + rand(5, 30)),
      updated_at: daysAgoISO(daysAgo),
    });

    // Add some timeline history
    const stagesSoFar = [];
    for (const [s, c] of Object.entries(STATUS_CONFIG)) {
      if (c.stage <= config.stage) stagesSoFar.push(s);
    }
    const historyItems = stagesSoFar.filter(() => Math.random() > 0.4);
    if (!historyItems.includes(status)) historyItems.push(status);

    historyItems.forEach((s, idx) => {
      insertHistory.run({
        application_id: id,
        status: s,
        sub_status: SUB_STATUS_MAP[s] ? pick(SUB_STATUS_MAP[s]) : '-',
        awaiting_from: STATUS_CONFIG[s].awaiting,
        changed_by: pick(['System', 'Amit Kumar', 'Priya Shah', 'Bank WABA']),
        entry_type: 'status',
        notes: s === status ? 'Current status' : 'Status completed',
        created_at: daysAgoISO(daysAgo + (historyItems.length - idx) * 2),
      });
    });

    // Seed some documents for this application
    for (const [category, docs] of Object.entries(DOC_TEMPLATES)) {
      const numDocs = rand(1, docs.length);
      for (let d = 0; d < numDocs; d++) {
        const docStatus = pick(DOC_STATUSES);
        insertDoc.run({
          application_id: id,
          doc_name: docs[d],
          doc_category: category,
          owner: category === 'Student KYC' ? 'Student' : 'Student',
          status: docStatus,
          uploaded_by: ['Received', 'Verified'].includes(docStatus) ? pick(['System', 'Priya Shah', 'Bank Portal']) : null,
          uploaded_at: ['Received', 'Verified'].includes(docStatus) ? daysAgoISO(rand(1, 15)) : null,
          created_at: daysAgoISO(daysAgo + rand(1, 5)),
        });
      }
    }

    // Seed a co-applicant for ~60% of applications
    if (Math.random() > 0.4) {
      insertCoApplicant.run({
        application_id: id,
        name: pick(CO_NAMES),
        relation: pick(RELATIONS),
        phone: PHONES[(i + 5) % PHONES.length],
        email: `co.${student.email}`,
        income: rand(400000, 2000000),
        employment_type: pick(EMPLOYMENTS),
      });
    }
  }
});

insertAll();
console.log('Seeded 50 applications with history, documents, and co-applicants into nexthara.db');
