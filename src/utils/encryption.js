const crypto = require('crypto');

// 32-byte encryption key derived from process.env.ENCRYPTION_KEY or a secure default
const SECRET_KEY = process.env.ENCRYPTION_KEY
  ? crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY)).digest()
  : crypto.createHash('sha256').update('medipulse-hospital-secure-aes256gcm-key-32b').digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a plain text string using AES-256-GCM
 * Output format: iv:authTag:encryptedHex
 */
const encrypt = (text) => {
  if (text === null || text === undefined || text === '') return text;
  const stringValue = typeof text === 'object' ? JSON.stringify(text) : String(text);
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv, {
    authTagLength: AUTH_TAG_LENGTH
  });

  let encrypted = cipher.update(stringValue, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 */
const decrypt = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string' || !encryptedText.includes(':')) {
    return encryptedText;
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    return encryptedText; // Not encrypted with this format
  }

  try {
    const [ivHex, authTagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv, {
      authTagLength: AUTH_TAG_LENGTH
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Try parsing as JSON if possible
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    // If decryption fails (e.g. key mismatch or invalid format), return fallback safely
    return encryptedText;
  }
};

/**
 * Mask sensitive data such as bank account, tax ID, or national ID
 * e.g., "1234567890" -> "******7890"
 */
const maskData = (value, visibleLastChars = 4) => {
  if (!value) return '';
  const str = String(value);
  if (str.length <= visibleLastChars) return str;
  const maskedLength = str.length - visibleLastChars;
  return '*'.repeat(maskedLength) + str.slice(-visibleLastChars);
};

module.exports = {
  encrypt,
  decrypt,
  maskData
};
