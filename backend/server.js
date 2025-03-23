const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import route files
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const userRoutes = require('./routes/userRoutes');
const sendMailRoute = require('./routes/sendMail');

const app = express();

// ==============================
// 1. Logger - log every request
// ==============================
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==============================
// 2. Serve static files (uploads)
// ==============================
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// ==============================
// 3. CORS Configuration
// ==============================
const corsOptions = {
  origin: ['http://localhost:3000', 'http://34.56.114.121'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// ==============================
// 4. Cache-Control for responses
// ==============================
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ==================================================
// 5. Conditionally apply body-parser (skip for files)
// ==================================================
app.use((req, res, next) => {
  const isFileUpload =
    (req.path.startsWith('/api/invoices') && (req.method === 'POST' || req.method === 'PUT')) ||
    (req.path.startsWith('/api/invoices/') && req.method === 'POST'); // For /invoices/:id/images

  if (isFileUpload) return next();

  bodyParser.json({ limit: '50mb' })(req, res, (err) => {
    if (err) {
      console.error('❌ JSON Parse Error:', err);
      return res.status(400).json({ message: 'Invalid JSON' });
    }
    bodyParser.urlencoded({ limit: '50mb', extended: true })(req, res, next);
  });
});

// ==============================
// 6. API Routes
// ==============================
app.use('/api', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api', sendMailRoute);

// ==============================
// 7. Fallback 404 Route
// ==============================
app.use('*', (req, res) => {
  res.status(404).send('Route not found');
});

// ==============================
// 8. Start Server
// ==============================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
