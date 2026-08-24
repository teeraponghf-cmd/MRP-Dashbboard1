// api/ask-ai.js
// Vercel Serverless Function — ทำหน้าที่เป็นตัวกลางเรียก Google Gemini API (free tier)
// เพื่อไม่ให้ GEMINI_API_KEY หลุดไปอยู่ในโค้ดฝั่ง browser (React) โดยเด็ดขาด
//
// วิธีติดตั้ง:
// 1. วางไฟล์นี้ไว้ที่ /api/ask-ai.js ที่ root ของโปรเจกต์ (ระดับเดียวกับ src/) — ต้องมี /api/_auth.js ด้วย (คนละไฟล์)
// 2. ขอ API key ฟรีที่ https://aistudio.google.com/apikey (ล็อกอินด้วย Google account, กด "Create API key" ได้เลย ไม่ต้องผูกบัตร)
// 3. ไปที่ Vercel Project Settings > Environment Variables เพิ่ม:
//      GEMINI_API_KEY = <ค่า API key ที่ได้จากขั้นตอนที่ 2>
//      GEMINI_MODEL    = gemini-2.0-flash   (หรือ model อื่นที่ต้องการ, ไม่ใส่ก็ได้จะใช้ค่า default นี้)
// 4. Deploy ใหม่ — Vercel จะ detect โฟลเดอร์ /api อัตโนมัติแล้วสร้าง endpoint ที่ /api/ask-ai ให้เอง
//
// หมายเหตุ: endpoint นี้ต้อง login ก่อนถึงจะเรียกได้ (เช็คผ่าน session cookie เดียวกับหน้าเว็บหลัก)
// กันไม่ให้คนนอกยิง request ตรงมาที่ endpoint นี้แล้วเปลืองโควตาฟรีโดยไม่ผ่านหน้าเว็บ
//
// Free tier ของ Gemini (ข้อมูล ณ ตอนเขียนโค้ดนี้ อาจเปลี่ยนแปลงได้ ตรวจสอบล่าสุดที่
// https://ai.google.dev/gemini-api/docs/rate-limits): มีโควตาฟรีต่อวัน/ต่อนาทีให้ใช้
// เหมาะกับงานภายในทีมขนาดเล็ก-กลาง ถ้าใช้งานหนักเกินโควตาฟรี ระบบจะตอบ error กลับมา
// (ไม่เรียกเก็บเงินอัตโนมัติ ตราบใดที่ยังไม่ได้ผูก billing account กับโปรเจกต์)

import { getSessionFromRequest } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: "กรุณา login ก่อนใช้งาน AI" });
    return;
  }

  const { question, context, history } = req.body || {};
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "Missing question" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server missing GEMINI_API_KEY (ตั้งค่าใน Vercel Environment Variables)" });
    return;
  }

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const systemPrompt = [
      "คุณคือผู้ช่วยที่ฝังอยู่ใน dashboard วางแผนวัตถุดิบ (MRP) ของโรงงานผลิต",
      "ตอบคำถามของ planner เป็นภาษาไทย กระชับ ตรงประเด็น ใช้ bullet point เมื่อเหมาะสม",
      "ตอบโดยอ้างอิงข้อมูลใน CONTEXT ที่ให้มาเท่านั้น ห้ามเดาหรือสมมติตัวเลขเอง",
      "ถ้าข้อมูลใน CONTEXT ไม่พอตอบคำถาม ให้บอกตรงๆ ว่าข้อมูลไม่พอ พร้อมบอกว่าขาดอะไร",
      "ถ้าคำถามถามถึง item หรือ project ที่ไม่พบใน CONTEXT ให้บอกว่าไม่พบข้อมูล ไม่ใช่คาดเดา",
    ].join("\n");

    // Gemini ใช้ role "user" กับ "model" (ไม่ใช่ "assistant" แบบ Anthropic/OpenAI)
    const trimmedHistory = Array.isArray(history) ? history.slice(-6) : [];
    const contents = [
      ...trimmedHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: String(m.content || "") }],
      })),
      {
        role: "user",
        parts: [{ text: `CONTEXT:\n${context || "(no context provided)"}\n\nQUESTION: ${question}` }],
      },
    ];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: `Gemini API error (${response.status}): ${errText}` });
      return;
    }

    const data = await response.json();
    const candidate = (data.candidates || [])[0];
    const text = candidate && candidate.content && Array.isArray(candidate.content.parts)
      ? candidate.content.parts.map((p) => p.text || "").join("\n").trim()
      : "";

    // กรณีโดนบล็อกด้วย safety filter หรือเหตุผลอื่นที่ไม่ใช่ error ปกติ
    const finishReason = candidate && candidate.finishReason;
    if (!text && finishReason && finishReason !== "STOP") {
      res.status(200).json({ answer: `(AI ไม่สามารถตอบคำถามนี้ได้ — เหตุผล: ${finishReason})` });
      return;
    }

    res.status(200).json({ answer: text || "(ไม่มีคำตอบกลับมา)" });
  } catch (err) {
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
