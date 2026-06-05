# Claude AI Agent Configuration

# AI Realty Video SaaS — Monorepo

## 🏢 Project Overview

**AI Realty Video SaaS** — Nền tảng hỗ trợ nhân viên sale bất động sản tự động sản xuất video ngắn chất lượng cao để đăng lên TikTok, Facebook Reels, YouTube Shorts.

### Kiến trúc 2 Service

```
┌─────────────────────────────────────────────────────────┐
│  Monorepo: ai-realty-video-saas/                        │
│                                                         │
│  services/main-api/          services/video-processor/  │
│  ┌───────────────────┐       ┌──────────────────────┐   │
│  │ - Auth & Users    │       │ - BullMQ Worker      │   │
│  │ - Token/Billing   │──────▶│ - FFmpeg/Remotion    │   │
│  │ - Media Upload    │ Queue │ - TTS/AI Voiceover   │   │
│  │ - Script Gen (AI) │       │ - Video Render       │   │
│  │ - Content Manage  │◀──────│ - S3 Upload          │   │
│  └───────────────────┘ DB    └──────────────────────┘   │
│                                                         │
│  apps/web/                   apps/admin/                │
│  ┌───────────────────┐       ┌──────────────────────┐   │
│  │ Next.js 14        │       │ React + Vite (SPA)   │   │
│  │ Landing + App     │       │ Admin Dashboard      │   │
│  └───────────────────┘       └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Business Domain

Xem chi tiết tại: `docs/business-requirements.md`

### Database Design

Xem chi tiết tại: `docs/database-design.md`

### Architecture

Xem chi tiết tại: `docs/architecture.md`

---

## Development Workflow

Follow this workflow for all feature development:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   /spec  →  /plan  →  /build  →  /test  →  /review  →  Ship│
│                                                             │
│   Define    Plan     Build     Verify    Review     Deploy  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| Phase      | Command   | Purpose                                                 |
| ---------- | --------- | ------------------------------------------------------- |
| **Define** | `/spec`   | Create PRD with objectives, scope, boundaries           |
| **Plan**   | `/plan`   | Decompose into vertical slices with acceptance criteria |
| **Build**  | `/build`  | Implement incrementally using TDD (RED-GREEN-REFACTOR)  |
| **Verify** | `/test`   | Write and verify tests; use Prove-It for bug fixes      |
| **Review** | `/review` | Five-axis code review before merge                      |
| **Ship**   | `/deploy` | Build, test, deploy with staged rollout                 |

### Supporting Commands

| Command      | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `/debug`     | Systematic error diagnosis and root cause analysis |
| `/simplify`  | Reduce complexity without changing behavior        |
| `/fix-issue` | Analyze and fix reported issues                    |

---

## Core Principles

### Code Quality

- **Test-Driven Development** — Write failing tests first, then implement
- **Incremental Implementation** — Small vertical slices, always buildable
- **Five-Axis Review** — Correctness, Readability, Architecture, Security, Performance

### Philosophy

- Progress over perfection
- Fix root causes, not symptoms
- The simplest thing that could work
- Tests are proof, not afterthought

---

## Mandatory Rules

All rules in `.claude/rules/` are **mandatory** and must be followed:

### Code Quality

| Rule                | Description                              |
| ------------------- | ---------------------------------------- |
| `clean-code.md`     | Variables, functions, SOLID, async/await |
| `code-style.md`     | Formatting, naming conventions           |
| `error-handling.md` | AppError class, global handler patterns  |

### Architecture & Design

| Rule                   | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `tech-stack.md`        | **APPROVED** stack: Next.js, Express, PG, Redis, Prisma, BullMQ |
| `system-design.md`     | Multi-service, queue-based, event-driven patterns               |
| `project-structure.md` | Monorepo layered architecture                                   |
| `api-conventions.md`   | REST standards, response envelopes                              |

### Data & Naming

| Rule                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| `naming-conventions.md` | Cache keys, DB, queues, env vars              |
| `database.md`           | Prisma patterns, transactions, N+1 prevention |

### Operations

| Rule              | Description                                 |
| ----------------- | ------------------------------------------- |
| `security.md`     | **CRITICAL** — Never violate security rules |
| `monitoring.md`   | Prometheus, Grafana, logging, alerting      |
| `testing.md`      | Coverage thresholds, test patterns          |
| `git-workflow.md` | Branching strategy, conventional commits    |

---

## Available Agents

Invoke the right agent for each task type:

### Development Agents

| Agent                            | When to Invoke                                            |
| -------------------------------- | --------------------------------------------------------- |
| 🖥️ **Frontend Developer**        | Web app components, pages, routing, state, UI             |
| 🔧 **Backend Developer**         | Main-API endpoints, services, DB queries, background jobs |
| 🎬 **Video Processor Developer** | Video pipeline, FFmpeg, Remotion, BullMQ workers          |
| 🏗️ **Systems Architect**         | Architecture decisions, ADRs, system design               |

### Quality Agents

| Agent                   | When to Invoke                                 |
| ----------------------- | ---------------------------------------------- |
| 👀 **Code Reviewer**    | Five-axis PR review, code quality assessment   |
| 🧪 **Test Engineer**    | Test strategy, TDD, coverage, bug reproduction |
| 🔒 **Security Auditor** | Vulnerability assessment, threat modeling      |
| ✅ **QA Engineer**      | Test plans, E2E tests, bug reports             |

### Product Agents

| Agent                  | When to Invoke                                |
| ---------------------- | --------------------------------------------- |
| 📋 **Project Manager** | User stories, sprint planning, status reports |
| 🎨 **UI/UX Designer**  | Design system, wireframes, accessibility      |
| ✍️ **Copywriter/SEO**  | Page copy, meta tags, SEO optimization        |

---

## Available Skills

Specialized skills for complex operations:

| Skill                        | Description                      |
| ---------------------------- | -------------------------------- |
| `tdd`                        | Test-Driven Development patterns |
| `code-review`                | Five-axis review framework       |
| `incremental-implementation` | Vertical slice development       |
| `deploy`                     | Full deployment pipeline         |
| `security-review`            | Security audit checklist         |

---

## Reference Checklists

Quick references in `.claude/references/`:

| Reference                    | Use For                            |
| ---------------------------- | ---------------------------------- |
| `security-checklist.md`      | Pre-deploy security verification   |
| `testing-patterns.md`        | Test structure and anti-patterns   |
| `performance-checklist.md`   | Core Web Vitals, optimization      |
| `accessibility-checklist.md` | WCAG 2.1 AA compliance             |
| `video-pipeline.md`          | AI Video generation pipeline guide |

---

## Service-Specific Rules

### `services/main-api`

- Framework: Express.js + TypeScript
- Port: 3001 (development)
- Responsibility: Business logic, auth, subscriptions, media upload, script generation, queue publishing
- Database: PostgreSQL via Prisma
- Cache: Redis (ioredis)
- Queue publisher: BullMQ → `video.create` queue

### `services/video-processor`

- Framework: Node.js Worker / Remotion (hoặc Python + FFmpeg)
- Queue consumer: BullMQ ← `video.create` queue
- Responsibility: Render video từ media + script + TTS audio
- Output: MP4 uploaded to AWS S3/Cloudflare R2
- Notify: Webhook / WebSocket → main-api update job status

### `apps/web`

- Framework: Next.js 14 (App Router)
- Purpose: Landing page + authenticated user app (dashboard, media upload, video management)
- Auth: NextAuth.js

### `apps/admin`

- Framework: React + Vite (SPA)
- Purpose: Internal admin dashboard — manage users, tokens, templates, revenue

---

## Agent Behavior Guidelines

1. **Follow the workflow** — Use `/spec` → `/plan` → `/build` → `/review`
2. **Apply mandatory rules** — All rules in `.claude/rules/` are non-negotiable
3. **Test first** — Write failing tests before implementing
4. **Incremental changes** — Small commits, always buildable
5. **Explain before acting** — Describe changes before making them
6. **Fix root causes** — Don't patch symptoms
7. **Use the right agent** — Invoke specialized agents for their domains
8. **Service isolation** — Each service has its own responsibility; never cross boundaries
9. **Async by default** — All heavy operations (video generation, AI calls) go through queue
10. **Token budget aware** — All AI calls must log token usage to the database for billing
