const db = require('../database/db');

class Invoice {
  static async createInvoice({ receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy }) {
    const [result] = await db.query(
      'INSERT INTO invoices (receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, createdBy]
    );
    return result;
  }

  static async getAllInvoices() {
    const [invoices] = await db.query('SELECT * FROM invoices');
    return invoices;
  }

  static async getInvoiceById(id) {
    const [invoice] = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    return invoice[0];
  }

  static async updateInvoice(id, { receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency }) {
    const [result] = await db.query(
      'UPDATE invoices SET receiptNumber = ?, invoiceNumber = ?, date = ?, time = ?, receiptType = ?, narrative = ?, amount = ?, currency = ? WHERE id = ?',
      [receiptNumber, invoiceNumber, date, time, receiptType, narrative, amount, currency, id]
    );
    return result;
  }

  static async deleteInvoice(id) {
    const [result] = await db.query('DELETE FROM invoices WHERE id = ?', [id]);
    return result;
  }

  static async addInvoiceImages(invoiceId, images) {
    const insertQuery = 'INSERT INTO invoice_images (invoiceId, imageUrl) VALUES (?, ?)';
    const promises = images.map((imageUrl) => db.query(insertQuery, [invoiceId, imageUrl]));
    return Promise.all(promises);
  }

  static async getInvoiceImages(invoiceId) {
    const [images] = await db.query('SELECT * FROM invoice_images WHERE invoiceId = ?', [invoiceId]);
    return images;
  }

  static async deleteInvoiceImage(imageUrl) {
    // The query must use parameterized inputs properly to treat imageUrl as a string.
    const [result] = await db.query('DELETE FROM invoice_images WHERE imageUrl = ?', [imageUrl]);
    return result;
  }

}

module.exports = Invoice;
