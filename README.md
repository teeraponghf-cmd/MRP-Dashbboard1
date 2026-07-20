# MRP Dashboard

A standalone, browser-only MRP (Material Requirements Planning) tool: BOM
explosion, time-phased planning, PO pending / GIT tracking, expiry handling,
and actual-vs-calculated consumption variance. No backend, no database —
everything runs client-side from CSV uploads.

## Run it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`).

## Deploy it for real use

Pick whichever you're most comfortable with. All are free for this kind of
single-page app.

### Option A — Vercel (easiest, no command line needed)

1. Push this folder to a GitHub repo (or use Vercel's "drag and drop" upload).
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Framework preset: **Vite**. Leave build settings as default
   (`npm run build`, output dir `dist`).
4. Click **Deploy**. You'll get a live URL like `mrp-dashboard.vercel.app`.

### Option B — Netlify

1. Push this folder to a GitHub repo.
2. Go to [netlify.com](https://netlify.com) → **Add new site** → import the repo.
3. Build command: `npm run build`. Publish directory: `dist`.
4. Deploy.

### Option C — Command line (Vercel CLI)

```bash
npm install -g vercel
npm run build
vercel --prod
```

### Option D — Any static host (S3, GitHub Pages, your own server)

```bash
npm run build
```

This produces a `dist/` folder — upload its contents to any static file host.
No server-side code needed at all.

## Notes on the current version

- **No login, no multi-user separation.** Anyone with the URL who uploads a
  CSV sees their own session only (data lives in browser memory, not shared
  between visitors) — but there's also no access control. If this matters,
  add a simple password gate or put it behind your company VPN/internal
  network before sharing the link widely.
- **No persistence.** Refreshing the page clears uploaded data — it's
  upload-and-analyze, not a system of record. If you want it to remember the
  last uploaded files between visits, that's a small addition (browser
  storage) — ask and I can add it.
- **Not connected to your ERP.** You still export CSVs from your real system
  and upload them here each time. If you eventually want a live connection
  instead of CSV upload, that requires a backend and is a bigger project.

## File structure

```
mrp-dashboard-app/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx          # entry point
│   └── MRPDashboard.jsx  # the dashboard itself — all logic lives here
└── README.md
```

To customize (colors, sample data, CSV column names, etc.), edit
`src/MRPDashboard.jsx` directly — it's a single self-contained file.
