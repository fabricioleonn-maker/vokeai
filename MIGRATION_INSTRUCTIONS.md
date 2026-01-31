# Aplicar Migration Manualmente

## Opção 1: Via psql (Linha de Comando)

```bash
# Windows PowerShell
$env:PGPASSWORD="sua_senha"
psql -h db-2ac786738.db003.hosteddb.reai.io -p 5432 -U role_2ac786738 -d 2ac786738 -f prisma/migrations/add_ai_memory_system.sql
```

## Opção 2: Via DBeaver / pgAdmin

1. Conectar ao banco:
   - Host: `db-2ac786738.db003.hosteddb.reai.io`
   - Port: `5432`
   - Database: `2ac786738`
   - User: `role_2ac786738`
   - Password: (da sua .env)

2. Abrir SQL Editor

3. Copiar e colar o conteúdo de: `prisma/migrations/add_ai_memory_system.sql`

4. Executar

## Opção 3: Via Código (Node.js)

```bash
npx tsx prisma/run-migration.ts
```

## Verificar Sucesso

Após rodar, verificar:

```sql
-- Verificar novos campos no Tenant
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
  AND column_name IN ('businessSector', 'businessType', 'companySize');

-- Verificar novas tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('KnowledgeFact', 'UserProfile', 'ConversationEmbedding', 'BusinessRule');
```

Deve retornar 3 colunas e 4 tabelas ✅
