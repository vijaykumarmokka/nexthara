import express from 'express';
import cors from 'cors';
import applicationsRouter from './routes/applications.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import studentRouter from './routes/student.js';
import leadsRouter from './routes/leads.js';
import communicationRouter from './routes/communication.js';
import agentRouter from './routes/agent.js';
import bankAdminRouter from './routes/bank-admin.js';
import eventsRouter from './routes/events.js';
import adminRouter from './routes/admin.js';
import crmRouter from './routes/crm.js';

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/student', studentRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/communication', communicationRouter);
app.use('/api/agent', agentRouter);
app.use('/api/bank-admin', bankAdminRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/crm', crmRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Global JSON error handler — converts all unhandled Express errors to JSON
// (prevents HTML 500 pages that the frontend can't parse as JSON)
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[API Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Nexthara API running on http://localhost:${PORT}`);
});
