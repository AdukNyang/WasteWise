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

### Backend — Report Submission (FR2)
- Submit an environmental report with category, description and location
- Attach a photo as evidence
- Unique report ID generated on submission
- Status automatically set to SUBMITTED
- Status history recorded on every submission
- View all my submitted reports
- View a single report with full status history

### Backend — Admin Dashboard (FR3, FR4)
- View all submitted reports with submitter details and status history
- Verify, reject or mark a report as under review
- Group duplicate reports together
- Detect possible duplicates by category and location
- Assign priority level to a verified report
- Assign report to a responsible stakeholder
- Assignment details recorded with date and assigned by

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

### Reports
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/reports | Submit a new environmental report |
| GET | /api/reports/my | Get all reports submitted by the logged in user |
| GET | /api/reports/:id | Get a single report by ID with status history |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/reports | Get all reports (admin only) |
| PATCH | /api/admin/reports/:id/verify | Verify, reject or mark report under review |
| POST | /api/admin/reports/group-duplicates | Group duplicate reports |
| GET | /api/admin/reports/duplicates | Find possible duplicates by category and location |
| POST | /api/admin/reports/:id/assign | Assign priority and responsible stakeholder |

---

## SRS Document
[View SRS Document](https://docs.google.com/document/d/1iA53cd5AfQdFHJX68JuZO5K-c_WOWDJS4xFVLkvPRkw/edit?usp=sharing)

---

## Author
Aduk Mathiang Ngut Nyang — African Leadership University
