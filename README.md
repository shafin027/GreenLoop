# GreenLoop - Sustainable Waste Management Platform

## Overview
GreenLoop is a full-stack web application for sustainable waste management. Users schedule pickups, earn eco-points and carbon credits, collectors claim pickups and earn delivery pay with weekly bonuses, recycling centers process waste and trade carbon credits, businesses buy carbon credits from the marketplace, and admins manage the whole platform.

## Architecture

- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + TypeScript
- **Backend**: Express.js server (TypeScript, run with `tsx`)
- **Database**: MongoDB (Mongoose ODM), local instance on port 27017
- **Auth**: JWT-based authentication, `gl_token` in localStorage, role-based access
- **Token storage**: `gl_token` key in localStorage, exposed as `token` via AuthContext

## Project Structure

```
/
├── server.ts          # Express backend with 40+ API routes
├── mongoClient.ts     # Mongoose models (User, Collector, Admin, RecyclingCenter, Business, CarbonCredit, Certificate, Pickup, Badge, Post, CommunityEvent, WasteLog, EarningsHistory, ...)
├── middleware.ts      # JWT auth + role check middleware (JWT secret: greenloop_secret_key_2026)
├── vite.config.ts     # Vite config (serves on port 5000)
├── start.sh           # Startup script (MongoDB + app server)
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── UserDashboard.tsx          # Schedule pickups, eco-points, carbon credits, community posts/events
│   │   ├── CollectorDashboard.tsx     # Claim/complete pickups, photo proof required, earnings chart, weekly milestones
│   │   ├── RecyclingCenterDashboard.tsx # Live pending requests, log waste, marketplace listing, award badges to businesses
│   │   ├── AdminDashboard.tsx         # System overview, collectors management, create events, award badges to centers/collectors
│   │   ├── BusinessDashboard.tsx      # Purchase carbon credits, certificates, view earned badges
│   │   ├── CommunityEvents.tsx        # Dark theme event cards with images, join with offerings/discounts
│   │   ├── BadgeDisplay.tsx
│   │   └── AuthModal.tsx
│   └── context/AuthContext.tsx        # Token stored as gl_token, exposed as `token`
├── index.html
└── .mongodb/                           # MongoDB data (gitignored)
```

## Running the App

The single workflow `Start application` runs `bash start.sh` which:
1. Starts MongoDB on `127.0.0.1:27017` with data in `.mongodb/data/`
2. Runs `npm run dev` (tsx server.ts) which starts Express + Vite middleware on port 5000

## Port Configuration

- **Port 5000**: Main app (Express + Vite frontend)
- **Port 27017**: MongoDB (localhost only)

## Pickup Workflow (Complete Flow)

1. User schedules pickup → status: `pending`
2. Recycling center sees live feed of pending pickups → accepts one → status: `accepted_by_center`
3. Collectors see center-accepted pickups in "Available" tab → claim one → status: `accepted_by_collector`
4. Collector updates: `on-the-way` → `arrived` → uploads photo + actual weight → `completed`
5. On completion: user earns 5 carbon credits + eco-points; collector earns ৳10 base + possible weekly bonus

## Carbon Credit System

- Centers earn 0.5 credits per kg of waste they log
- Centers list credits in the marketplace at their own price
- Businesses purchase credits from the marketplace
- Users earn 5 credits per completed pickup

## Earnings & Weekly Milestones (Collectors)

- Base delivery charge: ৳10 per pickup (BDT)
- Weekly bonuses: 5 pickups → ৳50, 10 pickups → ৳150, 20 pickups → ৳400
- Weekly stats reset every 7 days

## Badge System

- **User**: Auto-awarded on milestones; also manually claimable via Rewards tab when criteria is met (based on COMPLETED pickups only, i.e. collected by a collector)
- **Collector**: Auto-awarded on milestones (pickups, eco-points, CO2, weekly pickups, total earnings)
- **Centers**: 3 auto-awarded badges based on completed pickups through center (Waste Processor: 10 pickups, Volume Champion: 100kg, Diversity Expert: 3+ waste types); Green Certified badge manually awarded by admin
- **Businesses**: Manually awarded by recycling centers
- API endpoints: `GET /api/users/me/badge-progress`, `POST /api/users/me/claim-badge`, `GET /api/recycling-centers/badge-progress`

## User Roles & Credentials

- `user` - Regular user: schedule pickups, earn eco-points, join events, post in community
- `collector` - Pickup collector: claim/complete pickups with photo, track earnings, weekly milestones
- `recycling_center` - Recycling facility: live pending requests, log waste, list carbon credits, award badges to businesses
- `business` - Business: purchase carbon credits from marketplace, receive badges from centers
- `admin` / `super-admin` - Admin: all stats, collector management, create community events, award badges to centers/collectors

## Seeded Data

On startup (first run only):
- 12 achievement badges across all roles
- 2 recycling centers (center1@greenloop.com / center123, center2@greenloop.com / center123)
- 3 initial carbon credit listings

## Environment Variables

- `MONGODB_URI` - MongoDB connection string (defaults to `mongodb://localhost:27017/wastego`)
- `JWT_SECRET` - JWT signing secret (defaults to `greenloop_secret_key_2026`)
