# ✈️ Radar Agressivo de Oportunidades: Monitor Inteligente de Passagens Aéreas

Um terminal algorítmico profissional e de alta performance desenvolvido para caçar tarifas aéreas em tempo real para a rota **São Paulo (SAO) ⇄ Florianópolis (FLN)** para as datas críticas de Junho de 2026. 

Este sistema opera como um **Hedge Fund de passagens**, calculando médias móveis históricas, desvios padrão (Z-Score), picos artificiais, resets de lotes e disparando alertas instantâneos com provas visuais de compra (screenshots).

---

## 🚀 Principais Funcionalidades

- **Dashboard Trading Premium:** Visual premium inspirado em terminais fintech com animações de radar ativas, skeletons de carregamento, glassmorphism e dark mode.
- **Gráficos com Recharts:** Linhas de tendência temporal combinando preço mínimo e média móvel, heatmaps de dias/horários ideais para compra, e comparativo de preços entre aeroportos (`CGH`, `GRU`, `VCP`) e plataformas (`Google Flights`, `Skyscanner`, `Decolar`, `Kayak`).
- **Score de Oportunidade Inteligente (0-100):** Algoritmo que calcula a relevância da tarifa com base em limites de negócios, volatilidade histórica e proximidade da viagem.
- **Inteligência Preditiva:** Mecanismo estatístico (Regressão Linear e Desvio Padrão) que calcula a probabilidade em tempo real da tarifa cair ou subir nas próximas horas, estimando a janela de compra recomendada.
- **Motor Playwright Stealth:** Scraping de passagens com técnicas de camuflagem (rotação de `User-Agent`, emulação de viewports variáveis e delays randômicos) para evasão de bloqueio.
- **Fallback Resiliente / Dados Ricos:** Modo simulado configurável via `.env` (`MOCK_SCRAPING=true`) que popula o banco com histórico de oscilações extremamente realista para testes instantâneos.
- **Alertas Automatizados Multicanais:** Integração total com Webhooks do **Discord** (Rich Embeds customizados com cores e dados), bots do **Telegram** (Markdown formatado) e estrutura modular para **WhatsApp API**.
- **Captura de Screenshots de Oportunidades:** Salvamento automático de prova visual da passagem direto em pasta estática do servidor sempre que o Score for Excelente (>= 75).

---

## 📊 Regras de Negócio e Classificação de Score

De acordo com as flutuações de preços registradas na rota, o sistema atua nas seguintes faixas de tarifas:

| Limites de Tarifa | Classificação | Score Base | Recomendação do Sistema |
| :--- | :--- | :--- | :--- |
| **≤ R$ 700** | Excelente | `90 a 100` | 🔥 COMPRAR IMEDIATAMENTE (Oportunidade Rara) |
| **≤ R$ 820** | Bom | `75 a 89` | ⚡ OPORTUNIDADE BOA (Preço abaixo da média) |
| **≤ R$ 920** | Aceitável | `50 a 74` | ⚖️ PREÇO ACEITÁVEL (Acompanhar oscilações) |
| **> R$ 950** | Ruim | `0 a 49` | ❌ PREÇO RUIM / PICO ARTIFICIAL (Aguardar) |

*O Score final sofre ajustes dinâmicos com base em voos diretos (+5pts), bagagem inclusa (+5pts) e Z-Score abaixo da média móvel.*

---

## 📁 Arquitetura do Projeto

```
VER VOO/
├── backend/                    # Servidor Express, SQLite, Playwright & Scheduler
│   ├── db.js                   # Camada de banco de dados e auto-seeding
│   ├── server.js               # APIs REST de analytics, preços e trigger
│   ├── scraping-engine.js      # Motores de raspagem (Live e Simulado)
│   ├── opportunity-scorer.js   # Regras matemáticas de Score e Predições
│   ├── screenshot-manager.js   # Capturas de tela usando Playwright
│   └── package.json
├── frontend/                   # React, Vite, Tailwind CSS & Recharts
│   ├── src/
│   │   ├── components/         # Dashboard, Analytics, History, Settings, LiveActivity
│   │   ├── App.tsx             # Polling de dados e orquestração de telas
│   │   └── index.css           # Estilos customizados e glassmorphism
│   └── package.json
├── docker-compose.yml          # Containerização integrada
├── .env                        # Variáveis de Ambiente do Sistema
└── package.json                # Gerenciador global de scripts
```

---

## 🛠️ Como Iniciar o Projeto (Localmente)

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
- [Node.js](https://nodejs.org/) (Versão 18 ou superior)
- NPM (incluso no Node)

### 2. Instalar Dependências Gerais (Em um único comando!)
Abra o terminal no diretório raiz do projeto (`VER VOO`) e execute:
```bash
npm run install-all
```
*Este comando instalará todas as dependências do orquestrador global, do backend Express e do frontend React de forma automática.*

### 3. Configurar Alertas e Modo
Renomeie ou edite o arquivo `.env` gerado na raiz.
```ini
PORT=5000
MOCK_SCRAPING=true  # Mantenha true para testar os gráficos com dezenas de dados imediatamente
DISCORD_WEBHOOK_URL=insira_seu_webhook_aqui
TELEGRAM_BOT_TOKEN=insira_seu_token_aqui
TELEGRAM_CHAT_ID=insira_seu_chat_id_aqui
```

### 4. Rodar o Sistema de Forma Concorrente!
Para subir o backend Express e o frontend React simultaneamente, basta executar na raiz do projeto:
```bash
npm run dev
```
O console exibirá as inicializações coloridas de forma integrada:
- **Painel do Frontend:** Disponível em [http://localhost:5173](http://localhost:5173)
- **API do Backend:** Operando em [http://localhost:5000](http://localhost:5000)

---

## 🐳 Inicialização via Docker (Opcional)

Se você preferir executar o sistema inteiro dentro de containers isolados do Docker, execute o seguinte comando na pasta raiz:

```bash
docker-compose up --build
```

As portas serão expostas localmente da mesma maneira:
- Frontend: `http://localhost:5173`
- Backend / API: `http://localhost:5000`

---

## 🔔 Teste de Notificações em Tempo Real

1. Abra o Dashboard em `http://localhost:5173`.
2. Vá na aba **Alertas & Ajustes** (Settings).
3. Insira seu Webhook do Discord ou Telegram Token/Chat ID.
4. Clique no botão **Salvar Configurações** e, em seguida, em **Testar Webhooks Agora**.
5. Um card de alerta estilizado de oportunidade será transmitido instantaneamente para o seu Discord ou Telegram!

---
Desenvolvido com foco em alta fidelidade visual, máxima resiliência de raspagem e inteligência preditiva. ✈️📈
