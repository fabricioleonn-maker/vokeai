# Roadmap - Sistema Matriz

## ✅ FASE 1 - MVP Core (Concluído)

### Funcionalidades Implementadas:
- Sistema Matriz Core (source of truth)
- Modelo de dados multi-tenant completo
- Painel administrativo básico
- Interface conversacional web
- Agente Orquestrador
- 2 Agentes: Secretária Virtual + Financeiro
- Integrações mockadas (CalendarAdapter, FinanceAdapter)
- Sistema de auditoria
- Documentação técnica

---

## ✅ FASE 2A - Agentes Completos + Analytics (Concluído)

### Funcionalidades Implementadas:

#### Novos Agentes Especializados:
- **Agente de Atendimento N1**: FAQs, triagem, detecção de intenção comercial/técnica, handoff inteligente
- **Agente de Vendas Humanizado**: Qualificação de leads, tratamento de objeções, apresentação de planos, CTAs
- **Agente de Produtividade**: Criação de emails, planilhas, apresentações, checklists

#### Handoff Completo:
- Atendimento N1 → Vendas (interesse comercial detectado)
- Atendimento N1 → Suporte (problema técnico detectado)
- Qualquer agente → outro agente conforme contexto
- Lógica de handoff centralizada no Orquestrador

#### Painel Admin Melhorado:
- CRUD completo de Tenants (criar, editar, excluir)
- Seleção de plano ao criar/editar tenant
- Botões de ação com confirmação

#### Google Analytics:
- Integração via @next/third-parties/google
- Configurável via variável de ambiente NEXT_PUBLIC_GA_MEASUREMENT_ID
- Tracking automático de pageviews

---

## 📋 FASE 2B - Integrações Reais (Próxima)

### Planejado:

#### Integrações de Calendário:
- [ ] Google Calendar OAuth real
- [ ] Microsoft Outlook OAuth
- [ ] Webhook de sincronização bidirecional

#### Integrações Financeiras:
- [ ] Conexão com ERPs (Omie, ContaAzul, etc.)
- [ ] Importação de extratos bancários
- [ ] Categorização automática via ML

#### Sistema de Billing:
- [ ] Integração com Stripe
- [ ] Checkout de planos
- [ ] Portal do cliente
- [ ] Webhooks de pagamento
- [ ] Controle de inadimplência

---

## 📋 FASE 3 - Canais Externos

### Planejado:

#### WhatsApp Business API:
- [ ] Webhook de recebimento
- [ ] Envio de mensagens
- [ ] Templates de mensagens
- [ ] Integração com Evolution API ou Meta API

#### Instagram Direct:
- [ ] Webhook de DMs
- [ ] Resposta automática

#### Facebook Messenger:
- [ ] Webhook de mensagens
- [ ] Integração via Meta API

#### TikTok Messages:
- [ ] Webhook de mensagens (quando disponível)

---

## 📋 FASE 4 - Enterprise Features

### Planejado:

#### White-Label:
- [ ] Domínio customizado por tenant
- [ ] Logo e cores customizáveis
- [ ] Branding completo

#### API Pública:
- [ ] API REST documentada
- [ ] Webhooks para eventos
- [ ] Rate limiting por plano

#### Relatórios Avançados:
- [ ] Dashboard de métricas por tenant
- [ ] Exportação de dados
- [ ] Alertas e notificações

#### SLA e Compliance:
- [ ] Logs de auditoria expandidos
- [ ] Backup e recuperação
- [ ] LGPD/GDPR compliance

---

## 🎯 Próximos Passos Imediatos

1. **Configurar Google Analytics**: Adicionar Measurement ID real
2. **Testar handoff entre agentes**: Validar fluxos de transição
3. **Preparar integrações reais**: Documentar OAuth flows necessários
4. **Definir estratégia de billing**: Escolher provedor (Stripe recomendado)

---

## 📝 Notas de Implementação

### Google Analytics
Para ativar o Google Analytics:
1. Obtenha o Measurement ID no Google Analytics (formato: G-XXXXXXXXXX)
2. Adicione ao arquivo .env: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
3. Faça redeploy da aplicação

### Novos Agentes
Os 3 novos agentes (Atendimento N1, Vendas, Produtividade) estão disponíveis apenas no plano Pro.
Para usar em outros planos, atualize a configuração em `features.enabled_agents` do plano desejado.
