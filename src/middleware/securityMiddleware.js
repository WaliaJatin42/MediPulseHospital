const logger = require('../utils/logger');

/**
 * Regular expressions to detect HTML tags, CSS injection, script injection, and dangerous pseudo-protocols
 */
const DANGEROUS_PATTERNS = [
  // 1. Any HTML tags (e.g., <script>, <iframe>, <img>, <svg>, <style>, <b>, <a>, </p>, <!DOCTYPE>, <!-- -->)
  /<\s*[a-z!/][\s\S]*?>/i,
  // 2. Unclosed opening HTML or script tags (e.g. <script src=..., <img src=x, <svg onload=...)
  /<\s*(script|style|iframe|object|embed|svg|applet|meta|link|base|form|input|body|html|video|audio|source)\b/i,
  // 3. Inline JavaScript Event Handlers (e.g. onload=, onerror=, onclick=, onmouseover=, onfocus=, onblur=)
  /\bon[a-z]{3,20}\s*=/i,
  // 4. Script pseudo-protocols
  /javascript\s*:/i,
  /vbscript\s*:/i,
  // 5. Data URIs executing active content
  /data\s*:\s*text\/(html|javascript|css)/i,
  // 6. CSS expression and behavior injection (IE legacy exploits)
  /expression\s*\(/i,
  /behavior\s*:/i,
  // 7. CSS @import directives
  /@import\s+(url|\"|\')/i,
  // 8. CSS moz-binding injection
  /-moz-binding\s*:/i
];

/**
 * Prototype pollution and NoSQL injection keys
 */
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Check a string value for any disallowed HTML, CSS, or script payloads,
 * including URL-encoded and HTML entity variations.
 */
const checkStringForThreats = (str, currentPath) => {
  if (typeof str !== 'string') return null;

  // 1. Check raw string against patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(str)) {
      return { isViolating: true, field: currentPath || 'input', reason: 'Disallowed HTML, CSS, or script code detected' };
    }
  }

  // 2. Check URL-decoded string if it contains % (e.g., %3Cscript%3E or %253Cscript%253E)
  if (str.includes('%')) {
    try {
      const decodedOnce = decodeURIComponent(str);
      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(decodedOnce)) {
          return { isViolating: true, field: currentPath || 'input', reason: 'Disallowed URL-encoded script/HTML detected' };
        }
      }
      if (decodedOnce.includes('%')) {
        const decodedTwice = decodeURIComponent(decodedOnce);
        for (const pattern of DANGEROUS_PATTERNS) {
          if (pattern.test(decodedTwice)) {
            return { isViolating: true, field: currentPath || 'input', reason: 'Disallowed multi-encoded script/HTML detected' };
          }
        }
      }
    } catch (e) {
      // Ignore malformed URI sequences
    }
  }

  // 3. Check HTML entity encoded characters (e.g., &lt;script&gt;)
  if (/&(#(x[0-9a-f]+|[0-9]+)|[a-z]+);/i.test(str)) {
    const unescaped = str
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&#x2f;/gi, '/')
      .replace(/&#39;/gi, "'")
      .replace(/&#47;/gi, '/');
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(unescaped)) {
        return { isViolating: true, field: currentPath || 'input', reason: 'Disallowed HTML entity-encoded code detected' };
      }
    }
  }

  return null;
};

/**
 * Recursively inspect and validate an input object, array, or string.
 * Returns { isViolating: boolean, field: string, reason: string }
 */
const inspectInput = (input, currentPath = '') => {
  if (input === null || input === undefined) {
    return { isViolating: false };
  }

  // Check strings
  if (typeof input === 'string') {
    const threat = checkStringForThreats(input, currentPath);
    if (threat) return threat;
    return { isViolating: false };
  }

  // Check arrays
  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const res = inspectInput(input[i], `${currentPath}[${i}]`);
      if (res.isViolating) return res;
    }
    return { isViolating: false };
  }

  // Check objects
  if (typeof input === 'object') {
    for (const key of Object.keys(input)) {
      // 1. Prototype pollution check
      if (FORBIDDEN_KEYS.includes(key)) {
        return { isViolating: true, field: `${currentPath}.${key}`, reason: 'Forbidden prototype key' };
      }

      // 2. NoSQL injection check (keys starting with $)
      if (key.startsWith('$') || key.includes('.')) {
        return { isViolating: true, field: `${currentPath}.${key}`, reason: 'Disallowed MongoDB operator' };
      }

      // 3. Inspect key name itself for HTML/scripts
      const keyThreat = checkStringForThreats(key, `${currentPath}.${key}`);
      if (keyThreat) return keyThreat;

      // 4. Inspect value recursively
      const res = inspectInput(input[key], currentPath ? `${currentPath}.${key}` : key);
      if (res.isViolating) return res;
    }
  }

  return { isViolating: false };
};

/**
 * Express Middleware: VAPT Security Guard
 * Scans req.body, req.query, and req.params for XSS, HTML/CSS/Script injections, and NoSQL payloads.
 */
const vaptSecurityGuard = (req, res, next) => {
  // 0. Check Raw Body for Prototype Pollution & Payload Attacks
  if (req.rawBody && typeof req.rawBody === 'string') {
    if (/"(?:__proto__|constructor|prototype)"\s*:/i.test(req.rawBody)) {
      logger.warn(`[VAPT Security Alert] Blocked prototype pollution payload in raw body from IP ${req.ip} on ${req.method} ${req.originalUrl}`);
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Prototype pollution payload detected in request body. Request blocked for VAPT security compliance.',
        field: '__proto__'
      });
    }
  }

  // Check URL path and query string for prototype pollution attempts
  if (req.originalUrl && /(__proto__|constructor(\.prototype)?)/i.test(req.originalUrl)) {
    logger.warn(`[VAPT Security Alert] Blocked prototype pollution attempt in URL from IP ${req.ip} on ${req.method} ${req.originalUrl}`);
    return res.status(400).json({
      success: false,
      message: 'Security Alert: Prototype pollution payload detected in URL. Request blocked for VAPT security compliance.',
      field: 'url'
    });
  }

  // 1. Check Request Body
  if (req.body && typeof req.body === 'object') {
    const bodyCheck = inspectInput(req.body, 'body');
    if (bodyCheck.isViolating) {
      logger.warn(`[VAPT Security Alert] Blocked malicious payload in body field '${bodyCheck.field}' from IP ${req.ip} on ${req.method} ${req.originalUrl} (${bodyCheck.reason})`);
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Malicious or disallowed characters detected (HTML, CSS, or script code). Request blocked for VAPT security compliance.',
        field: bodyCheck.field
      });
    }
  }

  // 2. Check Query Parameters
  if (req.query && typeof req.query === 'object') {
    const queryCheck = inspectInput(req.query, 'query');
    if (queryCheck.isViolating) {
      logger.warn(`[VAPT Security Alert] Blocked malicious payload in query parameter '${queryCheck.field}' from IP ${req.ip} on ${req.method} ${req.originalUrl} (${queryCheck.reason})`);
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Malicious or disallowed characters detected in query parameters. Request blocked for VAPT security compliance.',
        field: queryCheck.field
      });
    }
  }

  // 3. Check Route Parameters
  if (req.params && typeof req.params === 'object') {
    const paramsCheck = inspectInput(req.params, 'params');
    if (paramsCheck.isViolating) {
      logger.warn(`[VAPT Security Alert] Blocked malicious payload in URL parameter '${paramsCheck.field}' from IP ${req.ip} on ${req.method} ${req.originalUrl} (${paramsCheck.reason})`);
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Malicious or disallowed characters detected in URL parameter. Request blocked for VAPT security compliance.',
        field: paramsCheck.field
      });
    }
  }

  next();
};

module.exports = { vaptSecurityGuard, inspectInput };
