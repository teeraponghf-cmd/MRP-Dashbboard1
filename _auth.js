// api/_auth.js
// Helper กลางสำหรับสร้าง/ตรวจสอบ session cookie แบบเซ็นด้วย HMAC-SHA256
// ไม่ต้องพึ่ง library ภายนอก ใช้ crypto module มาตรฐานของ Node (Vercel Serverless Functions รองรับอยู่แล้ว)

import crypto from "crypto";

export const COOKIE_NAME = "mrp_session";
const SESSION_HOURS = 24; // อายุ session ก่อนต้อง login ใหม่

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("Server missing SESSION_SECRET (ตั้งค่าใน Vercel Environment Variables)");
  return secret;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

// สร้างค่า cookie: "<role>.<expiresAtMs>.<signature>"
function createSessionValue(role) {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = `${role}.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

// ตรวจ cookie ที่ได้รับมา คืนค่า { role } ถ้าถูกต้องและยังไม่หมดอายุ, คืน null ถ้าไม่ผ่าน
function verifySessionValue(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [role, expiresAtStr, signature] = parts;
  const payload = `${role}.${expiresAtStr}`;
  let expected;
  try {
    expected = sign(payload);
  } catch (e) {
    return null;
  }
  // timing-safe compare กันโดน timing attack เดา signature
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  if (role !== "admin" && role !== "user") return null;

  return { role };
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  });
  return out;
}

export function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionValue(cookies[COOKIE_NAME]);
}

export function setSessionCookie(res, role) {
  const value = createSessionValue(role);
  const maxAge = SESSION_HOURS * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
  );
}
