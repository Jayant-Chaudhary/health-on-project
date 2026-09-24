const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const vitalsRoutes = require('./routes/vitals.routes');
const questionnaireRoutes = require('./routes/questionnaire.routes');
const labReportsRoutes = require('./routes/labReports.routes');
const checklistRoutes = require('./routes/checklist.routes');
const postVisitRoutes = require('./routes/postVisit.routes');
const profileRoutes = require('./routes/profile.routes');

const app = express();

app.use(cors({ origin: env.clientAppUrl, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Resource Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/lab-reports', labReportsRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/post-visit', postVisitRoutes);
app.use('/api/profile', profileRoutes);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    console.log(`Maternal Health Platform Server listening on port ${env.port}`);
  });
}

module.exports = app;
