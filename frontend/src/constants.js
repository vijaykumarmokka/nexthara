// Close reason codes (bank application closure)
export const CLOSE_REASON_CODES = [
  'DUPLICATE_LOGIN_OTHER_SOURCE',
  'POLICY_MISMATCH',
  'LOW_CIBIL',
  'HIGH_FOIR',
  'INCOME_INSUFFICIENT',
  'COURSE_NOT_ELIGIBLE',
  'COUNTRY_NOT_SUPPORTED',
  'DOCUMENTS_INSUFFICIENT',
  'EMPLOYER_NOT_ACCEPTABLE',
  'FRAUD_RISK',
  'STUDENT_DROPPED',
  'STUDENT_CHOSE_OTHER_LENDER',
  'TIMEOUT_EXPIRED',
  'OTHER',
];

// Document checklist grouped by category
export const DOC_CHECKLIST = {
  'Admission': ['Offer Letter', 'Admission Letter', 'University Invoice / Fee Structure'],
  'Student KYC': ['Passport (Student)', 'Aadhar Card', 'PAN Card', '10th Certificate', '12th Certificate', 'Graduation / Degree Certificate'],
  'Co-applicant': ['Passport / Aadhar (Co-applicant)', 'PAN (Co-applicant)', 'Income Proof (Co-applicant)', 'Relationship Proof'],
  'Financial': ['ITR (2 years)', 'Bank Statement (6 months)', 'Salary Slips (3 months)', 'Form 16'],
  'Collateral': ['Property Papers', 'Property Valuation Report', 'Property Insurance'],
  'Other': ['CIBIL Report', 'Employment Letter', 'Gap Certificate', 'Visa Copy'],
};

export const STATUS_CONFIG = {
  NOT_CONNECTED:           { label: 'Not Connected',         stage: 1, stageLabel: 'Pre-Login',        color: 'grey',   awaiting: 'Nexthara' },
  CONTACTED:               { label: 'Contacted',             stage: 1, stageLabel: 'Pre-Login',        color: 'grey',   awaiting: 'Bank' },
  YET_TO_CONNECT:          { label: 'Yet to Connect',        stage: 1, stageLabel: 'Pre-Login',        color: 'grey',   awaiting: 'Bank' },
  LOGIN_SUBMITTED:         { label: 'Login Submitted',       stage: 2, stageLabel: 'Login Stage',      color: 'blue',   awaiting: 'Bank' },
  LOGIN_IN_PROGRESS:       { label: 'Login In Progress',     stage: 2, stageLabel: 'Login Stage',      color: 'grey',   awaiting: 'Bank' },
  LOGIN_REJECTED:          { label: 'Login Rejected',        stage: 2, stageLabel: 'Login Stage',      color: 'red',    awaiting: 'Nexthara' },
  DUPLICATE_LOGIN:         { label: 'Duplicate Login',       stage: 2, stageLabel: 'Login Stage',      color: 'amber',  awaiting: 'Nexthara' },
  DOCS_PENDING:            { label: 'Docs Pending',          stage: 3, stageLabel: 'Doc Verification', color: 'amber',  awaiting: 'Student' },
  DOCS_SUBMITTED:          { label: 'Docs Submitted',        stage: 3, stageLabel: 'Doc Verification', color: 'blue',   awaiting: 'Bank' },
  DOCS_VERIFICATION:       { label: 'Docs Verification',     stage: 3, stageLabel: 'Doc Verification', color: 'blue',   awaiting: 'Bank' },
  UNDER_REVIEW:            { label: 'Under Review',          stage: 4, stageLabel: 'Credit Review',    color: 'blue',   awaiting: 'Bank' },
  CREDIT_CHECK_IN_PROGRESS:{ label: 'Credit Check',          stage: 4, stageLabel: 'Credit Review',    color: 'blue',   awaiting: 'Bank' },
  FIELD_VERIFICATION:      { label: 'Field Verification',    stage: 4, stageLabel: 'Credit Review',    color: 'blue',   awaiting: 'Bank' },
  QUERY_RAISED:            { label: 'Query Raised',          stage: 4, stageLabel: 'Credit Review',    color: 'amber',  awaiting: 'Student' },
  SANCTIONED:              { label: 'Sanctioned',            stage: 5, stageLabel: 'Decision',         color: 'green',  awaiting: 'Student' },
  CONDITIONAL_SANCTION:    { label: 'Conditional Sanction',  stage: 5, stageLabel: 'Decision',         color: 'amber',  awaiting: 'Student' },
  REJECTED:                { label: 'Rejected',              stage: 5, stageLabel: 'Decision',         color: 'red',    awaiting: 'Nexthara' },
  SANCTION_ACCEPTED:       { label: 'Sanction Accepted',     stage: 6, stageLabel: 'Post Sanction',    color: 'green',  awaiting: 'Bank' },
  AGREEMENT_SIGNED:        { label: 'Agreement Signed',      stage: 6, stageLabel: 'Post Sanction',    color: 'green',  awaiting: 'Bank' },
  DISBURSEMENT_PENDING:    { label: 'Disbursement Pending',  stage: 6, stageLabel: 'Post Sanction',    color: 'amber',  awaiting: 'Bank' },
  DISBURSED:               { label: 'Disbursed',             stage: 6, stageLabel: 'Post Sanction',    color: 'green',  awaiting: 'Closed' },
  CLOSED:                  { label: 'Closed',                stage: 7, stageLabel: 'Closed',           color: 'green',  awaiting: 'Closed' },
  DROPPED:                 { label: 'Dropped',               stage: 7, stageLabel: 'Closed',           color: 'grey',   awaiting: 'Closed' },
  EXPIRED:                 { label: 'Expired',               stage: 7, stageLabel: 'Closed',           color: 'red',    awaiting: 'Closed' },
};

export const SUB_STATUS_MAP = {
  DOCS_PENDING: ['ITR (2 years)', 'Bank Statement (6 months)', 'Salary Slips', 'Passport Copy', 'Offer Letter', 'CIBIL Report', 'Collateral Documents'],
  LOGIN_REJECTED: ['Country not supported', 'Course not eligible', 'Income below threshold', 'Policy mismatch'],
  QUERY_RAISED: ['Income clarification', 'Co-applicant relation proof', 'Property valuation mismatch', 'Employment proof needed'],
  REJECTED: ['Low FOIR', 'Low CIBIL', 'Incomplete documentation', 'Employer not acceptable', 'Course risk', 'Bank internal policy'],
  CONDITIONAL_SANCTION: ['Additional collateral needed', 'Co-applicant required', 'Higher margin deposit'],
  DROPPED: ['Student not responding', 'Intake deferred', 'Visa rejected', 'Admission cancelled', 'Student self-funded', 'Student chose other bank'],
};

// Per-status SLA thresholds (in days). 70% = risk zone.
export const SLA_THRESHOLD_BY_STATUS = {
  NOT_CONNECTED: 2, CONTACTED: 2, YET_TO_CONNECT: 2,
  LOGIN_SUBMITTED: 3, LOGIN_IN_PROGRESS: 3, LOGIN_REJECTED: 3, DUPLICATE_LOGIN: 3,
  DOCS_PENDING: 4, DOCS_SUBMITTED: 4, DOCS_VERIFICATION: 4,
  UNDER_REVIEW: 7, CREDIT_CHECK_IN_PROGRESS: 7, FIELD_VERIFICATION: 7, QUERY_RAISED: 5,
  SANCTIONED: 2, CONDITIONAL_SANCTION: 2, REJECTED: 2,
  SANCTION_ACCEPTED: 5, AGREEMENT_SIGNED: 5, DISBURSEMENT_PENDING: 7, DISBURSED: 7,
  CLOSED: null, DROPPED: null, EXPIRED: null,
};

export const BANKS = ['SBI', 'HDFC', 'ICICI', 'Axis Bank', 'PNB', 'Bank of Baroda', 'Canara Bank', 'Union Bank', 'IDFC First', 'Kotak', 'Prodigy Finance', 'MPOWER', 'Credila', 'Avanse', 'InCred'];

export const BANK_COLORS = { SBI:'#1a237e', HDFC:'#004c8c', ICICI:'#f57c00', 'Axis Bank':'#97144d', PNB:'#1565c0', 'Bank of Baroda':'#e65100', 'Canara Bank':'#1b5e20', 'Union Bank':'#283593', 'IDFC First':'#c62828', Kotak:'#e53935', 'Prodigy Finance':'#00695c', MPOWER:'#4527a0', Credila:'#0d47a1', Avanse:'#1565c0', InCred:'#2e7d32' };

export const PIPELINE_STAGES = [
  { num: 1, label: 'Pre-Login',        color: 'grey' },
  { num: 2, label: 'Login Stage',      color: 'yellow' },
  { num: 3, label: 'Doc Verification', color: 'orange' },
  { num: 4, label: 'Credit Review',    color: 'pink' },
  { num: 5, label: 'Decision',         color: 'green' },
  { num: 6, label: 'Post Sanction',    color: 'blue' },
  { num: 7, label: 'Closed',           color: 'dark' },
];

export function formatCurrency(amount) {
  if (!amount) return '-';
  return '\u20B9' + Number(amount).toLocaleString('en-IN');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
