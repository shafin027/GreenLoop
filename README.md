# 🌱 GreenLoop: Sustainable Waste Management Platform

> Connecting households, collectors, recycling centers, and businesses to create a circular economy for Bangladesh

---

## 🌍 About GreenLoop

GreenLoop is a comprehensive, eco-friendly waste management platform designed for Bangladesh that bridges the gap between households and recycling facilities. By leveraging technology, community engagement, and incentive-based rewards, GreenLoop empowers every stakeholder to participate in sustainable waste management while earning recognition and carbon credits.

### 🎯 Mission

To revolutionize waste management in Bangladesh by making sustainable practices accessible, rewarding, and impactful for households, waste collectors, recycling centers, and businesses.

---

## ✨ Key Features

### 📍 **Smart Waste Pickup System**
- Interactive map-based pickup scheduling using **Leaflet + OpenStreetMap**
- Real-time GPS location tracking for users and collectors
- Distance-based delivery charge calculation (৳60 base + ৳20/km after 3km + ৳5/kg over 5kg)
- Estimated vs. actual weight tracking with automatic charge recalculation

### 🔄 **Carbon Credit Marketplace**
- Earn carbon credits from waste pickups (rates vary by waste type)
- Recycling centers list available credits for purchase
- Businesses purchase credits to offset their carbon footprint
- Dynamic pricing and real-time availability tracking
- **Credit Rates by Waste Type:**
  - E-waste: 1.5 credits/kg (highest impact)
  - Metal: 1.0 credits/kg
  - Plastic: 0.8 credits/kg
  - Glass: 0.4 credits/kg
  - Paper: 0.3 credits/kg
  - Organic: 0.2 credits/kg

### 🏆 **Badge & Milestone System**
- Automatic badge awards for achievements
- User badges: based on eco-points, CO₂ reduction, pickups completed
- Collector badges: weekly milestones, earnings targets
- Center badges: waste processed, recycling diversity
- Business badges: partnership recognition
- Sustainability impact visualization

### 📊 **Collector Performance System**
- Rating and review system (1-5 stars)
- Weekly earning tracking with milestone bonuses (৳50-৳400)
- Verified collector badges and status
- Performance analytics and historical earnings

### ♻️ **Waste Type Management**
- Support for 6+ waste categories (e-waste, metal, plastic, glass, paper, organic)
- Real-time waste logging by recycling centers
- Waste history and tracking per user/collector
- Available waste capacity calculation

### 🛡️ **Fraud Detection System**
- Automated fraud detection logs
- Suspicious activity monitoring
- Admin review and investigation tools
- Pattern analysis and risk assessment

### 👥 **Community Features**
- Event creation and management
- Participant engagement tracking
- Post sharing and community discussions
- Eco-tips and sustainability education

### 📍 **Location Management**
- GPS location detection for all user types
- Manual coordinate input with validation
- Location-based service recommendations
- Distance calculations for delivery planning

---

## 👥 User Roles & Capabilities

### 🏠 **Household Users**
- Schedule waste pickups via interactive map
- Track pickup history and earnings
- Earn eco-points (10 points/kg of waste)
- Receive carbon credits for completed pickups
- View and claim badges
- Browse and purchase carbon credits
- Participate in community events
- Manage location preferences

### 🚚 **Waste Collectors**
- Accept pickup requests from users
- Get real-time directions to locations
- Update location and profile information
- Track weekly earnings and milestones
- View collected waste history
- Earn badges through performance
- Monitor and improve ratings

### ♻️ **Recycling Centers**
- Verify their operating location via GPS
- Accept waste deliveries from collectors
- Log waste by type with weight validation
- List and sell carbon credits in marketplace
- Track sustainability metrics
- Manage inventory and capacity
- Participate in eco-rewards program

### 🏢 **Businesses**
- Set company location for accountability
- Purchase carbon credits from available marketplace
- Track carbon offset progress
- Earn partnership badges
- Monitor sustainability goals
- View environmental impact reports

### 👨‍💼 **Administrators**
- **Dashboard Analytics:**
  - Real-time sustainability metrics
  - CO₂ reduction tracking
  - Waste collection statistics
  - Platform activity monitoring

- **Content Management:**
  - Create and manage community events
  - Moderate community posts
  - Award badges and achievements
  - Manage fraud detection logs

- **User Management:**
  - Ban/unban accounts (households, collectors, centers, businesses)
  - Delete user accounts when necessary
  - View user eco-points and credits
  - Monitor account activity

- **Center Management:**
  - Verify recycling centers
  - Track center locations
  - Monitor waste logging accuracy
  - Manage center-specific credits

- **Collector Management:**
  - Verify collector credentials
  - Monitor performance metrics
  - Track earnings and bonuses
  - Manage suspension/ban status

---

## 🔧 Technology Stack

### **Frontend**
- **React 19** with Hooks & Context API
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive, modern UI
- **Motion** (Framer Motion) for smooth animations
- **Leaflet 1.9.4** + **OpenStreetMap** for interactive maps
- **Recharts** for data visualization
- **Lucide Icons** for clean, consistent iconography

### **Backend**
- **Express.js** for REST API
- **Node.js** runtime
- **TypeScript** for type safety
- **JWT** for secure authentication
- **OpenAI API** integration for intelligent features

### **Database**
- **MongoDB** for flexible data storage
- Schema validation and relationships
- Index optimization for query performance

### **Deployment**
- Production-ready build with `start-prod.sh`
- Vite static asset serving
- Environment-based configuration

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v16+)
- MongoDB (local or Atlas)
- Git

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd greenloop

# Install dependencies
npm install

# Create .env file with required variables
echo "JWT_SECRET=greenloop_secret_key_2026" > .env
echo "MONGODB_URI=mongodb://localhost:27017/wastego" >> .env

# Start the development server
bash start.sh
```

### **Development**
```bash
# The app runs on http://localhost:5000
# Vite dev server handles frontend
# Express server handles API
```

### **Production**
```bash
bash start-prod.sh
# Builds React app and serves from Express
```

---

## 💰 Currency & Pricing

- **Currency:** Bengali Taka (৳ BDT)
- **Delivery Minimum Charge:** ৳60
- **Distance Surcharge:** ৳20/km (after 3km)
- **Weight Surcharge:** ৳5/kg (over 5kg)
- **Eco-Points:** 10 points/kg of waste collected
- **User Credits per Pickup:** 5 carbon credits
- **Weekly Bonuses:** ৳50 (5 pickups), ৳150 (10 pickups), ৳400 (20 pickups)

---

## 📈 Sustainability Metrics

### **Carbon Credit System**
- Based on waste type and difficulty of recycling
- Calculated as: `Math.ceil(weight_kg × type_rate)`
- All values displayed as integers for clarity
- Real-time balance tracking

### **Performance Rating**
- Collector ratings: 1-5 stars (rounded to 1 decimal)
- Review-based feedback system
- Public visibility for transparency
- Affects badge eligibility

### **Environmental Impact**
- CO₂ reduction calculated per pickup
- Community-wide sustainability dashboard
- Heatmap visualization of collection areas
- Weekly/monthly trend analysis

---

## 🔐 Security Features

### **Authentication**
- JWT-based token system
- `gl_token` stored in localStorage
- Secure password hashing with bcrypt
- Role-based access control (RBAC)

### **Authorization**
- Route-level permission checks
- Role-specific dashboards
- Data isolation by user type
- Admin-only sensitive operations

### **Account Safety**
- Ban system to prevent malicious activity
- Account deletion for privacy
- Fraud detection and logging
- Suspicious activity alerts

---

## 📱 Key Pages & Dashboards

| Role | Dashboard | Key Features |
|------|-----------|--------------|
| **User** | UserDashboard | Pickups, Credits, Badges, Location Setup |
| **Collector** | CollectorDashboard | Earnings, Ratings, Weekly Stats, Verification |
| **Center** | RecyclingCenterDashboard | Waste Logging, Credits, Verification, Inventory |
| **Business** | BusinessDashboard | Carbon Purchases, Goals, Badges, Location |
| **Admin** | AdminDashboard | Analytics, Users, Collectors, Centers, Ban/Delete |

---

## 🌐 API Endpoints Overview

### **Authentication**
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — User login
- `POST /api/auth/logout` — Clear session

### **Users**
- `GET /api/users/me` — User profile
- `GET /api/pickups/history` — Pickup history
- `PUT /api/users/me` — Update profile & location

### **Pickups**
- `POST /api/pickups/schedule` — Request pickup
- `GET /api/pickups/pending` — View pending pickups
- `PUT /api/pickups/:id/complete` — Mark as completed

### **Carbon Credits**
- `GET /api/carbon-credits/available` — Marketplace listings
- `POST /api/carbon-credits/purchase` — Buy credits
- `GET /api/user/credits` — Balance tracking

### **Collectors**
- `GET /api/collectors/all` — List collectors
- `POST /api/collectors/verify` — Admin verification
- `PUT /api/collectors/me` — Update profile

### **Recycling Centers**
- `GET /api/recycling-centers/all` — Center list
- `POST /api/recycling-centers/log-waste` — Log received waste
- `PUT /api/recycling-centers/me` — Update center info

### **Admin**
- `GET /api/admin/dashboard` — Overview stats
- `GET /api/admin/users` — User management
- `GET /api/admin/businesses` — Business management
- `POST /api/admin/ban/:role/:id` — Ban/unban account
- `DELETE /api/admin/delete/:role/:id` — Delete account

---

## 🎨 UI/UX Highlights

- **Dark Theme:** Sustainable, easy on the eyes
- **Eco-Color Palette:**
  - 🟢 Emerald (Primary - Growth & Nature)
  - 🟡 Amber (Warnings & Caution)
  - 🔵 Blue (Water & Environment)
  - 🟣 Purple (Community)
  - ⚪ Zinc (Neutral & Trust)

- **Responsive Design:** Works seamlessly on mobile, tablet, and desktop
- **Smooth Animations:** Motion-powered transitions for better UX
- **Accessibility:** Clear typography, high contrast, keyboard navigation

---

## 📊 Admin Features

### **User Management**
- View all registered users with eco-points and credits
- Ban/unban accounts with confirmation
- Delete accounts permanently
- Track badge progress

### **Collector Management**
- Verify collectors before activation
- Monitor earnings and weekly pickups
- View ban status and performance
- Remove problematic accounts

### **Recycling Center Management**
- Approve/verify centers by location
- Monitor waste processing metrics
- Track carbon credit inventory
- Manage location updates

### **Business Management**
- View company information and locations
- Monitor credit purchases
- Track sustainability goals
- Manage partnerships

### **Analytics & Reporting**
- Real-time waste collection heatmap
- Sustainability score tracking
- Fraud detection dashboard
- Community engagement metrics

---

## 🌟 Environmental Impact

Every interaction on GreenLoop contributes to:
- ♻️ **Waste Diversion:** Keeping waste out of landfills
- 🌳 **Carbon Offsetting:** Quantified environmental benefit
- 👥 **Community Building:** Local circular economy
- 🏆 **Incentivized Action:** Rewards for eco-friendly behavior

---

## 📝 Notes

- All currency is in **Bengali Taka (৳ BDT)**
- All numeric values (except ratings) are **integers** for clarity
- Location-based services use **Haversine distance calculation**
- Performance ratings maintained at **1 decimal place**
- Database: MongoDB (`wastego` database)
- Default port: **5000**

---

## 🤝 Contributing

GreenLoop is built with sustainability in mind. Every contribution helps Bangladesh move toward a circular economy.

---

## 📄 License

GreenLoop - Sustainable Waste Management Platform

---

**Made with 🌱 for a greener Bangladesh**

*Last Updated: March 2026*
