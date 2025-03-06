const express = require('express');
const multer = require('multer');
const path = require('path');
const Invoice = require('../models/Invoice');
const router = express.Router();
const fs = require('fs');

// Setup Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Helper function to log request data (for debugging)
function logInvoiceRequest(req) {
    console.log('--- Invoice Request Received ---');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
}

// Create Invoice with Images
router.post('/', upload.array('images', 10), async (req, res) => {
    logInvoiceRequest(req);  // Log for debugging

    const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy } = req.body;
    const images = req.files.map(file => file.path);

    if (!receiptNumber) {
        return res.status(400).json({ message: 'Receipt Number is required' });
    }

    try {
        const result = await Invoice.createInvoice({ receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy });
        const invoiceId = result.insertId;

        if (images.length > 0) {
            await Invoice.addInvoiceImages(invoiceId, images);
        }

        res.status(201).json({
            message: 'Invoice created successfully',
            invoice: {
                id: invoiceId,
                receiptNumber,
                invoiceNumber,
                date,
                time,
                receiptType,
                narrative,
                amount,
                currency,
                images,
                createdBy
            }
        });
    } catch (error) {
        console.error('Failed to create invoice:', error);
        res.status(500).json({ message: 'Failed to create invoice', error: error.message });
    }
});

// Update Invoice with Images
router.put('/:id', upload.array('images', 10), async (req, res) => {
    logInvoiceRequest(req);  // Log for debugging

    const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency } = req.body;
    const images = req.files.map(file => file.path);

    if (!receiptNumber) {
        return res.status(400).json({ message: 'Receipt Number is required' });
    }

    try {
        const result = await Invoice.updateInvoice(req.params.id, { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency });
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        if (images.length > 0) {
            await Invoice.addInvoiceImages(req.params.id, images);
        }

        res.status(200).json({
            message: 'Invoice updated successfully',
            invoice: {
                id: req.params.id,
                receiptNumber,
                invoiceNumber,
                date,
                time,
                receiptType,
                narrative,
                amount,
                currency,
                images
            }
        });
    } catch (error) {
        console.error('Failed to update invoice:', error);
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
});
