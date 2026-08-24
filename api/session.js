// api/session.js
// ตรวจ session cookie ที่ browser ส่งมา คืนค่า role ปัจจุบัน (admin/user) หรือ null ถ้ายังไม่ได้ login

import { getSessionFromRequest } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      res.status(200).json({ role: null });
      return;
    }
    res.status(200).json({ role: session.role });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
