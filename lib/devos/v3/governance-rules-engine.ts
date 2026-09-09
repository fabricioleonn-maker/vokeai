import { prisma } from '@/lib/db';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface GovernanceRule {
  id: string;
  type: 'SPEND_CAP' | 'TIME_WINDOW' | 'PRIORITY_BOOST';
  scope: {
    module?: string;
    jobType?: string;
    environment?: string;
  };
  params: Record<string, any>;
}

import { PolicyEngine } from '../policy/PolicyEngine';

export class GovernanceRulesEngine {
  /**
   * Evaluates if an execution request violates any high-level governance rules.
   */
  public static async evaluate(
    tenantId: string,
    module: string,
    priority: number
  ): Promise<{ allowed: boolean; reason?: string; priorityAdjustment?: number }> {
    
    // 1. Resolve Policy
    const policy = await PolicyEngine.resolve(tenantId);
    
    // 2. Check Business Hours
    if (policy.businessHours.enabled) {
      const now = dayjs().tz(policy.businessHours.timezone); // Assume timezone support exists
      const [startH, startM] = policy.businessHours.start.split(':').map(Number);
      const [endH, endM] = policy.businessHours.end.split(':').map(Number);
      const currentH = now.hour();
      const currentM = now.minute();

      const isInside = (currentH > startH || (currentH === startH && currentM >= startM)) &&
                       (currentH < endH || (currentH === endH && currentM <= endM));

      if (!isInside) {
        return { allowed: false, reason: 'OUTSIDE_BUSINESS_HOURS_POLICY' };
      }
    }

    // 3. Module Spend Cap Protection (Dynamic from Policy)
    const moduleLimit = policy.moduleLimits[module]?.maxCost;
    if (moduleLimit) {
       const todaySpend = await this.getModuleTodaySpend(tenantId, module);
       if (todaySpend > moduleLimit) {
         return { allowed: false, reason: `MODULE_SPEND_CAP_EXCEEDED: ${module}` };
       }
    }

    // 4. Priority Boost (Heuristic for critical modules)
    let priorityAdjustment = 0;
    if (module === 'executive' || module === 'finance') {
      priorityAdjustment = 10;
    }

    return { allowed: true, priorityAdjustment };
  }

  private static async getModuleTodaySpend(tenantId: string, module: string): Promise<number> {
    const startOfDay = dayjs().startOf('day').toDate();
    
    // Sum actualCost from DevOsJobRun for this module today
    const runs = await (prisma as any).devOsJobRun.aggregate({
      where: {
        tenantId,
        module,
        createdAt: { gte: startOfDay },
        status: 'SUCCESS'
      },
      _sum: {
        actualCost: true
      }
    });

    return runs._sum.actualCost || 0;
  }
}
