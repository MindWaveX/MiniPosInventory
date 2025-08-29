import emailjs from '@emailjs/browser';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// EmailJS configuration
const EMAILJS_PUBLIC_KEY = 'YOUR_KEY';
const EMAILJS_SERVICE_ID = 'SERVICE_ID';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Get alert email from settings
 * @returns {Promise<string>} - Alert email address
 * Note: Email is stored in Firestore under the field 'alert_email'
 */
const getAlertEmail = async () => {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const email = docSnap.data().alert_email || 'your_email@git.com'; // fallback email updated
      console.log('[DEBUG] getAlertEmail: fetched from Firestore:', email);
      return email;
    }
    console.log('[DEBUG] getAlertEmail: using default email your_email@git.com');
    return 'your_email@git.com'; // Default email
  } catch (error) {
    console.error('Error fetching alert email:', error);
    console.log('[DEBUG] getAlertEmail: using default email your_email@git.com due to error');
    return 'your_email@git.com'; // Default email on error
  }
};

/**
 * Test EmailJS configuration
 * @returns {Promise} - Test result
 */
export const testEmailJS = async () => {
  try {
    console.log('Testing EmailJS configuration...');
    console.log('Public Key:', EMAILJS_PUBLIC_KEY);
    console.log('Service ID:', EMAILJS_SERVICE_ID);
    
    const alertEmail = await getAlertEmail();
    
    const templateParams = {
      to_email: alertEmail,
      to_name: 'Admin',
      from_name: 'Test System',
      message: 'This is a test email from the inventory system.',
      subject: 'Test Email - Inventory System'
    };

    console.log('Sending test email with params:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'TEMPLATE_ID', // Use your actual template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Test email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Test email failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    throw error;
  }
};

/**
 * Send low stock alert email to admin
 * @param {string} productName - Name of the product
 * @param {string} sku - Product SKU
 * @param {number} currentQuantity - Current quantity in stock
 * @param {number} alertLimit - Alert limit for the product
 * @returns {Promise} - Email sending result
 */
export const sendLowStockEmail = async (productName, sku, currentQuantity, alertLimit) => {
  try {
    // Get alert email from settings
    const alertEmail = await getAlertEmail();
    console.log('[DEBUG] sendLowStockEmail: using alertEmail:', alertEmail);
    
    // Create a simple message for now - we'll use a basic template
    const message = `Low stock alert: ${productName} (SKU: ${sku}) now has only ${currentQuantity} left (alert limit: ${alertLimit}).`;
    
    const templateParams = {
      to_email: alertEmail,
      to_name: 'Admin',
      from_name: 'Inventory System',
      message: message,
      subject: `Low Stock Alert - ${productName}`,
      product_name: productName,
      sku: sku,
      current_quantity: currentQuantity,
      alert_limit: alertLimit
    };

    console.log('Sending email with params:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'TEMPLATE_ID', // Use your actual template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Low stock email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send low stock email:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    throw error;
  }
};

/**
 * Send general notification email to admin
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {Promise} - Email sending result
 */
export const sendNotificationEmail = async (subject, message) => {
  try {
    // Get alert email from settings
    const alertEmail = await getAlertEmail();
    console.log('[DEBUG] sendNotificationEmail: using alertEmail:', alertEmail);
    
    const templateParams = {
      to_email: alertEmail,
      to_name: 'Admin',
      from_name: 'Inventory System',
      subject: subject,
      message: message
    };

    console.log('Sending notification email with params:', templateParams);

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'TEMPLATE_ID', // Use your actual template ID
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Notification email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send notification email:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      response: error.response
    });
    throw error;
  }
}; 