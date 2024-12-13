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

  // New Method: Retrieve Receipt Types from Database ENUM
  static async getReceiptTypes() {
    try {
      const [result] = await db.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'invoices' AND COLUMN_NAME = 'receiptType';
      `);

      if (!result || !result[0]) {
        throw new Error('Receipt types not found');
      }

      const columnType = result[0].COLUMN_TYPE; // e.g., "enum('Invoice','Gas','Support Office','Meal Expense','Representation Expense','Other')"
      const receiptTypes = columnType.match(/enum\((.*)\)/)[1]
        .replace(/'/g, '') // Remove single quotes
        .split(','); // Split into an array

      return receiptTypes;
    } catch (error) {
      console.error('Error fetching receipt types:', error.message);
      throw error;
    }
  }
}

module.exports = Invoice;
