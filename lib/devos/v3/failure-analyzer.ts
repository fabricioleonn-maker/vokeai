import { prisma } from '../../db';

export type FailureType = 'transient' | 'validation' | 'dependency' | 'logic' | 'external' | 'security';

export interface FailureInsight {
  failure_type: FailureType;
  severity: number; // 0-100
  retryable: boolean;
  root_cause: string;
  error_code: string; // Added for Phase 13 tracking
  suggested_action: 'retry' | 'replan' | 'abort';
}

export class FailureAnalyzer {
  private static instance: FailureAnalyzer;

  private constructor() {}

  public static getInstance(): FailureAnalyzer {
    if (!FailureAnalyzer.instance) {
      FailureAnalyzer.instance = new FailureAnalyzer();
    }
    return FailureAnalyzer.instance;
  }

  /**
   * Analyzes a failed JobRun and provides actionable insights.
   */
  async analyze(runId: string): Promise<FailureInsight> {
    const run = await (prisma as any).devOsJobRun.findUnique({
      where: { id: runId }
    });

    if (!run) {
      throw new Error(`JobRun ${runId} not found`);
    }

    const { failureCode, failureReason, riskScore, logs } = run;
    const logText = JSON.stringify(logs || {});

    // Default insight
    let insight: FailureInsight = {
      failure_type: 'logic',
      severity: 50,
      retryable: false,
      root_cause: failureReason || 'Unknown error',
      error_code: failureCode || 'UNKNOWN',
      suggested_action: 'replan'
    };

    // 1. Transient Errors (Network, Timeout)
    if (
      failureCode === 'TIMEOUT' || 
      failureCode === 'NETWORK_ERROR' ||
      logText.includes('ETIMEDOUT') ||
      logText.includes('ECONNREFUSED')
    ) {
      insight = {
        failure_type: 'transient',
        severity: 30,
        retryable: true,
        root_cause: 'Network or timeout detected',
        error_code: failureCode || 'TIMEOUT',
        suggested_action: 'retry'
      };
    }

    // 2. Security / Risk Errors
    else if ((riskScore || 0) > 70 || failureCode === 'SECURITY_VIOLATION') {
      insight = {
        failure_type: 'security',
        severity: 90,
        retryable: false,
        root_cause: 'Risk score too high or security violation',
        error_code: failureCode || 'SECURITY_VIOLATION',
        suggested_action: 'abort'
      };
    }

    // 3. Validation Errors
    else if (failureCode === 'VALIDATION_FAILED' || logText.includes('invalid') || logText.includes('missing field')) {
      insight = {
        failure_type: 'validation',
        severity: 60,
        retryable: false, // Don't retry same invalid payload
        root_cause: 'Payload validation failed',
        error_code: failureCode || 'VALIDATION_FAILED',
        suggested_action: 'replan'
      };
    }

    // 4. Dependency / External Errors
    else if (failureCode === 'DEPENDENCY_MISSING' || logText.includes('404') || logText.includes('not found')) {
      insight = {
        failure_type: 'dependency',
        severity: 70,
        retryable: true, // Maybe dependency becomes available
        root_cause: 'Required dependency or resource missing',
        error_code: failureCode || 'DEPENDENCY_MISSING',
        suggested_action: 'retry'
      };
    }

    return insight;
  }
}
