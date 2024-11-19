// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const userRoutes = require('./routes/userRoutes');
const path = require('path');
const sendMailRoute = require('./routes/sendMail');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');


// Create the uploads folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define Routes
app.use('/api', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/users', userRoutes);
app.use('/api', sendMailRoute);


app.listen(5001, () => {
  console.log('Server running on port 5001');
});
app.use('*', (req, res) => {
  console.log('Invalid route accessed');
  res.status(404).send('Route not found');
});
