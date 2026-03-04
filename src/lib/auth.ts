import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bss-chat-secret-key-2026';

export function signToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (cleaned.startsWith('8')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

export function phoneVariants(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const withoutZero = normalized.startsWith('0') ? normalized.substring(1) : normalized;
  return [
    normalized,
    withoutZero,
    '62' + withoutZero,
    '+62' + withoutZero,
    '0' + withoutZero,
  ];
}
