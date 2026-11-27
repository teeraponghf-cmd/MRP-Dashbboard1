// Shared planning settings, stored as one JSON file in SharePoint through two Power Automate flows.
//   GET  /api/settings  -> any logged-in user: { data, version, updatedAt, updatedBy }  (data = null if nothing saved yet)
//   PUT  /api/settings  -> admin only, body { data, baseVersion }
//                          409 + { current } if someone else saved since baseVersion (no silent overwrite)
// Environment variables (Vercel > Settings > Environment Variables):
//   PA_SETTINGS_READ_URL   HTTP trigger URL of the "read settings" flow (returns the file content)
//   PA_SETTINGS_WRITE_URL  HTTP trigger URL of the "write settings" flow (writes the request body to the file)
//   PA_SETTINGS_KEY        optional shared secret, sent as header "x-mrp-key" so the flows can reject other callers
import { getSessionFromRequest } from "./_auth.js";

const MAX_BYTES = 4 * 1024 * 1024; // keep well under Power Automate request limits

function flowHeaders() {
  const h = { "Content-Type": "application/json" };
  if (process.env.PA_SETTINGS_KEY) h["x-mrp-key"] = process.env.PA_SETTINGS_KEY;
  return h;
}

// The read flow may return the file as plain JSON text, as a parsed object,
// or as SharePoint's { "$content-type": ..., "$content": "<base64>" } wrapper.
function decodeFileBody(text) {
  if (!text || !text.trim()) return null;
  let parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && typeof parsed.$content === "string") {
    const inner = Buffer.from(parsed.$content, "base64").toString("utf8");
    if (!inner.trim()) return null;
    parsed = JSON.parse(inner);
  }
  if (typeof parsed === "string") parsed = parsed.trim() ? JSON.parse(parsed) : null;
  return parsed && typeof parsed === "object" ? parsed : null;
}

async function readDoc() {
  const url = process.env.PA_SETTINGS_READ_URL;
  if (!url) throw Object.assign(new Error("Server is missing PA_SETTINGS_READ_URL"), { status: 503 });
  const r = await fetch(url, { method: "POST", headers: flowHeaders(), body: "{}" });
  if (r.status === 404) return { data: null, version: 0, updatedAt: null, updatedBy: null };
  if (!r.ok) throw Object.assign(new Error(`Read flow failed (HTTP ${r.status})`), { status: 502 });
  const doc = decodeFileBody(await r.text());
  if (!doc || !doc.data) return { data: null, version: Number(doc && doc.version) || 0, updatedAt: null, updatedBy: null };
  return { data: doc.data, version: Number(doc.version) || 0, updatedAt: doc.updatedAt || null, updatedBy: doc.updatedBy || null };
}

async function writeDoc(doc) {
  const url = process.env.PA_SETTINGS_WRITE_URL;
  if (!url) throw Object.assign(new Error("Server is missing PA_SETTINGS_WRITE_URL"), { status: 503 });
  const r = await fetch(url, { method: "POST", headers: flowHeaders(), body: JSON.stringify(doc) });
  if (!r.ok) throw Object.assign(new Error(`Write flow failed (HTTP ${r.status})`), { status: 502 });
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  try {
    if (req.method === "GET") {
      res.status(200).json(await readDoc());
      return;
    }

    if (req.method === "PUT") {
      if (session.role !== "admin") {
        res.status(403).json({ error: "Only admin can change the plan" });
        return;
      }
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { data, baseVersion } = body;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        res.status(400).json({ error: "Body must be { data: {...}, baseVersion }" });
        return;
      }
      const current = await readDoc();
      if (current.version > 0 && Number(baseVersion) !== current.version) {
        res.status(409).json({ error: "Settings were changed by someone else", current });
        return;
      }
      const doc = { schema: 1, version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: session.role, data };
      const size = Buffer.byteLength(JSON.stringify(doc), "utf8");
      if (size > MAX_BYTES) {
        res.status(413).json({ error: `Settings are too large (${Math.round(size / 1024)} KB)` });
        return;
      }
      await writeDoc(doc);
      res.status(200).json({ version: doc.version, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    res.status(err && err.status ? err.status : 500).json({ error: String(err && err.message ? err.message : err) });
  }
}
