const jwt = require('jsonwebtoken');
const logger = require('./logger');

const generateAccessToken = (user) => {
  logger.debug(`[Token Util] Generating Access Token for user ID ${user._id} (${user.email}, Role: ${user.role})`);
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  logger.debug(`[Token Util] Generating Refresh Token for user ID ${user._id}`);
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.debug(`[Cookie Util] Setting HTTP-only auth cookies (secure: ${isProduction})`);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.debug('[Cookie Util] Clearing auth cookies');

  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0)
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0)
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies
};

