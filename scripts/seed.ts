import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== PLANS ====================
  console.log('\n📊 Creating Plans...');

  const planFree = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      slug: 'free',
      name: 'Free',
      description: 'Plano gratuito com funcionalidades básicas',
      tier: 'free',
      limits: {
        messages_per_month: 100,
        agent_actions_per_month: 50,
        files_created_per_month: null,
        integrations_connected: 1
      },
      features: {
        auto_execution: false,
        multi_agent_flows: false,
        advanced_financial_processing: false,
        file_generation: false,
        white_label: false,
        enabled_agents: ['agent.secretary']
      },
      billing: {
        price_monthly: 0,
        price_yearly: 0,
        currency: 'BRL'
      },
      status: 'active'
    }
  });
  console.log(`  ✓ Plan: ${planFree.name}`);

  const planBasic = await prisma.plan.upsert({
    where: { slug: 'basic' },
    update: {},
    create: {
      slug: 'basic',
      name: 'Basic',
      description: 'Plano básico com mais agentes e recursos',
      tier: 'basic',
      limits: {
        messages_per_month: 1000,
        agent_actions_per_month: 500,
        files_created_per_month: 50,
        integrations_connected: 3
      },
      features: {
        auto_execution: true,
        multi_agent_flows: false,
        advanced_financial_processing: true,
        file_generation: false,
        white_label: false,
        enabled_agents: ['agent.secretary', 'agent.finance']
      },
      billing: {
        price_monthly: 49.90,
        price_yearly: 479.00,
        currency: 'BRL'
      },
      status: 'active'
    }
  });
  console.log(`  ✓ Plan: ${planBasic.name}`);

  const planPro = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      slug: 'pro',
      name: 'Pro',
      description: 'Plano profissional com todos os recursos',
      tier: 'pro',
      limits: {
        messages_per_month: null,
        agent_actions_per_month: null,
        files_created_per_month: null,
        integrations_connected: null
      },
      features: {
        auto_execution: true,
        multi_agent_flows: true,
        advanced_financial_processing: true,
        file_generation: true,
        white_label: false,
        enabled_agents: ['agent.secretary', 'agent.finance', 'agent.support.n1', 'agent.sales', 'agent.productivity']
      },
      billing: {
        price_monthly: 149.90,
        price_yearly: 1439.00,
        currency: 'BRL'
      },
      status: 'active'
    }
  });
  console.log(`  ✓ Plan: ${planPro.name}`);

  // ==================== AGENTS ====================
  console.log('\n🤖 Creating Agents...');

  const agentSecretary = await prisma.agentNode.upsert({
    where: { slug: 'agent.secretary' },
    update: {},
    create: {
      slug: 'agent.secretary',
      name: 'Secretária Virtual',
      description: 'Agente especializado em gerenciamento de agenda, compromissos e lembretes',
      category: 'productivity',
      status: 'active',
      channelsSupported: ['web', 'whatsapp', 'instagram', 'facebook', 'tiktok'],
      intentsSupported: ['agendar', 'remarcar', 'cancelar', 'disponibilidade', 'lembrete', 'bloquear'],
      requiredIntegrations: ['integration.google.calendar'],
      optionalIntegrations: ['integration.microsoft.outlook'],
      permissionsRequired: ['calendar:read', 'calendar:write'],
      planConstraints: {
        min_plan_tier: 'free',
        usage_limits: {
          actions_per_month: null,
          files_per_month: null
        }
      },
      behavior: {
        confirmation_required: true,
        auto_execute_allowed: false,
        max_questions_per_turn: 2,
        tone: 'human'
      },
      prompts: {
        system_base: 'Você é a Secretária Virtual do Sistema Matriz. Ajude o usuário com sua agenda de forma eficiente e humana.',
        tenant_override_allowed: true,
        tenant_custom_prompt: null
      },
      uiRules: {
        numbered_options: true,
        summary_before_action: true,
        universal_text_only: true
      },
      audit: {
        log_actions: true,
        log_payload: true
      }
    }
  });
  console.log(`  ✓ Agent: ${agentSecretary.name}`);

  const agentFinance = await prisma.agentNode.upsert({
    where: { slug: 'agent.finance' },
    update: {},
    create: {
      slug: 'agent.finance',
      name: 'Assistente Financeiro',
      description: 'Agente especializado em lançamentos financeiros, categorização e controle de despesas',
      category: 'finance',
      status: 'active',
      channelsSupported: ['web', 'whatsapp', 'instagram', 'facebook', 'tiktok'],
      intentsSupported: ['lancar', 'pagamento', 'despesa', 'receita', 'extrato', 'categoria'],
      requiredIntegrations: ['integration.financial.core'],
      optionalIntegrations: [],
      permissionsRequired: ['finance:read', 'finance:write'],
      planConstraints: {
        min_plan_tier: 'basic',
        usage_limits: {
          actions_per_month: null,
          files_per_month: null
        }
      },
      behavior: {
        confirmation_required: true,
        auto_execute_allowed: false,
        max_questions_per_turn: 2,
        tone: 'human'
      },
      prompts: {
        system_base: 'Você é o Assistente Financeiro do Sistema Matriz. Ajude o usuário a registrar e categorizar suas movimentações financeiras.',
        tenant_override_allowed: true,
        tenant_custom_prompt: null
      },
      uiRules: {
        numbered_options: true,
        summary_before_action: true,
        universal_text_only: true
      },
      audit: {
        log_actions: true,
        log_payload: true
      }
    }
  });
  console.log(`  ✓ Agent: ${agentFinance.name}`);

  // Agente de Atendimento N1
  const agentSupportN1 = await prisma.agentNode.upsert({
    where: { slug: 'agent.support.n1' },
    update: {},
    create: {
      slug: 'agent.support.n1',
      name: 'Atendimento N1',
      description: 'Agente de primeiro atendimento para FAQs, triagem e handoff para outros agentes',
      category: 'support',
      status: 'active',
      channelsSupported: ['web', 'whatsapp', 'instagram', 'facebook', 'tiktok'],
      intentsSupported: ['duvida', 'pergunta', 'ajuda', 'problema', 'informacao', 'humano'],
      requiredIntegrations: [],
      optionalIntegrations: [],
      permissionsRequired: ['support:read'],
      planConstraints: {
        min_plan_tier: 'pro',
        usage_limits: {
          actions_per_month: null,
          files_per_month: null
        }
      },
      behavior: {
        confirmation_required: false,
        auto_execute_allowed: true,
        max_questions_per_turn: 2,
        tone: 'human'
      },
      prompts: {
        system_base: 'Você é o Agente de Atendimento N1 do Sistema Matriz. Responda dúvidas, faça triagem e encaminhe para o agente adequado quando necessário.',
        tenant_override_allowed: true,
        tenant_custom_prompt: null
      },
      uiRules: {
        numbered_options: true,
        summary_before_action: false,
        universal_text_only: true
      },
      audit: {
        log_actions: true,
        log_payload: false
      }
    }
  });
  console.log(`  ✓ Agent: ${agentSupportN1.name}`);

  // Agente de Vendas
  const agentSales = await prisma.agentNode.upsert({
    where: { slug: 'agent.sales' },
    update: {},
    create: {
      slug: 'agent.sales',
      name: 'Vendas',
      description: 'Agente especializado em qualificação de leads, tratamento de objeções e conversão',
      category: 'sales',
      status: 'active',
      channelsSupported: ['web', 'whatsapp', 'instagram', 'facebook', 'tiktok'],
      intentsSupported: ['preco', 'plano', 'desconto', 'comprar', 'assinar', 'upgrade', 'proposta'],
      requiredIntegrations: [],
      optionalIntegrations: ['integration.crm'],
      permissionsRequired: ['sales:read', 'sales:write'],
      planConstraints: {
        min_plan_tier: 'pro',
        usage_limits: {
          actions_per_month: null,
          files_per_month: null
        }
      },
      behavior: {
        confirmation_required: false,
        auto_execute_allowed: true,
        max_questions_per_turn: 2,
        tone: 'human'
      },
      prompts: {
        system_base: 'Você é o Agente de Vendas do Sistema Matriz. Qualifique leads, trate objeções com empatia e conduza para conversão de forma humana.',
        tenant_override_allowed: true,
        tenant_custom_prompt: null
      },
      uiRules: {
        numbered_options: true,
        summary_before_action: false,
        universal_text_only: true
      },
      audit: {
        log_actions: true,
        log_payload: true
      }
    }
  });
  console.log(`  ✓ Agent: ${agentSales.name}`);

  // Agente de Produtividade
  const agentProductivity = await prisma.agentNode.upsert({
    where: { slug: 'agent.productivity' },
    update: {},
    create: {
      slug: 'agent.productivity',
      name: 'Produtividade',
      description: 'Agente especializado em criação de emails, documentos, planilhas e apresentações',
      category: 'productivity',
      status: 'active',
      channelsSupported: ['web', 'whatsapp', 'instagram', 'facebook', 'tiktok'],
      intentsSupported: ['email', 'documento', 'planilha', 'apresentacao', 'resumo', 'checklist', 'escrever'],
      requiredIntegrations: [],
      optionalIntegrations: ['integration.google.drive', 'integration.microsoft.office'],
      permissionsRequired: ['files:read', 'files:write'],
      planConstraints: {
        min_plan_tier: 'pro',
        usage_limits: {
          actions_per_month: null,
          files_per_month: 100
        }
      },
      behavior: {
        confirmation_required: true,
        auto_execute_allowed: false,
        max_questions_per_turn: 2,
        tone: 'neutral'
      },
      prompts: {
        system_base: 'Você é o Agente de Produtividade do Sistema Matriz. Ajude o usuário a criar emails, documentos, planilhas e apresentações de forma eficiente.',
        tenant_override_allowed: true,
        tenant_custom_prompt: null
      },
      uiRules: {
        numbered_options: true,
        summary_before_action: true,
        universal_text_only: true
      },
      audit: {
        log_actions: true,
        log_payload: true
      }
    }
  });
  console.log(`  ✓ Agent: ${agentProductivity.name}`);

  // ==================== INTEGRATIONS ====================
  console.log('\n🔌 Creating Integrations...');

  const integrationCalendar = await prisma.integrationNode.upsert({
    where: { slug: 'integration.google.calendar' },
    update: {},
    create: {
      slug: 'integration.google.calendar',
      name: 'Google Calendar',
      description: 'Integração com Google Calendar para gerenciamento de eventos e agenda',
      type: 'calendar',
      auth: {
        method: 'oauth2',
        scopes: ['calendar.readonly', 'calendar.events'],
        token_rotation: true
      },
      capabilities: {
        read: true,
        write: true,
        update: true,
        delete: true
      },
      dataContract: {
        input_schema: { event: { title: 'string', start: 'datetime', end: 'datetime' } },
        output_schema: { events: 'array' },
        normalization_rules: {}
      },
      supportedAgents: ['agent.secretary'],
      planConstraints: {
        allowed_plans: ['free', 'basic', 'pro', 'enterprise'],
        rate_limits: 100
      },
      syncStrategy: {
        realtime: false,
        polling_interval_minutes: 15,
        manual_sync_supported: true
      },
      privacyRules: {
        mask_private_data: true,
        pii_level: 'medium'
      },
      audit: {
        log_requests: true,
        log_responses: false
      }
    }
  });
  console.log(`  ✓ Integration: ${integrationCalendar.name}`);

  const integrationFinance = await prisma.integrationNode.upsert({
    where: { slug: 'integration.financial.core' },
    update: {},
    create: {
      slug: 'integration.financial.core',
      name: 'Sistema Financeiro Core',
      description: 'Integração com sistema financeiro para lançamentos e controle de despesas',
      type: 'finance',
      auth: {
        method: 'api_key',
        scopes: ['transactions.read', 'transactions.write'],
        token_rotation: false
      },
      capabilities: {
        read: true,
        write: true,
        update: true,
        delete: false
      },
      dataContract: {
        input_schema: { transaction: { type: 'string', amount: 'number', category: 'string' } },
        output_schema: { transactions: 'array' },
        normalization_rules: {}
      },
      supportedAgents: ['agent.finance'],
      planConstraints: {
        allowed_plans: ['basic', 'pro', 'enterprise'],
        rate_limits: 200
      },
      syncStrategy: {
        realtime: false,
        polling_interval_minutes: 30,
        manual_sync_supported: true
      },
      privacyRules: {
        mask_private_data: true,
        pii_level: 'high'
      },
      audit: {
        log_requests: true,
        log_responses: true
      }
    }
  });
  console.log(`  ✓ Integration: ${integrationFinance.name}`);

  // ==================== TENANTS ====================
  console.log('\n🏢 Creating Tenants...');

  // Tenant 1: Free Plan (apenas Secretária)
  const tenant1 = await prisma.tenant.upsert({
    where: { slug: 'empresa-free' },
    update: {},
    create: {
      slug: 'empresa-free',
      name: 'Empresa Free',
      status: 'active',
      planId: planFree.id
    }
  });
  console.log(`  ✓ Tenant: ${tenant1.name}`);

  // Tenant 2: Basic Plan (Secretária + Financeiro)
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'empresa-basic' },
    update: {},
    create: {
      slug: 'empresa-basic',
      name: 'Empresa Basic',
      status: 'active',
      planId: planBasic.id
    }
  });
  console.log(`  ✓ Tenant: ${tenant2.name}`);

  // Tenant 3: Pro Plan (todos os agentes)
  const tenant3 = await prisma.tenant.upsert({
    where: { slug: 'empresa-pro' },
    update: {},
    create: {
      slug: 'empresa-pro',
      name: 'Empresa Pro',
      status: 'active',
      planId: planPro.id
    }
  });
  console.log(`  ✓ Tenant: ${tenant3.name}`);

  // ==================== TENANT AGENT CONFIGS ====================
  console.log('\n⚙️ Creating Tenant Agent Configs...');

  // Tenant 1: Free - apenas Secretária
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant1.id, agentSlug: 'agent.secretary' } },
    update: {},
    create: {
      tenantId: tenant1.id,
      agentSlug: 'agent.secretary',
      enabled: true,
      allowedIntegrations: ['integration.google.calendar']
    }
  });
  console.log(`  ✓ ${tenant1.name}: agent.secretary`);

  // Tenant 2: Basic - Secretária + Financeiro
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant2.id, agentSlug: 'agent.secretary' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      agentSlug: 'agent.secretary',
      enabled: true,
      allowedIntegrations: ['integration.google.calendar']
    }
  });
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant2.id, agentSlug: 'agent.finance' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      agentSlug: 'agent.finance',
      enabled: true,
      allowedIntegrations: ['integration.financial.core']
    }
  });
  console.log(`  ✓ ${tenant2.name}: agent.secretary, agent.finance`);

  // Tenant 3: Pro - todos os agentes
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant3.id, agentSlug: 'agent.secretary' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      agentSlug: 'agent.secretary',
      enabled: true,
      allowedIntegrations: ['integration.google.calendar']
    }
  });
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant3.id, agentSlug: 'agent.finance' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      agentSlug: 'agent.finance',
      enabled: true,
      allowedIntegrations: ['integration.financial.core']
    }
  });
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant3.id, agentSlug: 'agent.support.n1' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      agentSlug: 'agent.support.n1',
      enabled: true,
      allowedIntegrations: []
    }
  });
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant3.id, agentSlug: 'agent.sales' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      agentSlug: 'agent.sales',
      enabled: true,
      allowedIntegrations: []
    }
  });
  await prisma.tenantAgentConfig.upsert({
    where: { tenantId_agentSlug: { tenantId: tenant3.id, agentSlug: 'agent.productivity' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      agentSlug: 'agent.productivity',
      enabled: true,
      allowedIntegrations: []
    }
  });
  console.log(`  ✓ ${tenant3.name}: todos os 5 agentes configurados`);

  // ==================== TENANT INTEGRATION CONFIGS ====================
  console.log('\n🔗 Creating Tenant Integration Configs...');

  // Tenant 1
  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId_integrationSlug: { tenantId: tenant1.id, integrationSlug: 'integration.google.calendar' } },
    update: {},
    create: {
      tenantId: tenant1.id,
      integrationSlug: 'integration.google.calendar',
      enabled: true,
      allowedAgents: ['agent.secretary'],
      syncSettings: { polling_interval_minutes: 15, manual_sync: true }
    }
  });

  // Tenant 2
  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId_integrationSlug: { tenantId: tenant2.id, integrationSlug: 'integration.google.calendar' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      integrationSlug: 'integration.google.calendar',
      enabled: true,
      allowedAgents: ['agent.secretary'],
      syncSettings: { polling_interval_minutes: 15, manual_sync: true }
    }
  });
  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId_integrationSlug: { tenantId: tenant2.id, integrationSlug: 'integration.financial.core' } },
    update: {},
    create: {
      tenantId: tenant2.id,
      integrationSlug: 'integration.financial.core',
      enabled: true,
      allowedAgents: ['agent.finance'],
      syncSettings: { polling_interval_minutes: 30, manual_sync: true }
    }
  });

  // Tenant 3
  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId_integrationSlug: { tenantId: tenant3.id, integrationSlug: 'integration.google.calendar' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      integrationSlug: 'integration.google.calendar',
      enabled: true,
      allowedAgents: ['agent.secretary'],
      syncSettings: { polling_interval_minutes: 15, manual_sync: true }
    }
  });
  await prisma.tenantIntegrationConfig.upsert({
    where: { tenantId_integrationSlug: { tenantId: tenant3.id, integrationSlug: 'integration.financial.core' } },
    update: {},
    create: {
      tenantId: tenant3.id,
      integrationSlug: 'integration.financial.core',
      enabled: true,
      allowedAgents: ['agent.finance'],
      syncSettings: { polling_interval_minutes: 30, manual_sync: true }
    }
  });
  console.log('  ✓ All tenant integrations configured');

  // ==================== USERS ====================
  console.log('\n👤 Creating Users...');

  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  const hashedAdminPassword = await bcrypt.hash('Admin@2026!', 12);

  // Admin user (required for testing)
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      password: hashedPassword,
      name: 'John Doe',
      role: 'admin',
      tenantId: tenant3.id
    }
  });
  console.log('  ✓ Admin user created');

  // Additional admin user as requested
  await prisma.user.upsert({
    where: { email: 'admin@sistemamatriz.com' },
    update: {},
    create: {
      email: 'admin@sistemamatriz.com',
      password: hashedAdminPassword,
      name: 'Admin Sistema',
      role: 'admin',
      tenantId: tenant3.id
    }
  });
  console.log('  ✓ Admin Sistema user created');

  // Demo users for each tenant
  await prisma.user.upsert({
    where: { email: 'user.free@test.com' },
    update: {},
    create: {
      email: 'user.free@test.com',
      password: hashedPassword,
      name: 'Usuário Free',
      role: 'user',
      tenantId: tenant1.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'user.basic@test.com' },
    update: {},
    create: {
      email: 'user.basic@test.com',
      password: hashedPassword,
      name: 'Usuário Basic',
      role: 'user',
      tenantId: tenant2.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'user.pro@test.com' },
    update: {},
    create: {
      email: 'user.pro@test.com',
      password: hashedPassword,
      name: 'Usuário Pro',
      role: 'user',
      tenantId: tenant3.id
    }
  });
  console.log('  ✓ Demo users created for all tenants');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📝 Usuário admin adicional criado:');
  console.log('   Email: admin@sistemamatriz.com');
  console.log('   Senha: Admin@2026!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
