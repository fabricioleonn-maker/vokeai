import crypto from 'crypto';

export interface GlobalFingerprintContext {
  jobType: string;
  module: string;
  environment: string;
  complexityTier: 'low' | 'medium' | 'high';
  payloadSizeTier: 'small' | 'medium' | 'large' | 'massive';
  errorCode?: string | null;
}

export class GlobalFingerprintEngine {
  /**
   * Generates a tenant-agnostic hash for global cross-tenant learning.
   * This ensures privacy as no tenantId or sensitive payload information is included.
   */
  public static generate(context: GlobalFingerprintContext): string {
    const rawString = [
      context.jobType.toLowerCase(),
      context.module.toLowerCase(),
      context.environment.toLowerCase(),
      context.complexityTier,
      context.payloadSizeTier,
      context.errorCode || 'none'
    ].join('|');

    return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 24);
  }

  /**
   * Utility to calculate tiers based on raw execution data.
   */
  public static calculatePayloadTier(payload: any): 'small' | 'medium' | 'large' | 'massive' {
    if (!payload) return 'small';
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(str, 'utf8');

    if (sizeBytes < 1024) return 'small';
    if (sizeBytes < 10240) return 'medium';
    if (sizeBytes < 102400) return 'large';
    return 'massive';
  }
}
