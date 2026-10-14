# Laboratory Equipment Booking System

A web application for managing laboratory equipment and booking time slots. Students and faculty can browse equipment, submit booking requests, track their reservations, and cancel eligible bookings. Lab administrators can manage equipment and review booking requests.

## Features

- User registration and login with hashed passwords and JWT authentication
- Three roles: `STUDENT`, `FACULTY`, and `LAB_ADMIN`
- Role-aware interface and protected backend routes
- Browse equipment and see whether it is available
- Create bookings with date, start time, and end time
- Prevent overlapping bookings for the same equipment
- View bookings and their current status
- Cancel pending or confirmed bookings according to permissions
- Lab administrators can add, edit, and disable equipment
- Lab administrators can confirm or reject booking requests
- Seed sample equipment and development test accounts
- Health endpoint for basic service checks
- Responsive React frontend

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Authentication | JWT, bcryptjs |
| Version control | Git, GitHub |
| DevOps lab tools | Jenkins, Selenium, Docker, Ansible |

## Project Structure

```text
laboratory-equipment-booking-system/
├── backend/
│   ├── middleware/auth.js
│   ├── prisma/schema.prisma
│   ├── prisma/seed.js
│   ├── routes/auth.js
│   ├── routes/equipment.js
│   ├── routes/bookings.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/styles.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20 or later
- npm
- PostgreSQL
- Git

## Local Setup

### 1. Configure the backend

Open a terminal in `backend` and install dependencies:

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and set your local database credentials. Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/laboratory_booking?schema=public"
JWT_SECRET="replace-this-with-a-long-random-secret"
PORT=3000
```

Use the PostgreSQL port configured on your machine. Port `5433` is only an example matching some local setups. Keep `.env` private and do not commit it.

### 2. Create the database schema

If this is a fresh database:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

If you are updating an existing database from an older version of this project, replace the old Prisma schema with the included `backend/prisma/schema.prisma`, then run a new migration:

```bash
npx prisma migrate dev --name add_roles_and_booking_workflow
npx prisma generate
```

If Prisma reports a migration conflict or asks to reset a database containing data you need, stop and inspect the message before accepting a reset.

### 3. Seed sample data

```bash
npm run seed
```

The seed is repeatable: it upserts sample equipment and test accounts. Existing test account passwords are reset to the development passwords shown below.

### 4. Start the backend

```bash
npm run dev
```

Backend URL: `http://localhost:3000`

Health check: `http://localhost:3000/health`

### 5. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `frontend/.env.example` to `frontend/.env` if needed. The default API URL is `http://localhost:3000`.

```bash
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

## Development Test Accounts

Run the seed command before using these accounts.

| Role | Email | Password |
|---|---|---|
| Student | `student@labbook.test` | `Student@123` |
| Faculty | `faculty@labbook.test` | `Faculty@123` |
| Lab Admin | `admin@labbook.test` | `Admin@123` |

These are development-only credentials. Do not use them in a deployed environment. The public registration endpoint always creates a `STUDENT` account; users cannot assign themselves an administrative role.

## Main API Routes

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Backend health |
| POST | `/api/auth/register` | Public | Register a student account |
| POST | `/api/auth/login` | Public | Log in |
| GET | `/api/auth/me` | Logged-in users | Get current account |
| GET | `/api/equipment` | Logged-in users | List active equipment |
| POST | `/api/equipment` | Lab admin | Add equipment |
| PATCH | `/api/equipment/:id` | Lab admin | Update equipment |
| PATCH | `/api/equipment/:id/disable` | Lab admin | Disable equipment |
| GET | `/api/bookings` | Logged-in users | List bookings visible to the user |
| POST | `/api/bookings` | Student/faculty | Request a booking |
| PATCH | `/api/bookings/:id/cancel` | Owner or lab admin | Cancel a booking |
| PATCH | `/api/bookings/:id/review` | Lab admin | Confirm or reject a request |

Protected requests use `Authorization: Bearer <token>`. Request details and validation are implemented in the backend route files.

## Booking Rules

- Booking end time must be later than start time.
- Bookings cannot be made in the past.
- A booking is initially `PENDING`.
- A lab administrator can confirm or reject pending requests.
- Confirmed bookings for the same equipment cannot overlap.
- Users can view their own bookings; lab administrators can review all bookings.
- Users cannot select their role during public registration.

## Git Workflow

Use a feature branch and pull request for changes:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/complete-mvp
```

After testing:

```bash
git status
git add .
git commit -m "feat: complete laboratory booking MVP"
git push -u origin feature/complete-mvp
```

Open a pull request from `feature/complete-mvp` into `develop`. Do not commit `.env`, passwords, access tokens, database dumps, or `node_modules`.

## Testing Checklist

1. Register a new student account.
2. Log in using each seeded test account.
3. Confirm the equipment list is visible.
4. Create a booking as a student or faculty user.
5. Log in as lab admin and confirm or reject a pending booking.
6. Try to create overlapping bookings for the same equipment and verify the conflict is rejected.
7. Cancel an eligible booking.
8. Check `http://localhost:3000/health`.
9. Confirm a student cannot access administrator-only API operations.

## DevOps Workflow

This application is intended to be used through the lab tasks for Git collaboration, Jenkins CI, Pipeline as Code, Selenium testing, Docker packaging, Jenkins-driven deployment, configuration management, health checks, and release verification. Treat each DevOps component as implemented only after it has been configured and tested in the repository.

## Security Notes

- Use a unique, strong `JWT_SECRET`.
- Keep environment files out of version control.
- Use HTTPS and production-grade secrets when deployed.
- Public registration creates student accounts only.
- The seeded credentials are for local development only.
- Review and test the application before production use.
