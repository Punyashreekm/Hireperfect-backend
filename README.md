# Hireperfect

Hireperfect is a secure, AI-enabled online assessment platform for students, job seekers, and professionals.

## Stack
- Backend: Node.js, Express, MongoDB
- Candidate frontend: React + Tailwind (shadcn-style components, JavaScript)
- Admin frontend: React + Tailwind (JavaScript)

## Assessment Categories
- Soft Skills: Aptitude, Verbal Reasoning
- IT: Java, Python, JavaScript (with optional coding questions)
- MBA: Finance, Analytics
- Duration: 30 minutes for every exam

## Key Features
- JWT auth with role-based authorization (`candidate`, `admin`)
- Candidate exam selection/purchase and attempt tracking
- AI proctoring event pipeline:
  - eyeball/head movement detection hooks
  - face presence validation
  - real-time warnings
  - auto termination after 5 warnings
  - immediate termination on tab switch/minimize
- Security controls on assessment page:
  - disables right-click
  - blocks copy/paste shortcuts
  - detects print-screen attempt
  - full-screen enforcement warning
- Assessment engine:
  - start assessment on click
  - visible countdown timer
  - randomized question order
  - auto-submit on timer expiry/forced exit
  - configurable navigation mode (`free`, `sequential` backend-ready)
- Admin panel:
  - manage users, exams, attempts, and live monitoring
- Candidate dashboard:
  - purchased exams
  - attempt history
  - scores
  - violation summary

## Run Backend
```bash
cd /Users/iterator/Desktop/Hireperfect/backend
cp env.example .env
# set ADMIN_EMAIL and ADMIN_PASSWORD in .env for first admin bootstrap
npm install
npm run dev
```

## Run Candidate App
```bash
cd /Users/iterator/Desktop/Hireperfect/frontend
npm install
npm run dev
```

## Run Admin App
```bash
cd /Users/iterator/Desktop/Hireperfect/admin
npm install
npm run dev
```

## Ports
- Backend: `5500`
- Candidate frontend: `5173`
- Admin frontend: `5174`
