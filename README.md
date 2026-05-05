# 🌱 GreenLoop

[![GitHub stars](https://img.shields.io/badge/Stars-0-blue?style=flat-square)](https://github.com/<your-username>/GreenLoop) [![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license) [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org/) [![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D6-4ea94b?style=flat-square)](https://www.mongodb.com/)

> GreenLoop is a sustainable waste management platform built for Bangladesh. It unites households, collectors, recycling centers, businesses, and admins with a modern React + Node.js + MongoDB stack.

## 📸 Screenshots

![GreenLoop Dashboard](docs/screenshot.png)


## 🚀 Project Overview

GreenLoop is a full-stack platform that rewards eco-friendly waste behavior with:

- waste pickup scheduling
- eco-points and achievement badges
- carbon credit tracking and marketplace management
- role-based dashboards for users, collectors, recycling centers, businesses, and admins
- community events, posts, and sustainability engagement
- AI chatbot assistant for guided help and platform support

## 🔥 Why GreenLoop is Special

- **Real-world sustainability flow**: from pickup scheduling to recycling center processing
- **Built-in gamification**: eco-points, badges, carbon credit rewards
- **Role-based experience**: each account type gets a personalized dashboard
- **Intelligent assistant**: AI chatbot answers questions using project context
- **Modern stack**: React + Tailwind + Vite frontend, Express + TypeScript backend, MongoDB database

## 🧩 Architecture & MVC Structure

GreenLoop follows the MVC pattern with clean separation between data, logic, and UI.

```
GreenLoop/
├── server.ts                 # Express server + Vite middleware
├── package.json              # Scripts + dependencies
├── .env                      # Secrets (JWT, MongoDB, OpenRouter API)
├── src/
│   ├── controllers/          # Business logic for each domain
│   ├── routes/               # API endpoints definitions
│   ├── models/               # Mongoose schema definitions
│   ├── frontend/
│   │   ├── views/            # React pages and UI components
│   │   ├── context/          # Auth context provider
│   │   └── services/         # API clients and utilities
│   ├── middleware.ts         # JWT auth and role authorization
│   ├── utils/                # Reusable helpers and badge logic
│   └── db.ts                 # MongoDB connection
└── README.md                 # This documentation
```

### MVC Breakdown

- **Models**: `src/models/*` — User, Pickup, Badge, CarbonCredit, RecyclingCenter, Collector, Business, Post, Event, etc.
- **Views**: `src/frontend/views/*` — dashboards, chatbot, map, auth modal, community feed.
- **Controllers**: `src/controllers/*` — handles requests, updates data, triggers badge and pickup workflows.
- **Routes**: `src/routes/*` — maps HTTP routes to controller actions.
- **Middleware**: `src/middleware.ts` — protects endpoints and enforces role permissions.

## ✨ Key Features

### 1. Multi-role Platform

- **Household Users**: schedule pickups, earn eco-points, claim badges, buy carbon credits
- **Collectors**: accept and complete pickups, earn delivery payments, track badges and weekly goals
- **Recycling Centers**: manage incoming waste, log waste inventory, issue certificates, list carbon credits
- **Businesses**: participate in sustainability tracking and carbon credit marketplace
- **Admins**: monitor data, manage fraud, moderate community content

### 2. Pickup Scheduling + Logistics

- Create pickup requests with waste details and preferred time
- Track pickup status and completion
- Use map-based UI and pickup history
- Backend calculates charges and distances using reusable helpers

### 3. Eco-Points & Badges

- Reward eco-friendly activity with points
- Automatically award badges when thresholds are reached
- Track progress on `ecoPoints`, `co2Reduced`, `pickupsCompleted`, and more
- Role-specific badge logic for users, collectors, and recycling centers

### 4. Carbon Credit Support

- Carbon credit listing and buying workflows
- Marketplace-ready backend with price and status fields
- Clear integration with user/account balance tracking

### 5. Community & Events

- Create, view, and interact with sustainability posts
- Community event management for local engagement
- Supports event participants and social sharing in the UI

### 6. AI Chatbot Assistant

- Built with `src/frontend/views/GreenLoopChatbot.tsx` and `src/controllers/ChatController.ts`
- Uses OpenRouter-compatible `openai` SDK integration
- Personalized answers using JWT-backed user context
- Supports markdown rendering, streaming reply UX, and auth-aware responses

## 🧠 Chatbot Implementation

The chatbot is a full-stack feature:

- `src/frontend/views/GreenLoopChatbot.tsx` — UI, auth gating, message streaming
- `src/routes/chat.ts` — secure `POST /api/chat` endpoint
- `src/controllers/ChatController.ts` — system prompt injection, OpenRouter request handling
- `src/middleware.ts` — authenticates tokens with JWT
- `.env` values power the API connection: `OPENROUTER_API` and optional `OPENROUTER_MODEL`

## 📦 Tech Stack

- Frontend: React 19, Vite, Tailwind CSS, motion/react, lucide-react
- Backend: Node.js, Express, TypeScript
- Database: MongoDB via Mongoose
- AI: OpenAI SDK pointed at OpenRouter
- Auth: `jsonwebtoken`, `bcryptjs`
- Utilities: `d3`, `recharts`, `leaflet`

## 📌 Project Status

- ✅ MVP complete for multi-role waste management workflows
- ✅ AI chatbot integrated with OpenRouter
- ✅ Role-based dashboards and award system implemented
- 🚧 Next stage: add real-time tracking, image uploads, and carbon credit trading UX

## 🛠️ Installation

```bash
git clone <your-repo-url>
cd GreenLoop
npm install
```

Create `.env` at the project root:

```env
JWT_SECRET=your_jwt_secret
MONGODB_URI=mongodb://localhost:27017/greenloop
OPENROUTER_API=your_openrouter_api_key
OPENROUTER_MODEL=minimax/minimax-m2.5:free
```

Start the app:

```bash
npm run dev
```

Or build for production:

```bash
npm run build
npm start
```

## ✅ Recommended Launch Workflow

1. Start MongoDB locally
2. Add `.env` keys
3. Run `npm install`
4. Run `npm run dev`
5. Open `http://localhost:5000`

## 📁 Important Files

- `server.ts` — application start and route registration
- `src/db.ts` — MongoDB connection
- `src/controllers/AuthController.ts` — login/register logic
- `src/controllers/PickupController.ts` — pickup lifecycle
- `src/controllers/ChatController.ts` — chatbot backend
- `src/frontend/views/UserDashboard.tsx` — household user panel
- `src/frontend/views/CollectorDashboard.tsx` — collector experience
- `src/frontend/views/RecyclingCenterDashboard.tsx` — recycling center operations
- `src/frontend/views/AdminDashboard.tsx` — admin analytics and moderation
- `src/frontend/views/GreenLoopChatbot.tsx` — AI assistant front-end
- `src/utils/badgeService.ts` — badge award engine


## 📌 License

This project is open source and ready to be shared on GitHub.
Feel free to fork, remix, and scale GreenLoop for your own sustainability mission.
