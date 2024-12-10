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

// Middleware configurations
app.use(cors());

// Increase payload size limits to handle large requests
app.use(bodyParser.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit

// Ensure the uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Ensure nested directories are created
}

// Serve static files from the uploads folder
app.use('/uploads', express.static(uploadDir));

// Define API routes
app.use('/api', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api', sendMailRoute);

// Fallback for invalid routes
app.use('*', (req, res) => {
  console.log(`Invalid route accessed: ${req.originalUrl}`);
  res.status(404).send('Route not found');
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
