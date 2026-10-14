const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let fcmInitialized = false;
let isMock = true;

/**
 * Initialize Firebase Admin SDK
 * Supports:
 * 1. JSON string in process.env.FIREBASE_SERVICE_ACCOUNT
 * 2. File path in process.env.FIREBASE_CREDENTIALS_PATH or GOOGLE_APPLICATION_CREDENTIALS
 * 3. Graceful simulation/mock mode if credentials are not yet supplied in .env
 */
function initFcm() {
  if (fcmInitialized) return;

  try {
    let credential = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
        logger.info('[FCM Service] Initialized using FIREBASE_SERVICE_ACCOUNT JSON environment variable');
      } catch (parseErr) {
        logger.error(`[FCM Service] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${parseErr.message}`);
      }
    } else if (process.env.FIREBASE_CREDENTIALS_PATH) {
      const filePath = path.resolve(process.env.FIREBASE_CREDENTIALS_PATH);
      if (fs.existsSync(filePath)) {
        credential = admin.credential.cert(require(filePath));
        logger.info(`[FCM Service] Initialized using service account file at: ${filePath}`);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
      logger.info('[FCM Service] Initialized using GOOGLE_APPLICATION_CREDENTIALS');
    }

    if (credential) {
      admin.initializeApp({ credential });
      fcmInitialized = true;
      isMock = false;
      logger.info('[FCM Service] Firebase Cloud Messaging is live and connected.');
    } else {
      fcmInitialized = true;
      isMock = true;
      logger.info('[FCM Service] Running in fallback/simulation mode. Push notifications will be logged and simulated until FIREBASE_SERVICE_ACCOUNT credentials are provided.');
    }
  } catch (error) {
    logger.error(`[FCM Service] Initialization warning: ${error.message}. Running in simulation mode.`);
    fcmInitialized = true;
    isMock = true;
  }
}

// Auto-initialize on module load
initFcm();

/**
 * Check if FCM is connected to live Firebase project
 */
const isFcmConfigured = () => !isMock;

/**
 * Send push notification to a single FCM device token
 * @param {string} token - FCM Registration Token
 * @param {object} payload - { title, body, data, imageUrl }
 */
const sendToToken = async (token, { title, body, data = {}, imageUrl = null }) => {
  if (!token) {
    return { success: false, message: 'FCM token required' };
  }

  const message = {
    token,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {})
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'medipulse_hospital_alerts'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  if (isMock) {
    logger.info(`[FCM Simulated Send] Token: ${token.substring(0, 15)}... | Title: "${title}" | Body: "${body}"`);
    return {
      success: true,
      simulated: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
    };
  }

  try {
    const response = await admin.messaging().send(message);
    logger.info(`[FCM Send Success] MessageId: ${response}`);
    return { success: true, messageId: response };
  } catch (err) {
    logger.error(`[FCM Send Error] Failed to send to token ${token.substring(0, 10)}...: ${err.message}`);
    const isInvalid =
      err.code === 'messaging/invalid-registration-token' ||
      err.code === 'messaging/registration-token-not-registered';
    return { success: false, error: err.message, code: err.code, isInvalidToken: isInvalid };
  }
};

/**
 * Send multicast push notification to multiple FCM device tokens
 * @param {string[]} tokens - Array of FCM registration tokens
 * @param {object} payload - { title, body, data, imageUrl }
 */
const sendMulticast = async (tokens, { title, body, data = {}, imageUrl = null }) => {
  if (!tokens || tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Deduplicate and filter non-empty tokens
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];

  if (isMock) {
    logger.info(`[FCM Simulated Multicast] Recipients: ${uniqueTokens.length} devices | Title: "${title}" | Body: "${body}"`);
    return {
      success: true,
      simulated: true,
      successCount: uniqueTokens.length,
      failureCount: 0,
      invalidTokens: []
    };
  }

  const message = {
    tokens: uniqueTokens,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {})
    },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'medipulse_hospital_alerts'
      }
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    const invalidTokens = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(uniqueTokens[idx]);
        }
      }
    });

    logger.info(`[FCM Multicast] Sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens
    };
  } catch (err) {
    logger.error(`[FCM Multicast Error] ${err.message}`);
    return { success: false, error: err.message, successCount: 0, failureCount: uniqueTokens.length, invalidTokens: [] };
  }
};

/**
 * Send notification to a topic (e.g. department or hospital-wide)
 * @param {string} topic - e.g. "hospital_all", "dept_pharmacy"
 * @param {object} payload - { title, body, data }
 */
const sendToTopic = async (topic, { title, body, data = {} }) => {
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]+/g, '_');

  if (isMock) {
    logger.info(`[FCM Simulated Topic] Topic: /topics/${sanitizedTopic} | Title: "${title}" | Body: "${body}"`);
    return {
      success: true,
      simulated: true,
      messageId: `mock-topic-${Date.now()}`
    };
  }

  const message = {
    topic: sanitizedTopic,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
    )
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`[FCM Topic Success] Sent to topic /topics/${sanitizedTopic}, MessageId: ${response}`);
    return { success: true, messageId: response };
  } catch (err) {
    logger.error(`[FCM Topic Error] Failed to send to topic ${sanitizedTopic}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Subscribe devices to a topic
 */
const subscribeToTopic = async (tokens, topic) => {
  const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.~%]+/g, '_');
  if (isMock) {
    return { success: true, simulated: true };
  }
  try {
    const res = await admin.messaging().subscribeToTopic(tokens, sanitizedTopic);
    return { success: true, successCount: res.successCount, failureCount: res.failureCount };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  isFcmConfigured,
  sendToToken,
  sendMulticast,
  sendToTopic,
  subscribeToTopic
};
