// backend/routes/sendMail.js

const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const router = express.Router();
require('dotenv').config();

// Send Mail
router.post('/send-mail', async (req, res) => {
  const { from, to, subject, body, invoiceId } = req.body;

  // Validate request fields
  if (!from || !to || !subject || !body || !invoiceId) {
    return res.status(400).json({ message: 'All fields are required (from, to, subject, body, invoiceId)' });
  }

  try {
    // Retrieve images associated with the invoice
    const [invoices] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (invoices.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoices[0];
    const imageFiles = JSON.parse(invoice.images || '[]'); // Assuming images are stored as a JSON array of filenames
    const attachments = imageFiles.map((image) => {
      const filePath = path.join(__dirname, '../uploads', image);
      return {
        filename: image,
        path: filePath,
      };
    });

    // Configure the transporter for email sending
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Mail options
    const mailOptions = {
      from: `${from} <${process.env.EMAIL_USER}>`, // Show sender name with actual sending email
      to,
      subject,
      text: body,
      attachments, // Attach images to the email
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    // console.log('Email sent: ' + info.response);

    res.status(200).json({ message: 'Email sent successfully', success: true });
  } catch (error) {
    console.error('Failed to send email', error);
    if (error.responseCode === 535 || error.responseCode === 'EAUTH') {
      res.status(500).json({ message: 'Authentication error: please check email credentials', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
  }
});

module.exports = router;
