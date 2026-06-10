# Navant Edu: Whitepaper Técnico e Arquitetural
### O Primeiro ERP Educacional com Arquitetura de Core Bancário do Brasil

---

## Executive Summary

O **Navant Edu** é uma plataforma SaaS Multitenant de gestão institucional desenvolvida especificamente para Instituições de Ensino Superior (IES), Redes de Escolas e Grandes Fundações Educacionais. Diferente dos sistemas legados que dominam o mercado (TOTVS RM, SIG@, Lyceum), o Navant Edu foi arquitetado do zero seguindo os padrões de engenharia de **Fintechs e Bancos Digitais**.

O resultado: uma plataforma capaz de processar decenas de milhares de matrículas, boletos e transações por segundo, com rastreabilidade absoluta, prevenção de fraudes nativa e uma estrutura de Guard Rails que nenhum outro sistema educacional oferece.

---

## 1. Filosofia de Engenharia

### 1.1. Clean Architecture (DDD)

Cada microsserviço é estruturado em camadas isoladas:

```
apps/<service>/
├── cmd/            → Entrypoint do serviço (main.go)
├── internal/
│   ├── domain/     → Entidades e Regras de Negócio (agnóstico de framework)
│   ├── usecase/    → Casos de Uso (a lógica que importa)
│   ├── repository/ → Implementação de acesso a dados (GORM/SQL)
│   └── adapters/   → Integrações externas (APIs, Webhooks, Queues)
└── delivery/
    └── http/       → Handlers REST (Chi Router)
```

**Por que isso importa:** Se amanhã decidirmos migrar de PostgreSQL para CockroachDB, apenas a camada `repository/` muda. O domínio e as regras de negócio permanecem intocados.

### 1.2. Golang: A Escolha da Performance

- **Compilado nativamente:** Binários de 5–12MB, inicialização em < 50ms
- **Goroutines:** Concorrência massiva sem overhead de threads do SO
- **Latência P99:** APIs respondendo em < 10ms em cenário de 10.000 req/s
- **Go Workspaces:** Todos os 18 microsserviços compartilham o mesmo workspace (`go.work`), eliminando inconsistências de versão entre pacotes internos

### 1.3. Multitenancy Nativa

Cada entidade no sistema carrega um `TenantID` (UUID) que é **validado na camada de middleware JWT antes de qualquer operação**. Uma mesma instância da plataforma pode gerenciar:

- Universidade A (São Paulo) — suas turmas, financeiro e alunos
- Centro Universitário B (Recife) — dados completamente isolados
- Rede de Franquias C (15 Polos EAD) — consolidado ou segregado

---

## 2. Ecossistema de Microsserviços (18 Serviços)

### Camada B2C — O Aluno como Centro

| Microsserviço | Responsabilidade Principal | Tecnologias |
|---|---|---|
| `apps/admissions` | Funil de captação (Lead → Matrícula), CRM, ENEM, MGM | Go, GORM, Chi |
| `apps/academic` | Currículo, Turmas, Frequência, Histórico Escolar, Notas | Go, GORM, Chi |
| `apps/financial` | Faturamento, Bolsas, Boletos PIX, Conciliação, Ledger | Go, GORM, Chi |
| `apps/clinic` | Clínica Escola: Prontuário (EHR), Agendamentos, Horas Práticas | Go, GORM |
| `apps/lms` | Integração com Moodle / LTI 1.3 (Conteúdo e-Learning) | Go |
| `apps/library` | Acervo digital, Reservas de Livros, Empréstimos | Go |
| `apps/surveys` | Avaliações Institucionais (CPA/ENADE), NPS de Alunos | Go |
| `apps/omnichannel` | Comunicação unificada: E-mail, SMS, WhatsApp, Push | Go |
| `apps/portal-bff` | Backend for Frontend: API Gateway otimizada para o Portal do Aluno | Go |

### Camada B2B — O Backoffice Corporativo

| Microsserviço | Responsabilidade Principal | Tecnologias |
|---|---|---|
| `apps/procurement` | Fornecedores, Licitações (RFP/Tender), Contratos B2B, Contas a Pagar | Go, GORM |
| `apps/hr` | Gestão de Colaboradores, Benefícios, Holerites, Ponto Eletrônico | Go |
| `apps/legal` | Contratos Jurídicos, Dossiês, Integração Benner | Go |
| `apps/facilities` | Gestão de Espaços: Salas, Laboratórios, Reservas | Go |
| `apps/document-vault` | Cofre Digital de Documentos (RG, Diplomas, TCEs) | Go |
| `apps/careers` | Hub de Estágios: TCE Digital, Empresas Concedentes, Relatórios | Go |
| `apps/crm` | Customer Relationship: Pipeline de Vendas de Cursos Livres | Go |
| `apps/workflow` | Motor de Workflows (Aprovações, Tramitações) | Go |
| `apps/integration` | Hub de Integrações Externas (D4Sign, Benner, Unico, Idwall) | Go |

### Pacotes Core Compartilhados

| Pacote | Responsabilidade |
|---|---|
| `packages/core` | IAM Auth, JWT, Events Publisher, Feature Toggles, Logging |
| `packages/audit` | Audit Trail imutável (log de toda ação crítica com actor + timestamp) |
| `packages/integration` | Clientes HTTP para APIs externas (D4Sign, Benner, Bacen) |
| `packages/workflow` | Engine de Máquina de Estados para fluxos aprovação |

---

## 3. Arquitetura de Eventos (EDA)

O Navant Edu **não usa chamadas HTTP síncronas** entre microsserviços para operações críticas. Em vez disso, os serviços publicam eventos em um Message Broker (RabbitMQ/Kafka).

### Fluxos de Eventos Críticos

```
admissions.contract.signed
    └──→ legal/benner_adapter.go      # Cria Dossiê Jurídico (se toggle ativo)
    └──→ academic/enrollment_handler  # Ativa acesso do aluno

financial.payment.confirmed
    └──→ financial/reconcile.go       # Concilia no Ledger (Double-Entry)
    └──→ lms/access_provisioner       # Libera acesso ao Moodle instantaneamente

procurement.contract.awarded
    └──→ financial/payable_handler    # Cria obrigação em Contas a Pagar

careers.internship.completed
    └──→ academic/hours_injector      # Injeta horas complementares no histórico
```

**Benefício:** Se o serviço Acadêmico cair por manutenção, os alunos continuam pagando e os boletos continuam sendo conciliados. Não há downtime em cascata.

---

## 4. Guard Rails: A Camada de Segurança Bancária

Esta é a camada que separa o Navant Edu de **todos os concorrentes** do mercado educacional.

### 4.1. Double-Entry Ledger (Contabilidade Imutável)

Todo movimento financeiro gera dois registros contábeis (Débito + Crédito) na tabela `accounting_entries`. Inspirado no padrão bancário de Core Banking, é **fisicamente impossível** que dinheiro "desapareça" do sistema. A instituição tem um razão contábil perfeito.

```go
// Entidade AccountingEntry — imutável por design
type AccountingEntry struct {
    ID              uuid.UUID
    InvoiceID       uuid.UUID
    EntryType       string    // "DEBIT" ou "CREDIT"
    Amount          float64
    Description     string
    ConfirmedViaWebhook bool  // Só true quando o Bacen/Pix confirmar
    CreatedAt       time.Time // Nunca alterado após criação
}
```

### 4.2. Credit Risk Lock (Trava de Risco de Crédito)

Antes de qualquer rematrícula, o Guard Rail `CheckFinancialRisk` é chamado. Alunos com faturas vencidas há mais de 15 dias são **bloqueados sistemicamente** na API. O bloqueio não pode ser contornado por regra de negócio de interface — está na lógica central do serviço.

### 4.3. Anti-Fraude e KYC (Know Your Customer)

Todo candidato à matrícula passa pelo fluxo:
1. Validação biométrica via **Unico IDTech** (selfie + documento)
2. Análise de CPF via Serasa/SPC
3. Status `PENDING_KYC` bloqueia o acesso ao portal acadêmico até aprovação
4. Apenas após validação o status migra para `ENROLLED`

### 4.4. Feature Toggles (Canary Releases)

O `FeatureToggleManager` (Singleton no `packages/core`) permite ligar/desligar integrações externas em runtime sem redeploy. Se a API do Benner Jurídico estiver instável, a flag `integration.benner.legal_dossier` é desligada e o fluxo continua funcionando sem o Benner.

```go
// Feature Toggle em ação
if tm.IsEnabled("integration.benner.legal_dossier") {
    bennerAdapter.SyncDossier(ctx, enrollment)
}
```

---

## 5. Módulos de Alto Valor (Diferenciais Competitivos)

### 5.1. Motor Dinâmico de Bolsas (`apps/financial`)

A política de descontos e bolsas é configurada pela própria instituição, sem deploy de código:

- **Bolsas por Departamento:** Ex: 50% para filhos de funcionários (RH valida)
- **Isenção de Ação Social:** 100% de isenção aprovada pelo Departamento de Ação Social
- **Bolsa ProUni / FIES:** Integração com sistemas federais
- **Descontos por Antecipação:** 5% de desconto para quem paga até o dia 5
- **Bolsa MGM:** 10% automático para quem trouxer um colega matriculado

### 5.2. Member-Get-Member com Originação (`apps/admissions`)

O Lead de Admissão carrega campos UTM nativos (`utm_source`, `utm_medium`, `utm_campaign`) e o campo `ReferredBy` (UUID do aluno indicador). Isso permite:

- Rastrear de qual campanha veio cada candidato (Google Ads, Instagram, Vestibular)
- Creditar automaticamente a bolsa do aluno indicador quando o indicado pagar a matrícula
- Relatórios de ROI por canal de marketing

### 5.3. Clínica Escola Integrada (`apps/clinic`)

Para IES de Saúde (Medicina, Odontologia, Fisioterapia): prontuários eletrônicos (EHR) com rastreamento de horas práticas supervisionadas. O INEP exige esse controle para autorização de cursos.

### 5.4. Hub de Carreiras e TCE Digital (`apps/careers`)

Fim do papel carbono para estágios obrigatórios. O sistema:
- Cadastra Empresas Concedentes (com CNPJ e validação)
- Gera o TCE e envia para D4Sign (assinatura tripla: Aluno, Empresa, Orientador)
- Ao concluir o estágio, injeta as horas complementares no histórico via evento assíncrono

### 5.5. Licitações B2B (`apps/procurement`)

Para IES que precisam de governança em compras:
- Abertura de Editais (RFP) com teto máximo e prazos
- Recebimento de Propostas (Bids) de Fornecedores cadastrados
- Award do vencedor gera Contrato B2B + Contas a Pagar automaticamente

---

## 6. Stack de Infraestrutura

```yaml
# docker-compose.yml (desenvolvimento local)
services:
  postgres:    # Banco de dados principal (GORM migrations)
  rabbitmq:    # Message broker para eventos
  redis:       # Cache de sessão e Feature Toggles
  traefik:     # Reverse proxy / API Gateway
```

**Produção recomendada:**
- **Cloud:** AWS ECS Fargate ou GCP Cloud Run (serverless containers)
- **Banco:** AWS RDS Aurora PostgreSQL (Multi-AZ, replicação automática)
- **Message Broker:** AWS SQS/SNS ou Confluent Kafka
- **Secrets:** HashiCorp Vault ou AWS Secrets Manager
- **Observabilidade:** OpenTelemetry + Jaeger + Prometheus + Grafana

---

## 7. Conformidade e Regulatório

| Regulação | Cobertura no Navant Edu |
|---|---|
| **LGPD** | Consentimento de dados na captação, anonimização de CPF/RG em logs |
| **MEC (Instr. Norm. 4/2013)** | Histórico escolar digital válido, controle de frequência mínima |
| **Lei do Estágio (11.788)** | TCE digital com assinatura eletrônica válida juridicamente |
| **CFM / CRO** | Prontuários eletrônicos para Clínicas Escola (EHR) |
| **Lei de Licitações (14.133)** | Módulo de Procurement com rastreabilidade de editais |

---

## 8. Posicionamento de Mercado

| Critério | TOTVS RM | SIG@ | Lyceum | **Navant Edu** |
|---|---|---|---|---|
| Arquitetura | Monolítico | Monolítico | Monolítico | **Microsserviços EDA** |
| Linguagem | Java/.NET | PHP | PHP | **Golang** |
| Multitenancy | Parcial | Não | Não | **Nativo** |
| Guard Rails Financeiros | Básico | Não | Não | **Completo (Bancário)** |
| E-Commerce de Cursos | Não | Não | Básico | **Nativo (Cart + PIX)** |
| Hub de Estágios | Manual | Manual | Manual | **Digital (D4Sign)** |
| Licitações B2B | Parcial | Não | Não | **Completo** |
| Feature Toggles | Não | Não | Não | **Sim (Canary Releases)** |
| Clínica Escola (EHR) | Terceiro | Não | Não | **Integrado** |

---

## 9. Roadmap

### Fase 7: Frontend (Portal do Aluno e Backoffice)
- Monorepo Next.js 15 + Turborepo
- Portal do Aluno (Mobile-First, PWA)
- Backoffice Administrativo (RBAC por perfil: Reitor, Coordenador, Financeiro)
- Design System compartilhado em TailwindCSS

### Fase 8: IA e Analytics
- Predição de Evasão (modelo ML treinado no histórico de pagamentos + frequência)
- Chatbot de Secretaria (LLM integrado via API Gemini)
- Dashboard Executivo com BI em tempo real

---

*Navant Edu — Construído com os padrões de engenharia que o mercado educacional nunca teve.*
