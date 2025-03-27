const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const Invoice = require('../models/Invoice');

const router = express.Router();

// ==========================
// 🔧 Setup Upload Directory
// ==========================
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ==========================
// 📦 Configure Multer
// ==========================
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
    console.log(`🧐 Checking file: ${file.originalname} (${file.mimetype})`);

    if (!allowed.includes(file.mimetype)) {
      console.warn(`❌ Blocked file: ${file.originalname}`);
      return cb(null, false); // ❗ Don't throw error — reject silently
    }

    cb(null, true); // ✅ Accept
  },
});

// ==========================
// 🔄 Convert HEIC to JPG
// ==========================
const convertHEICtoJPG = (heicPath) => {
  return new Promise((resolve, reject) => {
    const jpgPath = heicPath.replace(/\.heic$/i, '.jpg');
    exec(`heif-convert "${heicPath}" "${jpgPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ HEIC conversion failed: ${stderr}`);
        return reject(err);
      }
      fs.unlinkSync(heicPath); // 🧹 Cleanup HEIC
      resolve(jpgPath);
    });
  });
};

// ==========================
// 📌 ROUTES START HERE
// ==========================

// 🔖 GET receipt types
router.get('/receipt-types', async (_, res) => {
  try {
    const types = await Invoice.getReceiptTypes();
    res.json(types);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch receipt types', error: err.message });
  }
});

// 🧾 CREATE Invoice
router.post('/', upload.array('images', 10), async (req, res) => {
  console.log('📥 BODY:', req.body);

  if (!req.files?.length) {
    console.warn('⚠️ No images received in upload.');
  } else {
    req.files.forEach((f, i) => {
      console.log(`📎 ${i + 1}: ${f.originalname} (${f.mimetype})`);
    });
  }

  const {
    receiptNumber, invoiceNumber, date, time,
    receiptType, narrative, amount, currency, createdBy
  } = req.body;

  if (!receiptNumber) return res.status(400).json({ message: 'Receipt Number is required' });

  let images = req.files.map(f => f.path);

  for (let i = 0; i < images.length; i++) {
    if (images[i].toLowerCase().endsWith('.heic')) {
      try {
        images[i] = await convertHEICtoJPG(images[i]);
      } catch (err) {
        return res.status(500).json({ message: 'HEIC conversion failed' });
      }
    }
  }

  try {
    const result = await Invoice.createInvoice({
      receiptNumber, invoiceNumber, date, time,
      receiptType, narrative, amount, currency, createdBy
    });

    if (images.length) await Invoice.addInvoiceImages(result.insertId, images);

    res.status(201).json({ message: 'Invoice created', invoiceId: result.insertId, images });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create invoice', error: err.message });
  }
});

// 📜 GET all invoices
router.get('/', async (_, res) => {
  try {
    const invoices = await Invoice.getAllInvoices();
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving invoices', error: err.message });
  }
});

// 📄 GET single invoice and images
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

// 🛠️ UPDATE invoice
router.put('/:id', upload.array('images', 10), async (req, res) => {
  console.log('🔄 UPDATE BODY:', req.body);

  if (!req.files?.length) {
    console.warn('⚠️ No new images received in update.');
  } else {
    req.files.forEach((f, i) => {
      console.log(`📝 Update Image ${i + 1}: ${f.originalname} (${f.mimetype})`);
    });
  }

  const {
    receiptNumber, invoiceNumber, date, time,
    receiptType, narrative, amount, currency
  } = req.body;

  let images = req.files.map(f => f.path);

  for (let i = 0; i < images.length; i++) {
    if (images[i].toLowerCase().endsWith('.heic')) {
      try {
        images[i] = await convertHEICtoJPG(images[i]);
      } catch (err) {
        return res.status(500).json({ message: 'HEIC conversion failed' });
      }
    }
  }

  try {
    const result = await Invoice.updateInvoice(req.params.id, {
      receiptNumber, invoiceNumber, date, time,
      receiptType, narrative, amount, currency
    });

    if (result.affectedRows === 0)
      return res.status(404).json({ message: 'Invoice not found' });

    if (images.length) await Invoice.addInvoiceImages(req.params.id, images);

    res.json({ message: 'Invoice updated', id: req.params.id, images });
  } catch (err) {
    res.status(500).json({ message: 'Update error', error: err.message });
  }
});

// 🖼️ GET invoice images
router.get('/:id/images', async (req, res) => {
  try {
    const images = await Invoice.getInvoiceImages(req.params.id);
    res.json({ images });
  } catch (err) {
    res.status(500).json({ message: 'Could not get images', error: err.message });
  }
});

// ❌ DELETE invoice
router.delete('/:id', async (req, res) => {
  try {
    const result = await Invoice.deleteInvoice(req.params.id);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
});

// 🧹 DELETE image only
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

// 📸 TEST UPLOAD route
router.post('/test-upload', upload.array('images', 5), (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ message: 'No valid image files uploaded (check format)' });
  }

  console.log('✅ Test Upload - Files received:');
  req.files.forEach((f, i) => {
    console.log(`📎 ${i + 1}: ${f.originalname} (${f.mimetype})`);
  });

  res.status(200).json({
    message: 'Test upload successful',
    files: req.files.map((f) => f.originalname),
  });
});

module.exports = router;
