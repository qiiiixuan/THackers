import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const qrSecret = process.env.QR_SIGNING_SECRET || 'dev-qr-secret';

/**
 * Generate a unique QR token for users or events
 * This token will be used in QR codes to identify resources
 */
export const generateQrToken = (): string => {
  return uuidv4();
};

/**
 * Sign a QR token with an expiry time (seconds from now).
 */
export const signQrToken = (token: string, expiresInSeconds = 60 * 60 * 24 * 7): string => {
  const payload = {
    token,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', qrSecret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
};

/**
 * Verify a signed QR token and return the payload if valid.
 */
export const verifySignedQrToken = (
  signedToken: string
): { token: string; exp: number } | null => {
  const [encoded, signature] = signedToken.split('.');

  if (!encoded || !signature) return null;

  const expected = crypto.createHmac('sha256', qrSecret).update(encoded).digest('base64url');
  if (signature.length !== expected.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      token: string;
      exp: number;
    };

    if (!payload.token || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
};

/**
 * Normalize QR tokens so endpoints can accept both raw and signed tokens.
 */
export const normalizeQrToken = (token: string): string => {
  const verified = verifySignedQrToken(token);
  return verified ? verified.token : token;
};

/**
 * Generate a student profile URL for QR code
 * @param qrToken - The student's unique QR token
 * @param frontendUrl - The frontend base URL
 */
export const generateStudentQrUrl = (
  qrToken: string,
  frontendUrl: string,
  signed = false
): string => {
  const token = signed ? signQrToken(qrToken) : qrToken;
  return `${frontendUrl}/student/${token}`;
};

/**
 * Generate an event URL for QR code
 * @param qrToken - The event's unique QR token
 * @param frontendUrl - The frontend base URL
 */
export const generateEventQrUrl = (
  qrToken: string,
  frontendUrl: string,
  signed = false
): string => {
  const token = signed ? signQrToken(qrToken) : qrToken;
  return `${frontendUrl}/event/${token}`;
};

/**
 * Generate an event check-in URL for QR code
 */
export const generateEventCheckInQrUrl = (
  checkInToken: string,
  frontendUrl: string,
  signed = false
): string => {
  const token = signed ? signQrToken(checkInToken) : checkInToken;
  return `${frontendUrl}/event/check-in/${token}`;
};

/**
 * Extract token from a QR URL
 * @param url - The full QR URL
 */
export const extractTokenFromUrl = (url: string): string | null => {
  const parts = url.split('/');
  return parts.length > 0 ? parts[parts.length - 1] : null;
};
