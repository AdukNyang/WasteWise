# WasteWise — Community Environmental Reporting and Accountability Platform

This is a web platform that allows community members in Kampala, Uganda to report local environmental problems, track their progress, and confirm whether issues have been resolved. Administrators verify and assign reports to responsible stakeholders who resolve them. Contributors earn EcoCoins for verified participation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) |
| ORM | Prisma v5 |
| Auth | JWT |

---

## Project Structure

```
wastewise/
├── client/        # React + Vite frontend
└── server/        # Node.js + Express backend
    ├── prisma/    # Database schema
    └── src/
        ├── controllers/
        ├── middleware/
        └── routes/
```

---

## What Has Been Built

### Frontend — Authentication (FR1)
- Community members can create an account with their full name and sign in
- Public registration creates a community user account

### Frontend — Community Reporting (FR2)
- Submit reports with plain-language categories, a description, and a written location
- Optionally use browser GPS when unsure of the location; GPS requires permission and works on `localhost` or HTTPS
- Reporter GPS coordinates are stored separately and shown to the report owner, admin, and assigned stakeholder. Stakeholder resolution GPS, estimated accuracy, and the calculated distance are also saved and shown to the reporter and admin.
- Browser GPS is approximate and can be spoofed, so the distance check supports review but does not prove physical presence.
- Include a photo or video as required report evidence
- View report status and progress, accept follow-up when eligible, and confirm or dispute a resolution
- GPS coordinates are shown on an admin map with report markers. OpenStreetMap provides map tiles and receives the browser IP and map area requested, but not report descriptions or account data.

### Frontend — Administrator (FR3, FR4)
- Review reports and verify, reject, or mark them as under review
- Find and group duplicate reports
- Set report priority and assign reports to responsible stakeholders
- View GPS-enabled reports on a map with a marker for each issue
- OpenStreetMap provides map tiles and receives the browser IP and requested map area, but not report descriptions or account data

### Frontend — Stakeholder and Citizen Actions (FR5, FR6)
- Stakeholders can view assigned reports and add progress updates
- Describe where the work was completed, capture current GPS, and submit photo or video evidence
- If a report has GPS, resolution is accepted only when the stakeholder GPS is within 50 metres. If the report has no GPS, the stakeholder position is saved but the distance check is marked unverified.
- Citizens can confirm a resolution or dispute it

### Frontend — EcoCoins and Recognition (FR7)
- View the EcoCoins balance, transaction history, and redemption history
- Redeem EcoCoins for simulated rewards
- View reporter rank and appreciation messages; hand-drawn flower illustrations are shown for eligible reports ranked fourth and later

### Backend — Authentication (FR1)
- User registration with password hashing
- User login with JWT token
- Role-based access middleware (Community User, Administrator, Responsible Stakeholder)
- EcoCoins account auto-created on registration

### Backend — Report Submission (FR2)
- Submit an environmental report with category, description and location
- Require a photo or video as report evidence
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

### Backend — Stakeholder and Citizen Actions (FR5, FR6)
- Stakeholder can view their assigned reports
- Stakeholder can add progress updates to assigned reports
- Stakeholder must provide the resolution location and a photo or video before marking an issue as resolved
- Citizen can confirm or dispute a resolution
- Disputed issues are automatically reopened
- Full status history maintained throughout the process

### Backend — EcoCoins and Recognition (FR7)
- EcoCoins account auto-created on user registration
- Rank-based EcoCoins awarded when a report is verified by admin
- Follow-up coins awarded as assignment, progress, resolution and confirmation milestones happen
- First three reporters can accept the follow-up role in order, with a one-week window for each
- Report verification response includes rank, coins awarded and whether the appreciation UI should be shown
- Reporters ranked 4th and later receive an appreciation eligibility flag in the verification response
- EcoCoins blocked for rejected and duplicate reports
- View EcoCoins balance and full transaction history
- View redemption history
- Redeem EcoCoins for rewards (simulated)

---

## Getting Started

### Prerequisites
- Node.js v20.19+ or v22.12+
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
Copy `server/.env.example` to `server/.env` and fill in your local values:
```env
DATABASE_URL="your-neon-postgresql-connection-string"
JWT_SECRET="your-secret-key"
PORT=5000
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
VAPID_SUBJECT="mailto:notifications@example.com"
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

Browser push is optional. Generate a VAPID key pair with `npx web-push generate-vapid-keys`, then configure the public and private keys as server environment variables. Keep the private key secret. Browser push requires HTTPS in production; in-app notifications work without VAPID keys.

### 4. Set up the database
```bash
npx prisma db push
npx prisma generate
```

After schema changes, stop the running server before regenerating Prisma Client on Windows to avoid a locked engine file.

### 5. Start the server
```bash
npm run dev
```

Server runs on `http://localhost:5000`

### 6. Start the frontend
```bash
cd ../client
npm install
npm run dev
```

The frontend runs on the Vite URL shown in the terminal.

### 7. Configure the frontend API URL (optional)
The frontend uses `http://localhost:5000` by default. To use a different API URL, copy `client/.env.example` to `client/.env` and update:
```env
VITE_API_URL="http://localhost:5000"
```

### 8. Prepare administrator and stakeholder accounts
Community users can register in the app. Administrator and stakeholder accounts must already exist in the backend before they can sign in.

## Persistent evidence storage

Evidence uploads use `server/uploads` locally by default. For Render, attach a persistent disk mounted at `/var/data` and set `UPLOAD_DIR=/var/data/uploads` in the server environment. Files are only persistent across deploys when the host's persistent disk is mounted and the upload directory points to it.

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
| POST | /api/reports | Submit a report with required photo/video evidence and optional GPS coordinates |
| GET | /api/reports/my | Get all reports submitted by the logged in user |
| GET | /api/reports/:id | Get a single report by ID with status history |
| GET | /api/reports/:id/follow-up | Check the follow-up acceptance window |
| POST | /api/reports/:id/follow-up/accept | Accept the follow-up role when eligible |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/admin/reports | Get all reports (admin only) |
| PATCH | /api/admin/reports/:id/verify | Verify, reject or mark report under review |
| POST | /api/admin/reports/group-duplicates | Group duplicate reports |
| GET | /api/admin/reports/duplicates | Find possible duplicates by category and location |
| GET | /api/admin/stakeholders | List active stakeholder accounts for assignment |
| POST | /api/admin/reports/:id/assign | Assign priority and responsible stakeholder |

### Stakeholder and Citizen
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/stakeholder/assigned | Get all assigned reports (stakeholder only) |
| POST | /api/stakeholder/reports/:id/progress | Add a progress update |
| PATCH | /api/stakeholder/reports/:id/resolve | Resolve with `resolutionLocation`, `resolutionLatitude`, `resolutionLongitude`, optional `resolutionLocationAccuracyMeters`, and `evidence` photo/video fields. GPS must be within 50 metres of report GPS when available. |
| POST | /api/stakeholder/reports/:id/confirm | Confirm or dispute a resolution |

### EcoCoins
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/ecocoins/wallet | View balance, transactions and redemptions |
| POST | /api/ecocoins/redeem | Redeem coins for a reward |

### Notifications (community accounts)
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/notifications | List notifications and unread count |
| GET | /api/notifications/push-config | Get browser push availability and public key |
| POST | /api/notifications/subscriptions | Enable browser push for this device |
| DELETE | /api/notifications/subscriptions | Disable browser push for this device |
| PATCH | /api/notifications/:id/read | Mark one notification as read |
| PATCH | /api/notifications/read-all | Mark all notifications as read |

Report assignment creates an in-app notification for its reporter. Redeemed digital certificates can be opened from EcoCoins redemption history and printed or saved as PDF.

### EcoCoins earning

| Reporter rank | Verification | Follow-up maximum | Total maximum |
|---|---:|---:|---:|
| 1st | 1,000 | 4,000 | 5,000 |
| 2nd | 500 | 2,000 | 2,500 |
| 3rd | 300 | 1,334 | 1,634 |
| 4th–10th | 10 | 0 | 10 |
| 11th+ | 0 | 0 | 0 |

Reporter rank is based on category and location. GPS reports within 50 metres are treated as the same location; manually entered locations are compared after trimming and normalizing spaces and letter case. Each person is counted once for the same issue, so repeat reports do not advance their rank or earn the reporting reward again.

Only one of the first three reporters can accept follow-up. The first reporter has one week after verification, the second has the following week, and the third becomes eligible after two weeks. Follow-up coins are paid milestone by milestone, only for milestones reached after acceptance; missed earlier milestones are not paid retroactively.

---

## SRS Document
[View SRS Document](https://docs.google.com/document/d/1iA53cd5AfQdFHJX68JuZO5K-c_WOWDJS4xFVLkvPRkw/edit?usp=sharing)

---

## Author
Aduk Mathiang Ngut Nyang — African Leadership University
