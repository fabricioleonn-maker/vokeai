// ==================== INTEGRATION CONTRACTS ====================

export interface CalendarEvent {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isPrivate: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  category?: string;
  location?: string;
  reminder?: number;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isPrivate?: boolean;
  category?: string;
  location?: string;
  reminder?: number;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  isPrivate?: boolean;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  category?: string;
  location?: string;
  reminder?: number;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number;
}

export interface CalendarAdapter {
  listEvents(tenantId: string, userId: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  createEvent(tenantId: string, userId: string, event: CreateEventDto): Promise<CalendarEvent>;
  updateEvent(tenantId: string, eventId: string, updates: UpdateEventDto): Promise<CalendarEvent>;
  deleteEvent(tenantId: string, eventId: string): Promise<void>;
  findFreeSlots(tenantId: string, userId: string, date: Date, duration: number): Promise<TimeSlot[]>;
}

// ==================== FINANCE CONTRACTS ====================

export interface FinancialTransaction {
  id: string;
  tenantId: string;
  userId: string;
  type: 'pix' | 'card' | 'boleto' | 'transfer' | 'cash';
  amount: number;
  category: string;
  description?: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  merchant?: string;
  installments?: number;
  isRecurring: boolean;
}

export interface CreateTransactionDto {
  type: 'pix' | 'card' | 'boleto' | 'transfer' | 'cash';
  amount: number;
  category: string;
  description?: string;
  date: Date;
  merchant?: string;
  installments?: number;
  isRecurring?: boolean;
}

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CategorySuggestion {
  category: string;
  confidence: number;
}

export interface FinanceAdapter {
  createTransaction(tenantId: string, userId: string, transaction: CreateTransactionDto): Promise<FinancialTransaction>;
  listTransactions(tenantId: string, userId: string, filters: TransactionFilters): Promise<FinancialTransaction[]>;
  categorizeTransaction(description: string): Promise<CategorySuggestion>;
}

// ==================== AGENT CONTRACTS ====================

export interface AgentResult {
  agentName: string;
  intent: string;
  confidence: number;
  missingInfo: string[];
  options: string[];
  proposedActions: ProposedAction[];
  riskFlags: string[];
  suggestedUserMessage: string;
}

export interface ProposedAction {
  action: string;
  params: Record<string, unknown>;
  requiresConfirmation: boolean;
}

export interface AgentContext {
  tenantId: string;
  userId: string;
  channel: string;
  enabledAgents: string[];
  enabledIntegrations: string[];
  planLimits: Record<string, unknown>;
  userProfile: Record<string, unknown>;
  memorySummary?: string;
  recentMessages: { role: string; content: string }[];
  pendingAction?: PendingAction;
}

export interface PendingAction {
  type: string;
  agent: string;
  data: Record<string, unknown>;
  summary: string;
}

export interface OrchestratorResponse {
  message: string;
  agentUsed?: string;
  requiresConfirmation?: boolean;
  pendingAction?: PendingAction;
  metadata?: Record<string, unknown>;
}

// ==================== AUDIT ====================

export interface AuditEntry {
  tenantId: string;
  userId?: string;
  agentSlug?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

// ==================== CATEGORIES ====================

export const FINANCE_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Moradia',
  'Impostos',
  'SaaS/Assinaturas',
  'Vestuário',
  'Comunicação',
  'Outros'
] as const;

// ==================== PERSONALITY ====================

export interface AIPersonality {
  voiceTone: 'formal' | 'neutral' | 'casual' | 'friendly';
  communicationStyle: 'direct' | 'consultive' | 'empathetic';
  personalityInstructions: string;
  positiveExamples: string[];
  negativeExamples: string[];
  businessContext: string;
  customGreeting?: string;
  situationHandlers?: {
    planQuestion?: string;
    technicalIssue?: string;
    complaint?: string;
    priceObjection?: string;
  };
}
