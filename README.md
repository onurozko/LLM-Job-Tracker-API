# LLM Job Tracker

AI-powered job application tracker with automated note generation.

Track job applications, monitor pipeline status, and generate tailored insights like "Why I Fit", recruiter messages, and interview checklists using LLMs.

## Features
- Track job applications with status such as applied, interviewing, and offer
- Dashboard with application pipeline stats
- Search and filter applications
- Detailed application view
- AI-generated Why I Fit bullets
- AI-generated recruiter message
- AI-generated interview checklist
- Background note generation with Celery and Redis
- Local LLM support through Ollama

## Tech Stack
- Backend: FastAPI, Python
- Database: MongoDB
- Async Tasks: Celery, Redis
- Frontend: Next.js, TypeScript, TailwindCSS
- AI: Ollama, LLM

## Screenshots

### Dashboard Overview
A clean overview of applications, statuses, and pipeline health.

![Dashboard](./screenshots/dashboard.png)

### Notes Generation Before
Example application detail view before generating AI notes.

![Before Generation](./screenshots/pre-generation.png)

### Notes Generation After
Example application detail view after generating AI notes.

![After Generation](./screenshots/generated.png)

## Architecture
Frontend (Next.js) -> FastAPI -> MongoDB  
FastAPI -> Celery + Redis -> Ollama

## Running Locally

### 1. Clone the repository
```bash
git clone https://github.com/onurozko/LLM-Job-Tracker-API.git
cd LLM-Job-Tracker-API
```

### 2. Configure environment
```powershell
copy .env.example .env
```

### 3. Start backend services
```powershell
docker compose up --build
```

### 4. Run frontend
```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Future Improvements
- Add authentication and user-specific application tracking
- Add analytics charts and pipeline trend insights
- Add deploy setup (Docker registry + cloud deployment)
- Add export/share features for generated notes
