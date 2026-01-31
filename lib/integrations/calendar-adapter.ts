import { prisma } from '@/lib/db';
import type { CalendarAdapter, CalendarEvent, CreateEventDto, UpdateEventDto, TimeSlot } from '@/lib/types';
import { addHours, startOfDay, endOfDay, isWithinInterval, addMinutes } from 'date-fns';

export class MockCalendarAdapter implements CalendarAdapter {
  async listEvents(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const events = await prisma.calendarEvent.findMany({
      where: {
        tenantId,
        userId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { not: 'cancelled' }
      },
      orderBy: { startTime: 'asc' }
    });

    return events?.map(e => ({
      id: e?.id ?? '',
      tenantId: e?.tenantId ?? tenantId,
      userId: e?.userId ?? userId,
      title: e?.title ?? '',
      description: e?.description ?? undefined,
      startTime: e?.startTime ?? new Date(),
      endTime: e?.endTime ?? new Date(),
      isPrivate: e?.isPrivate ?? false,
      status: (e?.status as CalendarEvent['status']) ?? 'confirmed',
      category: e?.category ?? undefined,
      location: e?.location ?? undefined,
      reminder: e?.reminder ?? undefined
    })) ?? [];
  }

  async createEvent(
    tenantId: string,
    userId: string,
    event: CreateEventDto
  ): Promise<CalendarEvent> {
    const created = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId,
        title: event?.title ?? 'Evento',
        description: event?.description ?? null,
        startTime: event?.startTime ?? new Date(),
        endTime: event?.endTime ?? addHours(new Date(), 1),
        isPrivate: event?.isPrivate ?? false,
        category: event?.category ?? null,
        location: event?.location ?? null,
        reminder: event?.reminder ?? null,
        status: 'confirmed'
      }
    });

    return {
      id: created?.id ?? '',
      tenantId: created?.tenantId ?? tenantId,
      userId: created?.userId ?? userId,
      title: created?.title ?? '',
      description: created?.description ?? undefined,
      startTime: created?.startTime ?? new Date(),
      endTime: created?.endTime ?? new Date(),
      isPrivate: created?.isPrivate ?? false,
      status: 'confirmed',
      category: created?.category ?? undefined,
      location: created?.location ?? undefined,
      reminder: created?.reminder ?? undefined
    };
  }

  async updateEvent(
    tenantId: string,
    eventId: string,
    updates: UpdateEventDto
  ): Promise<CalendarEvent> {
    const updated = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...(updates?.title && { title: updates.title }),
        ...(updates?.description !== undefined && { description: updates.description }),
        ...(updates?.startTime && { startTime: updates.startTime }),
        ...(updates?.endTime && { endTime: updates.endTime }),
        ...(updates?.isPrivate !== undefined && { isPrivate: updates.isPrivate }),
        ...(updates?.status && { status: updates.status }),
        ...(updates?.category && { category: updates.category }),
        ...(updates?.location !== undefined && { location: updates.location }),
        ...(updates?.reminder !== undefined && { reminder: updates.reminder })
      }
    });

    return {
      id: updated?.id ?? eventId,
      tenantId: updated?.tenantId ?? tenantId,
      userId: updated?.userId ?? '',
      title: updated?.title ?? '',
      description: updated?.description ?? undefined,
      startTime: updated?.startTime ?? new Date(),
      endTime: updated?.endTime ?? new Date(),
      isPrivate: updated?.isPrivate ?? false,
      status: (updated?.status as CalendarEvent['status']) ?? 'confirmed',
      category: updated?.category ?? undefined,
      location: updated?.location ?? undefined,
      reminder: updated?.reminder ?? undefined
    };
  }

  async deleteEvent(tenantId: string, eventId: string): Promise<void> {
    await prisma.calendarEvent.update({
      where: { id: eventId },
      data: { status: 'cancelled' }
    });
  }

  async findFreeSlots(
    tenantId: string,
    userId: string,
    date: Date,
    duration: number
  ): Promise<TimeSlot[]> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    // Work hours: 8:00 - 18:00
    const workStart = addHours(dayStart, 8);
    const workEnd = addHours(dayStart, 18);
    
    const events = await this.listEvents(tenantId, userId, dayStart, dayEnd);
    const freeSlots: TimeSlot[] = [];
    
    let currentSlot = workStart;
    
    while (currentSlot < workEnd && freeSlots?.length < 3) {
      const slotEnd = addMinutes(currentSlot, duration);
      
      if (slotEnd > workEnd) break;
      
      const hasConflict = events?.some(event => {
        const eventStart = new Date(event?.startTime ?? 0);
        const eventEnd = new Date(event?.endTime ?? 0);
        return (
          isWithinInterval(currentSlot, { start: eventStart, end: eventEnd }) ||
          isWithinInterval(slotEnd, { start: eventStart, end: eventEnd }) ||
          (currentSlot <= eventStart && slotEnd >= eventEnd)
        );
      });
      
      if (!hasConflict) {
        freeSlots.push({
          start: new Date(currentSlot),
          end: new Date(slotEnd),
          duration
        });
      }
      
      currentSlot = addMinutes(currentSlot, 30);
    }
    
    return freeSlots ?? [];
  }
}

export const calendarAdapter = new MockCalendarAdapter();
