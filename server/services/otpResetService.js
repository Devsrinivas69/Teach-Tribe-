const crypto = require('crypto');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

const OTP_LENGTH = 6;
const OTP_TTL_MS = Number(process.env.PASSWORD_RESET_OTP_TTL_MS || 10 * 60 * 1000);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.PASSWORD_RESET_RESEND_COOLDOWN_MS || 60 * 1000);
const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_MAX_OTP_ATTEMPTS || 5);
const RESET_TOKEN_TTL_MS = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MS || 10 * 60 * 1000);

// Firestore collections for persistent OTP/token storage
const OTP_COLLECTION = 'password_reset_otps';
const TOKEN_COLLECTION = 'password_reset_tokens';

const normalizeEmail = (email) => email.trim().toLowerCase();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmailValid = (email) => emailRegex.test(normalizeEmail(email));

const now = () => Date.now();

/**
 * Get Firestore instance (lazy, so firebase-admin has time to initialise).
 */
const getDb = () => {
  try {
    return admin.firestore();
  } catch {
    return null;
  }
};

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = (10 ** OTP_LENGTH) - 1;
  const value = crypto.randomInt(min, max + 1);
  return String(value);
};

const generateSalt = () => crypto.randomBytes(16).toString('hex');

const hashOtp = (otp, salt) => crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');

const generateResetToken = () => crypto.randomBytes(32).toString('hex');

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

const sendOtpEmail = async (email, otp) => {
  const from = process.env.PASSWORD_RESET_FROM_EMAIL || process.env.SMTP_USER;
  const appName = process.env.PASSWORD_RESET_APP_NAME || 'TeachTribe';

  const transporter = getTransporter();
  if (!transporter || !from) {
    return false;
  }

  await transporter.sendMail({
    from,
    to: email,
    subject: `${appName} password reset code`,
    text: `Your ${appName} password reset OTP is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>${appName} Password Reset</h2>
        <p>Your OTP code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 3px;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  return true;
};

/**
 * Issue an OTP for the given email address.
 * Stores the hashed OTP in Firestore for persistence across serverless invocations.
 */
const issueOtp = async (email) => {
  const db = getDb();
  if (!db) {
    return { success: false, message: 'Database not available.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const docRef = db.collection(OTP_COLLECTION).doc(normalizedEmail);
  const ts = now();

  // Check cooldown
  const existing = await docRef.get();
  if (existing.exists) {
    const data = existing.data();
    if ((ts - data.lastSentAt) < OTP_RESEND_COOLDOWN_MS) {
      const waitMs = OTP_RESEND_COOLDOWN_MS - (ts - data.lastSentAt);
      return {
        success: false,
        message: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting a new OTP.`,
      };
    }
  }

  const otp = generateOtp();
  const salt = generateSalt();
  const otpHash = hashOtp(otp, salt);

  await docRef.set({
    otpHash,
    salt,
    attempts: 0,
    expiresAt: ts + OTP_TTL_MS,
    lastSentAt: ts,
  });

  const deliveredViaEmail = await sendOtpEmail(normalizedEmail, otp);

  if (!deliveredViaEmail) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'Email delivery is not configured. Please contact support.',
      };
    }

    console.log(`[PasswordReset][DEV] OTP for ${normalizedEmail}: ${otp}`);
  }

  return {
    success: true,
    message: deliveredViaEmail
      ? 'OTP sent to your email.'
      : 'OTP generated. Check server logs in development mode.',
  };
};

/**
 * Verify an OTP. On success, creates a reset token in Firestore.
 */
const verifyOtp = async (email, otp) => {
  const db = getDb();
  if (!db) {
    return { success: false, message: 'Database not available.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const docRef = db.collection(OTP_COLLECTION).doc(normalizedEmail);
  const doc = await docRef.get();

  if (!doc.exists) {
    return {
      success: false,
      message: 'OTP not found or expired. Please request a new OTP.',
    };
  }

  const record = doc.data();

  if (record.expiresAt <= now()) {
    await docRef.delete();
    return {
      success: false,
      message: 'OTP expired. Please request a new OTP.',
    };
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await docRef.delete();
    return {
      success: false,
      message: 'Too many failed attempts. Please request a new OTP.',
    };
  }

  const candidateHash = hashOtp(otp, record.salt);
  if (candidateHash !== record.otpHash) {
    await docRef.update({ attempts: record.attempts + 1 });

    return {
      success: false,
      message: 'Invalid OTP.',
      remainingAttempts: Math.max(OTP_MAX_ATTEMPTS - (record.attempts + 1), 0),
    };
  }

  // OTP matches — delete it and create a reset token
  await docRef.delete();

  const resetToken = generateResetToken();
  await db.collection(TOKEN_COLLECTION).doc(resetToken).set({
    email: normalizedEmail,
    expiresAt: now() + RESET_TOKEN_TTL_MS,
  });

  return {
    success: true,
    resetToken,
    message: 'OTP verified successfully.',
  };
};

/**
 * Validate a reset token from Firestore.
 */
const validateResetToken = async (email, resetToken) => {
  const db = getDb();
  if (!db) {
    return { success: false, message: 'Database not available.' };
  }

  const normalizedEmail = normalizeEmail(email);
  const doc = await db.collection(TOKEN_COLLECTION).doc(resetToken).get();

  if (!doc.exists) {
    return {
      success: false,
      message: 'Reset token is invalid or expired. Please verify OTP again.',
    };
  }

  const tokenRecord = doc.data();

  if (tokenRecord.email !== normalizedEmail || tokenRecord.expiresAt <= now()) {
    await db.collection(TOKEN_COLLECTION).doc(resetToken).delete();
    return {
      success: false,
      message: 'Reset token is invalid or expired. Please verify OTP again.',
    };
  }

  return { success: true };
};

/**
 * Consume (delete) a reset token after successful password change.
 */
const consumeResetToken = async (resetToken) => {
  const db = getDb();
  if (!db) return;
  await db.collection(TOKEN_COLLECTION).doc(resetToken).delete();
};

module.exports = {
  OTP_LENGTH,
  isEmailValid,
  issueOtp,
  verifyOtp,
  validateResetToken,
  consumeResetToken,
  normalizeEmail,
};
