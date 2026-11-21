# PolyTrack — Production & Cloud Deployment Guide

This guide covers how to deploy the **PolyTrack 3D Studio Production Tracking System** to production so anyone on the public internet can use it without downtime or data loss across redeployments.

---

## 🏛 Production Architecture

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│      Next.js Web Frontend      │         │     Blender 3D Studio Addon    │
│      Hosted on Vercel Edge     │         │    Running on Artist Workstation│
└───────────────┬────────────────┘         └────────────────┬───────────────┘
                │                                           │
                │ HTTPS (JWT)                               │ REST API
                ▼                                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 PolyTrack ASP.NET Core Web API (Docker)                   │
│                    Hosted on Railway / Render (Port 5030)                 │
└─────────────────────┬───────────────────────────────┬─────────────────────┘
                      │ EF Core (Code-First)          │ S3 REST API (SigV4)
                      ▼                               ▼
       ┌──────────────────────────────┐ ┌──────────────────────────────┐
       │   Managed PostgreSQL 18      │ │  Cloudflare R2 / AWS S3      │
       │    (Neon.tech / Supabase)    │ │ (.blend, .fbx, attachments)  │
       └──────────────────────────────┘ └──────────────────────────────┘
```

### Zero-Data-Loss Guarantees
- **Database Persistence:** Managed PostgreSQL on Neon / Supabase ensures database state, users, tasks, projects, comments, and audit trails survive container restarts.
- **File Asset Persistence:** All 3D assets, versions, textures, and task attachments are stored directly in Cloudflare R2 or AWS S3 via `S3FileStorageService`.
- **Automatic Migrations & Seeding:** On boot, the backend automatically runs `context.Database.MigrateAsync()` and seeds initial studio configurations if the database is newly initialized.

---

## Phase 1: Deploy Managed PostgreSQL (Neon or Supabase)

### Option A: Neon.tech (Recommended — Free Serverless Postgres)
1. Go to [neon.tech](https://neon.tech) and create a free account.
2. Click **Create Project**, name it `polytrack-db`, and choose PostgreSQL 16/17/18.
3. In your Neon Dashboard, copy the **Connection string** (choose **Connection pooling** or **Direct connection**):
   ```text
   postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/polytrack?sslmode=require
   ```
4. Save this URI; it will be your `DATABASE_URL`.

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com) and create a project.
2. Navigate to **Project Settings** → **Database**.
3. Under **Connection string** → **URI**, copy the URI:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres?sslmode=require
   ```

---

## Phase 2: S3-Compatible Cloud Storage (Cloudflare R2 or AWS S3)

### Option A: Cloudflare R2 (Recommended — Zero Egress Bandwidth Fees)
1. Sign in to your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **R2**.
2. Click **Create Bucket**, name it `polytrack-studio-storage`, and select default location.
3. Click **Manage R2 API Tokens** → **Create API Token**:
   - Permissions: **Object Read & Write**
   - Apply to: **Specific bucket** (`polytrack-studio-storage`)
4. Copy:
   - **Access Key ID** (`S3_ACCESS_KEY`)
   - **Secret Access Key** (`S3_SECRET_KEY`)
   - **Jurisdiction Endpoint / S3 Endpoint** (`S3_ENDPOINT`):
     ```text
     https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
     ```
5. In your bucket settings, add a CORS policy:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

### Option B: AWS S3
1. In the AWS Console, open **S3** and create a bucket (e.g. `polytrack-studio-storage`).
2. Create an IAM User with `AmazonS3FullAccess` and generate Access Keys:
   - `S3_BUCKET_NAME=polytrack-studio-storage`
   - `S3_ACCESS_KEY=AKIA...`
   - `S3_SECRET_KEY=...`
   - `S3_REGION=us-east-1`

---

## Phase 3: Deploy ASP.NET Core Backend (Railway or Render)

### Option A: Railway (Fastest)
1. Push your code to GitHub.
2. Sign in to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
3. Select the repository.
4. In Railway project settings:
   - Set **Root Directory** to `/PolyTrack.Backend` (or leave root if using root Dockerfile).
   - Railway will automatically detect the `Dockerfile`.
5. Add the following **Environment Variables** in Railway:
   | Variable | Value |
   | :--- | :--- |
   | `DATABASE_URL` | `postgresql://user:pass@ep-...neon.tech/polytrack?sslmode=require` |
   | `JWT_SECRET` | Generate 32+ character random secret string |
   | `FRONTEND_URL` | `https://your-polytrack-app.vercel.app` |
   | `S3_BUCKET_NAME` | `polytrack-studio-storage` |
   | `S3_ACCESS_KEY` | Your R2 / S3 Access Key ID |
   | `S3_SECRET_KEY` | Your R2 / S3 Secret Access Key |
   | `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `S3_REGION` | `auto` (or `us-east-1`) |
   | `ENABLE_SWAGGER`| `true` |
   | `PORT` | `5030` |
6. In **Settings** → **Networking**, click **Generate Domain** to get your public backend URL:
   ```text
   https://polytrack-production.up.railway.app
   ```

### Option B: Render
1. Sign in to [render.com](https://render.com) and click **New +** → **Web Service**.
2. Connect your repository.
3. Configure:
   - **Runtime:** `Docker`
   - **Docker Context Path:** `PolyTrack.Backend`
   - **Dockerfile Path:** `PolyTrack.Backend/Dockerfile`
   - **Instance Type:** Free or Starter
4. Add the same Environment Variables listed above.
5. Deploy. Render will assign you a public URL like:
   ```text
   https://polytrack-api.onrender.com
   ```

---

## Phase 4: Deploy Next.js Web Frontend (Vercel)

1. Sign in to [vercel.com](https://vercel.com) and click **Add New** → **Project**.
2. Import your GitHub repository.
3. In **Project Settings**:
   - **Root Directory:** Edit and select `polytrack-frontend`.
   - **Framework Preset:** `Next.js` (automatically detected).
   - **Build Command:** `next build` (or `pnpm run build`).
4. Under **Environment Variables**, add:
   | Name | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_URL` | `https://your-polytrack-api.onrender.com/api` |
5. Click **Deploy**.
6. When deployment finishes, Vercel gives you your production URL (e.g. `https://polytrack-studio.vercel.app`).
7. Update the backend's `FRONTEND_URL` environment variable with this exact Vercel URL.

---

## Phase 5: Verification & Production Smoke Testing

### 1. Test Live API Health & Seeded Accounts
You can run the audit script against your live public deployment by passing custom endpoints:

```powershell
# In PowerShell:
$api = "https://your-polytrack-api.onrender.com/api"
Invoke-RestMethod -Uri "$api/auth/login" -Method Post `
  -Body (@{ email = "admin@polytrack.com"; password = "Admin@123456" } | ConvertTo-Json) `
  -ContentType "application/json"
```

### 2. Verify 1-Click Demo Login
Open your production Vercel URL (`https://your-app.vercel.app/login`):
- Click any of the **Quick Demo Login** buttons (**Admin**, **PM**, **Artist**, **Reviewer**, **Client**).
- Verify instant dashboard access, stats loading, and real-time activity feeds.

### 3. Verify Public Client Inquiry
Open `https://your-app.vercel.app/inquiry`:
- Submit a quote request with an attached brief.
- Log in as **Project Manager** (`pm@polytrack.com`) and confirm the conversion flow into a live Project and Client account.

### 4. Verify 3D Asset Upload to Cloud Storage
- Log in as **Artist** (`artist@polytrack.com`).
- Upload a `.blend` or `.fbx` model under **Assets**.
- Verify the file is uploaded to your Cloudflare R2 / AWS S3 bucket and can be downloaded by the Reviewer.

---

## Phase 6: Blender 3D Addon Public Configuration

Remote artists using Blender 3.6+ or 4.x can connect directly to your live production server:

1. Download `polytrack_blender_addon.zip` from your live website (`https://your-app.vercel.app/downloads/polytrack_blender_addon.zip`) or from the UI header drawer.
2. In Blender: **Edit** → **Preferences** → **Add-ons** → **Install...** → select the `.zip`.
3. Open the **PolyTrack** panel in the 3D Viewport (press `N` on your keyboard).
4. Set **API Base URL** to your live backend:
   ```text
   https://your-polytrack-api.onrender.com/api
   ```
5. Click **Auto-fill Artist** (or enter credentials) and click **Sign In to PolyTrack**.
6. Artists can now search, download assets into their scene, and publish revisions directly to cloud storage!
