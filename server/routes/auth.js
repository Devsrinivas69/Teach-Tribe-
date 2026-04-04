const express = require('express');
const {
  OTP_LENGTH,
  isEmailValid,
  issueOtp,
  verifyOtp,
  validateResetToken,
  consumeResetToken,
  normalizeEmail,
} = require('../services/otpResetService');
const { getFirebaseAdminAuth, getFirebaseAdminError } = require('../services/firebaseAdmin');

const router = express.Router();

const getAdminAuthOrError = (res) => {
  const auth = getFirebaseAdminAuth();
  if (auth) return auth;

  const details = getFirebaseAdminError();
  res.status(503).json({
    success: false,
    error: 'Password reset service is not configured on server.',
    details,
  });
  return null;
};

router.post('/password-reset/request-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    if (!isEmailValid(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    const adminAuth = getAdminAuthOrError(res);
    if (!adminAuth) return;

    try {
      await adminAuth.getUserByEmail(email);
    } catch {
      // Intentionally do not reveal whether a user exists.
      return res.json({
        success: true,
        message: 'If this email is registered, an OTP has been sent.',
      });
    }

    const issued = await issueOtp(email);
    if (!issued.success) {
      return res.status(429).json({
        success: false,
        error: issued.message,
      });
    }

    return res.json({
      success: true,
      message: issued.message || 'If this email is registered, an OTP has been sent.',
      otpLength: OTP_LENGTH,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to issue OTP.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/password-reset/verify-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const otp = String(req.body?.otp || '').trim();

    if (!isEmailValid(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        error: 'OTP must be a 6-digit code.',
      });
    }

    const verified = await verifyOtp(email, otp);
    if (!verified.success) {
      return res.status(400).json({
        success: false,
        error: verified.message,
        remainingAttempts: verified.remainingAttempts,
      });
    }

    return res.json({
      success: true,
      message: verified.message,
      resetToken: verified.resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/password-reset/reset-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || '');
    const resetToken = String(req.body?.resetToken || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!isEmailValid(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters.',
      });
    }

    const tokenValid = await validateResetToken(email, resetToken);
    if (!tokenValid.success) {
      return res.status(400).json({
        success: false,
        error: tokenValid.message,
      });
    }

    const adminAuth = getAdminAuthOrError(res);
    if (!adminAuth) return;

    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.updateUser(user.uid, { password: newPassword });

    await consumeResetToken(resetToken);

    return res.json({
      success: true,
      message: 'Password reset successful. You can now login with the new password.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

module.exports = { router };
