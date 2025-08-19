# OS Conteúdo - Sistema de Gerenciamento de Produção de Vídeos

Sistema completo para gerenciar a produção de conteúdo de vídeo com fluxo automatizado, aprovações e inteligência artificial.

## 🚀 Funcionalidades Principais

### 📋 Gestão de OS (Ordens de Serviço)
- **Kanban Board** - Visualização do fluxo de produção
- **Lista Detalhada** - Visão tabular com filtros avançados
- **Criação Manual** - Formulário completo para novas OS
- **Importação com IA** - Upload de arquivos com extração automática

### 🤖 Inteligência Artificial
- **Parser de Documentos** - Extrai OS de PDFs, TXT, MD, DOCX
- **Classificação Automática** - Objetivo, tipo, prioridade
- **Deduplicação Inteligente** - Evita OS duplicadas
- **Análise de Tendências** - Insights de performance

### 👥 Gestão de Equipe
- **Usuários e Papéis** - Copy, Editor, Revisor, etc.
- **Aprovações** - Fluxo de aprovação com Crispim
- **SLA Monitoring** - Alertas automáticos de atraso
- **Relatórios** - Produtividade e métricas

### 📊 Analytics e Relatórios
- **Dashboard** - Métricas em tempo real
- **Auditoria de Conteúdo** - Análise de performance
- **Biblioteca** - Conteúdos publicados
- **Calendário** - Planejamento de publicações

## 🛠️ Tecnologias

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Supabase Edge Functions
- **Database:** PostgreSQL com RLS
- **IA:** OpenAI GPT-4 + Anthropic Claude
- **PDF Processing:** PDF.js
- **State Management:** React Context + Hooks

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone <repo-url>
cd os-conteudo
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
# Edite .env com suas credenciais do Supabase
```

4. **Execute migrações**
```bash
npm run db:migrate
```

5. **Inicie o desenvolvimento**
```bash
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Variáveis Opcionais (para IA)
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
INSTAGRAM_ACCESS_TOKEN=...
YOUTUBE_API_KEY=...
```

## 📚 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run test         # Executar testes
```

### Database
```bash
npm run db:generate  # Gerar migrações
npm run db:migrate   # Aplicar migrações
npm run db:studio    # Abrir Drizzle Studio
```

### Utilitários
```bash
npm run backfill     # Importar arquivos em lote
```

## 📁 Importação em Lote (Backfill)

Para importar múltiplos arquivos de uma vez:

1. **Crie a pasta backfill**
```bash
mkdir backfill
```

2. **Coloque seus arquivos**
```bash
# Suporta: .txt, .md, .pdf, .docx
cp /path/to/your/files/* ./backfill/
```

3. **Execute o backfill**
```bash
npm run backfill
```

O script vai:
- ✅ Processar todos os arquivos automaticamente
- ✅ Extrair OS com IA
- ✅ Deduplificar conteúdo
- ✅ Criar relatório detalhado

## 🏗️ Arquitetura

### Frontend (React)
```
src/
├── components/     # Componentes reutilizáveis
├── pages/         # Páginas da aplicação
├── contexts/      # Context providers
├── hooks/         # Custom hooks
├── lib/           # Utilitários e configurações
└── types/         # Definições TypeScript
```

### Backend (Supabase)
```
supabase/
├── functions/     # Edge Functions
├── migrations/    # Migrações do banco
└── config.toml    # Configuração do Supabase
```

### Edge Functions
- **`/api`** - CRUD principal de OS e usuários
- **`/os-intake`** - Importação com IA
- **`/sla-monitor`** - Monitoramento de prazos
- **`/content-audit`** - Auditoria de conteúdo
- **`/trends-analyzer`** - Análise de tendências

## 🔐 Segurança

### Multi-Tenant com RLS
- ✅ **Row Level Security** habilitado
- ✅ **Isolamento por organização**
- ✅ **Políticas granulares** por tabela
- ✅ **Auditoria completa** de ações

### Autenticação
- ✅ **JWT tokens** do Supabase Auth
- ✅ **Refresh automático** de sessões
- ✅ **Proteção de rotas** no frontend
- ✅ **Validação** em todas as APIs

## 📊 Monitoramento

### Logs e Auditoria
- **`logs_evento`** - Ações nas OS
- **`audit_logs`** - Logs de sistema
- **`import_sessions`** - Sessões de importação
- **`os_intake_keys`** - Chaves de idempotência

### Métricas
- **SLA Tracking** - Prazos e atrasos
- **Performance** - Tempo de processamento
- **Usage** - Quotas por organização
- **Errors** - Logs de erro detalhados

## 🎯 Fluxo de Trabalho

### 1. Criação de OS
```
Ideias → Importar/Criar → ROTEIRO → AUDIO → CAPTACAO → 
EDICAO → REVISAO → APROVACAO → AGENDAMENTO → POSTADO
```

### 2. Aprovações
- **Aprovação Interna** (REVISAO → APROVACAO)
- **Aprovação Crispim** (APROVACAO → AGENDAMENTO)
- **Publicação** (AGENDAMENTO → POSTADO)

### 3. Monitoramento
- **SLA Automático** por etapa
- **Alertas** de atraso
- **Relatórios** de produtividade

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para dúvidas ou problemas:
- 📧 Email: suporte@osconteudo.com
- 💬 Discord: [Link do servidor]
- 📖 Docs: [Link da documentação]

---

**Desenvolvido com ❤️ para otimizar a produção de conteúdo digital**