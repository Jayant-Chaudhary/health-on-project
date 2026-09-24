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
const ocrRoutes = require('./routes/ocr.routes');

const app = express();

app.use(cors({ origin: env.clientAppUrl, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Resource Endpoints
app.use('/auth', authRoutes);
app.use('/appointments', appointmentsRoutes);
app.use('/vitals', vitalsRoutes);
app.use('/questionnaire', questionnaireRoutes);
app.use(['/api/lab-reports', '/lab-reports'], labReportsRoutes);
app.use('/checklist', checklistRoutes);
app.use('/post-visit', postVisitRoutes);
app.use('/ocr', ocrRoutes);

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.port, () => {
    console.log(`Maternal Health Platform Server listening on port ${env.port}`);
  });
}

module.exports = app;
