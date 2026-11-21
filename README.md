# PolyTrack — 3D Studio Production Tracking System

**PolyTrack** is a high-performance 3D Studio Production Tracking System architected as a modular monolith for local studio servers (~20+ concurrent internal artists, project managers, reviewers, plus external clients).

---

## 🏛 System Architecture & Tech Stack

```
                          POLYTRACK STUDIO MONOLITH
                ┌───────────────────────────────────────────┐
                │             Web & 3D Clients              │
                │   React / Next.js Web App  | Blender Addon │
                └─────────────────────┬─────────────────────┘
                                      │ HTTP / REST (JWT)
                ┌─────────────────────▼─────────────────────┐
                │          ASP.NET Core Web API             │
                │  • JWT Auth & Rotating Refresh Tokens     │
                │  • RBAC & Project Membership Authorization│
                │  • Projects, Milestones, Tasks & Kanban   │
                │  • 3D Asset Management & Versioning       │
                │  • Timesheets, Workloads & Quotas         │
                │  • Client Portal & Inquiries              │
                └──────────────┬────────────────────┬───────┘
                               │ EF Core (Code-First)│ Local File I/O
                ┌──────────────▼────┐    ┌──────────▼────────────┐
                │   PostgreSQL 18   │    │ Local Studio Storage  │
                │  Database Record  │    │   /studio-storage     │
                │  23 Core Tables   │    │ .blend, .fbx, textures│
                └───────────────────┘    └───────────────────────┘
```

- **Backend:** ASP.NET Core Web API (.NET 10 / C#), Entity Framework Core (Code-First migrations), Npgsql PostgreSQL provider with native snake_case mapping.
- **Database:** PostgreSQL 18 on port `5432` (`PolyTrack` database).
- **Frontend:** React / Next.js (App Router, Webpack/Turbopack), TypeScript, Tailwind CSS, Lucide icons, Zustand state management, and SWR data-fetching client layer.
- **Local Studio Storage:** `/studio-storage` (`C:\Polytrack\studio-storage`) organized by:
  - `projects/{projectId}/assets/{category}/{assetId}/v{versionNumber}/{fileName}`
  - `projects/{projectId}/task-attachments/{taskId}/{fileName}`
  - `inquiries/{inquiryId}/{fileName}`
- **Blender Addon:** Python addon connecting via REST API with JWT to browse, import, and publish 3D assets.

---

## 📁 Repository Structure

```
C:\Polytrack\
├── PolyTrack.Backend/               # ASP.NET Core Web API Solution
│   ├── PolyTrack.slnx               # Solution definition
│   ├── PolyTrackAPI/                # API Controllers, Middlewares, DTOs & Program.cs
│   │   ├── Controllers/             # Auth, Projects, Tasks, Milestones, Assets, Users, Dashboard
│   │   ├── Middleware/              # AccountStatusMiddleware (RBAC active check)
│   │   ├── DTOs/                    # Request and response models
│   │   ├── appsettings.json         # PostgreSQL & FileStorage configuration
│   │   └── Program.cs               # DI setup, JWT authentication, seeder
│   ├── PolyTrackAPI.Core/           # Core domain abstractions
│   │   ├── Interfaces/              # IFileStorageService, IProjectAuthorizationService
│   │   └── Constants/               # Roles and system constants
│   └── PolyTrackAPI.Infrastructure/ # Database, EF Core & Services
│       ├── Data/                    # StudioDbContext & EF configurations
│       ├── Models/                  # All 23 EF entities (Users, Projects, Tasks, Assets, etc.)
│       ├── Migrations/              # EF Core Code-First migrations
│       └── Services/                # LocalFileStorageService, ProjectAuthorizationService
│
├── polytrack-frontend/              # React / Next.js App Router
│   ├── app/                         # App Router views (/login, /dashboard, projects, tasks, assets)
│   ├── components/                  # Modular UI components (LoginForm, DashboardOverview, Kanban, etc.)
│   ├── lib/                         # REST API Client (axios + automatic JWT rotation), Auth store
│   └── .env.local                   # NEXT_PUBLIC_API_URL=http://localhost:5030/api
│
├── studio-storage/                  # Physical disk store for 3D binary assets
│   ├── projects/                    # Assets and task attachments
│   └── inquiries/                   # Client portal inquiry reference attachments
│
├── start-backend.ps1                # One-click startup for API server
├── start-frontend.ps1               # One-click startup for Next.js frontend
└── test-api.ps1                     # Automated API smoke test
```

---

## 🔐 Roles & Authorization (RBAC + Project Membership)

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **Admin** | Full System Access | User & role management, config tables, soft deletes, unrestricted project access |
| **ProjectManager** | Assigned Projects | Milestone & task management, team allocation, asset approvals, client inquiry review |
| **Artist** | Member Projects | View assigned tasks, update task status, log daily timesheets, upload asset revisions |
| **Reviewer** | Member Projects | Review submitted draft assets, approve/reject with review notes |
| **Client** | Own Projects | Project milestone review (approve/reject), inquiry submission, feedback comments |

### Security Features
- **JWT Access Tokens:** Short-lived tokens with HS256 encryption.
- **Rotating Refresh Tokens:** Stored in PostgreSQL `refresh_tokens`, rotated on each exchange, revoked upon logout.
- **AccountStatusMiddleware:** Enforces instant revocation and request blocking if an account is marked inactive (`is_active = false`).

---

## 🚀 Quick Start Guide

### Prerequisites
- **PostgreSQL 18** running locally on port `5432` with database `PolyTrack`.
- **.NET SDK** (.NET 10 / 9).
- **Node.js** (v22+) and **pnpm**.

### Demo Credentials (All Passwords: `Admin@123456`)

| Role | Email | Password | Access / Capabilities |
|------|-------|----------|-----------------------|
| **Admin** | `admin@polytrack.com` | `Admin@123456` | Full system access, all projects, users & configs |
| **Project Manager** | `pm@polytrack.com` | `Admin@123456` | Milestone & task management, team allocation, approvals |
| **Lead Artist** | `artist@polytrack.com` | `Admin@123456` | Kanban tasks, timesheets, 3D asset uploads |
| **Reviewer** | `reviewer@polytrack.com` | `Admin@123456` | Asset submissions, reviews & approvals |
| **Client** | `client@polytrack.com` | `Admin@123456` | Client portal, project milestones & inquiries |

> **Tip:** On the web login screen (`/login`), you can click any role under **"Quick-Select Demo Account"** to immediately auto-fill and sign in!

### 1. Run the Backend API
```powershell
.\start-backend.ps1
```
*(Or manually: `cd PolyTrack.Backend\PolyTrackAPI && dotnet run --launch-profile http`)*
- API Endpoint: `http://localhost:5030`
- Swagger Documentation: `http://localhost:5030/swagger`

### 2. Run the Next.js Frontend
In a second terminal:
```powershell
.\start-frontend.ps1
```
*(Or manually: `cd polytrack-frontend && pnpm run dev`)*
- Web Application: `http://localhost:3000`
- Login URL: `http://localhost:3000/login`
- Default Sign-In: `admin@polytrack.com` / `Admin@123456`

### 3. Run Automated API Smoke Tests
With the backend running:
```powershell
.\test-api.ps1
```
Tests login, rotating refresh token exchange, dashboard metrics, project listings, Kanban board retrieval, and asset search.
