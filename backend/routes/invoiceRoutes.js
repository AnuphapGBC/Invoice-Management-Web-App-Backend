const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Invoice = require('../models/Invoice');

const router = express.Router();

// Setup upload folder
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});


const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.mimetype)) {
      console.warn(`🚫 Blocked file: ${file.originalname} (${file.mimetype})`);
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// HEIC to JPG converter
function convertHEICtoJPG(heicPath) {
  return new Promise((resolve, reject) => {
    const jpgPath = heicPath.replace(/\.heic$/i, '.jpg');
    exec(`heif-convert "${heicPath}" "${jpgPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Conversion failed: ${stderr}`);
        return reject(error);
      }
      fs.unlinkSync(heicPath); // Delete original HEIC
      resolve(jpgPath);
    });
  });
}

// --- Routes ---

// Get all receipt types
router.get('/receipt-types', async (req, res) => {
  try {
    const receiptTypes = await Invoice.getReceiptTypes();
    res.json(receiptTypes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch receipt types', error: err.message });
  }
});

// Create invoice
router.post('/', upload.array('images', 10), async (req, res) => {
  console.log('BODY:', req.body);
  // console.log('FILES:', req.files?.map(f => `${f.originalname} (${f.mimetype})`));

  if (!req.files || req.files.length === 0) {
    console.warn('⚠️ No images received in upload.');
  } else {
    console.log('✅ Received files:');
    req.files.forEach((file, index) => {
      console.log(`📎 ${index + 1}: ${file.originalname} (${file.mimetype})`);
    });
  }
  


  const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy } = req.body;
  let images = req.files.map(file => file.path);

  // Convert HEIC files
  for (let i = 0; i < images.length; i++) {
    if (images[i].toLowerCase().endsWith('.heic')) {
      try {
        images[i] = await convertHEICtoJPG(images[i]);
      } catch (err) {
        console.error('Failed to convert HEIC:', err);
        return res.status(500).json({ message: 'HEIC conversion failed' });
      }
    }
  }

  if (!receiptNumber) return res.status(400).json({ message: 'Receipt Number is required' });

  try {
    const result = await Invoice.createInvoice({
      receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy
    });

    const invoiceId = result.insertId;
    if (images.length > 0) {
      await Invoice.addInvoiceImages(invoiceId, images);
    }

    res.status(201).json({ message: 'Invoice created', invoiceId, images });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
});

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.getAllInvoices();
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving invoices', error: err.message });
  }
});

// Get invoice + images
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    const images = await Invoice.getInvoiceImages(req.params.id);
    res.json({ invoice, images });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching invoice', error: err.message });
  }
});

// Update invoice
router.put('/:id', upload.array('images', 10), async (req, res) => {
  console.log('UPDATE BODY:', req.body);
  // console.log('UPDATE FILES:', req.files?.map(f => f.originalname));

  if (!req.files || req.files.length === 0) {
    console.warn('⚠️ No new images received in update.');
  } else {
    console.log('✅ Update received files:');
    req.files.forEach((file, index) => {
      console.log(`📝 ${index + 1}: ${file.originalname} (${file.mimetype})`);
    });
  }
  

  const { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency } = req.body;
  let images = req.files.map(file => file.path);

  for (let i = 0; i < images.length; i++) {
    if (images[i].toLowerCase().endsWith('.heic')) {
      try {
        images[i] = await convertHEICtoJPG(images[i]);
      } catch (err) {
        console.error('HEIC update conversion error:', err);
        return res.status(500).json({ message: 'Failed to convert HEIC file' });
      }
    }
  }

  try {
    const result = await Invoice.updateInvoice(req.params.id, {
      receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency
    });

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Invoice not found' });

    if (images.length > 0) {
      await Invoice.addInvoiceImages(req.params.id, images);
    }

    res.json({ message: 'Invoice updated', id: req.params.id, images });
  } catch (err) {
    res.status(500).json({ message: 'Update error', error: err.message });
  }
});

// Get invoice images
router.get('/:id/images', async (req, res) => {
  try {
    const images = await Invoice.getInvoiceImages(req.params.id);
    res.json({ images });
  } catch (err) {
    res.status(500).json({ message: 'Could not get images', error: err.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const result = await Invoice.deleteInvoice(req.params.id);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
});

// Delete single image
router.delete('/images', async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ message: 'Image URL required' });

  try {
    const result = await Invoice.deleteInvoiceImage(imageUrl);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Image not found' });

    const fullPath = path.join(__dirname, '..', imageUrl);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

    res.json({ message: 'Image deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete image', error: err.message });
  }
});

module.exports = router;
