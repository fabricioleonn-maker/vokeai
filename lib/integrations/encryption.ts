import crypto from 'crypto';

// CRITICAL: Generate a secure 32-byte key and store in .env
// Run: openssl rand -hex 32
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.warn('⚠️  INTEGRATION_ENCRYPTION_KEY not set or invalid! Using fallback (INSECURE)');
}

const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts sensitive data (credentials, tokens, etc.)
 * @param data - Object to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(data: object | string): string {
    try {
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts encrypted data
 * @param encrypted - Encrypted string in format: iv:encryptedData
 * @returns Decrypted object or string
 */
export function decrypt(encrypted: string): any {
    try {
        const [ivHex, encryptedData] = encrypted.split(':');

        if (!ivHex || !encryptedData) {
            throw new Error('Invalid encrypted data format');
        }

        const key = Buffer.from(ENCRYPTION_KEY, 'hex');
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Try to parse as JSON, fallback to string
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Generates a secure encryption key
 * For CLI usage: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash sensitive data for comparison (passwords, tokens)
 * Use this when you need to verify data without storing it
 */
export function hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hashedData: string): boolean {
    return hash(data) === hashedData;
}
