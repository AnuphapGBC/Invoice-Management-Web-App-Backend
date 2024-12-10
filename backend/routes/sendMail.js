const express = require('express');
const nodemailer = require('nodemailer');
const db = require('../database/db');
const path = require('path');
const router = express.Router();
require('dotenv').config();

// Send Mail
router.post('/send-mail', async (req, res) => {
  const { from, to, subject, body, invoiceId } = req.body;

  console.log('Incoming request:', { from, to, subject, body, invoiceId });

  // Validate request fields
  if (!from || !to || !subject || !body || !invoiceId) {
    console.error('Validation failed: Missing required fields');
    return res.status(400).json({ message: 'All fields are required (from, to, subject, body, invoiceId)' });
  }

  try {
    // Fetch invoice details
    const [invoices] = await db.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (invoices.length === 0) {
      console.error(`Invoice not found for ID: ${invoiceId}`);
      return res.status(404).json({ message: 'Invoice not found' });
    }
    const invoice = invoices[0];
    console.log('Retrieved invoice:', invoice);

    // Fetch images for the invoice
    const [images] = await db.query('SELECT imageUrl FROM invoice_images WHERE invoiceId = ?', [invoiceId]);
    console.log('Retrieved images:', images);

    const attachments = images.map((image) => {
      const filePath = path.join(__dirname, '../', image.imageUrl);
      return {
        filename: path.basename(image.imageUrl),
        path: filePath,
      };
    });

    console.log('Prepared attachments:', attachments);

    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Mail options
    const mailOptions = {
      from: `${from} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: body,
      attachments,
    };

    console.log('Sending email with options:', mailOptions);

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);

    res.status(200).json({ message: 'Email sent successfully', success: true });
  } catch (error) {
    console.error('Failed to send email:', error);
    if (error.responseCode === 535 || error.responseCode === 'EAUTH') {
      res.status(500).json({ message: 'Authentication error: please check email credentials', error: error.message });
    } else {
      res.status(500).json({ message: 'Failed to send email', error: error.message });
    }
  }
});

module.exports = router;
