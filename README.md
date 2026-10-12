# Laboratory Equipment Booking System

A web-based application for managing laboratory equipment and booking time slots. It helps students and staff view equipment availability, request bookings, and track or cancel reservations. This project is also used to demonstrate DevOps practices such as Git collaboration, CI/CD, automated testing, containerization, and configuration management.

## Features

- User registration and login
- JWT-based authentication
- View laboratory equipment
- Request equipment bookings with start and end times
- View booking status
- Cancel bookings
- Seed sample equipment for local development
- Backend health-check endpoint
- Responsive web interface

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Authentication | JWT, bcrypt |
| Version control | Git, GitHub |
| DevOps tools for the lab | Jenkins, Selenium, Docker, Ansible |

## Project Structure

```text
laboratory-equipment-booking-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── equipment.js
│   │   └── bookings.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── .env.example
│   ├── package.json
│   ├── index.html
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Prerequisites

Install these before starting:

- Node.js 20 or later
- npm
- PostgreSQL
- Git

Ensure PostgreSQL is running and that you have permission to create or use the project database.

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd laboratory-equipment-booking-system
```

If the repository is already on your computer, open a terminal in the existing project directory.

### 2. Install backend dependencies

```bash
cd backend
npm install
```

Create a `.env` file in `backend` using `.env.example` as a reference. Update the database credentials to match your PostgreSQL configuration.

Example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/laboratory_booking?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=3000
```

Use port `5433` only if PostgreSQL is listening on that port. Otherwise, use your configured port. Do not commit the real `.env` file or production secrets.

### 3. Apply database migrations

From the `backend` directory, run:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

If an initial migration already exists, do not create another one with the same name. If you have added models to the Prisma schema after the initial migration, create a new migration with a descriptive name, for example:

```bash
npx prisma migrate dev --name add_equipment_and_bookings
```

### 4. Seed sample equipment

```bash
npm run seed
```

This inserts or updates sample equipment records for local testing.

### 5. Start the backend

```bash
npm run dev
```

The backend should run at `http://localhost:3000`.

### 6. Install and start the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend` based on `.env.example`. For local development, set the API URL as required by the frontend configuration, for example:

```env
VITE_API_BASE_URL="http://localhost:3000"
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## API Overview

The main API routes are listed below. Refer to the backend route files for the exact request fields and response formats.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Check backend health |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | Log in and obtain an authentication token |
| GET | `/api/equipment` | List laboratory equipment |
| GET | `/api/bookings` | View the authenticated user's bookings |
| POST | `/api/bookings` | Create a booking request |
| PATCH | `/api/bookings/:id/cancel` | Cancel a booking |

Protected routes require the token returned by login, usually sent as a Bearer token in the `Authorization` header.

## Database Model

The main entities are:

- **User:** stores user account details.
- **Equipment:** stores equipment details and availability-related information.
- **Booking:** links a user to equipment and records the requested time range and booking status.

The Prisma schema at `backend/prisma/schema.prisma` defines the database structure. Apply schema changes through Prisma migrations.

## Git Workflow

Create a feature branch for each unit of work and use a pull request to merge changes.

```bash
git checkout develop
git pull origin develop
git checkout -b feature/complete-mvp
```

After making and testing changes:

```bash
git status
git add .
git commit -m "feat: complete laboratory booking MVP"
git push -u origin feature/complete-mvp
```

Create a pull request from `feature/complete-mvp` into `develop`. Review the changes and resolve any CI or review feedback before merging. Never commit `.env` files, passwords, access tokens, database dumps, or dependency folders.

## Testing and Verification

Before raising a pull request:

1. Confirm the backend starts without errors.
2. Register a test user through the frontend.
3. Log in and verify that equipment is displayed.
4. Create a booking and confirm it appears in the booking list.
5. Cancel a booking and verify its status changes.
6. Check the health endpoint at `http://localhost:3000/health`.

Run any test scripts available in the relevant `package.json` files. Do not mark a test as passed until it has been run successfully.

## DevOps Workflow

The lab project is intended to demonstrate these practices as each task is completed:

1. Requirements analysis and Agile planning
2. Git branching, commits, and pull requests
3. Jenkins continuous integration
4. Pipeline as Code and deployment
5. Selenium UI testing and continuous testing
6. Docker image creation and container execution
7. Jenkins-driven deployment
8. Ansible configuration management
9. Health checks, idempotency, and recovery
10. Final release verification

Only describe a tool or workflow as implemented after it has been configured and tested in the repository.

## Troubleshooting

- **Database connection error:** Check that PostgreSQL is running and that `DATABASE_URL` has the correct username, password, host, port, and database name.
- **Prisma migration error:** Check `backend/prisma/schema.prisma` and review the migration error before retrying.
- **Frontend cannot reach backend:** Confirm the backend is running and `VITE_API_BASE_URL` points to the correct URL. Restart Vite after changing environment variables.
- **Missing dependencies:** Run `npm install` inside the relevant `backend` or `frontend` directory.
- **Port already in use:** Stop the process using the port or configure the application to use a free port.

## Security Notes

- Use a strong, unique `JWT_SECRET`.
- Keep `.env` files and production credentials out of Git.
- Use HTTPS and secure deployment settings outside local development.
- Validate user input and enforce authorization on protected routes.
- Use test accounts and non-production data while developing.

## Project Status

This README describes the application structure and local setup. Complete the setup and verification steps in your environment before treating the application as fully tested or production-ready.
