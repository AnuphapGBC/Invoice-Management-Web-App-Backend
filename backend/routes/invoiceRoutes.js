const express = require('express');
const multer = require('multer');
const path = require('path');
const Invoice = require('../models/Invoice');
const router = express.Router();
const fs = require('fs');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Create Invoice with Images
router.post('/', upload.array('images', 10), async (req, res) => {
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
    res.status(400).json({ message: 'Failed to create invoice', error: error.message });
  }
});

// Get All Invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.getAllInvoices();
    res.status(200).json({ message: 'Invoices retrieved successfully', invoices });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve invoices', error: error.message });
  }
});

// Get Invoice by ID including Images
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    const images = await Invoice.getInvoiceImages(req.params.id);
    res.status(200).json({ message: 'Invoice retrieved successfully', ...invoice, images });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve invoice', error: error.message });
  }
});

// Update Invoice with Images
router.put('/:id', upload.array('images', 10), async (req, res) => {
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
    res.status(400).json({ message: 'Failed to update invoice', error: error.message });
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

// Add Image to Invoice
router.post('/:id/images', upload.single('image'), async (req, res) => {
  const invoiceId = req.params.id;
  const imageUrl = req.file ? req.file.path : null;

  if (!imageUrl) {
    return res.status(400).json({ message: 'Image file is missing' });
  }

  try {
    await Invoice.addInvoiceImages(invoiceId, [imageUrl]);
    res.status(201).json({ message: 'Invoice image added successfully', invoiceId, imageUrl });
  } catch (error) {
    res.status(400).json({ message: 'Failed to add invoice image', error: error.message });
  }
});

// Get Images for Invoice
router.get('/:id/images', async (req, res) => {
  const invoiceId = req.params.id;
  try {
    const images = await Invoice.getInvoiceImages(invoiceId);
    res.status(200).json({ message: 'Invoice images retrieved successfully', images });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve invoice images', error: error.message });
  }
});

// Delete Image Route
router.delete('/images', async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  try {
    console.log('Deleting image:', imageUrl); // Debugging: Check the received imageUrl

    // Delete from database
    const result = await Invoice.deleteInvoiceImage(imageUrl);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete the actual file from the server
    const imagePath = path.join(__dirname, '..', imageUrl);
    fs.unlink(imagePath, (err) => {
      if (err) {
        console.error('Failed to delete image file', err);
        // Proceed with the response, but you may want to handle file errors differently
      }
    });

    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Failed to delete image', error);
    res.status(500).json({ message: 'Failed to delete image', error: error.message });
  }
});


module.exports = router;
