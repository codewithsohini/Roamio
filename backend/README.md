# Roamio Backend

AI-powered travel companion backend — personalized itineraries powered by Groq.

Built with **Python**, **FastAPI**, **PostgreSQL**, **SQLAlchemy**, and **Docker**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | FastAPI 0.111 |
| Server | Uvicorn |
| Database | PostgreSQL 15 |
| ORM | SQLAlchemy 2 |
| Migrations | Alembic |
| AI Provider | Groq |
| Auth | JWT (python-jose + passlib) |
| Containerisation | Docker + Docker Compose |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  ← FastAPI application entry point
│   ├── config.py                ← Environment-driven settings (Milestone 2)
│   ├── database.py              ← SQLAlchemy engine and session (Milestone 2)
│   ├── ai/
│   │   ├── base.py              ← Abstract AIProvider interface (Milestone 5)
│   │   ├── factory.py           ← Resolves active AI provider from config (Milestone 5)
│   │   └── providers/
│   │       └── groq.py          ← Groq implementation (Milestone 5)
│   ├── prompts/
│   │   ├── system_prompt.py     ← Roamio AI personality + rules (Milestone 6)
│   │   ├── itinerary_prompt.py  ← Trip generation prompt builder (Milestone 6)
│   │   ├── chat_prompt.py       ← General chat prompt builder (Milestone 6)
│   │   └── formatter_prompt.py  ← JSON output schema enforcement (Milestone 6)
│   ├── models/
│   │   ├── base.py              ← SQLAlchemy DeclarativeBase (Milestone 3)
│   │   ├── user.py              ← User ORM model (Milestone 3)
│   │   ├── travel_profile.py    ← TravelProfile ORM model (Milestone 3)
│   │   └── trip.py              ← Trip ORM model (Milestone 3)
│   ├── schemas/
│   │   ├── user.py              ← User request/response schemas (Milestone 4)
│   │   ├── token.py             ← JWT token schemas (Milestone 4)
│   │   ├── travel_profile.py    ← TravelProfile schemas (Milestone 11)
│   │   ├── chat.py              ← Chat request schema (Milestone 9)
│   │   └── journey.py           ← Journey request/response schemas (Milestone 10)
│   ├── services/
│   │   ├── auth_service.py      ← Password hashing, JWT logic (Milestone 4)
│   │   ├── prompt_builder.py    ← PromptBuilder orchestrator (Milestone 7)
│   │   ├── recommendation_service.py ← Pipeline orchestrator (Milestone 8)
│   │   ├── response_validator.py     ← AI output validation + repair (Milestone 13)
│   │   └── sse_service.py       ← SSE streaming utility (Milestone 12)
│   ├── routers/
│   │   ├── auth.py              ← /auth/register, /auth/login (Milestone 4)
│   │   ├── users.py             ← /users/me (Milestone 4)
│   │   ├── travel_profile.py    ← /users/me/travel-profile (Milestone 11)
│   │   ├── chat.py              ← /chat (Milestone 9)
│   │   └── journey.py           ← /journeys (Milestone 10)
│   └── dependencies/
│       ├── db.py                ← DB session injection (Milestone 4)
│       └── auth.py              ← JWT auth guard (Milestone 4)
├── alembic/
│   └── versions/                ← Auto-generated migration scripts (Milestone 3)
├── tests/
│   ├── routers/                 ← Integration tests per router
│   └── services/                ← Unit tests per service
├── docker/                      ← Dockerfile, docker-compose.yml (Milestone 14)
├── .env.example                 ← Environment variable reference
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- pip

### 1. Clone the repository

```bash
git clone <repo-url>
cd roamio/backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your real values
```

### 5. Run the development server

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

Interactive API docs: `http://localhost:8000/docs`

---

## API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/health` | Backend health check | None |
| POST | `/auth/register` | Create a new user account | None |
| POST | `/auth/login` | Login and receive JWT token | None |
| GET | `/users/me` | Get current user profile | JWT |
| GET | `/users/me/travel-profile` | Get saved travel preferences | JWT |
| PUT | `/users/me/travel-profile` | Update travel preferences | JWT |
| POST | `/journeys` | Generate a personalized itinerary (streaming) | JWT |
| GET | `/journeys` | List past journeys | JWT |
| GET | `/journeys/{trip_id}` | Get a single journey with full itinerary | JWT |
| POST | `/chat` | General travel conversation (streaming) | JWT |

---

## Environment Variables

See [`.env.example`](.env.example) for the full reference with descriptions.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT algorithm (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL |
| `AI_PROVIDER` | Active AI provider (`groq`) |
| `GROQ_API_KEY` | GROQ API key |

---

## Running Tests

```bash
pytest tests/ -v
```

---

## Docker (Milestone 14)

```bash
# Build and start all services (API + PostgreSQL)
docker compose -f docker/docker-compose.yml up --build
```

---

## Deployment (AWS — Milestone 15)

Deployment targets **ECS Fargate** (API) + **RDS PostgreSQL** (database).
See `docker/ecs-task-definition.json` and the `scripts/` folder for ECR push and deployment helpers.

---

## Implementation Progress

| Milestone | Description | Status |
|---|---|---|
| 1 | Project Setup and Folder Structure | ✅ Complete |
| 2 | Configuration | ⏳ Pending |
| 3 | Database Models | ⏳ Pending |
| 4 | Authentication | ⏳ Pending |
| 5 | Groq Service and AI Provider Abstraction | ⏳ Pending |
| 6 | Prompt Templates | ⏳ Pending |
| 7 | Prompt Builder | ⏳ Pending |
| 8 | Recommendation Service | ⏳ Pending |
| 9 | Chat API | ⏳ Pending |
| 10 | Journey Planner API | ⏳ Pending |
| 11 | Trip History | ⏳ Pending |
| 12 | Streaming Responses | ⏳ Pending |
| 13 | AI Response Validation | ⏳ Pending |
| 14 | Docker | ⏳ Pending |
| 15 | AWS Deployment Readiness | ⏳ Pending |
