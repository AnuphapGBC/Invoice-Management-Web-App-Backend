const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Invoice = require('../models/Invoice'); 
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage and file filter
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ storage, fileFilter });

// Log request for debugging
function logRequest(req) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    console.log('Body:', req.body);
    console.log('Files:', req.files?.map(f => f.filename) || 'No files');
}

// HEIC to JPG converter using heif-convert
function convertHEICtoJPG(heicPath) {
    return new Promise((resolve, reject) => {
        const jpgPath = heicPath.replace(/\.heic$/i, '.jpg');
        exec(`heif-convert "${heicPath}" "${jpgPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`HEIC conversion failed: ${stderr}`);
                return reject(error);
            }
            fs.unlinkSync(heicPath); // Remove original HEIC file
            resolve(jpgPath);
        });
    });
}

// Get Receipt Types
router.get('/receipt-types', async (req, res) => {
    try {
        const receiptTypes = await Invoice.getReceiptTypes();
        res.status(200).json(receiptTypes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch receipt types', error: error.message });
    }
});

// Create Invoice with images
router.post('/', upload.array('images', 10), async (req, res) => {
    logRequest(req);

    const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy } = req.body;
    let images = req.files.map(file => file.path);

    // Convert HEIC files if needed
    for (let i = 0; i < images.length; i++) {
        if (images[i].toLowerCase().endsWith('.heic')) {
            try {
                images[i] = await convertHEICtoJPG(images[i]);
            } catch (err) {
                console.error(`HEIC conversion failed for ${images[i]}`, err);
                return res.status(500).json({ message: 'Failed to process HEIC file' });
            }
        }
    }

    if (!receiptNumber) {
        return res.status(400).json({ message: 'Receipt Number is required' });
    }

    try {
        const result = await Invoice.createInvoice({ receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy });
        const invoiceId = result.insertId;

        if (images.length > 0) {
            await Invoice.addInvoiceImages(invoiceId, images);
        }

        res.status(201).json({ message: 'Invoice created successfully', invoiceId, images });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create invoice', error: error.message });
    }
});

// Get All Invoices
router.get('/', async (req, res) => {
    try {
        const invoices = await Invoice.getAllInvoices();
        res.status(200).json({ invoices });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve invoices', error: error.message });
    }
});

// Get Invoice by ID (including images)
router.get('/:id', async (req, res) => {
    try {
        const invoice = await Invoice.getInvoiceById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        const images = await Invoice.getInvoiceImages(req.params.id);
        res.status(200).json({ invoice, images });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve invoice', error: error.message });
    }
});

// Update Invoice with images
router.put('/:id', upload.array('images', 10), async (req, res) => {
    logRequest(req);

    const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency } = req.body;
    let images = req.files.map(file => file.path);

    for (let i = 0; i < images.length; i++) {
        if (images[i].toLowerCase().endsWith('.heic')) {
            try {
                images[i] = await convertHEICtoJPG(images[i]);
            } catch (err) {
                console.error(`HEIC conversion failed for ${images[i]}`, err);
                return res.status(500).json({ message: 'Failed to process HEIC file' });
            }
        }
    }

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

        res.status(200).json({ message: 'Invoice updated successfully', images });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
});

// Delete Invoice
router.delete('/:id', async (req, res) => {
    try {
        const result = await Invoice.deleteInvoice(req.params.id);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        res.status(200).json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete invoice', error: error.message });
    }
});

// Get Images for Invoice
router.get('/:id/images', async (req, res) => {
    try {
        const images = await Invoice.getInvoiceImages(req.params.id);
        res.status(200).json({ images });
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve images', error: error.message });
    }
});

// Delete Single Image
router.delete('/images', async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ message: 'Image URL is required' });
    }

    try {
        const result = await Invoice.deleteInvoiceImage(imageUrl);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Image not found' });
        }

        const imagePath = path.join(__dirname, '..', imageUrl);
        fs.unlink(imagePath, (err) => {
            if (err) console.error('Failed to delete image file:', err);
        });

        res.status(200).json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete image', error: error.message });
    }
});

module.exports = router;
