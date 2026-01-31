export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit/audit-service';

// GET agent config for a tenant
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as { tenantId?: string; role?: string };
    
    // Get agent node
    const agentNode = await prisma.agentNode.findUnique({
      where: { slug: params.slug }
    });
    
    if (!agentNode) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Get tenant-specific config if available
    let tenantConfig = null;
    if (user.tenantId) {
      tenantConfig = await prisma.tenantAgentConfig.findFirst({
        where: {
          tenantId: user.tenantId,
          agentSlug: params.slug
        }
      });
    }
    
    // Merge with default config
    const behaviorOverride = (tenantConfig?.behaviorOverride as Record<string, unknown>) || {};
    
    return NextResponse.json({
      id: tenantConfig?.id || '',
      slug: params.slug,
      name: agentNode.name,
      customPrompt: tenantConfig?.customPrompt || '',
      tone: behaviorOverride.tone || 'neutral',
      templates: behaviorOverride.templates || [],
      flowSteps: behaviorOverride.flowSteps || [],
      keywords: behaviorOverride.keywords || [],
      isActive: tenantConfig?.enabled ?? true
    });
  } catch (error) {
    console.error('Get agent config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update agent config
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user as { id: string; tenantId?: string; role?: string };
    
    if (!user.tenantId) {
      return NextResponse.json({ error: 'Tenant required' }, { status: 400 });
    }
    
    const body = await request.json();
    const { customPrompt, tone, templates, flowSteps, keywords, isActive } = body;
    
    // Get existing config
    const existingConfig = await prisma.tenantAgentConfig.findFirst({
      where: {
        tenantId: user.tenantId,
        agentSlug: params.slug
      }
    });
    
    const behaviorOverride = {
      tone,
      templates,
      flowSteps,
      keywords
    };
    
    let config;
    
    if (existingConfig) {
      // Update existing
      config = await prisma.tenantAgentConfig.update({
        where: { id: existingConfig.id },
        data: {
          customPrompt,
          behaviorOverride,
          enabled: isActive ?? true,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new
      config = await prisma.tenantAgentConfig.create({
        data: {
          tenantId: user.tenantId,
          agentSlug: params.slug,
          customPrompt,
          behaviorOverride,
          enabled: isActive ?? true
        }
      });
    }
    
    // Log audit
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: existingConfig ? 'UPDATE' : 'CREATE',
      entityType: 'TenantAgentConfig',
      entityId: config.id,
      after: behaviorOverride
    });
    
    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        slug: params.slug,
        customPrompt,
        tone,
        templates,
        flowSteps,
        keywords,
        isActive: config.enabled
      }
    });
  } catch (error) {
    console.error('Update agent config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
