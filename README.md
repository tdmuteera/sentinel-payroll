# Sentinel Payroll System

A desktop payroll application covering employee records, payroll calculations, validation rules and payslips. It runs as an Electron app with a local Express + SQLite backend.

> Early-stage project, still a work in progress.

## Features
- Employee records management
- Payroll calculation with validation rules
- PDF payslip generation (pdfmake)
- JWT login with bcrypt-hashed passwords
- Dashboard charts (Recharts)
- Packaged as a Windows installer with electron-builder

## Tech stack
**Frontend:** React, Vite, Tailwind CSS, React Router, React Hook Form, Axios · **Backend:** Node.js, Express, better-sqlite3 · **Desktop:** Electron, electron-builder

## Run locally
```bash
cd backend && npm install && cp .env.example .env && npm run seed
cd ../frontend && npm install
cd ../backend && npm run electron-dev
```
Note: the `dev:front` and `build-frontend` scripts in `backend/package.json` have been updated to the `../frontend` folder name.

## Author
Tadiwanashe Muteera · tdmuteera@gmail.com
