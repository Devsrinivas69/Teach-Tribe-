import validator from 'validator';

const SAFE_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,79}$/;

const stripControlChars = (value: string) => {
  let cleaned = '';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if ((code >= 0 && code <= 31) || code === 127) continue;
    cleaned += ch;
  }
  return cleaned;
};

const hasControlChars = (value: string) => {
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if ((code >= 0 && code <= 31) || code === 127) {
      return true;
    }
  }
  return false;
};

const normalizeTextInput = (value: string) => {
  return stripControlChars(value.normalize('NFKC'))
    .replace(/\s+/g, ' ')
    .trim();
};

export interface SanitizedLoginInput {
  email: string;
  password: string;
}

export interface SanitizedSignupInput extends SanitizedLoginInput {
  name: string;
}

export const sanitizeEmailInput = (rawEmail: string) => {
  if (typeof rawEmail !== 'string') {
    throw new Error('Email is required.');
  }

  const normalized = validator.normalizeEmail(rawEmail.trim(), {
    all_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  });

  if (!normalized) {
    throw new Error('Invalid email address.');
  }

  if (!validator.isLength(normalized, { min: 6, max: 254 })) {
    throw new Error('Email length is invalid.');
  }

  if (!validator.isEmail(normalized, { allow_utf8_local_part: false, require_tld: true })) {
    throw new Error('Please enter a valid email address.');
  }

  return normalized;
};

export const sanitizePasswordInput = (rawPassword: string) => {
  if (typeof rawPassword !== 'string') {
    throw new Error('Password is required.');
  }

  if (rawPassword !== rawPassword.trim()) {
    throw new Error('Password cannot start or end with spaces.');
  }

  if (hasControlChars(rawPassword)) {
    throw new Error('Password contains invalid characters.');
  }

  if (!validator.isLength(rawPassword, { min: 8, max: 128 })) {
    throw new Error('Password must be 8 to 128 characters long.');
  }

  if (!validator.isStrongPassword(rawPassword, {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })) {
    throw new Error('Password must include uppercase, lowercase, number, and symbol.');
  }

  return rawPassword;
};

export const sanitizeNameInput = (rawName: string) => {
  if (typeof rawName !== 'string') {
    throw new Error('Name is required.');
  }

  const normalized = normalizeTextInput(rawName);

  if (!validator.isLength(normalized, { min: 2, max: 80 })) {
    throw new Error('Name must be between 2 and 80 characters.');
  }

  if (!SAFE_NAME_REGEX.test(normalized)) {
    throw new Error("Name contains invalid characters. Use letters, spaces, apostrophe, dot, or hyphen.");
  }

  return normalized;
};

export const sanitizeLoginInput = (input: { email: string; password: string }): SanitizedLoginInput => {
  return {
    email: sanitizeEmailInput(input.email),
    password: sanitizePasswordInput(input.password),
  };
};

export const sanitizeSignupInput = (input: { name: string; email: string; password: string }): SanitizedSignupInput => {
  return {
    name: sanitizeNameInput(input.name),
    email: sanitizeEmailInput(input.email),
    password: sanitizePasswordInput(input.password),
  };
};

export const sanitizeDisplayNameForProfile = (rawName: string | null | undefined) => {
  if (!rawName) return 'User';

  try {
    return sanitizeNameInput(rawName);
  } catch {
    return 'User';
  }
};
