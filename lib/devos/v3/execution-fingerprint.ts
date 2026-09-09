import crypto from 'crypto';

export interface FingerprintContext {
  tenantId: string;
  module: string;
  environment: string;
  jobType?: string;
  action?: string;
  payloadSizeTier?: 'small' | 'medium' | 'large' | 'massive';
  complexityTier?: 'low' | 'medium' | 'high';
  errorCode?: string;
}

export class ExecutionFingerprint {
  /**
   * Generates a deterministic fingerprint hash based on the execution context.
   * This allows the PerformanceMiner to group similar executions and learn their success/cost patterns.
   */
  public static generate(context: FingerprintContext): string {
    const rawString = [
      context.tenantId,
      context.module,
      context.environment,
      context.jobType || 'unknown_job',
      context.action || 'unknown_action',
      context.payloadSizeTier || 'small',
      context.complexityTier || 'low',
      context.errorCode || 'none'
    ].join('|').toLowerCase();

    return crypto.createHash('sha256').update(rawString).digest('hex').substring(0, 16);
  }

  /**
   * Helper to determine payload size tier based on string length or object keys.
   */
  public static calculatePayloadTier(payload: any): 'small' | 'medium' | 'large' | 'massive' {
    if (!payload) return 'small';
    const str = JSON.stringify(payload);
    const sizeBytes = Buffer.byteLength(str, 'utf8');

    if (sizeBytes < 1024) return 'small'; // < 1KB
    if (sizeBytes < 10240) return 'medium'; // < 10KB
    if (sizeBytes < 102400) return 'large'; // < 100KB
    return 'massive';
  }
}
