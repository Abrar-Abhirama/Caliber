# Plant Dashboard (Fullstack)

A clean, decoupled fullstack application for plant telemetry monitoring and RAG-based AI troubleshooting linked to `../knowledge-base`.

## Architecture

```
plant-dashboard/
├── backend/                  # Node.js Express API Server
│   ├── src/
│   │   ├── config/           # Environment & system configurations
│   │   ├── controllers/      # Route handlers (chat, dashboard, knowledge)
│   │   ├── middlewares/      # Error handling, validation, logging
│   │   ├── routes/           # REST API route definitions
│   │   ├── services/         # Business logic (AI engine, Knowledge-base loader/search)
│   │   ├── utils/            # Shared helper functions
│   │   └── server.js         # Backend server entry point
│   ├── .env.example          # Environment variables template
│   └── package.json
│
├── frontend/                 # React (Vite) Single Page Application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── assets/           # Icons, logos, and images
│   │   ├── components/
│   │   │   ├── common/       # Header, Sidebar, Navigation
│   │   │   ├── dashboard/    # Telemetry, Digital Twin cards, Status views
│   │   │   └── chatbot/      # Chat interface, message bubbles, source drawer
│   │   ├── hooks/            # Custom React hooks (e.g. useChat, useTelemetry)
│   │   ├── pages/            # Page-level containers (Dashboard, Chat, Documents)
│   │   ├── services/         # API clients (Axios / Fetch wrapper)
│   │   ├── styles/           # Global styles and design system variables
│   │   ├── App.jsx           # Root application component
│   │   ├── main.jsx          # React DOM entry point
│   │   └── index.css         # Base styling & theme variables
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
