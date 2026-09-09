import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ProjectBrainService } from '@/lib/devos/v3/brain-service';
import { ProjectHealthService } from '@/lib/devos/v3/health-service';

/**
 * POST /api/devos/admin/backfill-v3 - Prepare all legacy projects for V3 Intelligence
 */
export async function POST(req: NextRequest) {
  // 1. Fetch all projects missing V3 components
  const projects = await prisma.devOsProject.findMany({
    include: {
      brain: true,
      health: true
    }
  });

  const stats = {
    total: projects.length,
    brainsCreated: 0,
    healthsCreated: 0,
    errors: 0
  };

  for (const project of projects) {
    try {
      // Initialize Brain if missing
      if (!project.brain) {
        await ProjectBrainService.initializeBrain(project.id, project.tenantId, project.objective);
        stats.brainsCreated++;
      }

      // Initialize Health if missing
      if (!project.health) {
        await prisma.devOsProjectHealth.create({
          data: {
            tenantId: project.tenantId,
            projectId: project.id,
            score: 100,
            riskLevel: 'LOW',
            stability: 1.0,
            successRate: 1.0,
            avgTaskQuality: 1.0
          }
        });
        stats.healthsCreated++;
      }
    } catch (error) {
      console.error(`Backfill failed for project ${project.id}:`, error);
      stats.errors++;
    }
  }

  return NextResponse.json({
    message: 'Backfill completed',
    stats
  });
}
