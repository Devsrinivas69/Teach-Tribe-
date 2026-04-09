const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
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
const MASTER_ADMIN_EMAIL = (process.env.MASTER_ADMIN_EMAIL || 'admintechtribe@gmail.com').trim().toLowerCase();
const ADMIN_ACCESS_COLLECTION = 'admin_access_requests';
const APP_NAME = process.env.PASSWORD_RESET_APP_NAME || 'TeachTribe';
const isProd = process.env.NODE_ENV === 'production';

const normalizeSpaces = (value) => value.replace(/\s+/g, ' ').trim();

const sanitizeApplicantName = (rawName) => normalizeSpaces(String(rawName || '').normalize('NFKC'));
const sanitizeWorkspaceName = (rawWorkspaceName) => normalizeSpaces(String(rawWorkspaceName || '').normalize('NFKC'));

const isApplicantNameValid = (value) => /^(?=.{2,80}$)[A-Za-z][A-Za-z .'-]*$/.test(value);
const isWorkspaceNameValid = (value) => /^(?=.{3,80}$)[A-Za-z0-9][A-Za-z0-9 '&-]*$/.test(value);

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

const sendMailIfConfigured = async ({ to, subject, text, html }) => {
  const from = process.env.ADMIN_APPLICATION_FROM_EMAIL || process.env.SMTP_USER;
  const transporter = getTransporter();
  if (!from || !transporter) return false;

  await transporter.sendMail({ from, to, subject, text, html });
  return true;
};

const sendAdminApplicationEmailToMaster = async ({ applicantName, applicantEmail, workspaceName, requestedAt }) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/master-admin`;
  return sendMailIfConfigured({
    to: MASTER_ADMIN_EMAIL,
    subject: `${APP_NAME}: New admin access request`,
    text: [
      'A new admin access request was submitted.',
      '',
      `Name: ${applicantName}`,
      `Email: ${applicantEmail}`,
      `Requested workspace: ${workspaceName}`,
      `Requested at: ${requestedAt}`,
      '',
      `Review in dashboard: ${dashboardUrl}`,
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>New Admin Access Request</h2>
        <p><strong>Name:</strong> ${applicantName}</p>
        <p><strong>Email:</strong> ${applicantEmail}</p>
        <p><strong>Requested workspace:</strong> ${workspaceName}</p>
        <p><strong>Requested at:</strong> ${requestedAt}</p>
        <p><a href="${dashboardUrl}">Open Master Admin Dashboard</a></p>
      </div>
    `,
  });
};

const sendAdminApprovalEmail = async ({ applicantEmail, applicantName, workspaceName, password }) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  return sendMailIfConfigured({
    to: applicantEmail,
    subject: `${APP_NAME}: Admin access approved`,
    text: [
      `Hi ${applicantName},`,
      '',
      'Your admin access request has been approved.',
      `Workspace: ${workspaceName}`,
      '',
      'Login credentials:',
      `Email: ${applicantEmail}`,
      `Password: ${password}`,
      '',
      `Login here: ${loginUrl}`,
      '',
      'For security, please change your password after first login.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Admin Access Approved</h2>
        <p>Hi ${applicantName},</p>
        <p>Your admin access request has been approved.</p>
        <p><strong>Workspace:</strong> ${workspaceName}</p>
        <p><strong>Email:</strong> ${applicantEmail}</p>
        <p><strong>Temporary password:</strong> ${password}</p>
        <p><a href="${loginUrl}">Login to TeachTribe</a></p>
        <p>Please change your password immediately after first login.</p>
      </div>
    `,
  });
};

const sendAdminRejectionEmail = async ({ applicantEmail, applicantName, workspaceName, reason }) => {
  return sendMailIfConfigured({
    to: applicantEmail,
    subject: `${APP_NAME}: Admin access request update`,
    text: [
      `Hi ${applicantName},`,
      '',
      'Your admin access request could not be approved at this time.',
      `Requested workspace: ${workspaceName}`,
      reason ? `Reason: ${reason}` : '',
      '',
      'You can reapply with updated details.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Admin Access Request Update</h2>
        <p>Hi ${applicantName},</p>
        <p>Your admin access request could not be approved at this time.</p>
        <p><strong>Requested workspace:</strong> ${workspaceName}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>You can reapply with updated details.</p>
      </div>
    `,
  });
};

const getAdminFirestoreOrError = (res) => {
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    const details = getFirebaseAdminError();
    if (details) {
      console.error('[AdminAccess] Firebase Admin init error:', details);
    }

    res.status(503).json({
      success: false,
      error: 'Admin onboarding service is not configured on server.',
      ...(isProd ? {} : { details }),
    });
    return null;
  }

  try {
    return admin.firestore();
  } catch {
    res.status(503).json({
      success: false,
      error: 'Database is not available on server.',
    });
    return null;
  }
};

const generateStrongPassword = (length = 14) => {
  const lowers = 'abcdefghijkmnopqrstuvwxyz';
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%&*?';
  const all = `${lowers}${uppers}${numbers}${symbols}`;

  const seed = [
    lowers[crypto.randomInt(0, lowers.length)],
    uppers[crypto.randomInt(0, uppers.length)],
    numbers[crypto.randomInt(0, numbers.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  while (seed.length < length) {
    seed.push(all[crypto.randomInt(0, all.length)]);
  }

  for (let i = seed.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [seed[i], seed[j]] = [seed[j], seed[i]];
  }

  return seed.join('');
};

const createWorkspaceSlug = (workspaceName) => {
  const base = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  return base || 'workspace';
};

const verifyMasterAdminRequest = async (req, res) => {
  const adminAuth = getAdminAuthOrError(res);
  if (!adminAuth) return null;

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token is required.' });
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ success: false, error: 'Authorization token is required.' });
    return null;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = String(decoded.email || '').toLowerCase();
    if (email !== MASTER_ADMIN_EMAIL) {
      res.status(403).json({ success: false, error: 'Only master admin can perform this action.' });
      return null;
    }

    return { adminAuth, decoded, email };
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authorization token.',
      details: error instanceof Error ? error.message : 'Unknown token verification error',
    });
    return null;
  }
};

const getAdminAuthOrError = (res) => {
  const auth = getFirebaseAdminAuth();
  if (auth) return auth;

  const details = getFirebaseAdminError();
  if (details) {
    console.error('[Auth] Firebase Admin init error:', details);
  }

  res.status(503).json({
    success: false,
    error: 'Password reset service is not configured on server.',
    ...(isProd ? {} : { details }),
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

router.post('/admin-access/apply', async (req, res) => {
  try {
    const applicantName = sanitizeApplicantName(req.body?.name || '');
    const applicantEmail = normalizeEmail(req.body?.email || '');
    const workspaceName = sanitizeWorkspaceName(req.body?.workspaceName || '');

    if (!isApplicantNameValid(applicantName)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid full name (2-80 characters).',
      });
    }

    if (!isEmailValid(applicantEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (!isWorkspaceNameValid(workspaceName)) {
      return res.status(400).json({
        success: false,
        error: 'Workspace name must be 3-80 characters and contain only letters, numbers, spaces, apostrophe, ampersand, or hyphen.',
      });
    }

    const db = getAdminFirestoreOrError(res);
    if (!db) return;

    const existingRequests = await db.collection(ADMIN_ACCESS_COLLECTION)
      .where('email', '==', applicantEmail)
      .limit(20)
      .get();

    const hasPendingRequest = existingRequests.docs.some((doc) => {
      const data = doc.data();
      return data.status === 'pending';
    });

    if (hasPendingRequest) {
      return res.status(409).json({
        success: false,
        error: 'An admin access request is already pending for this email.',
      });
    }

    const requestedAt = new Date().toISOString();
    const requestRef = await db.collection(ADMIN_ACCESS_COLLECTION).add({
      name: applicantName,
      email: applicantEmail,
      workspaceName,
      status: 'pending',
      requestedAt,
      reviewedAt: null,
      reviewedByUid: null,
      reviewedByEmail: null,
      reviewNote: null,
      provisionedUserId: null,
      provisionedAdminId: null,
    });

    const delivered = await sendAdminApplicationEmailToMaster({
      applicantName,
      applicantEmail,
      workspaceName,
      requestedAt,
    });

    return res.status(201).json({
      success: true,
      requestId: requestRef.id,
      message: delivered
        ? 'Admin application submitted. Master admin has been notified by email.'
        : 'Admin application submitted. Email notification is not configured on server.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to submit admin access request.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/admin-access/requests', async (req, res) => {
  try {
    const verified = await verifyMasterAdminRequest(req, res);
    if (!verified) return;

    const db = getAdminFirestoreOrError(res);
    if (!db) return;

    const statusFilter = String(req.query.status || 'pending').toLowerCase();
    const snapshot = await db.collection(ADMIN_ACCESS_COLLECTION)
      .orderBy('requestedAt', 'desc')
      .limit(200)
      .get();

    let requests = snapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    }));

    if (statusFilter !== 'all') {
      requests = requests.filter((item) => item.status === statusFilter);
    }

    return res.json({
      success: true,
      requests,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to load admin access requests.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/admin-access/approve', async (req, res) => {
  try {
    const verified = await verifyMasterAdminRequest(req, res);
    if (!verified) return;

    const applicationId = String(req.body?.applicationId || '').trim();
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required.' });
    }

    const db = getAdminFirestoreOrError(res);
    if (!db) return;

    const requestRef = db.collection(ADMIN_ACCESS_COLLECTION).doc(applicationId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, error: 'Admin application not found.' });
    }

    const requestData = requestDoc.data();
    if (requestData.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Application is already ${requestData.status}.` });
    }

    const applicantName = sanitizeApplicantName(requestData.name || '');
    const applicantEmail = normalizeEmail(requestData.email || '');
    const workspaceName = sanitizeWorkspaceName(requestData.workspaceName || '');

    if (!isApplicantNameValid(applicantName) || !isEmailValid(applicantEmail) || !isWorkspaceNameValid(workspaceName)) {
      return res.status(400).json({
        success: false,
        error: 'Application data is invalid. Ask applicant to reapply.',
      });
    }

    const temporaryPassword = generateStrongPassword();
    let userRecord;
    let userExisted = false;

    try {
      userRecord = await verified.adminAuth.getUserByEmail(applicantEmail);
      userExisted = true;
      userRecord = await verified.adminAuth.updateUser(userRecord.uid, {
        displayName: applicantName,
        password: temporaryPassword,
        disabled: false,
      });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
      if (code === 'auth/user-not-found') {
        userRecord = await verified.adminAuth.createUser({
          email: applicantEmail,
          password: temporaryPassword,
          displayName: applicantName,
        });
      } else {
        throw error;
      }
    }

    const nowIso = new Date().toISOString();
    let adminId = `admin-${Date.now()}-${createWorkspaceSlug(workspaceName)}`;
    const adminDoc = await db.collection('admin_units').doc(adminId).get();
    if (adminDoc.exists) {
      adminId = `${adminId}-${crypto.randomInt(100, 999)}`;
    }

    const profileRef = db.collection('profiles').doc(userRecord.uid);
    const roleRef = db.collection('user_roles').doc(userRecord.uid);
    const adminUnitRef = db.collection('admin_units').doc(adminId);
    const membershipRef = db.collection('user_admin_memberships').doc(`${userRecord.uid}_${adminId}`);
    const auditRef = db.collection('admin_audit_logs').doc();
    const profileDoc = await profileRef.get();
    const createdAt = profileDoc.exists && typeof profileDoc.data().created_at === 'string'
      ? profileDoc.data().created_at
      : nowIso;

    const batch = db.batch();
    batch.set(profileRef, {
      id: userRecord.uid,
      display_name: applicantName,
      email: applicantEmail,
      avatar_url: null,
      bio: '',
      created_at: createdAt,
      updated_at: nowIso,
    }, { merge: true });

    batch.set(roleRef, {
      user_id: userRecord.uid,
      role: 'admin',
      created_at: createdAt,
      updated_at: nowIso,
    }, { merge: true });

    batch.set(adminUnitRef, {
      name: workspaceName,
      status: 'active',
      createdBy: verified.decoded.uid,
      createdAt: nowIso,
      source: 'admin_access_approval',
    }, { merge: true });

    batch.set(membershipRef, {
      userId: userRecord.uid,
      adminId,
      roleUnderAdmin: 'admin',
      isPrimary: true,
      createdAt: nowIso,
    }, { merge: true });

    batch.update(requestRef, {
      status: 'approved',
      reviewedAt: nowIso,
      reviewedByUid: verified.decoded.uid,
      reviewedByEmail: verified.email,
      reviewNote: null,
      provisionedUserId: userRecord.uid,
      provisionedAdminId: adminId,
    });

    batch.set(auditRef, {
      actorId: verified.decoded.uid,
      actorEmail: verified.email,
      actorRole: 'master_admin',
      action: 'admin_application_approved',
      details: {
        applicationId,
        applicantEmail,
        applicantUserId: userRecord.uid,
        adminId,
      },
      createdAt: nowIso,
    });

    await batch.commit();

    const delivered = await sendAdminApprovalEmail({
      applicantEmail,
      applicantName,
      workspaceName,
      password: temporaryPassword,
    });

    return res.json({
      success: true,
      message: delivered
        ? 'Application approved. Account and workspace created, and password emailed to applicant.'
        : 'Application approved. Account and workspace created, but email sending is not configured.',
      userId: userRecord.uid,
      adminId,
      userExisted,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to approve admin access request.',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.post('/admin-access/reject', async (req, res) => {
  try {
    const verified = await verifyMasterAdminRequest(req, res);
    if (!verified) return;

    const applicationId = String(req.body?.applicationId || '').trim();
    const reviewNote = normalizeSpaces(String(req.body?.reviewNote || '').slice(0, 240));
    if (!applicationId) {
      return res.status(400).json({ success: false, error: 'applicationId is required.' });
    }

    const db = getAdminFirestoreOrError(res);
    if (!db) return;

    const requestRef = db.collection(ADMIN_ACCESS_COLLECTION).doc(applicationId);
    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return res.status(404).json({ success: false, error: 'Admin application not found.' });
    }

    const requestData = requestDoc.data();
    if (requestData.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Application is already ${requestData.status}.` });
    }

    const nowIso = new Date().toISOString();
    await requestRef.update({
      status: 'rejected',
      reviewedAt: nowIso,
      reviewedByUid: verified.decoded.uid,
      reviewedByEmail: verified.email,
      reviewNote: reviewNote || null,
    });

    await db.collection('admin_audit_logs').add({
      actorId: verified.decoded.uid,
      actorEmail: verified.email,
      actorRole: 'master_admin',
      action: 'admin_application_rejected',
      details: {
        applicationId,
        applicantEmail: requestData.email || '',
        reason: reviewNote || null,
      },
      createdAt: nowIso,
    });

    await sendAdminRejectionEmail({
      applicantEmail: normalizeEmail(requestData.email || ''),
      applicantName: sanitizeApplicantName(requestData.name || 'Applicant'),
      workspaceName: sanitizeWorkspaceName(requestData.workspaceName || 'Requested Workspace'),
      reason: reviewNote,
    });

    return res.json({
      success: true,
      message: 'Application rejected successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to reject admin access request.',
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
