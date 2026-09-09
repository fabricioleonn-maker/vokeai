/**
 * Temporary types to bypass Prisma lock issues.
 * These match the enums defined in prisma/schema.prisma.
 */

export enum DevOsNodeType {
  INPUT = 'INPUT',
  GOVERNANCE = 'GOVERNANCE',
  BUDGET = 'BUDGET',
  SCORING = 'SCORING',
  APPROVAL = 'APPROVAL',
  ORCHESTRATOR = 'ORCHESTRATOR',
  AGENT = 'AGENT',
  AGENT_DECISION = 'AGENT_DECISION',
  AGENT_HANDOFF = 'AGENT_HANDOFF',
  AGENT_MERGE = 'AGENT_MERGE',
  AGENT_FALLBACK = 'AGENT_FALLBACK',
  AGENT_TIMEOUT = 'AGENT_TIMEOUT',
  EXECUTION = 'EXECUTION',
  RETRY = 'RETRY',
  REPLAN = 'REPLAN',
  COMMIT = 'COMMIT',
  FAILURE = 'FAILURE',
}

export enum DevOsNodeStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum DevOsBudgetStatus {
  ACTIVE = 'ACTIVE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  BLOCKED = 'BLOCKED',
}

export enum DevOsBudgetLogType {
  ALLOCATION = 'ALLOCATION',
  RESERVATION = 'RESERVATION',
  CONSUMPTION = 'CONSUMPTION',
  RELEASE = 'RELEASE',
  OVERRIDE = 'OVERRIDE',
}

export enum DevOsTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
}

export enum DevOsPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface WalletState {
  balance: number;
  reservedBalance: number;
  totalConsumed: number;
}

export type NodeStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'PREDICTED';
export type NodeType = keyof typeof DevOsNodeType;
