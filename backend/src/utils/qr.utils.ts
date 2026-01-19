import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique QR token for users or events
 * This token will be used in QR codes to identify resources
 */
export const generateQrToken = (): string => {
  return uuidv4();
};

/**
 * Generate a student profile URL for QR code
 * @param qrToken - The student's unique QR token
 * @param frontendUrl - The frontend base URL
 */
export const generateStudentQrUrl = (qrToken: string, frontendUrl: string): string => {
  return `${frontendUrl}/student/${qrToken}`;
};

/**
 * Generate an event URL for QR code
 * @param qrToken - The event's unique QR token
 * @param frontendUrl - The frontend base URL
 */
export const generateEventQrUrl = (qrToken: string, frontendUrl: string): string => {
  return `${frontendUrl}/event/${qrToken}`;
};

/**
 * Extract token from a QR URL
 * @param url - The full QR URL
 */
export const extractTokenFromUrl = (url: string): string | null => {
  const parts = url.split('/');
  return parts.length > 0 ? parts[parts.length - 1] : null;
};
