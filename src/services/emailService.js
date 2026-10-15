const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Creates and caches the Nodemailer transporter.
 */
const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || 'jkw1434@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
  });
};

/**
 * Send password reset email to a user.
 * 
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.resetToken - Raw reset token
 * @param {string} [options.userName] - Recipient name
 * @returns {Promise<{ success: boolean, messageId?: string, resetUrl: string, reason?: string }>}
 */
const sendPasswordResetEmail = async ({ to, resetToken, userName = 'Staff Member' }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const resetUrl = `${clientUrl}/?resetToken=${encodeURIComponent(resetToken)}`;
  const senderEmail = process.env.SMTP_USER || 'jkw1434@gmail.com';
  const fromAddress = process.env.SMTP_FROM || `"MediPulse Hospital Security" <${senderEmail}>`;

  const transporter = getTransporter();

  if (!transporter) {
    logger.warn(`[Email Service] SMTP_PASS is not set in .env. Password reset email could not be dispatched to ${to}. Direct reset link: ${resetUrl}`);
    return {
      success: false,
      reason: 'SMTP_CREDENTIALS_MISSING',
      resetUrl
    };
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MediPulse Hospital - Password Reset</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 28px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 30px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
    .btn:hover { background: #1d4ed8; }
    .fallback-box { background: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; word-break: break-all; margin-top: 24px; border: 1px solid #e2e8f0; }
    .security-notice { margin-top: 28px; padding: 14px; background: #fffbeb; border-radius: 8px; border-left: 4px solid #f59e0b; font-size: 12px; color: #92400e; line-height: 1.5; }
    .footer { background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MediPulse Hospital</h1>
      <p>Healthcare Identity & Access Management</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${userName},</div>
      <p class="message">
        A request has been initiated to reset the password for your MediPulse Hospital clinical/staff account (<strong>${to}</strong>).
      </p>
      <div class="btn-container">
        <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
      </div>
      <p class="message" style="font-size: 13px;">
        Or copy and paste this link into your web browser:
      </p>
      <div class="fallback-box">
        ${resetUrl}
      </div>
      <div class="security-notice">
        <strong>Security Notice:</strong> This password reset link is strictly confidential and expires in <strong>30 minutes</strong>. If you did not initiate this request, no further action is required; your current credentials remain secure. For anomalies, contact Superadmin (<a href="mailto:${senderEmail}">${senderEmail}</a>).
      </div>
    </div>
    <div class="footer">
      &copy; 2026 MediPulse Hospital Management Systems. All rights reserved.<br />
      Dispatched by Superadmin System Account: ${senderEmail}
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `Hello ${userName},

A password reset request was initiated for your MediPulse Hospital account (${to}).

To set a new password, click the link below or copy it into your browser:
${resetUrl}

This link is valid for 30 minutes.

If you did not make this request, please disregard this email.
Superadmin Contact: ${senderEmail}

© 2026 MediPulse Hospital Management Systems.`;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: 'MediPulse Hospital - Password Reset Request',
      text: textContent,
      html: htmlContent
    });

    logger.info(`[Email Service] Password reset email successfully dispatched to ${to} (Message ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      resetUrl
    };
  } catch (error) {
    logger.error(`[Email Service Error] Failed to send email to ${to}: ${error.message}`, { stack: error.stack });
    return {
      success: false,
      error: error.message,
      resetUrl
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  getTransporter
};
