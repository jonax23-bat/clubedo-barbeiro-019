# ✂️ Royal Blade — Stitch Clubber Gamified Barber Membership

**Royal Blade** (também conhecido como **Clube do Barbeiro**) é um sistema completo e gamificado de fidelidade e assinaturas para barbearias de alto padrão. Ele transforma a rotina de cuidados pessoais em uma experiência interativa e comunitária, unindo agendamento de serviços, planos de assinatura recorrentes, economia interna de moedas/XP, feed social e um bolão de futebol integrado.

O aplicativo está implantado em ambiente de produção oficial no endereço:  
👉 **[https://clubedabarba019.web.app](https://clubedabarba019.web.app/)**

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **React.js & Vite**: Biblioteca ágil para criação de interfaces dinâmicas, com compilação ultra-rápida (HMR) e empacotamento otimizado.
- **JavaScript (ES6+)**: Lógica e comunicação assíncrona.
- **Vanilla CSS (Custom Styling)**: Folhas de estilo sob medida com foco em estética premium, utilizando gradientes harmônicos, efeitos de desfoque (glassmorphism), animações de progresso e total responsividade para dispositivos móveis e desktops.
- **Google Fonts & Material Symbols**: Tipografia moderna e biblioteca de ícones vetoriais.

### Backend & Serviços Cloud (Firebase Suite)
- **Firebase Authentication**: Sistema seguro de login para clientes e equipe técnica usando login social via Google e login clássico por E-mail/Senha.
- **Cloud Firestore**: Banco de dados NoSQL estruturado em tempo real para armazenamento e sincronização instantânea de usuários, publicações, comentários, apostas, ligas de futebol, agendamentos e logs financeiros.
- **Firebase Hosting**: Plataforma escalável para hospedagem do aplicativo frontend otimizado para produção.

### APIs de Terceiros
- **Sports API (Football Data)**: Integração com endpoints esportivos em tempo real para sincronização automática de jogos da Copa do Mundo, UEFA Champions League e Campeonato Brasileiro (Série A).

---

## 💎 Funcionalidades Principais

### 👤 1. Área do Cliente
- **Painel Geral (Home)**: Exibe o progresso de cortes de cabelo realizados, metas para obtenção de recompensas, saldo de moedas do clube e agendamentos futuros.
- **Agendamento Inteligente**: Marcação de horários de forma ágil com profissionais da barbearia, com suporte a bônus de **Golden Hour** (horários promocionais com acréscimo de XP).
- **Planos de Assinatura**: O usuário pode solicitar planos (Classic, VIP ou Master). A assinatura entra em estado pendente aguardando validação manual e confirmação física de pagamento pelo dono.
- **Loja do Clube**: Conversão de moedas virtuais acumuladas (Clubber Coins) por prêmios e produtos físicos da barbearia.
- **Nível do Clube (XP)**: O cliente acumula pontos de XP ao completar cortes e contratar assinaturas, progredindo do Nível 1 (Novato) até o Nível 8 (Clã Barbeiro), que destrava badges exclusivas e multiplicadores de bônus.

### ⚽ 2. Bolão da Rodada (Novo)
- **Partidas Reais**: Interface dedicada com as partidas da rodada obtidas da API esportiva.
- **Palpites**: Formulário para membros ativos (com plano assinado) darem palpites nos placares dos jogos.
- **Cálculo de Pontos**: Adiciona +3 pontos para acertos exatos do placar (com acréscimo de bônus proporcional ao nível de fidelidade do jogador no clube).
- **Ranking Mensal**: Leaderboard de apostadores ordenados por pontos acumulados nas últimas rodadas.

### 💬 3. Comunidade Social
- **Feed de Notícias**: Espaço integrado para compartilhamento de fotos, cortes recentes e comunicados oficiais da barbearia.
- **Interações**: Opções de curtir, comentar e expressar reações rápidas utilizando emojis personalizados (👍 Gostei, ❤️ Amei, 🔥 Brabo, ✂️ Estilo).
- **Leaderboard Geral**: Ranking global dos membros com maior pontuação de XP da barbearia.

### 💼 4. Painel Administrativo (Dono/Barbeiro)
- **Gestão de Clientes**: Registro manual de novos clientes, ajuste de saldos de XP/Coins e monitoramento em tempo real do vencimento das assinaturas.
- **Solicitações de Planos**: Painel com aprovação ou rejeição manual de novos planos de assinantes.
- **Gestão de Equipe**: Cadastro de barbeiros, definição de comissões, horários de expediente e bloqueio de datas de ausência.
- **Financeiro**: Relatório de faturamento consolidado por serviços, planos e produtos da loja, com gráficos e detalhamento de receitas.
- **Identidade Visual**: Troca rápida do nome comercial exibido nas interfaces do aplicativo.
- **Configurações do Bolão**: Ativação ou suspensão de ligas monitoradas e sincronização forçada de placares ao vivo com a API esportiva.

---

## 🛠️ Como Executar o Projeto Localmente

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado na sua máquina.

### Passos para Inicialização
1. Clone o repositório para sua máquina local:
   ```bash
   git clone https://github.com/jonax23-bat/clubedo-barbeiro-019.git
   cd clubedo-barbeiro-019
   ```

2. Instale as dependências do projeto:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env` na raiz do projeto contendo as chaves de configuração do Firebase e da API de esportes (baseie-se no arquivo `.env.example` ou use credenciais oficiais):
   ```env
   VITE_FOOTBALL_API_KEY=sua_chave_da_api_de_esportes
   VITE_FIREBASE_API_KEY=sua_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

4. Execute o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```
   Acesse a URL gerada (geralmente `http://localhost:5173`) no navegador de sua preferência.

5. Para criar o pacote de produção otimizado:
   ```bash
   npm run build
   ```
