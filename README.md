# LLM Job Tracker API

A small FastAPI service to track job applications and generate tailored notes (why I fit, recruiter message, interview checklist) using an LLM. Supports **mock** output (no API keys) or **Ollama** (local models). Uses MongoDB and Celery with Redis.

## What it does

- Store job applications: company, role, location, link, status, notes
- Generate structured content via LLM (mock or Ollama): 5 fit bullets, recruiter message, interview checklist
- Run generation as a background Celery task and store results in MongoDB
- Minimal REST API: create, list, get, update applications; trigger generate; poll task status

## Architecture

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Client  │────▶│   API   │────▶│ MongoDB │
└─────────┘     └────┬────┘     └─────────┘
                     │
                     │ enqueue
                     ▼
              ┌─────────────┐
              │   Redis     │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐     ┌─────────┐
              │   Worker    │────▶│  LLM    │ (mock or Ollama)
              └──────┬──────┘     └─────────┘
                     │
                     │ update doc
                     ▼
              ┌─────────────┐
              │   MongoDB   │
              └─────────────┘
```

## Tech used

- **FastAPI** – API
- **MongoDB** – persistence (Motor async in API, PyMongo in worker)
- **Celery** – background tasks
- **Redis** – broker and result backend
- **Pydantic / pydantic-settings** – models and config from `.env`
- **Mock / Ollama** – LLM (no API keys required)

## Prerequisites

- Docker and Docker Compose  
- (Optional) Ollama if you want real local LLM: `ollama run llama3`

## Configuration

All configuration is via environment variables. Use the **configuration tutorial** in the repo:

1. Copy the example file: `copy .env.example .env`
2. Open **`.env.example`** – it documents every variable with comments (MongoDB, Redis, LLM backend, API, CORS).
3. Edit `.env` with your values. For Docker, defaults in `.env.example` are enough if you use the provided `docker-compose.yml`.

Never commit `.env` (it is in `.gitignore`).

## Run with Docker

```powershell
# From project root. Copy .env.example to .env first (edit if needed).
copy .env.example .env
docker compose up --build
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  

## Frontend Dashboard (Next.js)

A styled frontend is available in `frontend/` with:

- dashboard stats
- application list + detail view
- search and status filtering
- create application form
- status updates
- generate-notes action with task polling
- copy recruiter message action

Run it locally:

```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Example requests

**Create application**

```bash
curl -X POST http://localhost:8000/applications \
  -H "Content-Type: application/json" \
  -d '{"company":"Acme Inc","role":"Backend Engineer","location_type":"remote","location":"","url":"https://acme.com/jobs"}'
```

**List applications**

```bash
curl http://localhost:8000/applications
```

**Get one**

```bash
curl http://localhost:8000/applications/<id>
```

**Update status**

```bash
curl -X PATCH http://localhost:8000/applications/<id> \
  -H "Content-Type: application/json" \
  -d '{"status":"interviewing"}'
```

**Trigger generation (returns task_id)**

```bash
curl -X POST http://localhost:8000/applications/<id>/generate
```

**Poll task until done**

```bash
curl http://localhost:8000/tasks/<task_id>
```

**Get application again** to see `fit_bullets`, `recruiter_message`, `interview_checklist` filled.

## Example response (application with generated content)

```json
{
  "id": "...",
  "company": "Acme Inc",
  "role": "Backend Engineer",
  "location_type": "remote",
  "location": "",
  "url": "https://acme.com/jobs",
  "status": "applied",
  "created_at": "2025-03-02T12:00:00",
  "updated_at": "2025-03-02T12:01:00",
  "fit_bullets": [
    "Strong alignment between my experience and Backend Engineer at Acme Inc.",
    "Relevant background for Acme Inc's industry and goals.",
    "Track record of delivery in similar environments.",
    "Clear interest in the team and product.",
    "Ready to contribute from day one."
  ],
  "recruiter_message": "Hi, I applied for the Backend Engineer position at Acme Inc and would love to discuss how my experience can add value. Happy to align on a quick call.",
  "interview_checklist": [
    "Review job description and company values.",
    "Prepare STAR examples for key competencies.",
    "List 2–3 thoughtful questions for the team.",
    "Test camera and mic if remote."
  ]
}
```

## License

MIT
