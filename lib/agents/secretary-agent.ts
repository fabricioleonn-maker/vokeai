import { calendarAdapter } from '@/lib/integrations/calendar-adapter';
import { logAudit } from '@/lib/audit/audit-service';
import type { AgentContext, AgentResult, PendingAction, CreateEventDto } from '@/lib/types';
import { format, addDays, setHours, setMinutes, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SECRETARY_INTENTS = [
  'agendar', 'agenda', 'reuniao', 'reunião', 'compromisso', 'marcar',
  'horario', 'horário', 'evento', 'remarcar', 'cancelar', 'desmarcar',
  'quando', 'disponivel', 'disponível', 'livre', 'lembrete', 'bloquear'
];

export function matchesSecretaryIntent(message: string): boolean {
  const lower = message?.toLowerCase() ?? '';
  return SECRETARY_INTENTS?.some(intent => lower?.includes?.(intent)) ?? false;
}

function parseDateTime(text: string): { date: Date; time?: string } | null {
  const lower = text?.toLowerCase() ?? '';
  let date = new Date();
  
  if (lower?.includes?.('hoje')) {
    date = new Date();
  } else if (lower?.includes?.('amanhã') || lower?.includes?.('amanha')) {
    date = addDays(new Date(), 1);
  } else if (lower?.includes?.('depois de amanhã') || lower?.includes?.('depois de amanha')) {
    date = addDays(new Date(), 2);
  }
  
  // Extract time pattern like "14h", "14:30", "as 14", "às 14:00"
  const timeMatch = text?.match?.(/(\d{1,2})(?::|h|:?)(\d{2})?/i);
  let time: string | undefined;
  
  if (timeMatch) {
    const hours = parseInt(timeMatch?.[1] ?? '0', 10);
    const minutes = parseInt(timeMatch?.[2] ?? '0', 10);
    if (hours >= 0 && hours <= 23) {
      time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  return { date, time };
}

function extractTitle(text: string): string {
  // Common patterns to extract title
  const patterns = [
    /(?:reuniao|reunião)\s+(?:de\s+)?(?:com\s+)?([\w\s]+?)(?:\s+(?:hoje|amanhã|amanha|\d|para|as|às))/i,
    /(?:agendar|marcar)\s+([\w\s]+?)(?:\s+(?:hoje|amanhã|amanha|\d|para|as|às))/i,
  ];
  
  for (const pattern of patterns) {
    const match = text?.match?.(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  
  const lower = text?.toLowerCase() ?? '';
  if (lower?.includes?.('reuniao') || lower?.includes?.('reunião')) return 'Reunião';
  if (lower?.includes?.('consulta')) return 'Consulta';
  if (lower?.includes?.('entrevista')) return 'Entrevista';
  
  return 'Compromisso';
}

export async function processSecretaryMessage(
  message: string,
  context: AgentContext
): Promise<AgentResult & { pendingAction?: PendingAction }> {
  const lower = message?.toLowerCase() ?? '';
  
  // Check for confirmation responses
  if (context?.pendingAction?.agent === 'secretary') {
    if (lower === '1' || lower?.includes?.('confirmar') || lower?.includes?.('sim')) {
      return await executeConfirmedAction(context?.pendingAction, context);
    }
    if (lower === '2' || lower?.includes?.('ajustar')) {
      return {
        agentName: 'secretary',
        intent: 'adjust',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'O que gostaria de ajustar?\n\n1) Data/Horário\n2) Título\n3) Duração'
      };
    }
    if (lower === '3' || lower?.includes?.('cancelar') || lower?.includes?.('não')) {
      return {
        agentName: 'secretary',
        intent: 'cancelled',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: 'Tudo bem! Ação cancelada. Posso ajudar com mais alguma coisa?'
      };
    }
  }
  
  // Create event intent
  if (lower?.includes?.('agendar') || lower?.includes?.('marcar') || lower?.includes?.('criar')) {
    const parsed = parseDateTime(message);
    const title = extractTitle(message);
    
    if (!parsed?.time) {
      return {
        agentName: 'secretary',
        intent: 'create_event',
        confidence: 0.9,
        missingInfo: ['horário'],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: `Entendi que quer ${title?.toLowerCase()}. Para qual horário?`
      };
    }
    
    const [hours, minutes] = (parsed.time ?? '09:00').split(':').map(n => parseInt(n, 10));
    const startTime = setMinutes(setHours(parsed.date, hours), minutes);
    const endTime = addHours(startTime, 1);
    const dateFormatted = format(parsed.date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
    
    const pendingAction: PendingAction = {
      type: 'create_event',
      agent: 'secretary',
      data: {
        title,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        description: '',
        category: 'work'
      },
      summary: `📅 Data: ${dateFormatted}\n🕐 Horário: ${parsed.time}\n⏱️ Duração: 1 hora (padrão)\n📝 Título: ${title}`
    };
    
    return {
      agentName: 'secretary',
      intent: 'create_event',
      confidence: 0.95,
      missingInfo: [],
      options: ['Confirmar', 'Ajustar', 'Cancelar'],
      proposedActions: [{ action: 'create_event', params: pendingAction.data, requiresConfirmation: true }],
      riskFlags: [],
      suggestedUserMessage: `Vou criar um compromisso:\n\n${pendingAction.summary}\n\nConfirmar?\n1) Confirmar\n2) Ajustar\n3) Cancelar`,
      pendingAction
    };
  }
  
  // List events / check availability
  if (lower?.includes?.('disponível') || lower?.includes?.('disponivel') || lower?.includes?.('livre') || lower?.includes?.('horários')) {
    const parsed = parseDateTime(message);
    const dateFormatted = format(parsed?.date ?? new Date(), "dd/MM/yyyy (EEEE)", { locale: ptBR });
    
    try {
      const freeSlots = await calendarAdapter.findFreeSlots(
        context?.tenantId ?? '',
        context?.userId ?? '',
        parsed?.date ?? new Date(),
        60
      );
      
      if ((freeSlots?.length ?? 0) === 0) {
        return {
          agentName: 'secretary',
          intent: 'check_availability',
          confidence: 0.95,
          missingInfo: [],
          options: [],
          proposedActions: [],
          riskFlags: ['no_availability'],
          suggestedUserMessage: `Para ${dateFormatted}, não encontrei horários livres no horário comercial. Gostaria de verificar outro dia?`
        };
      }
      
      const slotsFormatted = freeSlots?.slice(0, 3)?.map((slot, i) => 
        `${i + 1}) ${format(slot?.start ?? new Date(), 'HH:mm')} - ${format(slot?.end ?? new Date(), 'HH:mm')}`
      ).join('\n');
      
      return {
        agentName: 'secretary',
        intent: 'check_availability',
        confidence: 0.95,
        missingInfo: [],
        options: freeSlots?.map(s => format(s?.start ?? new Date(), 'HH:mm')) ?? [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: `Para ${dateFormatted}, encontrei estes horários livres:\n\n${slotsFormatted}\n\nQual prefere?`
      };
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  }
  
  // Cancel event
  if (lower?.includes?.('cancelar') || lower?.includes?.('desmarcar')) {
    return {
      agentName: 'secretary',
      intent: 'cancel_event',
      confidence: 0.9,
      missingInfo: ['evento_especifico'],
      options: [],
      proposedActions: [],
      riskFlags: [],
      suggestedUserMessage: 'Qual compromisso gostaria de cancelar? Me dê mais detalhes (data, horário ou título).'
    };
  }
  
  // Default: general secretary help
  return {
    agentName: 'secretary',
    intent: 'general_help',
    confidence: 0.7,
    missingInfo: [],
    options: [],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Posso ajudar com sua agenda! O que gostaria de fazer?\n\n1) Agendar compromisso\n2) Ver horários disponíveis\n3) Cancelar/remarcar evento'
  };
}

async function executeConfirmedAction(
  pendingAction: PendingAction,
  context: AgentContext
): Promise<AgentResult> {
  if (pendingAction?.type === 'create_event') {
    try {
      const eventData = pendingAction?.data as { title?: string; startTime?: string; endTime?: string; description?: string; category?: string };
      
      const createEventDto: CreateEventDto = {
        title: String(eventData?.title ?? 'Compromisso'),
        description: String(eventData?.description ?? ''),
        startTime: new Date(eventData?.startTime ?? new Date()),
        endTime: new Date(eventData?.endTime ?? new Date()),
        category: String(eventData?.category ?? 'work')
      };
      
      const event = await calendarAdapter.createEvent(
        context?.tenantId ?? '',
        context?.userId ?? '',
        createEventDto
      );
      
      await logAudit({
        tenantId: context?.tenantId ?? '',
        userId: context?.userId,
        agentSlug: 'agent.secretary',
        action: 'create_event',
        entityType: 'calendar_event',
        entityId: event?.id,
        before: undefined,
        after: { ...(eventData ?? {}) }
      });
      
      return {
        agentName: 'secretary',
        intent: 'event_created',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: [],
        suggestedUserMessage: `✅ Compromisso criado com sucesso!\n\n${pendingAction?.summary ?? ''}\n\nPosso ajudar com mais alguma coisa?`
      };
    } catch (error) {
      console.error('Error creating event:', error);
      return {
        agentName: 'secretary',
        intent: 'error',
        confidence: 1.0,
        missingInfo: [],
        options: [],
        proposedActions: [],
        riskFlags: ['execution_error'],
        suggestedUserMessage: 'Desculpe, houve um erro ao criar o compromisso. Por favor, tente novamente.'
      };
    }
  }
  
  return {
    agentName: 'secretary',
    intent: 'unknown_action',
    confidence: 0.5,
    missingInfo: [],
    options: [],
    proposedActions: [],
    riskFlags: [],
    suggestedUserMessage: 'Desculpe, não entendi a ação solicitada. Pode repetir?'
  };
}
