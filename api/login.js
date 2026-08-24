// api/login.js
// รับรหัสผ่านจากฟอร์ม login เช็คว่าตรงกับ ADMIN_PASSWORD หรือ USER_PASSWORD ไหม
// ถ้าตรง ออก session cookie (httpOnly) กลับไปให้ browser เก็บไว้
//
// ตั้งค่าที่ต้องมีใน Vercel Environment Variables:
//   ADMIN_PASSWORD  = รหัสผ่านสำหรับสิทธิ์แก้ไขได้เต็มที่
//   USER_PASSWORD   = รหัสผ่านสำหรับสิทธิ์ดูอย่างเดียว
//   SESSION_SECRET  = ข้อความลับยาวๆ (สุ่มเอาไว้) ใช้เซ็น cookie

import { setSessionCookie } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { password } = req.body || {};
  if (!password || typeof password !== "string") {
    res.status(400).json({ error: "กรุณากรอกรหัสผ่าน" });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const userPassword = process.env.USER_PASSWORD;

  if (!adminPassword && !userPassword) {
    res.status(500).json({ error: "Server ยังไม่ได้ตั้งค่า ADMIN_PASSWORD / USER_PASSWORD" });
    return;
  }

  let role = null;
  if (adminPassword && password === adminPassword) role = "admin";
  else if (userPassword && password === userPassword) role = "user";

  if (!role) {
    // หน่วงเวลาเล็กน้อยกันการเดารหัสแบบ brute-force รัวๆ
    await new Promise((r) => setTimeout(r, 400));
    res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
    return;
  }

  try {
    setSessionCookie(res, role);
    res.status(200).json({ role });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
