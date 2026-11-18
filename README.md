# WasteWise — Community Environmental Reporting and Accountability Platform

This is a web platform that allows community members in Kampala, Uganda to report local environmental problems, track their progress, and confirm whether issues have been resolved. Administrators verify and assign reports to responsible stakeholders who resolve them. Contributors earn EcoCoins for verified participation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) |
| ORM | Prisma v5 |
| Auth | JWT |

---

## Project Structure

```
wastewise/
├── client/        # React frontend (coming soon)
└── server/        # Node.js + Express backend
    ├── prisma/    # Database schema
    └── src/
        ├── controllers/
        ├── middleware/
        └── routes/
```

---

## What Has Been Built

### Backend — Authentication (FR1)
- User registration with password hashing
- User login with JWT token
- Role-based access middleware (Community User, Administrator, Responsible Stakeholder)
- EcoCoins account auto-created on registration

---

## Getting Started

### Prerequisites
- Node.js v18+
- Git
- A Neon account (https://neon.tech)

### 1. Clone the repository
```bash
git clone https://github.com/AdukNyang/WasteWise.git
cd WasteWise
```

### 2. Set up the backend
```bash
cd server
npm install
```

### 3. Configure environment variables
Create a `.env` file inside `server/`:
```env
DATABASE_URL="your-neon-postgresql-connection-string"
JWT_SECRET="your-secret-key"
PORT=5000
```

### 4. Set up the database
```bash
npx prisma db push
npx prisma generate
```

### 5. Start the server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and receive JWT token |

---

## SRS Document
[View SRS Document](https://docs.google.com/document/d/1iA53cd5AfQdFHJX68JuZO5K-c_WOWDJS4xFVLkvPRkw/edit?usp=sharing)

---

## Author
Aduk Mathiang Ngut Nyang — African Leadership University
