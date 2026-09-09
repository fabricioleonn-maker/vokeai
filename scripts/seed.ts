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
        integrations_connected: 1,
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
        }
      }
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
        integrations_connected: 3,
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
        }
      }
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
        integrations_connected: null,
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
        }
      }
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
      config: {
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
          system_base: 'Você é a Secretária Virtual da Synkra. Ajude o usuário com sua agenda de forma eficiente e humana.',
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
      config: {
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
          system_base: 'Você é o Assistente Financeiro da Synkra. Ajude o usuário a registrar e categorizar suas movimentações financeiras.',
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
    }
  });
  console.log(`  ✓ Agent: ${agentFinance.name}`);

  const agentSupportN1 = await prisma.agentNode.upsert({
    where: { slug: 'agent.support.n1' },
    update: {},
    create: {
      slug: 'agent.support.n1',
      name: 'Atendimento N1',
      description: 'Agente de primeiro atendimento para FAQs, triagem e handoff para outros agentes',
      category: 'support',
      status: 'active',
      config: {
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
          system_base: 'Você é o Agente de Atendimento N1 da Synkra. Responda dúvidas, faça triagem e encaminhe para o agente adequado quando necessário.',
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
    }
  });
  console.log(`  ✓ Agent: ${agentSupportN1.name}`);

  const agentSales = await prisma.agentNode.upsert({
    where: { slug: 'agent.sales' },
    update: {},
    create: {
      slug: 'agent.sales',
      name: 'Vendas',
      description: 'Agente especializado em qualificação de leads, tratamento de objeções e conversão',
      category: 'sales',
      status: 'active',
      config: {
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
          system_base: 'Você é o Agente de Vendas da Synkra. Qualifique leads, trate objeções com empatia e conduza para conversão de forma humana.',
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
    }
  });
  console.log(`  ✓ Agent: ${agentSales.name}`);

  const agentProductivity = await prisma.agentNode.upsert({
    where: { slug: 'agent.productivity' },
    update: {},
    create: {
      slug: 'agent.productivity',
      name: 'Produtividade',
      description: 'Agente especializado em criação de emails, documentos, planilhas e apresentações',
      category: 'productivity',
      status: 'active',
      config: {
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
          system_base: 'Você é o Agente de Produtividade da Synkra. Ajude o usuário a criar emails, documentos, planilhas e apresentações de forma eficiente.',
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
    }
  });
  console.log(`  ✓ Agent: ${agentProductivity.name}`);

  // ==================== USERS ====================
  console.log('\n👤 Creating Users...');

  const hashedAdminPassword = await bcrypt.hash('Admin@2026!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@synkra.com.br' },
    update: {},
    create: {
      email: 'admin@synkra.com.br',
      password: hashedAdminPassword,
      name: 'Admin Synkra',
      role: 'admin',
    }
  });

  console.log('  ✓ Users created');

  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
