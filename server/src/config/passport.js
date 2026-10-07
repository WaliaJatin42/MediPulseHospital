const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const logger = require('../utils/logger');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  logger.info('[Passport] Initializing Google OAuth 2.0 Strategy');
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;
          const googleId = profile.id;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : undefined;
          const name = profile.displayName ||
            `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() ||
            'Google User';

          logger.info(`[OAuth] Processing Google auth callback for profile ID: ${googleId}, Email: ${email}`);

          // 1. Search by googleId
          let user = await User.findOne({ googleId });

          if (user) {
            logger.info(`[OAuth] Existing user found by googleId: ${user.email} (ID: ${user._id})`);
            return done(null, user);
          }

          // 2. Search by email (Account Linking)
          if (email) {
            user = await User.findOne({ email });
            if (user) {
              logger.info(`[OAuth] Linking existing account ${user.email} to Google ID ${googleId}`);
              user.googleId = googleId;
              if (avatar && (!user.avatar || user.avatar.includes('unsplash'))) {
                user.avatar = avatar;
              }
              await user.save();
              return done(null, user);
            }
          }

          // 3. Create new Google user
          logger.info(`[OAuth] Creating new user account from Google OAuth: ${email} (${name})`);
          user = await User.create({
            name,
            email,
            googleId,
            avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            authProvider: 'google',
            role: 'user',
            isActive: true
          });

          logger.info(`[OAuth] New user account created via Google OAuth: ${user.email} (ID: ${user._id})`);
          return done(null, user);
        } catch (error) {
          logger.error(`[OAuth Error] Google authentication strategy failed: ${error.message}`, { stack: error.stack });
          return done(error, null);
        }
      }
    )
  );
} else {
  logger.warn('[Passport Warning] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in environment variables. Google OAuth strategy is not initialized.');
}

module.exports = passport;

