const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const userRoutes = require('./routes/userRoutes');
const sendMailRoute = require('./routes/sendMail');

const app = express();

// Logger - log every request
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// CORS Configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'http://34.56.114.121', 'https://your-production-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Cache-Control
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// Conditional body-parser (skip for file upload routes)
app.use((req, res, next) => {
    if (
        (req.path.startsWith('/api/invoices') && (req.method === 'POST' || req.method === 'PUT')) ||
        (req.path.startsWith('/api/invoices/') && req.method === 'POST')  // for /invoices/:id/images
    ) {
        // Skip bodyParser.json() and bodyParser.urlencoded() for these routes
        next();
    } else {
        bodyParser.json({ limit: '50mb' })(req, res, (err) => {
            if (err) {
                console.error('JSON Parse Error:', err);
                return res.status(400).json({ message: 'Invalid JSON' });
            }
            bodyParser.urlencoded({ limit: '50mb', extended: true })(req, res, next);
        });
    }
});

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files (images)
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api', sendMailRoute);

// 404 Fallback (for API-only servers)
app.use('*', (req, res) => {
    res.status(404).send('Route not found');
});

// Start Server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
