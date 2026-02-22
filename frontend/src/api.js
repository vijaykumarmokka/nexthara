const BASE = '/api/applications';

function getToken() {
  return localStorage.getItem('nexthara_token');
}

function handleUnauthorized() {
  localStorage.removeItem('nexthara_token');
  window.dispatchEvent(new Event('nexthara_logout'));
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers, ...options });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getApplications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`${BASE}?${qs}`);
  },
  getStats() {
    return request(`${BASE}/stats`);
  },
  getPipeline() {
    return request(`${BASE}/pipeline`);
  },
  getSidebarCounts() {
    return request(`${BASE}/sidebar-counts`);
  },
  getApplication(id) {
    return request(`${BASE}/${id}`);
  },
  createApplication(data) {
    return request(BASE, { method: 'POST', body: JSON.stringify(data) });
  },
  updateApplication(id, data) {
    return request(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteApplication(id) {
    return request(`${BASE}/${id}`, { method: 'DELETE' });
  },
};

export const authApi = {
  login(email, password) {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me() {
    return request('/api/auth/me');
  },
};

export const usersApi = {
  getUsers() {
    return request('/api/users');
  },
  createUser(data) {
    return request('/api/users', { method: 'POST', body: JSON.stringify(data) });
  },
  updateUser(id, data) {
    return request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteUser(id) {
    return request(`/api/users/${id}`, { method: 'DELETE' });
  },
};

export const documentsApi = {
  getDocuments(appId) {
    return request(`${BASE}/${appId}/documents`);
  },
  addDocument(appId, data) {
    return request(`${BASE}/${appId}/documents`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateDocument(appId, docId, data) {
    return request(`${BASE}/${appId}/documents/${docId}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteDocument(appId, docId) {
    return request(`${BASE}/${appId}/documents/${docId}`, { method: 'DELETE' });
  },
  // Multipart file upload
  async uploadFile(appId, file, meta = {}) {
    const token = getToken();
    const form = new FormData();
    form.append('file', file);
    if (meta.doc_name)    form.append('doc_name', meta.doc_name);
    if (meta.doc_category) form.append('doc_category', meta.doc_category);
    if (meta.owner)       form.append('owner', meta.owner);
    if (meta.label)       form.append('label', meta.label);
    const res = await fetch(`${BASE}/${appId}/documents/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (res.status === 401) { handleUnauthorized(); throw new Error('Session expired'); }
    if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Upload failed' })); throw new Error(e.error); }
    return res.json();
  },
  // Returns the URL to view or download a file
  fileUrl(appId, docId, download = false) {
    return `${BASE}/${appId}/documents/${docId}/file${download ? '?download=1' : ''}`;
  },
};

export const leadsApi = {
  getLeads(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/leads?${qs}`);
  },
  getStats() {
    return request('/api/leads/stats');
  },
  getAnalytics() {
    return request('/api/leads/analytics');
  },
  getQueues() {
    return request('/api/leads/queues');
  },
  getLead(id) {
    return request(`/api/leads/${id}`);
  },
  createLead(data) {
    return request('/api/leads', { method: 'POST', body: JSON.stringify(data) });
  },
  updateLead(id, data) {
    return request(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  saveQualification(id, data) {
    return request(`/api/leads/${id}/qualification`, { method: 'POST', body: JSON.stringify(data) });
  },
  markQualified(id) {
    return request(`/api/leads/${id}/mark-qualified`, { method: 'POST', body: JSON.stringify({}) });
  },
  addNote(id, note_text) {
    return request(`/api/leads/${id}/note`, { method: 'POST', body: JSON.stringify({ note_text }) });
  },
  logCall(id, data) {
    return request(`/api/leads/${id}/call-log`, { method: 'POST', body: JSON.stringify(data) });
  },
  setFollowup(id, data) {
    return request(`/api/leads/${id}/followup`, { method: 'POST', body: JSON.stringify(data) });
  },
  completeFollowup(leadId, followupId) {
    return request(`/api/leads/${leadId}/followup/${followupId}/complete`, { method: 'POST', body: JSON.stringify({}) });
  },
  convert(id, data) {
    return request(`/api/leads/${id}/convert`, { method: 'POST', body: JSON.stringify(data) });
  },
  drop(id, reason, stage = 'DROPPED') {
    return request(`/api/leads/${id}/drop`, { method: 'POST', body: JSON.stringify({ reason, stage }) });
  },
  mergeLead(primary_id, duplicate_id, reason) {
    return request('/api/leads/merge', { method: 'POST', body: JSON.stringify({ primary_id, duplicate_id, reason }) });
  },
  getCampaignAnalytics() {
    return request('/api/leads/campaign-analytics');
  },
};

export const packsApi = {
  getPacks(appId) {
    return request(`${BASE}/${appId}/packs`);
  },
  createPack(appId, data = {}) {
    return request(`${BASE}/${appId}/packs`, { method: 'POST', body: JSON.stringify(data) });
  },
};

export const communicationApi = {
  // Next Actions
  getNextActions(caseId) {
    return request(`/api/communication/cases/${caseId}/next-actions`);
  },
  createNextAction(caseId, data) {
    return request(`/api/communication/cases/${caseId}/next-actions`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateNextAction(actionId, data) {
    return request(`/api/communication/next-actions/${actionId}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  // Reminder Jobs
  getReminderJobs(caseId) {
    return request(`/api/communication/cases/${caseId}/reminder-jobs`);
  },
  sendReminder(caseId, data = {}) {
    return request(`/api/communication/cases/${caseId}/reminder-jobs`, { method: 'POST', body: JSON.stringify(data) });
  },
  // Message Log
  getMessageLog(caseId) {
    return request(`/api/communication/cases/${caseId}/message-log`);
  },
  // Stage Expectations
  getStageExpectations(status) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request(`/api/communication/stage-expectations${qs}`);
  },
  createStageExpectation(data) { return request('/api/communication/stage-expectations', { method: 'POST', body: JSON.stringify(data) }); },
  updateStageExpectation(id, data) { return request(`/api/communication/stage-expectations/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  // Escalations
  getEscalations(caseId) {
    return request(`/api/communication/cases/${caseId}/escalations`);
  },
  createEscalation(caseId, data) {
    return request(`/api/communication/cases/${caseId}/escalations`, { method: 'POST', body: JSON.stringify(data) });
  },
  resolveEscalation(escalationId) {
    return request(`/api/communication/escalations/${escalationId}/resolve`, { method: 'POST', body: JSON.stringify({}) });
  },
  // Open actions dashboard
  getOpenActions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/communication/open-actions?${qs}`);
  },
};

export const agentApi = {
  // Auth
  registerOrg(data) { return request('/api/agent/auth/register-org', { method: 'POST', body: JSON.stringify(data) }); },
  me() { return request('/api/agent/auth/me'); },

  // Dashboard
  getDashboard() { return request('/api/agent/dashboard'); },

  // Leads
  getLeads(params = {}) { const qs = new URLSearchParams(params).toString(); return request(`/api/agent/leads?${qs}`); },
  createLead(data) { return request('/api/agent/leads', { method: 'POST', body: JSON.stringify(data) }); },
  getLead(id) { return request(`/api/agent/leads/${id}`); },
  updateLead(id, data) { return request(`/api/agent/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  addLeadNote(id, note_text) { return request(`/api/agent/leads/${id}/note`, { method: 'POST', body: JSON.stringify({ note_text }) }); },
  convertLeadToCase(id, data) { return request(`/api/agent/leads/${id}/convert-to-case`, { method: 'POST', body: JSON.stringify(data) }); },

  // Cases
  getCases(params = {}) { const qs = new URLSearchParams(params).toString(); return request(`/api/agent/cases?${qs}`); },
  getCase(id) { return request(`/api/agent/cases/${id}`); },

  // Bank Apps
  getBankApps(params = {}) { const qs = new URLSearchParams(params).toString(); return request(`/api/agent/bank-apps?${qs}`); },

  // Students
  getStudents(params = {}) { const qs = new URLSearchParams(params).toString(); return request(`/api/agent/students?${qs}`); },
  getStudent(id) { return request(`/api/agent/students/${id}`); },

  // Commissions
  getCommissions(params = {}) { const qs = new URLSearchParams(params).toString(); return request(`/api/agent/commissions?${qs}`); },
  getCommission(id) { return request(`/api/agent/commissions/${id}`); },
  createCommission(data) { return request('/api/agent/commissions', { method: 'POST', body: JSON.stringify(data) }); },
  updateCommission(id, data) { return request(`/api/agent/commissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Reports
  getReports() { return request('/api/agent/reports'); },

  // Settings
  getProfile() { return request('/api/agent/settings/profile'); },
  updateProfile(data) { return request('/api/agent/settings/profile', { method: 'PATCH', body: JSON.stringify(data) }); },
  getBranches() { return request('/api/agent/settings/branches'); },
  createBranch(data) { return request('/api/agent/settings/branches', { method: 'POST', body: JSON.stringify(data) }); },
  getUsers() { return request('/api/agent/settings/users'); },
  createUser(data) { return request('/api/agent/settings/users', { method: 'POST', body: JSON.stringify(data) }); },
  updateUser(id, data) { return request(`/api/agent/settings/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
};

export const bankAdminApi = {
  // Auth
  login(email, password) { return request('/api/bank-admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); },
  me() { return request('/api/bank-admin/auth/me'); },

  // Banks
  getBanks() { return request('/api/bank-admin/banks'); },
  getBank(id) { return request(`/api/bank-admin/banks/${id}`); },
  updateBank(id, data) { return request(`/api/bank-admin/banks/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  createBank(data) { return request('/api/bank-admin/banks', { method: 'POST', body: JSON.stringify(data) }); },

  // Products
  getProducts(bankId) { return request(`/api/bank-admin/banks/${bankId}/products`); },
  createProduct(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/products`, { method: 'POST', body: JSON.stringify(data) }); },
  getProduct(productId) { return request(`/api/bank-admin/products/${productId}`); },
  updateProduct(productId, data) { return request(`/api/bank-admin/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteProduct(productId) { return request(`/api/bank-admin/products/${productId}`, { method: 'DELETE' }); },

  // Criteria
  getCriteria(productId) { return request(`/api/bank-admin/products/${productId}/criteria`); },
  addCriterion(productId, data) { return request(`/api/bank-admin/products/${productId}/criteria`, { method: 'POST', body: JSON.stringify(data) }); },
  deleteCriterion(id) { return request(`/api/bank-admin/criteria/${id}`, { method: 'DELETE' }); },

  // Documents
  getProductDocs(productId) { return request(`/api/bank-admin/products/${productId}/documents`); },
  addProductDoc(productId, data) { return request(`/api/bank-admin/products/${productId}/documents`, { method: 'POST', body: JSON.stringify(data) }); },
  deleteProductDoc(id) { return request(`/api/bank-admin/product-documents/${id}`, { method: 'DELETE' }); },

  // Branches
  getBranches(bankId) { return request(`/api/bank-admin/banks/${bankId}/branches`); },
  createBranch(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/branches`, { method: 'POST', body: JSON.stringify(data) }); },
  updateBranch(id, data) { return request(`/api/bank-admin/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },

  // Users
  getUsers(bankId) { return request(`/api/bank-admin/banks/${bankId}/users`); },
  createUser(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/users`, { method: 'POST', body: JSON.stringify(data) }); },
  updateUser(id, data) { return request(`/api/bank-admin/bank-users/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },

  // Announcements
  getAnnouncements(bankId) { return request(`/api/bank-admin/banks/${bankId}/announcements`); },
  createAnnouncement(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/announcements`, { method: 'POST', body: JSON.stringify(data) }); },
  deleteAnnouncement(id) { return request(`/api/bank-admin/announcements/${id}`, { method: 'DELETE' }); },

  // API Keys
  getApiKeys(bankId) { return request(`/api/bank-admin/banks/${bankId}/api-keys`); },
  createApiKey(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/api-keys`, { method: 'POST', body: JSON.stringify(data) }); },
  toggleApiKey(id) { return request(`/api/bank-admin/api-keys/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({}) }); },

  // Dashboard & Analytics
  getDashboard(bankId) { return request(`/api/bank-admin/banks/${bankId}/dashboard`); },
  getAnalytics(bankId) { return request(`/api/bank-admin/banks/${bankId}/analytics`); },
  getAuditLog(bankId) { return request(`/api/bank-admin/banks/${bankId}/audit-log`); },

  // Regions
  getRegions(bankId) { return request(`/api/bank-admin/banks/${bankId}/regions`); },
  createRegion(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/regions`, { method: 'POST', body: JSON.stringify(data) }); },

  // Bank Applications
  getBankApplications(bankId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/bank-admin/banks/${bankId}/bank-applications${q ? '?' + q : ''}`);
  },
  createBankApplication(bankId, data) { return request(`/api/bank-admin/banks/${bankId}/bank-applications`, { method: 'POST', body: JSON.stringify(data) }); },
  getBankApplication(id) { return request(`/api/bank-admin/bank-applications/${id}`); },
  updateBankApplicationStatus(id, data) { return request(`/api/bank-admin/bank-applications/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }); },
  assignBankApplication(id, data) { return request(`/api/bank-admin/bank-applications/${id}/assign`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Queries
  getQueries(appId) { return request(`/api/bank-admin/bank-applications/${appId}/queries`); },
  createQuery(appId, data) { return request(`/api/bank-admin/bank-applications/${appId}/queries`, { method: 'POST', body: JSON.stringify(data) }); },
  getQuery(id) { return request(`/api/bank-admin/queries/${id}`); },
  addQueryMessage(id, data) { return request(`/api/bank-admin/queries/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }); },
  closeQuery(id) { return request(`/api/bank-admin/queries/${id}/close`, { method: 'PATCH', body: JSON.stringify({}) }); },

  // Proofs
  getProofs(appId) { return request(`/api/bank-admin/bank-applications/${appId}/proofs`); },
  uploadProof(appId, data) { return request(`/api/bank-admin/bank-applications/${appId}/proofs`, { method: 'POST', body: JSON.stringify(data) }); },
  verifyProof(id, data) { return request(`/api/bank-admin/proofs/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Doc Reviews
  getDocReviews(appId) { return request(`/api/bank-admin/bank-applications/${appId}/doc-reviews`); },
  reviewDoc(appId, data) { return request(`/api/bank-admin/bank-applications/${appId}/doc-reviews`, { method: 'POST', body: JSON.stringify(data) }); },
  getDocRejectionReasons() { return request(`/api/bank-admin/doc-rejection-reasons`); },

  // Policy Versions
  getPolicyVersions(productId) { return request(`/api/bank-admin/products/${productId}/policy-versions`); },
  createPolicyVersion(productId, data) { return request(`/api/bank-admin/products/${productId}/policy-versions`, { method: 'POST', body: JSON.stringify(data) }); },

  // Enhanced dashboard
  getEnhancedDashboard(bankId) { return request(`/api/bank-admin/banks/${bankId}/enhanced-dashboard`); },

  // Application events (timeline)
  getApplicationEvents(appId) { return request(`/api/bank-admin/bank-applications/${appId}/events`); },
};

export const coApplicantsApi = {
  getCoApplicants(appId) {
    return request(`${BASE}/${appId}/co-applicants`);
  },
  addCoApplicant(appId, data) {
    return request(`${BASE}/${appId}/co-applicants`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateCoApplicant(appId, coId, data) {
    return request(`${BASE}/${appId}/co-applicants/${coId}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  deleteCoApplicant(appId, coId) {
    return request(`${BASE}/${appId}/co-applicants/${coId}`, { method: 'DELETE' });
  },
};

// ─── Events API ────────────────────────────────────────────────────────────────
export const eventsApi = {
  // Staff — events CRUD
  getEvents(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events${q ? '?' + q : ''}`);
  },
  createEvent(data) { return request('/api/events', { method: 'POST', body: JSON.stringify(data) }); },
  getEvent(id) { return request(`/api/events/${id}`); },
  updateEvent(id, data) { return request(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Registrations
  getRegistrations(eventId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/${eventId}/registrations${q ? '?' + q : ''}`);
  },

  // Check-in
  checkin(eventId, data) { return request(`/api/events/${eventId}/checkin`, { method: 'POST', body: JSON.stringify(data) }); },
  getCheckins(eventId) { return request(`/api/events/${eventId}/checkins`); },

  // Messages / Broadcast
  getMessages(eventId) { return request(`/api/events/${eventId}/messages`); },
  sendMessage(eventId, data) { return request(`/api/events/${eventId}/messages`, { method: 'POST', body: JSON.stringify(data) }); },

  // Leads / Conversions
  getLeadsConversions(eventId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/${eventId}/leads${q ? '?' + q : ''}`);
  },
  bulkConvertToLeads(eventId, data) { return request(`/api/events/${eventId}/convert/bulk-to-leads`, { method: 'POST', body: JSON.stringify(data) }); },
  convertRegistration(eventId, regId, data) { return request(`/api/events/${eventId}/convert/registration/${regId}`, { method: 'POST', body: JSON.stringify(data) }); },

  // Analytics
  getOverviewAnalytics(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/analytics${q ? '?' + q : ''}`);
  },
  getEventAnalytics(eventId) { return request(`/api/events/${eventId}/analytics`); },

  // Ticket types
  getTicketTypes(eventId) { return request(`/api/events/${eventId}/ticket-types`); },

  // Meta mappings
  getMetaMappings(eventId) { return request(`/api/events/${eventId}/meta-mappings`); },
  addMetaMapping(eventId, data) { return request(`/api/events/${eventId}/meta-mappings`, { method: 'POST', body: JSON.stringify(data) }); },

  // Export
  exportCSV(eventId) { return `/api/events/${eventId}/export`; },

  // Public (student-facing — no auth needed, just fetch directly)
  getPublicEvent(slug) { return fetch(`/api/events/public/event/${slug}`).then(r => r.json()); },
  registerForEvent(slug, data) {
    return fetch(`/api/events/public/event/${slug}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json());
  },
  getTicket(code) { return fetch(`/api/events/public/ticket/${code}`).then(r => r.json()); },
};

// ─── Admin API (Super Admin Master Brain) ─────────────────────────────────────
export const adminApi = {
  getDashboard(days = 30) { return request(`/api/admin/dashboard?days=${days}`); },

  // Automation Rules
  getAutomationRules() { return request('/api/admin/automation-rules'); },
  createAutomationRule(data) { return request('/api/admin/automation-rules', { method: 'POST', body: JSON.stringify(data) }); },
  updateAutomationRule(id, data) { return request(`/api/admin/automation-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteAutomationRule(id) { return request(`/api/admin/automation-rules/${id}`, { method: 'DELETE' }); },

  // Message Templates
  getTemplates(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/message-templates${q ? '?' + q : ''}`);
  },
  createTemplate(data) { return request('/api/admin/message-templates', { method: 'POST', body: JSON.stringify(data) }); },
  updateTemplate(id, data) { return request(`/api/admin/message-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteTemplate(id) { return request(`/api/admin/message-templates/${id}`, { method: 'DELETE' }); },

  // Masters
  getUniversities() { return request('/api/admin/universities'); },
  createUniversity(data) { return request('/api/admin/universities', { method: 'POST', body: JSON.stringify(data) }); },
  updateUniversity(id, data) { return request(`/api/admin/universities/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteUniversity(id) { return request(`/api/admin/universities/${id}`, { method: 'DELETE' }); },

  getCourses() { return request('/api/admin/courses'); },
  createCourse(data) { return request('/api/admin/courses', { method: 'POST', body: JSON.stringify(data) }); },
  updateCourse(id, data) { return request(`/api/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteCourse(id) { return request(`/api/admin/courses/${id}`, { method: 'DELETE' }); },

  getCountries() { return request('/api/admin/countries'); },
  createCountry(data) { return request('/api/admin/countries', { method: 'POST', body: JSON.stringify(data) }); },
  updateCountry(id, data) { return request(`/api/admin/countries/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteCountry(id) { return request(`/api/admin/countries/${id}`, { method: 'DELETE' }); },

  getDocumentMaster() { return request('/api/admin/document-master'); },
  createDocument(data) { return request('/api/admin/document-master', { method: 'POST', body: JSON.stringify(data) }); },
  updateDocument(id, data) { return request(`/api/admin/document-master/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteDocument(id) { return request(`/api/admin/document-master/${id}`, { method: 'DELETE' }); },

  getStageMaster(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/stage-master${q ? '?' + q : ''}`);
  },
  createStage(data) { return request('/api/admin/stage-master', { method: 'POST', body: JSON.stringify(data) }); },
  updateStage(id, data) { return request(`/api/admin/stage-master/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteStage(id) { return request(`/api/admin/stage-master/${id}`, { method: 'DELETE' }); },

  getLossReasons(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/loss-reasons${q ? '?' + q : ''}`);
  },
  createLossReason(data) { return request('/api/admin/loss-reasons', { method: 'POST', body: JSON.stringify(data) }); },
  updateLossReason(id, data) { return request(`/api/admin/loss-reasons/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteLossReason(id) { return request(`/api/admin/loss-reasons/${id}`, { method: 'DELETE' }); },

  // Settings
  getSettings() { return request('/api/admin/settings'); },
  updateSettings(data) { return request('/api/admin/settings', { method: 'PUT', body: JSON.stringify(data) }); },

  // Reports
  getLeadReport(days = 30) { return request(`/api/admin/reports/leads?days=${days}`); },
  getCaseReport(days = 30) { return request(`/api/admin/reports/cases?days=${days}`); },
  getBankReport() { return request('/api/admin/reports/banks'); },
  getStaffReport(days = 30) { return request(`/api/admin/reports/staff?days=${days}`); },
  getCampaignReport(days = 30) { return request(`/api/admin/reports/campaigns?days=${days}`); },

  // Communications
  getComms() { return request('/api/admin/comms'); },

  // Organizations
  getOrgs() { return request('/api/admin/orgs'); },

  // Audit Logs
  getAuditLogs(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/audit-logs${q ? '?' + q : ''}`);
  },

  // Notifications
  getNotifications(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`/api/admin/notifications${q ? '?' + q : ''}`);
  },
  markNotificationRead(id) { return request(`/api/admin/notifications/${id}/read`, { method: 'PATCH', body: JSON.stringify({}) }); },

  // Control Room
  getControlRoom() { return request('/api/admin/control-room'); },
  createIncident(data) { return request('/api/admin/incidents', { method: 'POST', body: JSON.stringify(data) }); },
  updateIncident(id, data) { return request(`/api/admin/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Feature Flags
  getFeatureFlags() { return request('/api/admin/feature-flags'); },
  createFeatureFlag(data) { return request('/api/admin/feature-flags', { method: 'POST', body: JSON.stringify(data) }); },
  toggleFeatureFlag(key, enabled) { return request(`/api/admin/feature-flags/${key}/toggle`, { method: 'PATCH', body: JSON.stringify({ enabled }) }); },

  // Report Subscriptions & Runs
  getReportSubscriptions() { return request('/api/admin/report-subscriptions'); },
  createReportSubscription(data) { return request('/api/admin/report-subscriptions', { method: 'POST', body: JSON.stringify(data) }); },
  deleteReportSubscription(id) { return request(`/api/admin/report-subscriptions/${id}`, { method: 'DELETE' }); },
  getReportRuns(params = {}) { const q = new URLSearchParams(params).toString(); return request(`/api/admin/report-runs${q ? '?' + q : ''}`); },
  runReport(type, filters = {}) { return request(`/api/admin/report-runs/${type}`, { method: 'POST', body: JSON.stringify(filters) }); },

  // Leads & Cases Monitor
  getLeadsMonitor(params = {}) { const q = new URLSearchParams(params).toString(); return request(`/api/admin/monitor/leads${q ? '?' + q : ''}`); },
  getCasesMonitor(params = {}) { const q = new URLSearchParams(params).toString(); return request(`/api/admin/monitor/cases${q ? '?' + q : ''}`); },

  // Events & Agents Control
  getEventsControl() { return request('/api/admin/events-control'); },
  getAgentsControl() { return request('/api/admin/agents-control'); },

  // Banks Governance
  getBanksGovernance() { return request('/api/admin/banks-governance'); },
  toggleBank(bankId, is_active) { return request(`/api/admin/banks/${bankId}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_active }) }); },
  createBankAdmin(data) { return request('/api/admin/banks', { method: 'POST', body: JSON.stringify(data) }); },

  // Control Room Actions
  reassignEntity(data) { return request('/api/admin/control-room/reassign', { method: 'POST', body: JSON.stringify(data) }); },
  triggerReminder(data) { return request('/api/admin/control-room/trigger-reminder', { method: 'POST', body: JSON.stringify(data) }); },
  flagEscalate(data) { return request('/api/admin/control-room/flag', { method: 'POST', body: JSON.stringify(data) }); },

  // Enhanced Audit Logs
  getAdminAuditLogs(params = {}) { const q = new URLSearchParams(params).toString(); return request(`/api/admin/audit-logs-admin${q ? '?' + q : ''}`); },
  logAuditAction(data) { return request('/api/admin/audit-log', { method: 'POST', body: JSON.stringify(data) }); },

  // Stages Config
  getStagesConfig() { return request('/api/admin/stages-config'); },
  updateStageMaster(id, data) { return request(`/api/admin/stage-master/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
};

// ─── CRM API (Final Step modules) ─────────────────────────────────────────────
const CRM = '/api/crm';

export const crmApi = {
  // Student Profile (extended fields)
  getProfile(caseId) { return request(`${CRM}/cases/${caseId}/profile`); },
  updateProfile(caseId, data) { return request(`${CRM}/cases/${caseId}/profile`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Co-applicants
  getCoapplicants(caseId) { return request(`${CRM}/cases/${caseId}/coapplicants`); },
  createCoapplicant(caseId, data) { return request(`${CRM}/cases/${caseId}/coapplicants`, { method: 'POST', body: JSON.stringify(data) }); },
  updateCoapplicant(caseId, coId, data) { return request(`${CRM}/cases/${caseId}/coapplicants/${coId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteCoapplicant(caseId, coId) { return request(`${CRM}/cases/${caseId}/coapplicants/${coId}`, { method: 'DELETE' }); },

  // References
  getReferences(caseId) { return request(`${CRM}/cases/${caseId}/references`); },
  createReference(caseId, data) { return request(`${CRM}/cases/${caseId}/references`, { method: 'POST', body: JSON.stringify(data) }); },
  updateReference(caseId, refId, data) { return request(`${CRM}/cases/${caseId}/references/${refId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteReference(caseId, refId) { return request(`${CRM}/cases/${caseId}/references/${refId}`, { method: 'DELETE' }); },

  // Checklist
  getChecklist(caseId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`${CRM}/cases/${caseId}/checklist${q ? '?' + q : ''}`);
  },
  generateChecklist(caseId) { return request(`${CRM}/cases/${caseId}/checklist/generate`, { method: 'POST', body: JSON.stringify({}) }); },
  updateChecklistItem(itemId, data) { return request(`${CRM}/checklist-items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Bank requirement overrides
  createOverride(bankAppId, data) { return request(`${CRM}/bank-apps/${bankAppId}/requirements/override`, { method: 'POST', body: JSON.stringify(data) }); },

  // Query threads
  getQueries(caseId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`${CRM}/cases/${caseId}/queries${q ? '?' + q : ''}`);
  },
  createQuery(caseId, data) { return request(`${CRM}/cases/${caseId}/queries`, { method: 'POST', body: JSON.stringify(data) }); },
  getQuery(threadId) { return request(`${CRM}/queries/${threadId}`); },
  addQueryMessage(threadId, data) { return request(`${CRM}/queries/${threadId}/messages`, { method: 'POST', body: JSON.stringify(data) }); },
  updateQueryStatus(threadId, status) { return request(`${CRM}/queries/${threadId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },

  // Tasks
  getTasks(caseId, params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`${CRM}/cases/${caseId}/tasks${q ? '?' + q : ''}`);
  },
  createTask(data) { return request(`${CRM}/tasks`, { method: 'POST', body: JSON.stringify(data) }); },
  updateTask(taskId, data) { return request(`${CRM}/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }); },

  // Document Master
  getDocumentMaster(params = {}) {
    const q = new URLSearchParams(params).toString();
    return request(`${CRM}/admin/document-master${q ? '?' + q : ''}`);
  },
  createDocumentMaster(data) { return request(`${CRM}/admin/document-master`, { method: 'POST', body: JSON.stringify(data) }); },
  updateDocumentMaster(doc_code, data) { return request(`${CRM}/admin/document-master/${doc_code}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteDocumentMaster(doc_code) { return request(`${CRM}/admin/document-master/${doc_code}`, { method: 'DELETE' }); },

  // Sanction blockers dashboard
  getSanctionBlockers() { return request(`${CRM}/dashboard/sanction-blockers`); },

  // Reminders
  scheduleReminder(data) { return request(`${CRM}/reminders/schedule`, { method: 'POST', body: JSON.stringify(data) }); },
};
