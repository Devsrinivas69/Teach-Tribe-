const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let firebaseAdminError = null;

const normalizeServiceAccount = (parsed) => {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Firebase service account JSON.');
  }

  if (typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
};

const tryInitialize = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (inlineServiceAccount) {
    const parsed = normalizeServiceAccount(JSON.parse(inlineServiceAccount));
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
    return;
  }

  if (serviceAccountPath) {
    const trimmed = serviceAccountPath.trim();

    // Tolerate misconfiguration where JSON is accidentally stored in FIREBASE_SERVICE_ACCOUNT_PATH.
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = normalizeServiceAccount(JSON.parse(trimmed));
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
      return;
    }

    const resolvedPath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_PATH not found: ${resolvedPath}`);
    }

    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const parsed = normalizeServiceAccount(JSON.parse(raw));
    admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
    return;
  }

  // Fallback for cloud runtimes with default credentials configured.
  admin.initializeApp();
};

try {
  tryInitialize();
} catch (error) {
  firebaseAdminError = error instanceof Error ? error.message : 'Unknown Firebase Admin initialization error';
}

const getFirebaseAdminAuth = () => {
  if (firebaseAdminError) {
    return null;
  }

  try {
    return admin.auth();
  } catch {
    return null;
  }
};

const getFirebaseAdminError = () => firebaseAdminError;

module.exports = {
  getFirebaseAdminAuth,
  getFirebaseAdminError,
};
