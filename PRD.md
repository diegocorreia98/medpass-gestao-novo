# PRD - MedPass Gestão
## Product Requirements Document

### Versão: 1.0
### Data: 19 de Setembro de 2025
### Última Atualização: 19 de Setembro de 2025

---

## 📋 Sumário Executivo

O **MedPass Gestão** é uma plataforma web completa para gestão de planos de saúde, desenvolvida para otimizar operações entre a matriz e suas unidades franqueadas. O sistema oferece funcionalidades distintas para dois tipos de usuários: **Matriz** (administração central) e **Unidade** (franquias), proporcionando controle total sobre beneficiários, planos, transações e capacitação.

---

## 🎯 Visão do Produto

**Missão**: Digitalizar e otimizar a gestão de planos de saúde, oferecendo uma plataforma robusta que conecta matriz e unidades de forma eficiente.

**Visão**: Ser a principal solução de gestão para operadoras de planos de saúde no Brasil, facilitando operações e melhorando a experiência de gestão.

**Valores**:
- Transparência nas operações
- Eficiência operacional
- Segurança dos dados
- Escalabilidade
- Experiência do usuário

---

## 👥 Usuários-Alvo

### 1. **Usuários Matriz** (Administração Central)
- **Perfil**: Administradores, gestores e operadores da sede
- **Responsabilidades**: Supervisão geral, configuração de planos, gestão de unidades, análise de dados corporativos
- **Necessidades**: Visibilidade total, controle de configurações, relatórios consolidados

### 2. **Usuários Unidade** (Franquias)
- **Perfil**: Gestores e funcionários das unidades franqueadas
- **Responsabilidades**: Gestão local de beneficiários, vendas, atendimento ao cliente
- **Necessidades**: Ferramentas operacionais, relatórios locais, capacitação

---

## 🏗️ Arquitetura Técnica

### **Stack Tecnológico**
- **Frontend**: React 18 + TypeScript + Vite
- **UI/UX**: Shadcn/UI + Tailwind CSS + Radix UI
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Estado**: TanStack Query (React Query)
- **Roteamento**: React Router v6
- **Autenticação**: Supabase Auth + perfis customizados

### **Padrões Arquiteturais**
- **Autenticação dual**: Supabase Auth + tabela de perfis customizada
- **RLS (Row Level Security)**: Controle de acesso baseado em roles
- **Componentes reutilizáveis**: Design system consistente
- **Hooks customizados**: Lógica de negócio encapsulada

---

## 🔐 Sistema de Autenticação e Autorização

### **Tipos de Usuário**
1. **Matriz**: Acesso total ao sistema
2. **Unidade**: Acesso restrito aos dados da própria unidade

### **Controle de Acesso**
- **RLS (Row Level Security)**: Políticas de banco de dados
- **ProtectedRoute**: Componente para proteção de rotas
- **Context de Autenticação**: Gerenciamento global de sessão

### **Múltiplos Usuários por Unidade**
- Sistema de roles: `admin`, `funcionario`, `visualizador`
- Tabela `unidade_usuarios` para relacionamento N:N
- Permissões granulares por role

---

## 🚀 Funcionalidades Principais

## 📊 PAINEL MATRIZ

### **1. Dashboard Executivo**
- **Métricas em tempo real**: Beneficiários ativos, receita, crescimento
- **Visualizações**: Gráficos interativos (Recharts)
- **Mapa do Brasil**: Distribuição geográfica das unidades
- **KPIs**: Acompanhamento de metas e performance

### **2. Gestão de Orçamentos**
- **Geração automática**: Cálculo baseado em regras de negócio
- **Múltiplos planos**: Suporte a diversos tipos de cobertura
- **Customização**: Ajustes por região e perfil do cliente
- **Aprovação workflow**: Sistema de aprovação multinível

### **3. Gestão de Adesões**
- **Processo completo**: Do orçamento à ativação
- **Documentação digital**: Upload e validação de documentos
- **Integração de pagamento**: Processamento via Vindi
- **Notificações automatizadas**: Updates por email/SMS

### **4. Gestão de Cancelamentos**
- **Workflows configuráveis**: Processos de retenção
- **Razões estruturadas**: Categorização para análise
- **Aprovações**: Sistema de aprovação para cancelamentos
- **Relatórios de churn**: Análise de motivos de cancelamento

### **5. Administração Avançada**
- **Configuração de planos**: Criação e edição de produtos
- **Gestão de unidades**: Cadastro e configuração de franquias
- **Usuários e permissões**: Controle de acesso granular
- **Logs de auditoria**: Rastreamento de todas as ações

### **6. Gestão Financeira**
- **Transações**: Acompanhamento de pagamentos e recebimentos
- **Comissões**: Cálculo automático por unidade
- **Relatórios financeiros**: Demonstrativos detalhados
- **Integração bancária**: Conciliação automática

### **7. Sistema de Franquias**
- **Cadastro de franqueados**: Informações completas
- **Territórios**: Definição de áreas de atuação
- **Performance**: Acompanhamento de resultados por unidade
- **Suporte**: Ferramentas de apoio às franquias

## 🏢 PAINEL UNIDADE

### **1. Dashboard Operacional**
- **Métricas locais**: Beneficiários, vendas, metas
- **Agenda**: Compromissos e tarefas
- **Notificações**: Alertas e comunicados da matriz
- **Performance**: Indicadores de produtividade

### **2. Gestão de Beneficiários**
- **Cadastro completo**: Informações pessoais e contratuais
- **Histórico médico**: Registros de atendimentos
- **Dependentes**: Gestão de familiares
- **Status de pagamento**: Controle de inadimplência

### **3. Gestão de Empresas**
- **Cadastro corporativo**: Informações da empresa contratante
- **Colaboradores**: Gestão de funcionários beneficiários
- **Contratos**: Termos e condições específicas
- **Faturamento**: Gestão de cobranças corporativas

### **4. Operações Locais**
- **Orçamentos**: Geração para clientes locais
- **Adesões**: Processamento de novos contratos
- **Atendimento**: Suporte ao beneficiário
- **Documentação**: Gestão de arquivos

### **5. Financeiro Local**
- **Carteira**: Controle de recebimentos
- **Relatórios**: Demonstrativos da unidade
- **Comissões**: Acompanhamento de ganhos
- **Metas**: Controle de objetivos

## 🎓 SISTEMA DE CAPACITAÇÃO

### **1. Gestão de Cursos (Matriz)**
- **Criação de cursos**: Editor completo com módulos e lições
- **Categorização**: Organização por áreas de conhecimento
- **Conteúdo multimídia**: Vídeos, textos, PDFs, links
- **Sequenciamento**: Controle de ordem das lições
- **Publicação**: Sistema de aprovação e distribuição

### **2. Player de Vídeo Avançado**
- **Controles completos**: Play/pause, volume, velocidade
- **Modo tela cheia**: Experiência imersiva
- **Marcadores de progresso**: Salvamento automático do ponto atual
- **Legendas**: Suporte a múltiplos idiomas
- **Relatórios de visualização**: Tempo assistido por usuário

### **3. Biblioteca de Cursos (Unidade)**
- **Catálogo completo**: Todos os cursos disponíveis
- **Filtros avançados**: Por categoria, nível, duração
- **Busca inteligente**: Localização rápida de conteúdo
- **Progresso visual**: Indicadores de conclusão
- **Recomendações**: Sugestões personalizadas

### **4. Sistema de Certificação**
- **Geração automática**: Certificados ao completar 100% do curso
- **Templates personalizáveis**: Design profissional
- **Numeração única**: Controle de autenticidade
- **Download em PDF**: Formato padrão para impressão
- **Histórico completo**: Registro de todas as certificações

### **5. Acompanhamento de Progresso**
- **Dashboard individual**: Progresso pessoal do usuário
- **Relatórios gerenciais**: Performance da equipe
- **Gamificação**: Sistema de pontos e conquistas
- **Metas de capacitação**: Objetivos por função/cargo

---

## 📱 Interface e Experiência do Usuário

### **Design System**
- **Componentes**: Shadcn/UI para consistência
- **Tema**: Suporte a modo escuro/claro
- **Responsividade**: Adaptação para mobile e desktop
- **Acessibilidade**: Conformidade com padrões WCAG

### **Navegação**
- **Sidebar contextual**: Menus específicos por tipo de usuário
- **Breadcrumbs**: Orientação de localização
- **Busca global**: Localização rápida de funcionalidades
- **Atalhos**: Teclas de acesso rápido

### **Performance**
- **Loading states**: Feedback visual durante carregamento
- **Cache inteligente**: React Query para otimização
- **Lazy loading**: Carregamento sob demanda
- **Otimização de imagens**: Compressão automática

---

## 🔒 Segurança e Compliance

### **Proteção de Dados**
- **LGPD**: Conformidade com a Lei Geral de Proteção de Dados
- **Criptografia**: Dados sensíveis protegidos em trânsito e repouso
- **Backup automático**: Rotinas de segurança dos dados
- **Auditoria**: Logs completos de todas as operações

### **Controles de Acesso**
- **2FA**: Autenticação de dois fatores (opcional)
- **Sessões**: Controle de tempo de inatividade
- **IP whitelist**: Restrição por localização (opcional)
- **Roles granulares**: Permissões específicas por função

---

## 📊 Analytics e Relatórios

### **Business Intelligence**
- **Dashboard executivo**: KPIs estratégicos
- **Relatórios automatizados**: Envio por email agendado
- **Análise de tendências**: Insights de crescimento
- **Comparativos**: Performance entre unidades

### **Relatórios Operacionais**
- **Beneficiários**: Cadastros, cancelamentos, renovações
- **Financeiro**: Receitas, comissões, inadimplência
- **Vendas**: Performance por vendedor e unidade
- **Capacitação**: Progresso e conclusões de cursos

---

## 🔗 Integrações

### **Pagamentos**
- **Vindi**: Processamento de recorrência
- **PIX**: Pagamentos instantâneos
- **Boleto**: Emissão automática
- **Cartão**: Processamento seguro

### **Comunicação**
- **Email**: SMTP configurável
- **SMS**: Notificações via WhatsApp/Telegram
- **Push notifications**: Alertas em tempo real

### **Documentos**
- **PDF**: Geração automática de contratos e relatórios
- **Assinatura digital**: Integração com DocuSign/similar
- **Storage**: Supabase Storage para arquivos

---

## 📈 Roadmap e Evolução

### **Próximas Funcionalidades**
1. **Mobile App**: Aplicativo nativo para iOS/Android
2. **API Pública**: Integrações com sistemas terceiros
3. **IA/ML**: Recomendações inteligentes e análise preditiva
4. **Chatbot**: Suporte automatizado
5. **Workflow Builder**: Criação de processos customizados

### **Melhorias Técnicas**
- **Performance**: Otimizações contínuas
- **Monitoramento**: APM e alertas
- **Testes**: Cobertura automatizada
- **CI/CD**: Pipeline de deploy automatizado

---

## 💼 Modelo de Negócio

### **Monetização**
- **SaaS**: Assinatura mensal/anual por unidade
- **Setup Fee**: Taxa única de implementação
- **Módulos adicionais**: Funcionalidades premium
- **Suporte**: Planos de suporte técnico

### **Escalabilidade**
- **Multi-tenant**: Suporte a múltiplas operadoras
- **White-label**: Personalização da marca
- **Revendedores**: Programa de parcerias

---

## 🎯 Métricas de Sucesso

### **KPIs Técnicos**
- **Uptime**: > 99.9%
- **Performance**: Tempo de carregamento < 2s
- **Adoção**: % de usuários ativos mensais
- **Satisfação**: NPS > 8.0

### **KPIs de Negócio**
- **Retenção**: Taxa de churn < 5%
- **Crescimento**: % de aumento de unidades/mês
- **ROI**: Retorno sobre investimento para clientes
- **Produtividade**: Redução de tempo em tarefas manuais

---

## 🏁 Conclusão

O **MedPass Gestão** representa uma solução completa e inovadora para o mercado de planos de saúde, oferecendo uma plataforma robusta que atende tanto às necessidades estratégicas da matriz quanto às operacionais das unidades. Com foco em experiência do usuário, segurança e escalabilidade, o sistema está posicionado para transformar a gestão de operadoras de saúde no Brasil.

---

**Documento elaborado por**: Sistema de IA Claude  
**Aprovação técnica**: Pendente  
**Aprovação comercial**: Pendente  
**Próxima revisão**: 19/10/2025
