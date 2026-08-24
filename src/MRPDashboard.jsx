import React, { useState, useMemo, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { AlertTriangle, Upload, Download, ChevronRight, ChevronDown, PackageSearch, Gauge, ClipboardList, CircleAlert, Layers, ChevronsDown, ChevronsUp, CalendarX, Scale } from "lucide-react";

// ---------- Sample data ----------
const SAMPLE_BOM = [
  { parent_item: "BIKE-100", component_item: "FRAME-STD", qty_per: 1 },
  { parent_item: "BIKE-100", component_item: "WHEEL-ASM", qty_per: 2 },
  { parent_item: "BIKE-100", component_item: "DRIVETRAIN-KIT", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "RIM-26", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "HUB-STD", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "14000133", qty_per: 32 },
  { parent_item: "DRIVETRAIN-KIT", component_item: "CHAIN-STD", qty_per: 1 },
  { parent_item: "DRIVETRAIN-KIT", component_item: "CRANKSET", qty_per: 1 },
];

const SAMPLE_INVENTORY = [
  { item: "BIKE-100", description: "Complete bicycle", unit: "EA", vendor: "", unit_price: 185, on_hand: 12, lead_time_weeks: 1, lot_size: 1, safety_stock: 5, safety_factor: 1, expiry_date: "" },
  { item: "FRAME-STD", description: "Standard frame, welded", unit: "EA", vendor: "Apex Metal Works", unit_price: 42, on_hand: 40, lead_time_weeks: 3, lot_size: 20, safety_stock: 10, safety_factor: 1.2, expiry_date: "" },
  { item: "WHEEL-ASM", description: "Wheel assembly, built", unit: "EA", vendor: "SpinCraft Wheels Co.", unit_price: 28, on_hand: 30, lead_time_weeks: 2, lot_size: 10, safety_stock: 8, safety_factor: 1, expiry_date: "" },
  { item: "DRIVETRAIN-KIT", description: "Drivetrain kit", unit: "EA", vendor: "GearForge Ltd.", unit_price: 35, on_hand: 25, lead_time_weeks: 2, lot_size: 15, safety_stock: 6, safety_factor: 1, expiry_date: "" },
  { item: "RIM-26", description: "26in alloy rim", unit: "EA", vendor: "Apex Metal Works", unit_price: 9.5, on_hand: 60, lead_time_weeks: 2, lot_size: 50, safety_stock: 20, safety_factor: 1, expiry_date: "", mold_family: "MOLD-RIM-A" },
  { item: "HUB-STD", description: "Standard hub", unit: "EA", vendor: "SpinCraft Wheels Co.", unit_price: 6.2, on_hand: 45, lead_time_weeks: 2, lot_size: 40, safety_stock: 15, safety_factor: 1, expiry_date: "", mold_family: "MOLD-RIM-A" },
  { item: "CHAIN-STD", description: "Standard chain, pre-lubed", unit: "EA", vendor: "GearForge Ltd.", unit_price: 4.8, on_hand: 20, lead_time_weeks: 4, lot_size: 25, safety_stock: 10, safety_factor: 1.5, expiry_date: "" },
  { item: "CRANKSET", description: "Crankset, forged", unit: "EA", vendor: "GearForge Ltd.", unit_price: 12.5, on_hand: 18, lead_time_weeks: 4, lot_size: 20, safety_stock: 8, safety_factor: 1, expiry_date: "" },
];

const SAMPLE_DEMAND = [
  { item: "BIKE-100", week: "26CW27", quantity: 20 },
  { item: "BIKE-100", week: "26CW28", quantity: 22 },
  { item: "BIKE-100", week: "26CW29", quantity: 25 },
  { item: "BIKE-100", week: "26CW32", quantity: 20 },
  { item: "BIKE-100", week: "26CW34", quantity: 25 },
  { item: "BIKE-100", week: "26CW36", quantity: 30 },
  { item: "BIKE-100", week: "26CW38", quantity: 18 },
  { item: "BIKE-100", week: "26CW40", quantity: 22 },
  { item: "14000133", week: "26CW33", quantity: 200 },
];

const SAMPLE_PO_PENDING = [
  { item: "CHAIN-STD", week: "26CW32", quantity: 25, po_number: "TPO4471", vendor: "Shimano Trading Co." },
  { item: "WHEEL-ASM", week: "26CW31", quantity: 10, po_number: "TPO4455", vendor: "Taiwan Wheel Works" },
];

const SAMPLE_GIT = [
  { item: "FRAME-STD", quantity: 20 },
];

const SAMPLE_ACTUAL_CONSUMPTION = [
  { item: "BIKE-100", week: "26CW27", quantity: 20 },
  { item: "BIKE-100", week: "26CW28", quantity: 22 },
  { item: "BIKE-100", week: "26CW29", quantity: 28 },
  { item: "FRAME-STD", week: "26CW27", quantity: 20 },
  { item: "FRAME-STD", week: "26CW28", quantity: 25 },
  { item: "FRAME-STD", week: "26CW29", quantity: 18 },
  { item: "WHEEL-ASM", week: "26CW27", quantity: 40 },
  { item: "WHEEL-ASM", week: "26CW28", quantity: 50 },
  { item: "WHEEL-ASM", week: "26CW29", quantity: 36 },
  { item: "14000133", week: "26CW27", quantity: 1280 },
  { item: "14000133", week: "26CW28", quantity: 1600 },
  { item: "CHAIN-STD", week: "26CW27", quantity: 20 },
];

const SAMPLE_BATCHES = [
  { item: "14000133", batch_no: "SPK-B1", quantity: 300, expiry_date: "2026-07-01" },
  { item: "14000133", batch_no: "SPK-B2", quantity: 600, expiry_date: "2026-11-01" },
  { item: "CHAIN-STD", batch_no: "CHN-B1", quantity: 8, expiry_date: "2026-07-28" },
  { item: "CHAIN-STD", batch_no: "CHN-B2", quantity: 12, expiry_date: "2026-12-01" },
];

// ---------- Bulletproof CSV Parsers ----------
function toNum(v, fallback = 0) {
  if (v === undefined || v === null) return fallback;
  if (typeof v === 'number') return isNaN(v) ? fallback : v;
  const str = String(v).replace(/,/g, '').trim();
  const n = Number(str);
  return Number.isFinite(n) ? n : fallback;
}

function getField(row, candidates, fallbackSubstrings) {
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/[\s_\-#.()]/g, "");
    for (const cand of candidates) {
      if (norm === cand) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
    }
  }
  if (fallbackSubstrings) {
    for (const key of Object.keys(row)) {
      const norm = key.toLowerCase().replace(/[\s_\-#.()]/g, "");
      for (const sub of fallbackSubstrings) {
        if (norm.includes(sub)) {
          const v = row[key];
          if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
      }
    }
  }
  return undefined;
}

function extract(r, exactProp, cands, subs) {
  if (r[exactProp] !== undefined && r[exactProp] !== "") return r[exactProp];
  return getField(r, cands, subs);
}

const PO_NUMBER_CANDS = ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"];
const PO_NUMBER_SUBS = ["po", "ref", "doc"];

// รวมค่าที่ผู้ใช้ปรับเอง (poOverrides) เข้ากับข้อมูล PO Pending ต้นฉบับที่ดึงมาจาก SharePoint
// ทำเป็นชั้นแยกต่างหาก เพื่อให้รอดพ้นการถูกทับตอนดึงข้อมูลใหม่ (refresh)
function applyPoOverrides(originalRows, overrides) {
  if (!Array.isArray(originalRows) || !overrides || Object.keys(overrides).length === 0) return originalRows;
  return originalRows.map((r) => {
    const rPo = getField(r, PO_NUMBER_CANDS, PO_NUMBER_SUBS) || "?";
    const key = `${r.item}::${rPo}`;
    const ov = overrides[key];
    if (!ov) return r;
    return {
      ...r,
      ...(ov.quantity !== undefined ? { quantity: ov.quantity } : {}),
      ...(ov.week !== undefined ? { week: ov.week } : {}),
    };
  });
}

// ---------- ISO week helpers ----------
// นับเป็น "project" ก็ต่อเมื่อรหัส item ขึ้นต้นด้วยตัวอักษร (เช่น G8X, RS3)
// ถ้าขึ้นต้นด้วยตัวเลข (เช่น 140, 240) ถือเป็น raw material ไม่ใช่ project
function isProjectCode(code) {
  return /^[A-Za-z]/.test(String(code || ""));
}
// รองรับวันที่หลายรูปแบบ (ISO YYYY-MM-DD และแบบวัน-เดือน-ปี เช่น DD-MM-YY / DD-MM-YYYY / DD/MM/YYYY)
function parseFlexibleDate(dateStr) {
  const s = String(dateStr || "").trim();
  if (!s) return null;
  // ISO: YYYY-MM-DD หรือ YYYY/MM/DD (ปีอยู่หน้า 4 หลัก)
  let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m) {
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return isNaN(dt) ? null : dt;
  }
  // วัน-เดือน-ปี: DD-MM-YYYY / DD-MM-YY / DD/MM/YYYY / DD/MM/YY
  m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m) {
    let year = parseInt(m[3], 10);
    if (year < 100) year += 2000;
    const dt = new Date(Date.UTC(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10)));
    return isNaN(dt) ? null : dt;
  }
  // สุดท้าย ลองให้ JS parse เอง (เผื่อรูปแบบอื่นๆ ที่ยังพอตีความได้)
  const dt = new Date(s);
  return isNaN(dt) ? null : dt;
}
function mondayOfWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d;
}
function isoWeekLabel(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${yy}CW${String(weekNo).padStart(2, "0")}`;
}
function isoWeekToMonday(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const target = new Date(week1Monday);
  target.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return target;
}
function parseWeekToIndex(weekValue, startMonday) {
  if (weekValue === undefined || weekValue === null) return 0;
  const s = String(weekValue).trim().replace(/\s+/g, '');
  let m = s.match(/^(\d{2,4})CW(\d{1,2})$/i);
  if (!m) m = s.match(/^(\d{4})-W(\d{1,2})$/i);
  if (m) {
    let year = parseInt(m[1], 10);
    if (year < 100) year += 2000;
    const target = isoWeekToMonday(year, parseInt(m[2], 10));
    return Math.round((target - startMonday) / (7 * 86400000));
  }
  const n = Number(s);
  return Number.isFinite(n) ? n - 1 : 0; 
}

// ---------- MRP engine (FIXED) ----------
// ---------- MRP engine (FIXED) ----------
function runMRP({ bom, inventory, demand, poPending, git, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides }) {
  if (!Array.isArray(bom) || !Array.isArray(inventory)) {
    return { weeks: [], weekLabels: [], weekDates: [], weekMondayDates: [], records: {}, order: [], childrenOf: {}, historyWeeks: 0, warnings: {} };
  }

  const HW = Math.max(0, historyWeeks || 0);
  const totalCols = HW + horizon;
  const weeks = Array.from({ length: totalCols }, (_, i) => i + 1);

  const invByItem = {};
  inventory.forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item", "part", "รหัส"]);
    if (!rawItem) return;
    rawItem = String(rawItem).trim().toUpperCase();
    invByItem[rawItem] = {
      item: rawItem,
      description: extract(r, "description", ["description", "desc", "name", "ชื่อ"], ["desc", "ชื่อ"]),
      unit: extract(r, "unit", ["unit", "uom", "measure", "หน่วย"], ["unit", "uom"]),
      vendor: extract(r, "vendor", ["vendor", "supplier", "ผู้ขาย"], ["vendor", "sup"]),
      moldFamily: extract(r, "mold_family", ["moldfamily", "moldset", "mold", "familyname", "familygroup"], ["mold", "family"]),
      unit_price: toNum(extract(r, "unit_price", ["unitprice", "price", "cost", "ราคา"], ["price"])),
      on_hand: toNum(extract(r, "on_hand", ["onhand", "stock", "inventory", "คงคลัง"], ["hand", "stock"])),
      lead_time_weeks: toNum(extract(r, "lead_time_weeks", ["leadtime", "lt", "leadtimeweeks"], ["lead", "lt"])),
      lot_size: toNum(extract(r, "lot_size", ["lotsize", "moq", "lot"], ["lot", "moq"]), 1),
      safety_stock: toNum(extract(r, "safety_stock", ["safetystock", "ss"], ["safety", "ss"]), 1),
      safety_factor: toNum(extract(r, "safety_factor", ["safetyfactor", "sf"], ["factor"]), 1),
      expiry_date: extract(r, "expiry_date", ["expirydate", "expiry", "expdate"], ["exp"])
    };
  });

  const childrenOf = {};
  const parentsOf = {};
  bom.forEach((r) => {
    let p = extract(r, "parent_item", ["parentitem", "parent", "assembly", "fg", "แม่"], ["parent"]);
    let c = extract(r, "component_item", ["componentitem", "component", "child", "part", "rm", "ลูก"], ["comp", "child"]);
    let q = extract(r, "qty_per", ["qtyper", "qty", "quantity", "จำนวน"], ["qty"]);
    if (p && c) {
      p = String(p).trim().toUpperCase();
      c = String(c).trim().toUpperCase();
      childrenOf[p] = childrenOf[p] || [];
      childrenOf[p].push({ component: c, qty_per: toNum(q, 1) });
      parentsOf[c] = parentsOf[c] || [];
      parentsOf[c].push(p);
    }
  });

  const demandItemsSet = new Set();
  const allItems = new Set([
    ...Object.keys(invByItem),
    ...(demand || []).map(r => {
      let rawItem = extract(r, "item", ["item", "part", "รหัส"], ["item"]);
      let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
      if (rawItem) {
        let it = String(rawItem).trim().toUpperCase();
        if (toNum(rawQty) > 0) demandItemsSet.add(it);
        return it;
      }
      return "";
    }).filter(Boolean),
    ...Object.keys(childrenOf),
    ...Object.keys(parentsOf),
  ]);

  const warnings = { demandWithoutBOM: [], missingInventory: [] };
  Array.from(demandItemsSet).forEach(item => {
    if (!childrenOf[item] || childrenOf[item].length === 0) {
      warnings.demandWithoutBOM.push(item);
    }
  });
  Array.from(allItems).forEach(item => {
    if (!invByItem[item] && /^\d+$/.test(item)) {
      warnings.missingInventory.push(item);
    }
  });

  const level = {};
  allItems.forEach((it) => (level[it] = 0));
  let changed = true;
  let guard = 0;
  while (changed && guard < allItems.size + 5) {
    changed = false;
    guard++;
    Object.entries(childrenOf).forEach(([p, kids]) => {
      const pLevel = level[p] ?? 0;
      kids.forEach(k => {
        if ((level[k.component] ?? 0) < pLevel + 1) {
          level[k.component] = pLevel + 1;
          changed = true;
        }
      });
    });
  }

  const order = Array.from(allItems).sort((a, b) => (level[a] || 0) - (level[b] || 0));

  const grossReq = {};
  order.forEach((it) => (grossReq[it] = new Array(totalCols).fill(0)));
  const startMonday = mondayOfWeek(new Date());
  const weekLabels = weeks.map((_, i) => isoWeekLabel(new Date(startMonday.getTime() + (i - HW) * 7 * 86400000)));
  const weekDates = weeks.map((_, i) => {
    const d = new Date(startMonday.getTime() + (i - HW) * 7 * 86400000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  });
  const weekMondayDates = weeks.map((_, i) => new Date(startMonday.getTime() + (i - HW) * 7 * 86400000).toISOString().slice(0, 10));

  (demand || []).forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item"]);
    let rawWeek = extract(r, "week", ["week", "wk", "cw", "สัปดาห์"], ["week"]);
    let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
    if (!rawItem || rawWeek === undefined) return;
    rawItem = String(rawItem).trim().toUpperCase();
    const idx = parseWeekToIndex(rawWeek, startMonday) + HW;
    if (idx >= 0 && idx < totalCols && grossReq[rawItem]) {
      grossReq[rawItem][idx] += toNum(rawQty);
    }
  });

  const schedReceiptByItem = {};
  const poPendingByItem = {};
  const gitByItem = {};
  order.forEach((it) => {
    schedReceiptByItem[it] = new Array(totalCols).fill(0);
    poPendingByItem[it] = new Array(totalCols).fill(0);
    gitByItem[it] = new Array(totalCols).fill(0);
  });

const poDetailsByItem = {};
  (poPending || []).forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item"]);
    let rawWeek = extract(r, "week", ["week", "wk", "cw", "สัปดาห์"], ["week"]);
    let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
    if (!rawItem || rawWeek === undefined) return;
    rawItem = String(rawItem).trim().toUpperCase();
    const idx = parseWeekToIndex(rawWeek, startMonday) + HW;
    if (!poPendingByItem[rawItem]) poPendingByItem[rawItem] = new Array(totalCols).fill(0);
    if (!schedReceiptByItem[rawItem]) schedReceiptByItem[rawItem] = new Array(totalCols).fill(0);

    // เก็บเข้า "ตารางแสดงผล" เสมอ ไม่ว่า week จะอยู่ในช่วง horizon/history หรือไม่
    const inRange = idx >= 0 && idx < totalCols;
    poDetailsByItem[rawItem] = poDetailsByItem[rawItem] || [];
    poDetailsByItem[rawItem].push({
      poNumber: String(extract(r, "po_number", ["ponumber", "ponum", "po", "เลขที่po"], ["po", "doc"]) || "?").trim(),
      vendor: String(extract(r, "vendor", ["vendor", "supplier", "ผู้ขาย"], ["vendor", "sup"]) || "").trim(),
      quantity: toNum(rawQty), weekIdx: idx, rawWeek: rawWeek,
      weekLabel: inRange ? weekLabels[idx] : String(rawWeek),
      mondayDate: inRange ? weekMondayDates[idx] : "",
      outOfHorizon: !inRange,
    });

    // ใส่เข้า array คำนวณ MRP เฉพาะที่อยู่ในช่วง horizon เท่านั้น (array ความยาวคงที่)
    if (inRange) {
      poPendingByItem[rawItem][idx] += toNum(rawQty);
      schedReceiptByItem[rawItem][idx] += toNum(rawQty);
    }
  });
  Object.values(poDetailsByItem).forEach((list) => list.sort((a, b) => a.weekIdx - b.weekIdx));

  (git || []).forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item"]);
    let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
    if (!rawItem) return;
    rawItem = String(rawItem).trim().toUpperCase();
    if (!gitByItem[rawItem]) gitByItem[rawItem] = new Array(totalCols).fill(0);
    if (!schedReceiptByItem[rawItem]) schedReceiptByItem[rawItem] = new Array(totalCols).fill(0);
    gitByItem[rawItem][HW] += toNum(rawQty);
    schedReceiptByItem[rawItem][HW] += toNum(rawQty);
  });

  const actualByItem = {};
  order.forEach((it) => (actualByItem[it] = new Array(totalCols).fill(0)));
  (actualConsumption || []).forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item", "part"]);
    let rawWeek = extract(r, "week", ["week", "wk", "cw", "สัปดาห์"], ["week", "cw"]);
    let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "actual", "usage", "เบิกจริง", "ยอดเบิก"], ["qty", "quant", "act", "เบิก", "issue"]);
    if (!rawItem || rawWeek === undefined) return;
    rawItem = String(rawItem).trim().toUpperCase();
    const idx = parseWeekToIndex(rawWeek, startMonday) + HW;
    if (!actualByItem[rawItem]) actualByItem[rawItem] = new Array(totalCols).fill(0);
    if (idx >= 0 && idx < totalCols) {
      actualByItem[rawItem][idx] += toNum(rawQty);
    }
  });

  const batchesByItem = {};
  (batches || []).forEach((r) => {
    let rawItem = extract(r, "item", ["item", "part", "material", "รหัส"], ["item"]);
    let rawQty = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
    let rawBatch = extract(r, "batch_no", ["batchno", "batch", "lotno", "lot", "รุ่น"], ["batch", "lot"]);
    let rawExpiry = extract(r, "expiry_date", ["expirydate", "expiry", "expdate", "exp", "หมดอายุ"], ["exp"]);
    if (!rawItem) return;
    rawItem = String(rawItem).trim().toUpperCase();
    const qty = toNum(rawQty);
    const dateStr = String(rawExpiry || "").trim();
    const expiryDate = parseFlexibleDate(dateStr);
    const valid = expiryDate && !isNaN(expiryDate);
    const weeksToExpiry = valid ? Math.floor((expiryDate - startMonday) / (7 * 86400000)) : null;
    batchesByItem[rawItem] = batchesByItem[rawItem] || [];
    batchesByItem[rawItem].push({
      batchNo: String(rawBatch || "?").trim(), quantity: qty, expiryDate: dateStr,
      weeksToExpiry, expired: valid ? weeksToExpiry < 0 : false, expiringSoon: valid ? (weeksToExpiry >= 0 && weeksToExpiry <= 4) : false,
    });
  });
  Object.values(batchesByItem).forEach((list) => list.sort((a, b) => (a.weeksToExpiry ?? Infinity) - (b.weeksToExpiry ?? Infinity)));

  const records = {};

  order.forEach((item) => {
    const inv = invByItem[item] || { item: item, on_hand: 0, lead_time_weeks: 0, lot_size: 1, safety_stock: 0, description: item, unit: "EA", vendor: "", unit_price: 0, expiry_date: "" };
    const leadTime = Math.max(0, toNum(inv.lead_time_weeks, 0));
    const lotSize = Math.max(1, toNum(inv.lot_size, 1));
    const baseSafety = Math.max(0, toNum(inv.safety_stock, 0));
    const safetyFactor = toNum(inv.safety_factor, 1) || 1;
    // FIX #2: safetyFactor scales the SAFETY STOCK TARGET only.
    // It must NOT also scale demand/consumption (that double-counts the buffer).
    const safety = baseSafety * safetyFactor;

    const itemBatches = batchesByItem[item] || [];
    const masterOnHand = toNum(inv.on_hand, 0);
    let rawOnHand, effectiveOnHand, expired, expiringSoon, weeksToExpiry, expiryDateStr;

    if (itemBatches.length > 0) {
      // ไฟล์ Batches/Expired มักเป็นแค่รายการ lot ที่ใกล้/หมดอายุ ไม่ใช่ batch ledger ครบทุกก้อน
      // ยึด on_hand จาก Inventory Master เป็นยอดรวมหลักเสมอ (เผื่อผลรวม batch มากกว่า กันไม่ให้ยอดหาย)
      const batchTotal = itemBatches.reduce((s, b) => s + b.quantity, 0);
      const expiredFromBatches = itemBatches.filter((b) => b.expired).reduce((s, b) => s + b.quantity, 0);
      rawOnHand = Math.max(masterOnHand, batchTotal);
      effectiveOnHand = Math.max(0, rawOnHand - expiredFromBatches);
      expired = effectiveOnHand === 0 && rawOnHand > 0;
      expiringSoon = itemBatches.some((b) => !b.expired && b.expiringSoon);
      const nearest = itemBatches.find((b) => !b.expired);
      weeksToExpiry = nearest ? nearest.weeksToExpiry : null;
      expiryDateStr = nearest ? nearest.expiryDate : (itemBatches[0] ? itemBatches[0].expiryDate : "");
    } else {
      rawOnHand = masterOnHand;
      expired = false;
      expiringSoon = false;
      weeksToExpiry = null;
      expiryDateStr = String(inv.expiry_date || "").trim();
      if (expiryDateStr) {
        const expiryDate = parseFlexibleDate(expiryDateStr);
        if (expiryDate) {
          weeksToExpiry = Math.floor((expiryDate - startMonday) / (7 * 86400000));
          expired = weeksToExpiry < 0;
          expiringSoon = !expired && weeksToExpiry <= 4;
        }
      }
      effectiveOnHand = expired ? 0 : rawOnHand;
    }

    // แถวแยกต่างหาก "Expired quantity": ปริมาณของที่หมดอายุ/กำลังจะหมดอายุ ในแต่ละสัปดาห์
    // (ของที่หมดอายุไปแล้วก่อนช่วงเวลาที่มองอยู่ จะรวมไว้ที่คอลัมน์แรกสุดของ history)
    const expiredByWeek = new Array(totalCols).fill(0);
    if (itemBatches.length > 0) {
      itemBatches.forEach((b) => {
        if (b.weeksToExpiry === null || b.weeksToExpiry === undefined) return;
        let idx = b.weeksToExpiry + HW;
        if (idx < 0) idx = 0;
        if (idx < totalCols) expiredByWeek[idx] += b.quantity;
      });
    } else if (expiryDateStr && weeksToExpiry !== null) {
      let idx = weeksToExpiry + HW;
      if (idx < 0) idx = 0;
      if (idx < totalCols) expiredByWeek[idx] += rawOnHand;
    }

    const gr = grossReq[item] || new Array(totalCols).fill(0);
    const sr = schedReceiptByItem[item] || new Array(totalCols).fill(0);
    const actualCons = actualByItem[item] || new Array(totalCols).fill(0);

    // คำนวณสัดส่วนรวม (Aggregate Factor) จากอดีตอย่างปลอดภัย
    let totalPastPlan = 0;
    let totalPastActual = 0;
    for (let i = 0; i < HW; i++) {
      totalPastPlan += gr[i] || 0;
      totalPastActual += actualCons[i] || 0;
    }
    // FIX #1: if there is no actual-consumption data at all for this item
    // (totalPastActual === 0, e.g. the actualConsumption sheet is empty or
    // doesn't cover this item), we must NOT infer a 0-ratio and let it get
    // clamped to 0.5 below. Missing data means "no adjustment", i.e. factor = 1.
    const consumptionFactor =
      (totalPastPlan > 0 && totalPastActual > 0)
        ? (totalPastActual / totalPastPlan)
        : 1;

    const pastActualTotal = actualCons.slice(0, HW).reduce((a, b) => a + b, 0);
    const pastActualAvg = HW > 0 ? pastActualTotal / HW : 0;

    // NOTE: this "consumption" field is for display only and intentionally
    // does NOT include safetyFactor or adjustedFactor anymore (see FIX #2/#3
    // below) — it should reflect raw gross requirement so it ties out with
    // what's shown to the user. Safety buffer is applied separately via
    // `safety`, and the aggregate adjustment is applied via adjustedConsumption
    // (now also stored per-row so the numbers are traceable).
    const consumption = gr.map((v) => v);
    const projOnHand = new Array(totalCols).fill(null);
    const netReq = new Array(totalCols).fill(null);
    const plannedReceipt = new Array(totalCols).fill(null);
    const pastDue = new Array(totalCols).fill(false);
    const adjustedConsumptionArr = new Array(totalCols).fill(null);

    let onHandPrev = effectiveOnHand;
    for (let fi = 0; fi < horizon; fi++) {
      const i = HW + fi;

      // ปรับความต้องการในอนาคตด้วยสัดส่วนรวมที่เสถียร (จำกัดช่วง 0.5x-2.0x)
      const adjustedFactor = Math.max(0.5, Math.min(2.0, consumptionFactor));
      // FIX #2: removed the extra `* safetyFactor` here — safetyFactor already
      // raises the `safety` target above, so multiplying demand by it too was
      // double-applying the buffer.
      const adjustedConsumption = (gr[i] || 0) * adjustedFactor;
      adjustedConsumptionArr[i] = adjustedConsumption;

      // หักยอดของที่หมดอายุในสัปดาห์นี้ออกจาก on-hand ด้วย (ไม่ใช่แค่โชว์แยกในแถว Expired quantity)
      const expiredThisWeek = expiredByWeek[i] || 0;

      let proj = onHandPrev + sr[i] - adjustedConsumption - expiredThisWeek;
      let ordered = 0;

      const releaseIdx = i - leadTime;
      const overrideReceiptKey = `${item}::${i}`;

      if (receiptOverrides && receiptOverrides[overrideReceiptKey] !== undefined) {
         ordered = receiptOverrides[overrideReceiptKey];
      } else {
         if (proj < safety) {
            if (releaseIdx < HW && planOverrides && planOverrides[`${item}::${HW}`] !== undefined) {
               ordered = 0;
            } else {
               const need = safety - proj;
               ordered = Math.ceil(need / lotSize) * lotSize;
            }
         }
      }

      plannedReceipt[i] = ordered;
      proj += ordered;
      projOnHand[i] = proj;
      netReq[i] = Math.max(0, safety - (onHandPrev + sr[i] - adjustedConsumption - expiredThisWeek));
      onHandPrev = proj;
    }

    const calcPlannedRelease = new Array(totalCols).fill(0);
    for (let fi = 0; fi < horizon; fi++) {
      const i = HW + fi;
      if (plannedReceipt[i] > 0) {
        const releaseIdx = i - leadTime;
        if (releaseIdx >= HW) {
          calcPlannedRelease[releaseIdx] += plannedReceipt[i];
        } else {
          calcPlannedRelease[HW] += plannedReceipt[i];
          pastDue[HW] = true;
        }
      }
    }

    const finalPlannedRelease = calcPlannedRelease.map((v, idx) => {
      const key = `${item}::${idx}`;
      return planOverrides && planOverrides[key] !== undefined ? planOverrides[key] : v;
    });

    const kids = childrenOf[item] || [];
    kids.forEach(({ component, qty_per }) => {
      grossReq[component] = grossReq[component] || new Array(totalCols).fill(0);
      for (let i = 0; i < totalCols; i++) {
        if (i < HW) {
          const pastReleaseIdx = i - leadTime;
          if (pastReleaseIdx >= 0) {
            grossReq[component][pastReleaseIdx] += (gr[i] || 0) * qty_per;
          }
        } else {
          grossReq[component][i] += (finalPlannedRelease[i] || 0) * qty_per;
        }
      }
    });

    records[item] = {
      item,
      description: inv.description || item,
      unit: inv.unit || "EA",
      vendor: String(inv.vendor || "").trim(),
      moldFamily: String(inv.moldFamily || "").trim(),
      unitPrice: toNum(inv.unit_price, 0),
      level: level[item] || 0,
      leadTime,
      lotSize,
      safety,
      baseSafety,
      safetyFactor,
      consumptionFactor,
      onHand: rawOnHand,
      usableOnHand: effectiveOnHand,
      expiredQty: Math.max(0, rawOnHand - effectiveOnHand),
      onHandValue: rawOnHand * (toNum(inv.unit_price, 0)),
      usableValue: effectiveOnHand * (toNum(inv.unit_price, 0)),
      expiredValue: Math.max(0, rawOnHand - effectiveOnHand) * (toNum(inv.unit_price, 0)),
      expiredByWeek,
      batches: itemBatches,
      expiryDate: expiryDateStr,
      expired,
      expiringSoon,
      weeksToExpiry,
      grossReq: gr,
      consumption,
      adjustedConsumption: adjustedConsumptionArr,
      // Per-row comparison helpers: null in history weeks (adjustedConsumption
      // is only computed for future/forecast weeks), numeric only where both
      // sides exist so the UI can show "-" instead of 0 when there's nothing
      // to compare yet.
      consumptionDiff: consumption.map((v, i) =>
        adjustedConsumptionArr[i] === null ? null : (adjustedConsumptionArr[i] - v)
      ),
      consumptionDiffPct: consumption.map((v, i) =>
        adjustedConsumptionArr[i] === null || v === 0 ? null : ((adjustedConsumptionArr[i] - v) / v) * 100
      ),
      scheduledReceipts: sr,
      // FIX #4: fallback arrays now match totalCols so indices line up with
      // every other per-item array (previously defaulted to length `horizon`,
      // which is HW columns short and would misalign with weekLabels/weekDates).
      poPending: poPendingByItem[item] || new Array(totalCols).fill(0),
      poPendingDetails: poDetailsByItem[item] || [],
      git: gitByItem[item] || new Array(totalCols).fill(0),
      actualConsumption: actualCons,
      pastActualTotal,
      pastActualAvg,
      consumptionVariance: gr.map((v, i) => i < HW ? (actualCons[i] - v) : null),
      projOnHand,
      netReq,
      plannedReceipt,
      plannedRelease: finalPlannedRelease,
      pastDue,
      hasParents: !!parentsOf[item],
      parentsCount: (parentsOf[item] || []).length,
      parentItems: parentsOf[item] || [],
      children: kids,
    };
  });

  return { weeks, weekLabels, weekDates, weekMondayDates, records, order, childrenOf, historyWeeks: HW, warnings };
}
// ---------- Storage adapter ----------
const STORAGE_PREFIX = "mrp_dashboard:";
async function storageGet(key) {
  try {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
      const res = await window.storage.get(STORAGE_PREFIX + key, false);
      return res ? JSON.parse(res.value) : null;
    }
  } catch (e) { }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (e) { }
  return null;
}
async function storageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
      await window.storage.set(STORAGE_PREFIX + key, JSON.stringify(value), false);
      return true;
    }
  } catch (e) { }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    }
  } catch (e) { }
  return false;
}
async function storageClearAll(keys) {
  for (const key of keys) {
    try {
      if (typeof window !== "undefined" && window.storage && typeof window.storage.delete === "function") {
        await window.storage.delete(STORAGE_PREFIX + key, false);
        continue;
      }
    } catch (e) { }
    try {
      if (typeof window !== "undefined" && window.localStorage) window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) { }
  }
}

function parseCSV(file, onDone) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => onDone(res.data),
  });
}

function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- UI ----------
const COLORS = {
  ink: "#101828",
  inkSoft: "#667085",
  paper: "#F5F6FA",
  paperLine: "#E3E6EC",
  card: "#FFFFFF",
  steel: "#3B5EDB",
  steelDeep: "#26418F",
  amber: "#D97706",
  rust: "#DC2626",
  moss: "#16A34A",
  shadow: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)",
  shadowLg: "0 4px 8px rgba(16,24,40,0.06), 0 2px 4px rgba(16,24,40,0.08)",
  radius: 10,
  radiusSm: 6,
};

function UploadSlot({ label, hint, onFile, loaded, count, onSample }) {
  return (
    <div style={{
      border: `1px solid ${COLORS.paperLine}`,
      background: COLORS.card,
      borderRadius: COLORS.radius,
      boxShadow: COLORS.shadow,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 200,
      flex: 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, letterSpacing: "0.06em", color: COLORS.ink, textTransform: "uppercase", fontWeight: 600 }}>{label}</span>
        {loaded && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.moss }}>{count} rows</span>}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft }}>{hint}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.steel,
          border: `1px solid ${COLORS.steel}`, borderRadius: COLORS.radiusSm, padding: "4px 8px",
          transition: "background 0.15s ease",
        }}>
          <Upload size={12} /> upload .csv
          <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => {
            if (e.target.files?.[0]) onFile(e.target.files[0]);
          }} />
        </label>
        <button onClick={onSample} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft,
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, background: "transparent", padding: "4px 8px", cursor: "pointer",
          transition: "background 0.15s ease, border-color 0.15s ease",
        }}>use sample</button>
      </div>
    </div>
  );
}

function KPI({ label, value, tone, icon: Icon, mobile }) {
  const toneColor = tone === "rust" ? COLORS.rust : tone === "amber" ? COLORS.amber : tone === "moss" ? COLORS.moss : COLORS.steelDeep;
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.paperLine}`, borderTop: `3px solid ${toneColor}`,
      borderRadius: COLORS.radius, boxShadow: COLORS.shadow,
      padding: "14px 16px", flex: mobile ? "0 0 auto" : 1, minWidth: mobile ? 160 : 150,
      scrollSnapAlign: mobile ? "start" : "none",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: toneColor, marginBottom: 6 }}>
        <Icon size={14} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: COLORS.ink }}>{value}</div>
    </div>
  );
}

function TreeRow({ item, records, childrenOf, selected, onSelect, depth, onlyWithOrders, subtreeOrderMap, forceOpen }) {
  const [open, setOpen] = useState(depth < 1);
  useEffect(() => {
    if (forceOpen && forceOpen.value !== null) setOpen(forceOpen.value);
  }, [forceOpen && forceOpen.key]);
  const rec = records[item];
  if (!rec) return null;
  const kids = (childrenOf[item] || []).filter((k) => !onlyWithOrders || subtreeOrderMap[k.component]);
  const isSelected = selected === item;
  const shortage = rec.plannedRelease.some((v) => v > 0);
  const critical = rec.pastDue.some(Boolean);

  return (
    <div>
      <div
        onClick={() => onSelect(item)}
        title={`${rec.description} (${rec.unit})`}
        style={{
          display: "flex", flexDirection: "column", gap: 0, cursor: "pointer",
          paddingLeft: depth * 16 + 6, paddingRight: 6, paddingTop: 4, paddingBottom: 4,
          background: isSelected ? COLORS.steel : "transparent",
          color: isSelected ? "#FFFFFF" : COLORS.ink,
          borderLeft: isSelected ? `3px solid ${COLORS.amber}` : "3px solid transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {kids.length > 0 ? (
            <span onClick={(e) => {
              e.stopPropagation();
              setOpen(!open);
            }} style={{ display: "flex" }}>
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          ) : <span style={{ width: 13 }} />}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item}
          </span>
          {rec.parentsCount > 1 && (
            <span title={`shared across ${rec.parentsCount} assemblies: ${rec.parentItems.join(", ")}`} style={{
              display: "flex", alignItems: "center", gap: 2, fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace",
              color: isSelected ? "#EEF2FF" : COLORS.steel, border: `1px solid ${isSelected ? "#EEF2FF" : COLORS.steel}`,
              padding: "0 4px", lineHeight: "14px", borderRadius: 999,
            }}>
              <Layers size={9} /> {rec.parentsCount}
            </span>
          )}
          {critical && <CircleAlert size={12} color={isSelected ? "#FFD9CE" : COLORS.rust} />}
          {!critical && shortage && <AlertTriangle size={11} color={isSelected ? "#FFE9C6" : COLORS.amber} />}
          {rec.expired && <CalendarX size={11} title={`expired ${rec.expiryDate}`} color={isSelected ? "#FFD9CE" : COLORS.rust} />}
          {!rec.expired && rec.expiringSoon && <CalendarX size={11} title={`expires ${rec.expiryDate}`} color={isSelected ? "#FFE9C6" : COLORS.amber} />}
        </div>
        <div style={{
          fontFamily: "Inter, sans-serif", fontSize: 10, paddingLeft: 17,
          color: isSelected ? "#E4E7EC" : COLORS.inkSoft,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {rec.description} · {rec.unit}
        </div>
      </div>
      {open && kids.map((k) => (
        <TreeRow key={k.component} item={k.component} records={records} childrenOf={childrenOf}
          selected={selected} onSelect={onSelect} depth={depth + 1}
          onlyWithOrders={onlyWithOrders} subtreeOrderMap={subtreeOrderMap}
          forceOpen={forceOpen} />
      ))}
    </div>
  );
}

function VendorGroupRow({ vendor, items, records, selected, onSelect, onlyWithOrders, forceOpen }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (forceOpen && forceOpen.value !== null) setOpen(forceOpen.value);
  }, [forceOpen && forceOpen.key]);
  const visibleItems = onlyWithOrders ? items.filter((it) => records[it].plannedRelease.some((v) => v > 0)) : items;
  if (onlyWithOrders && visibleItems.length === 0) return null;
  const anyCritical = visibleItems.some((it) => records[it].pastDue.some(Boolean));
  const anyShortage = visibleItems.some((it) => records[it].plannedRelease.some((v) => v > 0));

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          padding: "5px 6px", background: COLORS.paper, borderLeft: `3px solid ${COLORS.steel}`,
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, fontWeight: 700, color: COLORS.ink, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {vendor} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400, color: COLORS.inkSoft, fontSize: 10.5 }}>({visibleItems.length})</span>
        </span>
        {anyCritical && <CircleAlert size={12} color={COLORS.rust} />}
        {!anyCritical && anyShortage && <AlertTriangle size={11} color={COLORS.amber} />}
      </div>
      {open && visibleItems.map((it) => {
        const rec = records[it];
        const isSelected = selected === it;
        const critical = rec.pastDue.some(Boolean);
        const shortage = rec.plannedRelease.some((v) => v > 0);
        return (
          <div key={it} onClick={() => onSelect(it)} title={`${rec.description} (${rec.unit})`} style={{
            display: "flex", flexDirection: "column", cursor: "pointer",
            paddingLeft: 22, paddingRight: 6, paddingTop: 4, paddingBottom: 4,
            background: isSelected ? COLORS.steel : "transparent",
            color: isSelected ? "#FFFFFF" : COLORS.ink,
            borderLeft: isSelected ? `3px solid ${COLORS.amber}` : "3px solid transparent",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it}</span>
              {critical && <CircleAlert size={12} color={isSelected ? "#FFD9CE" : COLORS.rust} />}
              {!critical && shortage && <AlertTriangle size={11} color={isSelected ? "#FFE9C6" : COLORS.amber} />}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, paddingLeft: 17, color: isSelected ? "#E4E7EC" : COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {rec.description} {"·"} {rec.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VendorGroupTree({ groups, records, selected, onSelect, onlyWithOrders, forceOpen }) {
  return (
    <div>
      {groups.map((g) => (
        <VendorGroupRow key={g.vendor} vendor={g.vendor} items={g.items} records={records}
          selected={selected} onSelect={onSelect} onlyWithOrders={onlyWithOrders}
          forceOpen={forceOpen} />
      ))}
    </div>
  );
}

function ProjectGroupRow({ project, items, records, childrenOf, selected, onSelect, onlyWithOrders, subtreeOrderMap, forceOpen }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (forceOpen && forceOpen.value !== null) setOpen(forceOpen.value);
  }, [forceOpen && forceOpen.key]);
  const visibleItems = onlyWithOrders ? items.filter((it) => subtreeOrderMap[it]) : items;
  if (onlyWithOrders && visibleItems.length === 0) return null;
  const anyCritical = visibleItems.some((it) => records[it].pastDue.some(Boolean));
  const anyShortage = visibleItems.some((it) => records[it].plannedRelease.some((v) => v > 0));

  return (
    <div>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          padding: "5px 6px", background: COLORS.paper, borderLeft: `3px solid ${COLORS.amber}`,
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, fontWeight: 700, color: COLORS.ink, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {project} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400, color: COLORS.inkSoft, fontSize: 10.5 }}>({visibleItems.length})</span>
        </span>
        {anyCritical && <CircleAlert size={12} color={COLORS.rust} />}
        {!anyCritical && anyShortage && <AlertTriangle size={11} color={COLORS.amber} />}
      </div>
      {open && visibleItems.map((it) => (
        <TreeRow key={it} item={it} records={records} childrenOf={childrenOf}
          selected={selected} onSelect={onSelect} depth={0}
          onlyWithOrders={onlyWithOrders} subtreeOrderMap={subtreeOrderMap}
          forceOpen={forceOpen} />
      ))}
    </div>
  );
}

function ProjectGroupTree({ groups, records, childrenOf, selected, onSelect, onlyWithOrders, subtreeOrderMap, forceOpen }) {
  return (
    <div>
      {groups.map((g) => (
        <ProjectGroupRow key={g.project} project={g.project} items={g.items} records={records} childrenOf={childrenOf}
          selected={selected} onSelect={onSelect} onlyWithOrders={onlyWithOrders} subtreeOrderMap={subtreeOrderMap}
          forceOpen={forceOpen} />
      ))}
    </div>
  );
}

function RecordGrid({ rec, weeks, weekLabels, weekDates, historyWeeks, onAdjustPlan, onResetPlanOverride, onAdjustReceipt, onResetReceiptOverride, onAdjustPOQty, poOriginalQtyMap, onResetPOQty, onAdjustPOWeek, onResetPOWeek, poOriginalMap, planOverrides, receiptOverrides, isMobile, draftRefs, onAdjustDraftRef, moldFamilyMembers, isReadOnly }) {
  if (!rec) return null;
  const rows = [
    { label: "Gross requirements (calculated)", data: rec.grossReq, kind: "gr" },
    { label: `Consumption used for planning (×${rec.consumptionFactor.toFixed(2)})`, data: rec.consumption, kind: "consumption" },
    { label: "Actual consumption (issued)", data: rec.actualConsumption, kind: "actual" },
   { label: "Variance (Qty / %)", data: rec.consumptionVariance, kind: "variance" },
    { label: "PO pending", data: rec.poPending, kind: "po" },
    { label: "Goods in transit (GIT)", data: rec.git, kind: "git" },
    { label: "Expired quantity", data: rec.expiredByWeek, kind: "expline" },
    { label: "Projected on hand", data: rec.projOnHand, kind: "poh" },
    { label: `Safety stock remaining (On-hand − SS ${rec.safety})`, data: rec.projOnHand.map((v) => (v === null || v === undefined ? null : v - rec.safety)), kind: "ssline" },
    { label: "Net requirements", data: rec.netReq, kind: "nr" },
    { label: "Planned order receipt", data: rec.plannedReceipt, kind: "por" },
    { label: "Planned order release", data: rec.plannedRelease, kind: "prel" },
    { label: "Lead time (wk)", data: new Array(weeks.length).fill(rec.leadTime), kind: "ltline" },
  ];

  const formattedAvg = rec.pastActualAvg.toLocaleString(undefined, { maximumFractionDigits: 1 });

  // --- เริ่มคำนวณ Variance รวมของอดีต ---
  const pastGrossTotal = rec.grossReq.slice(0, historyWeeks).reduce((a, b) => a + b, 0);
  const pastVarianceTotal = rec.pastActualTotal - pastGrossTotal;
  
  let pastVarPctStr = "";
  if (pastGrossTotal === 0 && rec.pastActualTotal === 0) {
    pastVarPctStr = "0%";
  } else if (pastGrossTotal === 0 && rec.pastActualTotal > 0) {
    pastVarPctStr = "+∞%";
  } else {
    const pct = (pastVarianceTotal / pastGrossTotal) * 100;
    pastVarPctStr = pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
  }
  const pastVarQtyStr = pastVarianceTotal > 0 ? `+${Math.round(pastVarianceTotal)}` : `${Math.round(pastVarianceTotal)}`;
  
  // กำหนดสีให้ตรงกับในตาราง
  let pastVarColor = COLORS.inkSoft;
  if (pastVarianceTotal === 0 && pastGrossTotal === 0 && rec.pastActualTotal === 0) {
    pastVarColor = COLORS.inkSoft;
  } else if (Math.abs(pastVarianceTotal) < 0.5) {
    pastVarColor = COLORS.moss;
  } else if (pastVarianceTotal > 0) {
    pastVarColor = COLORS.amber;
  } else {
    pastVarColor = COLORS.rust;
  }
  // --- จบการคำนวณ ---

  return (
    <div style={{ border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, overflow: "hidden" }}>
      {/* title block */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(8, 1fr)", borderBottom: `1px solid ${COLORS.paperLine}`,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
      }}>
        {[
          ["ITEM", rec.item],
          ["UNIT", rec.unit],
          ["LEAD TIME (WK)", rec.leadTime],
          ["LOT SIZE / SS", `${rec.lotSize} / ${rec.baseSafety}${rec.safetyFactor !== 1 ? ` ×${rec.safetyFactor} = ${rec.safety}` : ""}`],
          ["ON HAND (usable/total)", `${rec.usableOnHand.toLocaleString()} / ${rec.onHand.toLocaleString()} ${rec.unit}`],
          [`PAST ${historyWeeks}W AVG`, (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span>{formattedAvg} {rec.unit}/wk ({rec.pastActualTotal.toLocaleString()} total)</span>
              <span style={{ fontSize: 10, color: pastVarColor, fontWeight: 600 }}>
                Var: {pastVarQtyStr} ({pastVarPctStr})
              </span>
            </div>
          )],
          ["EXPIRY", rec.batches.length > 0
            ? `${rec.batches.length} batch${rec.batches.length === 1 ? "" : "es"}${rec.expired ? " (ALL EXPIRED)" : rec.expiredQty > 0 ? ` (${rec.expiredQty} exp.)` : ""}`
            : (rec.expiryDate ? (rec.expired ? "EXPIRED" : rec.expiryDate) : "—")],
          ["UNIT PRICE / VALUE", rec.unitPrice > 0
            ? `${rec.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} × ${rec.usableOnHand} = ${rec.usableValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : "—"],
        ].map(([k, v], i) => (
          <div key={k} style={{
            padding: "6px 10px",
            borderRight: isMobile ? (i % 2 === 0 ? `1px solid ${COLORS.paperLine}` : "none") : (i < 7 ? `1px solid ${COLORS.paperLine}` : "none"),
            borderBottom: isMobile ? (i < 6 ? `1px solid ${COLORS.paperLine}` : "none") : "none",
            background: k === "EXPIRY" && rec.expired ? COLORS.rust : k === "EXPIRY" && rec.expiringSoon ? "#FEF3C7" : k.includes("AVG") ? "#DCFCE7" : k.includes("ON HAND") ? "#E0E7FF" : "transparent",
          }}>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#FEE2E2" : k.includes("AVG") ? COLORS.moss : k.includes("ON HAND") ? COLORS.steelDeep : COLORS.inkSoft, letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#fff" : k === "EXPIRY" && rec.expiringSoon ? COLORS.amber : COLORS.ink, fontWeight: 600, fontSize: 12 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 10px 2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
        {rec.description} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 400, color: COLORS.inkSoft }}>({rec.unit}){rec.vendor ? ` · ${rec.vendor}` : ""}</span>
      </div>
      {rec.parentsCount > 1 && (
        <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel, display: "flex", alignItems: "center", gap: 4 }}>
          <Layers size={11} /> common component — used in {rec.parentsCount} assemblies: {rec.parentItems.join(", ")}
        </div>
      )}
      {rec.moldFamily && moldFamilyMembers && moldFamilyMembers.length > 0 && (
        <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.amber, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <Layers size={11} /> mold family "{rec.moldFamily}" — สั่งพร้อมกันเป็นเซ็ตกับ: {moldFamilyMembers.join(", ")}
        </div>
      )}
      {rec.batches.length > 0 ? (
        <div style={{ padding: "0 10px 8px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <CalendarX size={11} /> batch breakdown (FEFO order) — usable {rec.usableOnHand} / total {rec.onHand} {rec.unit}
            {rec.expiredQty > 0 && <span style={{ color: COLORS.rust }}>&nbsp;{"·"} {rec.expiredQty} {rec.unit} expired, excluded</span>}
          </div>
          <table style={{ borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, width: "100%", maxWidth: 480 }}>
            <thead>
              <tr style={{ color: COLORS.inkSoft }}>
                <td style={{ padding: "2px 8px 2px 0", textAlign: "left" }}>BATCH</td>
                <td style={{ padding: "2px 8px" }}>QTY</td>
                <td style={{ padding: "2px 8px" }}>EXPIRY</td>
                <td style={{ padding: "2px 0" }}>STATUS</td>
              </tr>
            </thead>
            <tbody>
              {rec.batches.map((b) => (
                <tr key={b.batchNo}>
                  <td style={{ padding: "2px 8px 2px 0", color: COLORS.ink }}>{b.batchNo}</td>
                  <td style={{ padding: "2px 8px" }}>{b.quantity}</td>
                  <td style={{ padding: "2px 8px" }}>{b.expiryDate || "—"}</td>
                  <td style={{ padding: "2px 0" }}>
                    <span style={{
                      fontSize: 9.5, padding: "1px 7px", borderRadius: 999, fontWeight: 600,
                      color: b.expired ? "#fff" : b.expiringSoon ? COLORS.amber : COLORS.moss,
                      background: b.expired ? COLORS.rust : b.expiringSoon ? "#FEF3C7" : "#DCFCE7",
                    }}>{b.expired ? "EXPIRED" : b.expiringSoon ? `${b.weeksToExpiry}w left` : "OK"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {rec.expired && (
            <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.rust, display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarX size={11} /> on-hand ({rec.onHand} {rec.unit}) expired {rec.expiryDate} — excluded from planning, treated as 0
            </div>
          )}
          {!rec.expired && rec.expiringSoon && (
            <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.amber, display: "flex", alignItems: "center", gap: 4 }}>
              <CalendarX size={11} /> expires {rec.expiryDate} — {rec.weeksToExpiry} week{rec.weeksToExpiry === 1 ? "" : "s"} from now
            </div>
          )}
        </>
      )}
      {rec.poPendingDetails.length > 0 && (
        <div style={{ padding: "0 10px 8px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.amber, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <ClipboardList size={11} /> PO pending — {rec.poPendingDetails.reduce((s, p) => s + p.quantity, 0)} {rec.unit} across {rec.poPendingDetails.length} PO{rec.poPendingDetails.length === 1 ? "" : "s"}
          </div>
          <table style={{ borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, width: "100%", maxWidth: 480 }}>
            <thead>
              <tr style={{ color: COLORS.inkSoft }}>
                <td style={{ padding: "2px 8px 2px 0", textAlign: "left" }}>PO #</td>
                <td style={{ padding: "2px 8px", textAlign: "left" }}>VENDOR</td>
                <td style={{ padding: "2px 8px" }}>QTY</td>
                <td style={{ padding: "2px 8px" }}>DUE WK</td>
                <td style={{ padding: "2px 0" }}>DATE (MON)</td>
              </tr>
            </thead>
           <tbody>
  {rec.poPendingDetails.map((p, i) => {
    const origQty = poOriginalQtyMap ? poOriginalQtyMap[`${rec.item}::${p.poNumber}`] : undefined;
    const isQtyOverridden = origQty !== undefined && origQty !== p.quantity;
    const origWeek = poOriginalMap ? poOriginalMap[`${rec.item}::${p.poNumber}`] : undefined;
    const isWeekOverridden = origWeek !== undefined && String(origWeek.week) !== String(p.rawWeek);
    return (
      <tr key={`${p.poNumber}-${i}`}>
        <td style={{ padding: "2px 8px 2px 0", color: COLORS.ink }}>{p.poNumber}</td>
        <td style={{ padding: "2px 8px", color: COLORS.inkSoft }}>{p.vendor || "—"}</td>
                    <td style={{ padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                        {isQtyOverridden && !isReadOnly && (
                          <button onClick={() => onResetPOQty(rec.item, p.poNumber)} title={`reset to original (${origQty})`} style={{
                            border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber,
                            fontSize: 9, padding: 0, lineHeight: 1,
                          }}>&#8635;</button>
                        )}
                        <input type="number" min={0} value={p.quantity} disabled={isReadOnly}
                          onChange={(e) => onAdjustPOQty(rec.item, p.poNumber, e.target.value)}
                          style={{
                            width: 48, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                            border: `1px solid ${isQtyOverridden ? COLORS.amber : COLORS.paperLine}`, background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink, padding: "1px 3px",
                          }} />
                      </div>
                    </td>
              
                     <td style={{ padding: "0 4px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                          {isWeekOverridden && !isReadOnly && (
                            <button onClick={() => onResetPOWeek(rec.item, p.poNumber)} title={`reset to original (${origWeek.week})`} style={{
                              border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber,
                              fontSize: 9, padding: 0, lineHeight: 1,
                            }}>&#8635;</button>
                          )}
                          <input type="text" defaultValue={p.rawWeek} disabled={isReadOnly}
                            onBlur={(e) => onAdjustPOWeek(rec.item, p.poNumber, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            title="e.g. 26CW30 or 3"
                            style={{
                              width: 56, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                              border: `1px solid ${isWeekOverridden ? COLORS.amber : COLORS.paperLine}`, background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink, padding: "1px 3px",
                            }} />
                        </div>
                        {p.outOfHorizon && (
                          <span title="วันครบกำหนดอยู่นอกช่วง horizon/history ที่ตั้งไว้ตอนนี้ — ไม่ถูกนำไปคำนวณ MRP" style={{
                            fontSize: 8.5, padding: "0 5px", color: COLORS.inkSoft, borderRadius: 999,
                            border: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap",
                          }}>OUT OF VIEW</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "2px 0", color: COLORS.inkSoft }}>{p.mondayDate || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ overflowX: "auto", paddingBottom: "12px" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          <thead>
            <tr>
              <td style={{ padding: "6px 10px", color: COLORS.inkSoft, whiteSpace: "nowrap", borderTop: `1px solid ${COLORS.paperLine}` }}>
                WEEK<div style={{ fontSize: 9, fontWeight: 400 }}>(Mon)</div>
              </td>
              {weeks.map((w, i) => (
                <td key={w} style={{
                  textAlign: "right", padding: "6px 8px", color: i < historyWeeks ? "#9AA5B1" : COLORS.inkSoft,
                  borderTop: `1px solid ${COLORS.paperLine}`,
                  borderLeft: i === historyWeeks ? `2px solid ${COLORS.steel}` : `1px solid ${COLORS.paperLine}`,
                  whiteSpace: "nowrap", background: i < historyWeeks ? "#F1F2F6" : "transparent",
                }}>
                  {weekLabels[i]}
                  <div style={{ fontSize: 9, fontWeight: 400, color: "inherit", opacity: 0.85 }}>{weekDates[i]}{i < historyWeeks ? " (past)" : ""}</div>
                </td>
              ))}
              <td style={{
                textAlign: "right", padding: "6px 10px", color: COLORS.ink, fontWeight: 700,
                borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `2px solid ${COLORS.steel}`,
                whiteSpace: "nowrap", background: COLORS.paper,
              }}>
                TOTAL
                <div style={{ fontSize: 9, fontWeight: 400, color: COLORS.inkSoft }}>{weeks.length} wk</div>
              </td>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = r.data.reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);
              return (
              <tr key={r.kind}>
                <td style={{ padding: "6px 10px", color: COLORS.ink, whiteSpace: "nowrap", borderTop: `1px solid ${COLORS.paperLine}` }}>{r.label}</td>
                {r.data.map((v, i) => {
                  let color = COLORS.ink;
                  let bg = "transparent";
                  if (r.kind === "poh" && v < 0) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "poh" && v !== null && v < rec.safety) { bg = "#FEF3C7"; }
                  if (r.kind === "prel" && v > 0 && rec.pastDue[i]) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "prel" && v > 0) { bg = "#E0E7FF"; color = COLORS.steelDeep; }
                  if (r.kind === "po" && v > 0) { bg = "#FEF3C7"; color = COLORS.amber; }
                  if (r.kind === "git" && v > 0) { bg = "#DCFCE7"; color = COLORS.moss; }
                  if (r.kind === "expline" && v > 0) { bg = COLORS.rust; color = "#fff"; }
                  if (r.kind === "consumption" && rec.consumptionFactor !== 1 && v > 0) { bg = "#E0E7FF"; color = COLORS.steelDeep; }
                  if (r.kind === "actual" && v > 0) { bg = "#EDE9FE"; color = "#6D28D9"; }
                  if (r.kind === "ssline" && v !== null) {
                    // แดง: stock ต่ำกว่า safety stock ของ item นั้นเอง
                    // เหลือง: ยังไม่ต่ำกว่า SS แต่ buffer ที่เหลือ (stock - SS) น้อยกว่าอัตราเบิกใช้เฉลี่ย 1 สัปดาห์ (Past AVG) — ใกล้ทะลุ SS ภายในไม่ถึง 1 สัปดาห์
                    if (v < 0) { bg = COLORS.rust; color = "#fff"; }
                    else if (rec.pastActualAvg > 0 && v < rec.pastActualAvg) { bg = "#FEF3C7"; color = COLORS.amber; }
                    else { bg = "#DCFCE7"; color = COLORS.moss; }
                  }
                  if (r.kind === "ltline") { bg = "transparent"; color = COLORS.steel; }
                  
                  // Variance Rendering
                  if (r.kind === "variance" && v !== null) {
                    if (v === 0 && rec.grossReq[i] === 0 && rec.actualConsumption[i] === 0) {
                      bg = "transparent"; color = COLORS.inkSoft; 
                    } else if (Math.abs(v) < 0.5) { 
                      bg = "#DCFCE7"; color = COLORS.moss; 
                    } else if (v > 0) { 
                      bg = "#FEF3C7"; color = COLORS.amber; 
                    } else { 
                      bg = "#FEE2E2"; color = COLORS.rust; 
                    }
                  }

                  const isOverriddenPrel = r.kind === "prel" && planOverrides && planOverrides[`${rec.item}::${i}`] !== undefined;
                  const isOverriddenPor = r.kind === "por" && receiptOverrides && receiptOverrides[`${rec.item}::${i}`] !== undefined;
                  const isOverridden = isOverriddenPrel || isOverriddenPor;

                  const isPast = i < historyWeeks;
                  const isEditablePrel = r.kind === "prel" && !isPast;
                  const isEditablePor = r.kind === "por" && !isPast;
                  const isEditable = isEditablePrel || isEditablePor;
                  
                  let displayVal = "";
                  if (isEditable) {
                    displayVal = isOverridden ? v : (v ? Math.round(v) : "");
                  }

                  const onAdjust = r.kind === "prel" ? onAdjustPlan : onAdjustReceipt;
                  const onReset = r.kind === "prel" ? onResetPlanOverride : onResetReceiptOverride;
                  const tooltipMsg = r.kind === "prel" 
                    ? `LT = ${rec.leadTime} wk → Arrives: ${i + rec.leadTime < weeks.length ? weekLabels[i + rec.leadTime] : "Out of horizon"}`
                    : `Receipt in ${weekLabels[i]} → Pushes On-Hand up`;

                return (
                    <td key={i} style={{
                      textAlign: "right", padding: isEditable ? "3px 4px" : "6px 8px", borderTop: `1px solid ${COLORS.paperLine}`,
                      borderLeft: i === historyWeeks ? `2px solid ${COLORS.steel}` : `1px solid ${COLORS.paperLine}`,
                      color, background: isPast && bg === "transparent" ? "#F1F2F6" : bg,
                      outline: isOverridden ? `2px solid ${COLORS.amber}` : "none", outlineOffset: "-2px",
                    }}>
                      {isEditable ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                            {isOverridden && !isReadOnly && (
                              <button onClick={() => onReset(rec.item, i)} title="reset to calculated value" style={{
                                border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber,
                                fontSize: 9, padding: 0, lineHeight: 1,
                              }}>&#8635;</button>
                            )}
                            <input
                              type="number" min={0}
                              value={displayVal}
                              placeholder="—"
                              title={tooltipMsg}
                              disabled={isReadOnly}
                              onChange={(e) => onAdjust(rec.item, i, e.target.value)}
                              style={{
                                width: 42, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                                border: "none", background: "transparent", color, padding: "3px 2px",
                              }}
                            />
                          </div>
                          {displayVal !== "" && (
                            <input
                              type="text"
                              value={draftRefs[`${rec.item}::${i}::${r.kind}`] || ""}
                              placeholder={r.kind === "prel" ? "PR#" : "PO#"}
                              title={r.kind === "prel" ? "เลขที่ Draft PR (กรอกเองถ้าระบบยังไม่ได้ดึงมา)" : "เลขที่ Draft PO (กรอกเองถ้าระบบยังไม่ได้ดึงมา)"}
                              disabled={isReadOnly}
                              onChange={(e) => onAdjustDraftRef(rec.item, i, r.kind, e.target.value)}
                              style={{
                                width: 44, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                                border: `1px solid ${COLORS.paperLine}`, borderRadius: 4, background: isReadOnly ? "transparent" : "#fff",
                                color: COLORS.steel, padding: "1px 3px",
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        v === null || v === undefined ? "—" : (r.kind === "variance" ? (
                          (() => {
                            const plan = rec.grossReq[i];
                            const act = rec.actualConsumption[i];
                            if (plan === 0 && act === 0) return "0";
                            
                            const invertedV = plan - act;
                            let pctStr = "";
                            if (plan === 0 && act > 0) {
                              pctStr = "-∞%"; 
                            } else {
                              const pct = (invertedV / plan) * 100;
                              pctStr = pct > 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
                            }
                            const qtyStr = invertedV > 0 ? `+${Math.round(invertedV)}` : Math.round(invertedV);
                            
                            return (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", lineHeight: "1.1" }}>
                                <span>{qtyStr}</span>
                                <span style={{ fontSize: 9, opacity: 0.8, fontWeight: 500 }}>{pctStr}</span>
                              </div>
                            );
                          })()
                        ) : ((r.kind === "ssline" || r.kind === "poh") ? Math.round(v) : (v ? Math.round(v) : "—")))
                      )}
                    </td>
                  );
                })}
                <td style={{
                  textAlign: "right", padding: "6px 10px", fontWeight: 700, color: COLORS.ink,
                  borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `2px solid ${COLORS.steel}`,
                  background: COLORS.paper, whiteSpace: "nowrap",
                }}>
                  {r.kind === "ssline" || r.kind === "ltline" ? "—" : Math.round(total).toLocaleString()}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", bg: "#E0E7FF", color: COLORS.steelDeep },
  { value: "released", label: "Released to buyer", bg: "#FEF3C7", color: COLORS.amber },
  { value: "ordered", label: "PO placed", bg: "#DCFCE7", color: COLORS.moss },
  { value: "received", label: "Received", bg: "#EDE9FE", color: "#6D28D9" },
];

function PlannedOrders({ records, weeks, weekLabels, orderStatus, setOrderStatus, selectedItem, isReadOnly }) {
  const [hideReceived, setHideReceived] = useState(false);
  const [onlySelected, setOnlySelected] = useState(true);
  const rows = [];
  Object.values(records).forEach((rec) => {
    rec.plannedRelease.forEach((v, i) => {
      if (v > 0) {
        const receiptIdx = Math.min(i + rec.leadTime, weekLabels.length - 1);
        const key = `${rec.item}::${weekLabels[i]}`;
        rows.push({
          key, item: rec.item, unit: rec.unit, releaseIdx: i, releaseWeek: weekLabels[i], receiptWeek: weekLabels[receiptIdx],
          qty: Math.round(v), pastDue: rec.pastDue[i], leadTime: rec.leadTime,
        });
      }
    });
  });
  rows.sort((a, b) => a.releaseIdx - b.releaseIdx);

  // เช็คว่า item ในเซ็ต mold family เดียวกัน มีแผน planned release คนละสัปดาห์ไหม — ถ้าใช่ เตือนให้รวมสั่งพร้อมกัน
  const familyMisalignment = [];
  {
    const byFamily = {};
    rows.forEach((r) => {
      const fam = records[r.item] && records[r.item].moldFamily;
      if (!fam) return;
      byFamily[fam] = byFamily[fam] || {};
      byFamily[fam][r.releaseWeek] = byFamily[fam][r.releaseWeek] || new Set();
      byFamily[fam][r.releaseWeek].add(r.item);
    });
    Object.entries(byFamily).forEach(([fam, byWeek]) => {
      const weeksList = Object.keys(byWeek);
      if (weeksList.length > 1) {
        familyMisalignment.push({
          fam,
          detail: weeksList.map((w) => `${w}: ${Array.from(byWeek[w]).join(", ")}`).join(" · "),
        });
      }
    });
  }

  const getEntry = (key) => orderStatus[key] || { status: "pending", poNumber: "" };
  const updateEntry = (key, patch) => {
    setOrderStatus((prev) => ({ ...prev, [key]: { ...getEntry(key), ...patch } }));
  };

  const scopedRows = onlySelected && selectedItem ? rows.filter((r) => r.item === selectedItem) : rows;
  const visibleRows = hideReceived ? scopedRows.filter((r) => getEntry(r.key).status !== "received") : scopedRows;
  const counts = scopedRows.reduce((acc, r) => {
    const s = getEntry(r.key).status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const exportCSV = () => {
    const data = scopedRows.map((r) => ({
      item: r.item, description: records[r.item].description, unit: r.unit,
      release_week: r.releaseWeek, due_week: r.receiptWeek, quantity: r.qty,
      lead_time_weeks: r.leadTime, past_due: r.pastDue ? "yes" : "no",
      status: getEntry(r.key).status, po_number: getEntry(r.key).poNumber || "",
    }));
    downloadCSV(`order_plan_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  return (
    <div style={{ border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px",
        borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 6,
      }}>
        <span style={{
          display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: COLORS.ink, textTransform: "uppercase",
        }}>
          <ClipboardList size={14} color={COLORS.steel} /> Order Planning ({scopedRows.length})
          {onlySelected && selectedItem && (
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, textTransform: "none",
              color: COLORS.steel, background: "#E0E7FF", border: `1px solid ${COLORS.steel}`, padding: "1px 8px", borderRadius: 999,
            }}>{selectedItem}</span>
          )}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft,
          }}>
            <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} style={{ margin: 0 }} />
            selected item only
          </label>
          <label style={{
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft,
          }}>
            <input type="checkbox" checked={hideReceived} onChange={(e) => setHideReceived(e.target.checked)} style={{ margin: 0 }} />
            hide received
          </label>
          <button onClick={exportCSV} style={{
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel,
            border: `1px solid ${COLORS.steel}`, background: "transparent", padding: "3px 8px", borderRadius: COLORS.radiusSm,
          }}><Download size={11} /> export order plan</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "6px 12px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.filter((s) => !onlySelected || (counts[s.value] || 0) > 0).map((s) => (
          <span key={s.value} style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: s.color,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: s.bg, border: `1px solid ${s.color}`, display: "inline-block" }} />
            {s.label}: {counts[s.value] || 0}
          </span>
        ))}
      </div>
      {familyMisalignment.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "8px 12px", borderBottom: `1px solid ${COLORS.paperLine}`, background: "#FEF3C7" }}>
          {familyMisalignment.map((f) => (
            <div key={f.fam} style={{ display: "flex", alignItems: "flex-start", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#92400E" }}>
              <Layers size={12} style={{ marginTop: 1, flexShrink: 0 }} />
              <span><b>mold family "{f.fam}"</b> มีแผนสั่งคนละสัปดาห์ — พิจารณารวมสั่งพร้อมกัน: {f.detail}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: COLORS.inkSoft }}>
              {["RELEASE WK", "ITEM", "QTY", "UNIT", "DUE WK", "STATUS", "PO #"].map((h) => (
                <td key={h} style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: h === "ITEM" ? "left" : "right" }}>{h}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const entry = getEntry(r.key);
              const statusMeta = STATUS_OPTIONS.find((s) => s.value === entry.status) || STATUS_OPTIONS[0];
              return (
                <tr key={r.key}>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>
                    {r.releaseWeek}{r.pastDue && (
                      <span style={{ marginLeft: 4, fontSize: 9, color: "#fff", background: COLORS.rust, borderRadius: 999, padding: "1px 6px", fontWeight: 600 }}>LATE</span>
                    )}
                  </td>
                  <td style={{ padding: "5px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.ink }}>{r.item}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>{r.qty}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft }}>{r.unit}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>{r.receiptWeek}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>
                    <select value={entry.status} disabled={isReadOnly} onChange={(e) => updateEntry(r.key, { status: e.target.value })} style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 8px", fontWeight: 600,
                      background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.color}`,
                      borderRadius: 999, cursor: isReadOnly ? "default" : "pointer",
                    }}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>
                    <input type="text" value={entry.poNumber} placeholder="TPO####" disabled={isReadOnly}
                      onChange={(e) => updateEntry(r.key, { poNumber: e.target.value })}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, width: 78, textAlign: "right",
                        border: `1px solid ${COLORS.paperLine}`, padding: "2px 4px", background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink, borderRadius: COLORS.radiusSm,
                      }} />
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 14, textAlign: "center", color: COLORS.inkSoft }}>
                {scopedRows.length === 0 ? (onlySelected && selectedItem ? `No planned orders for ${selectedItem} in this horizon.` : "No planned orders in this horizon.") : "All planned orders are marked received."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MRPDashboardInner({ role, onLogout }) {
  const [bom, setBom] = useState(SAMPLE_BOM);
  const [inventory, setInventory] = useState(SAMPLE_INVENTORY);
  const [demand, setDemand] = useState(SAMPLE_DEMAND);
  const [scheduledReceiptsPO, setScheduledReceiptsPO] = useState(SAMPLE_PO_PENDING);
  const [scheduledReceiptsPOOriginal, setScheduledReceiptsPOOriginal] = useState(SAMPLE_PO_PENDING);
  const [scheduledReceiptsGIT, setScheduledReceiptsGIT] = useState(SAMPLE_GIT);
  const [actualConsumption, setActualConsumption] = useState(SAMPLE_ACTUAL_CONSUMPTION);
  const [batches, setBatches] = useState(SAMPLE_BATCHES);
  const [orderStatus, setOrderStatus] = useState({});
  const [horizon, setHorizon] = useState(12);
  const [historyWeeks, setHistoryWeeks] = useState(4);
  const [planOverrides, setPlanOverrides] = useState({});
  const [receiptOverrides, setReceiptOverrides] = useState({});
  const [draftRefs, setDraftRefs] = useState({}); // เลขที่ PR/PO ฉบับร่างที่พิมพ์เอง กรณีระบบยังไม่ได้ดึงมาให้อัตโนมัติ
  const [selected, setSelected] = useState("BIKE-100");
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 800);
  const isReadOnly = role !== "admin"; // สิทธิ์แก้ไขได้เฉพาะ admin เท่านั้น มาจาก session ที่ login ไว้
  const [mobileTab, setMobileTab] = useState("items"); // "items" | "details" — ใช้เฉพาะจอมือถือ
  const [uploadsOpen, setUploadsOpen] = useState(() => !(typeof window !== "undefined" && window.innerWidth < 800));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [onlyWithOrders, setOnlyWithOrders] = useState(false);
  const [viewMode, setViewMode] = useState("assembly");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBOM, setShowBOM] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]); // [{role: "user"|"assistant", content}]
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [bomFilter, setBomFilter] = useState("");
  const [coverageFilter, setCoverageFilter] = useState("");
  const [coverageProjectFilter, setCoverageProjectFilter] = useState("");
  const [showCoverage, setShowCoverage] = useState(false);
  const [bomProjectFilter, setBomProjectFilter] = useState("");
  const [forceOpen, setForceOpen] = useState({ value: null, key: 0 });
  
  useEffect(() => {
    if (onlyWithOrders) setForceOpen({ value: true, key: Date.now() });
  }, [onlyWithOrders]);
  
  const [loadedFlags, setLoadedFlags] = useState({ bom: false, inventory: false, demand: false, poPending: false, git: false, actualConsumption: false, batches: false });
  const [hydrated, setHydrated] = useState(false);
const [hydrating, setHydrating] = useState(true);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [poOverrides, setPoOverrides] = useState({});

  // ---------------------------------------------------------
  // โหลดค่าที่เคยบันทึกไว้กลับมา (order status, ค่าที่ปรับเอง, horizon, PO pending ที่แก้เอง)
  // ---------------------------------------------------------
  useEffect(() => {
    (async () => {
      const [savedOrderStatus, savedPlanOverrides, savedReceiptOverrides, savedHorizon, savedHistoryWeeks, savedPoOverrides, savedDraftRefs] = await Promise.all([
        storageGet("orderStatus"),
        storageGet("planOverrides"),
        storageGet("receiptOverrides"),
        storageGet("horizon"),
        storageGet("historyWeeks"),
        storageGet("poOverrides"),
        storageGet("draftRefs"),
      ]);
      if (savedOrderStatus) setOrderStatus(savedOrderStatus);
      if (savedPlanOverrides) setPlanOverrides(savedPlanOverrides);
      if (savedReceiptOverrides) setReceiptOverrides(savedReceiptOverrides);
      if (savedHorizon !== null && savedHorizon !== undefined) setHorizon(savedHorizon);
      if (savedHistoryWeeks !== null && savedHistoryWeeks !== undefined) setHistoryWeeks(savedHistoryWeeks);
      if (savedPoOverrides) setPoOverrides(savedPoOverrides);
      if (savedDraftRefs) setDraftRefs(savedDraftRefs);
      setSettingsLoaded(true);
    })();
  }, []);

  // บันทึกอัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง (รอให้โหลดค่าเก่าเสร็จก่อน กันเขียนทับด้วยค่าว่างตอนเปิดหน้า)
  useEffect(() => { if (settingsLoaded) storageSet("orderStatus", orderStatus); }, [orderStatus, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("planOverrides", planOverrides); }, [planOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("receiptOverrides", receiptOverrides); }, [receiptOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("horizon", horizon); }, [horizon, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("historyWeeks", historyWeeks); }, [historyWeeks, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("poOverrides", poOverrides); }, [poOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("draftRefs", draftRefs); }, [draftRefs, settingsLoaded]);

  // ผสานค่า PO pending ที่ผู้ใช้แก้เอง (poOverrides) เข้ากับข้อมูลต้นฉบับที่ดึงมาจาก SharePoint เสมอ
  // ทำให้ต่อให้ดึงข้อมูลใหม่ (ตอนโหลดหน้า/รีเฟรช) ค่าที่เคยแก้ไว้ก็จะยังถูกทับกลับเข้าไปให้อัตโนมัติ
  useEffect(() => {
    setScheduledReceiptsPO(applyPoOverrides(scheduledReceiptsPOOriginal, poOverrides));
  }, [scheduledReceiptsPOOriginal, poOverrides]);

  const adjustDraftRef = (item, weekIndex, kind, rawValue) => {
    const key = `${item}::${weekIndex}::${kind}`;
    setDraftRefs((prev) => {
      const next = { ...prev };
      if (!rawValue || !rawValue.trim()) { delete next[key]; return next; }
      next[key] = rawValue;
      return next;
    });
  };

  const clearSavedSettings = async () => {
    await storageClearAll(["orderStatus", "planOverrides", "receiptOverrides", "horizon", "historyWeeks", "poOverrides", "draftRefs"]);
    setOrderStatus({});
    setPlanOverrides({});
    setReceiptOverrides({});
    setDraftRefs({});
    setHorizon(12);
    setHistoryWeeks(4);
    setPoOverrides({});
  };

  // ---------------------------------------------------------
  // ดึงข้อมูลจาก SharePoint (แบบต่อคิว ป้องกัน Server บล็อก)
  // ---------------------------------------------------------
  useEffect(() => {
    const PA_BASE_URL = "https://defaultb0a451413bd9434690304b8b30ca77.f2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/98efa377cbb84f8f92a8cecf69d97cf9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GYjaw1ng23DOassgX6tsKKM2JEA88g_dSH7pun4kOw8";

    const fetchAndParse = async (filename, stateSetters, flagKey) => {
      try {
        const response = await fetch(`${PA_BASE_URL}&filename=${filename}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            // รองรับการนำข้อมูลไปใส่ State หลายๆ ตัวพร้อมกัน จากการดึงแค่รอบเดียว
            if (Array.isArray(stateSetters)) {
              stateSetters.forEach(setter => setter(res.data));
            } else {
              stateSetters(res.data);
            }
            setLoadedFlags((f) => ({ ...f, [flagKey]: true }));
          }
        });
      } catch (error) {
        console.error(`Error fetching ${filename}:`, error);
      }
    };

    const loadAllData = async () => {
      // 🔑 ใส่ await ข้างหน้า เพื่อบังคับให้โหลดเสร็จทีละไฟล์ ค่อยโหลดไฟล์ต่อไป
      await fetchAndParse("bom", setBom, "bom");
      await fetchAndParse("Onhand", setInventory, "inventory");
      await fetchAndParse("Demand Schedule", setDemand, "demand");
      await fetchAndParse("Actual Consumption", setActualConsumption, "actualConsumption");
      await fetchAndParse("Expired", setBatches, "batches");
      
      // 🎯 สำหรับ PO Pending: ดึงแค่ "ครั้งเดียว" แล้วแบ่งข้อมูลให้ทั้ง State ปกติ และ Original
      await fetchAndParse("Pending", [setScheduledReceiptsPOOriginal, setScheduledReceiptsPO], "poPending");
      
      await fetchAndParse("GIT", setScheduledReceiptsGIT, "git");

      // โหลดครบทุกไฟล์แล้ว ค่อยปิดสถานะจอโหลด
      setHydrating(false);
      setHydrated(true);
    };

    loadAllData();

  }, []);

  const handleSelectItem = (item) => {
    setSelected(item);
    if (isMobile) setMobileTab("details");
  };

  const handleFile = useCallback((key, setter) => (file) => {
    parseCSV(file, (rows) => {
      setter(rows);
      setLoadedFlags((f) => ({ ...f, [key]: true }));
    });
  }, []);

  const handlePoPendingFile = useCallback((file) => {
    parseCSV(file, (rows) => {
      setScheduledReceiptsPO(rows);
      setScheduledReceiptsPOOriginal(rows);
      setLoadedFlags((f) => ({ ...f, poPending: true }));
    });
  }, []);

  const { weeks, weekLabels, weekDates, weekMondayDates, records, order, childrenOf, warnings } = useMemo(
    () => runMRP({ bom, inventory, demand, poPending: scheduledReceiptsPO, git: scheduledReceiptsGIT, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides }),
    [bom, inventory, demand, scheduledReceiptsPO, scheduledReceiptsGIT, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides]
  );

  const adjustPlan = (item, weekIndex, rawValue) => {
    const key = `${item}::${weekIndex}`;
    setPlanOverrides((prev) => {
      const next = { ...prev };
      if (rawValue === "" || rawValue === null) { delete next[key]; return next; }
      const n = Number(rawValue);
      if (!Number.isFinite(n) || n < 0) return prev;
      next[key] = n;
      return next;
    });
  };
  const resetPlanOverride = (item, weekIndex) => {
    const key = `${item}::${weekIndex}`;
    setPlanOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const adjustReceipt = (item, weekIndex, rawValue) => {
    const key = `${item}::${weekIndex}`;
    setReceiptOverrides((prev) => {
      const next = { ...prev };
      if (rawValue === "" || rawValue === null) { delete next[key]; return next; }
      const n = Number(rawValue);
      if (!Number.isFinite(n) || n < 0) return prev;
      next[key] = n;
      return next;
    });
  };
  const resetReceiptOverride = (item, weekIndex) => {
    const key = `${item}::${weekIndex}`;
    setReceiptOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const adjustPOQty = (item, poNumber, rawValue) => {
    const n = Number(rawValue);
    if (!Number.isFinite(n) || n < 0) return;
    const key = `${item}::${poNumber}`;
    setPoOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), quantity: n } }));
  };

  const poOriginalMap = useMemo(() => {
    const map = {};
    scheduledReceiptsPOOriginal.forEach((r) => {
      const rPo = getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"], ["po", "ref", "doc"]) || "?";
      map[`${r.item}::${rPo}`] = { quantity: toNum(r.quantity), week: r.week };
    });
    return map;
  }, [scheduledReceiptsPOOriginal]);
  const poOriginalQtyMap = useMemo(() => {
    const map = {};
    Object.entries(poOriginalMap).forEach(([k, v]) => { map[k] = v.quantity; });
    return map;
  }, [poOriginalMap]);

  const adjustPOWeek = (item, poNumber, rawValue) => {
    if (!String(rawValue).trim()) return;
    const key = `${item}::${poNumber}`;
    setPoOverrides((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), week: rawValue } }));
  };
  const resetPOWeek = (item, poNumber) => {
    const key = `${item}::${poNumber}`;
    setPoOverrides((prev) => {
      if (!prev[key] || prev[key].week === undefined) return prev;
      const next = { ...prev };
      const entry = { ...next[key] };
      delete entry.week;
      if (Object.keys(entry).length === 0) delete next[key]; else next[key] = entry;
      return next;
    });
  };

  const resetPOQty = (item, poNumber) => {
    const key = `${item}::${poNumber}`;
    setPoOverrides((prev) => {
      if (!prev[key] || prev[key].quantity === undefined) return prev;
      const next = { ...prev };
      const entry = { ...next[key] };
      delete entry.quantity;
      if (Object.keys(entry).length === 0) delete next[key]; else next[key] = entry;
      return next;
    });
  };

  const exportPowerBI = () => {
    const runDate = new Date().toISOString().slice(0, 10);

    // 1) Weekly time series: stock / consumption / receiving ต่อ item ต่อสัปดาห์ (tidy format สำหรับ Power BI)
    //    รวมข้อมูลที่ผู้ใช้กรอก/ปรับเองด้วย: override, draft PR/PO, order status
    const weeklyRows = [];
    order.forEach((item) => {
      const rec = records[item];
      weeks.forEach((w, i) => {
        const releaseWeekLabel = weekLabels[i];
        const statusEntry = orderStatus[`${item}::${releaseWeekLabel}`];
        weeklyRows.push({
          item: rec.item,
          description: rec.description,
          unit: rec.unit,
          vendor: rec.vendor,
          mold_family: rec.moldFamily || "",
          level: rec.level,
          is_history: i < historyWeeks ? "yes" : "no",
          week_index: i,
          week_label: weekLabels[i],
          week_date: weekDates[i],
          week_monday_date: weekMondayDates[i],
          gross_requirement: rec.grossReq[i] ?? 0,
          consumption_planned: rec.consumption[i] ?? 0,
          actual_consumption: rec.actualConsumption[i] ?? 0,
          consumption_variance: rec.consumptionVariance[i] ?? "",
          po_pending_qty: rec.poPending[i] ?? 0,
          git_qty: rec.git[i] ?? 0,
          expired_qty: rec.expiredByWeek[i] ?? 0,
          projected_on_hand: rec.projOnHand[i] ?? "",
          safety_stock_target: rec.safety,
          safety_stock_remaining: rec.projOnHand[i] !== null && rec.projOnHand[i] !== undefined ? rec.projOnHand[i] - rec.safety : "",
          net_requirement: rec.netReq[i] ?? "",
          planned_order_receipt: rec.plannedReceipt[i] ?? "",
          planned_order_receipt_overridden: (receiptOverrides[`${item}::${i}`] !== undefined) ? "yes" : "no",
          planned_order_release: rec.plannedRelease[i] ?? "",
          planned_order_release_overridden: (planOverrides[`${item}::${i}`] !== undefined) ? "yes" : "no",
          draft_pr_number: draftRefs[`${item}::${i}::prel`] || "",
          draft_po_number: draftRefs[`${item}::${i}::por`] || "",
          order_status: statusEntry ? statusEntry.status : "",
          order_status_po_number: statusEntry ? (statusEntry.poNumber || "") : "",
          lead_time_weeks: rec.leadTime,
          lot_size: rec.lotSize,
          unit_price: rec.unitPrice,
        });
      });
    });
    downloadCSV(`powerbi_weekly_${runDate}.csv`, weeklyRows);

    // 2) Stock snapshot: สต็อกปัจจุบันต่อ item ณ วันที่รัน
    const stockRows = order.map((item) => {
      const rec = records[item];
      return {
        item: rec.item,
        description: rec.description,
        unit: rec.unit,
        vendor: rec.vendor,
        mold_family: rec.moldFamily || "",
        on_hand_usable: rec.usableOnHand,
        on_hand_total: rec.onHand,
        expired_qty: rec.expiredQty,
        safety_stock_base: rec.baseSafety,
        safety_factor: rec.safetyFactor,
        safety_stock_effective: rec.safety,
        lead_time_weeks: rec.leadTime,
        lot_size: rec.lotSize,
        unit_price: rec.unitPrice,
        on_hand_usable_value: rec.usableValue,
        expired_value: rec.expiredValue,
        batch_count: rec.batches.length,
        nearest_expiry_date: rec.expiryDate || "",
        expired: rec.expired ? "yes" : "no",
        expiring_soon: rec.expiringSoon ? "yes" : "no",
        run_date: runDate,
      };
    });
    downloadCSV(`powerbi_stock_${runDate}.csv`, stockRows);

    // 3) PO outstanding: รายการ PO pending ทุกใบ (รวมที่อยู่นอกช่วง horizon ด้วย) + ค่าที่แก้เอง (poOverrides)
    const poRows = [];
    order.forEach((item) => {
      const rec = records[item];
      (rec.poPendingDetails || []).forEach((p) => {
        const overrideKey = `${item}::${p.poNumber}`;
        const ov = poOverrides[overrideKey];
        poRows.push({
          item: rec.item,
          description: rec.description,
          unit: rec.unit,
          po_number: p.poNumber,
          vendor: p.vendor,
          quantity: p.quantity,
          due_week: p.weekLabel,
          due_monday_date: p.mondayDate,
          within_current_horizon: p.outOfHorizon ? "no" : "yes",
          qty_manually_edited: ov && ov.quantity !== undefined ? "yes" : "no",
          due_week_manually_edited: ov && ov.week !== undefined ? "yes" : "no",
          run_date: runDate,
        });
      });
    });
    downloadCSV(`powerbi_po_outstanding_${runDate}.csv`, poRows);

    // 4) Order Planning: สถานะที่ผู้ใช้ update เอง (Pending/Released/PO placed/Received) + เลข PO ที่กรอก
    const orderPlanningRows = [];
    order.forEach((item) => {
      const rec = records[item];
      rec.plannedRelease.forEach((v, i) => {
        if (v > 0) {
          const releaseWeekLabel = weekLabels[i];
          const receiptIdx = Math.min(i + rec.leadTime, weekLabels.length - 1);
          const statusEntry = orderStatus[`${item}::${releaseWeekLabel}`] || { status: "pending", poNumber: "" };
          orderPlanningRows.push({
            item: rec.item,
            description: rec.description,
            unit: rec.unit,
            vendor: rec.vendor,
            mold_family: rec.moldFamily || "",
            release_week: releaseWeekLabel,
            due_week: weekLabels[receiptIdx],
            quantity: Math.round(v),
            lead_time_weeks: rec.leadTime,
            past_due: rec.pastDue[i] ? "yes" : "no",
            status: statusEntry.status,
            po_number: statusEntry.poNumber || "",
            draft_pr_number: draftRefs[`${item}::${i}::prel`] || "",
            run_date: runDate,
          });
        }
      });
    });
    downloadCSV(`powerbi_order_planning_${runDate}.csv`, orderPlanningRows);
  };

  const poPendingHeaderWarning = useMemo(() => {
    if (!scheduledReceiptsPO.length) return null;
    const headers = Object.keys(scheduledReceiptsPO[0]);
    const strictCands = ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"];
    const fallbackSubs = ["po", "ref", "doc"];
    const exclude = new Set(["item", "week", "quantity", "qty", "status"]);
    const matched = headers.some((h) => {
      const norm = h.toLowerCase().replace(/[\s_\-#.()]/g, "");
      if (exclude.has(norm)) return false;
      return strictCands.includes(norm) || fallbackSubs.some((s) => norm.includes(s));
    });
    return matched ? null : headers;
  }, [scheduledReceiptsPO]);

  const vendorGroups = useMemo(() => {
    const map = {};
    order.forEach((it) => {
      const v = records[it].vendor || "Unassigned";
      map[v] = map[v] || [];
      map[v].push(it);
    });
    const vendors = Object.keys(map).sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b);
    });
    return vendors.map((v) => ({ vendor: v, items: map[v].sort() }));
  }, [order, records]);

  // กลุ่ม item ตาม mold family — ใช้ตอนสั่งซื้อจะได้ซื้อทั้งเซ็ตพร้อมกัน (แสดงเฉพาะ item ที่ระบุ mold_family ไว้)
  const moldFamilyMap = useMemo(() => {
    const map = {};
    order.forEach((it) => {
      const mf = records[it].moldFamily;
      if (!mf) return;
      map[mf] = map[mf] || [];
      map[mf].push(it);
    });
    Object.values(map).forEach((list) => list.sort());
    return map;
  }, [order, records]);

  const moldFamilyGroups = useMemo(() => {
    return Object.keys(moldFamilyMap).sort().map((f) => ({ vendor: f, items: moldFamilyMap[f] }));
  }, [moldFamilyMap]);

  const topItems = useMemo(() => order.filter((it) => !records[it].hasParents), [order, records]);

  // กรุ๊ป FG (top-level item) ตาม project — project = 3 ตัวแรกของรหัส FG เช่น G8X-011-102 -> G8X
  const projectGroups = useMemo(() => {
    const map = {};
    topItems.forEach((it) => {
      if (!isProjectCode(it)) return; // ข้าม raw material ที่ขึ้นต้นด้วยตัวเลข (เช่น 140, 240)
      const code = it.slice(0, 3).toUpperCase();
      map[code] = map[code] || [];
      map[code].push(it);
    });
    return Object.keys(map).sort().map((p) => ({ project: p, items: map[p].sort() }));
  }, [topItems]);

  // ไล่ BOM ลงจาก FG แต่ละ project เพื่อรู้ว่า item ไหน (รวม raw material) อยู่ใน project ไหนบ้าง
  // item ที่ใช้ร่วมกันหลาย project จะติดแท็กได้มากกว่า 1 project
  const itemProjectsMap = useMemo(() => {
    const map = {};
    topItems.forEach((it) => {
      if (!isProjectCode(it)) return;
      const project = it.slice(0, 3).toUpperCase();
      const visited = new Set();
      const stack = [it];
      while (stack.length > 0) {
        const cur = stack.pop();
        if (visited.has(cur)) continue;
        visited.add(cur);
        if (!map[cur]) map[cur] = new Set();
        map[cur].add(project);
        (childrenOf[cur] || []).forEach((k) => stack.push(k.component));
      }
    });
    return map;
  }, [topItems, childrenOf]);

  const coverageProjectOptions = useMemo(() => {
    const set = new Set();
    Object.values(itemProjectsMap).forEach((projSet) => projSet.forEach((p) => set.add(p)));
    return Array.from(set).sort();
  }, [itemProjectsMap]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return order.filter((it) => {
      const rec = records[it];
      return (
        it.toLowerCase().includes(q) ||
        (rec.description || "").toLowerCase().includes(q) ||
        (rec.vendor || "").toLowerCase().includes(q)
      );
    });
  }, [searchQuery, order, records]);

  // BOM แบบระเบิดครบ (parent -> component) พร้อมข้อมูลเสริมจาก records สำหรับหน้า BOM / export
  const bomRows = useMemo(() => {
    const rows = [];
    Object.entries(childrenOf).forEach(([parent, kids]) => {
      const prec = records[parent];
      kids.forEach(({ component, qty_per }) => {
        const crec = records[component];
        rows.push({
          project: isProjectCode(parent) ? parent.slice(0, 3).toUpperCase() : "",
          parent_item: parent,
          parent_description: prec ? prec.description : "",
          parent_level: prec ? prec.level : "",
          component_item: component,
          component_description: crec ? crec.description : "",
          qty_per,
          component_unit: crec ? crec.unit : "",
          component_vendor: crec ? crec.vendor : "",
          component_lead_time_weeks: crec ? crec.leadTime : "",
          component_lot_size: crec ? crec.lotSize : "",
          component_mold_family: crec ? (crec.moldFamily || "") : "",
        });
      });
    });
    return rows.sort((a, b) => a.parent_item.localeCompare(b.parent_item) || a.component_item.localeCompare(b.component_item));
  }, [childrenOf, records]);

  const bomProjectOptions = useMemo(() => Array.from(new Set(bomRows.map((r) => r.project))).filter(Boolean).sort(), [bomRows]);

  const bomRowsFiltered = useMemo(() => {
    const q = bomFilter.trim().toLowerCase();
    return bomRows.filter((r) => {
      if (bomProjectFilter && r.project !== bomProjectFilter) return false;
      if (!q) return true;
      return (
        r.parent_item.toLowerCase().includes(q) ||
        r.component_item.toLowerCase().includes(q) ||
        (r.parent_description || "").toLowerCase().includes(q) ||
        (r.component_description || "").toLowerCase().includes(q) ||
        (r.component_vendor || "").toLowerCase().includes(q)
      );
    });
  }, [bomRows, bomFilter, bomProjectFilter]);

  const exportBOM = () => {
    const suffix = bomProjectFilter ? `_${bomProjectFilter}` : "";
    downloadCSV(`bom_export${suffix}_${new Date().toISOString().slice(0, 10)}.csv`, bomRowsFiltered);
  };

  // Stock coverage: on-hand หารด้วยอัตราเบิกใช้เฉลี่ยต่อสัปดาห์ (Past AVG) = จะอยู่ได้กี่สัปดาห์
  // coverage_weeks = null หมายถึงไม่มีข้อมูล consumption ในอดีตให้เทียบ (หารด้วย 0 ไม่ได้)
  const coverageRows = useMemo(() => {
    const rows = order.map((item) => {
      const rec = records[item];
      const avg = rec.pastActualAvg;
      const coverageWeeks = avg > 0 ? rec.usableOnHand / avg : null;
      return {
        item,
        description: rec.description,
        unit: rec.unit,
        vendor: rec.vendor,
        on_hand_usable: rec.usableOnHand,
        avg_weekly_consumption: avg,
        lead_time_weeks: rec.leadTime,
        coverage_weeks: coverageWeeks,
      };
    });
    return rows.sort((a, b) => {
      if (a.coverage_weeks === null && b.coverage_weeks === null) return a.item.localeCompare(b.item);
      if (a.coverage_weeks === null) return 1;
      if (b.coverage_weeks === null) return -1;
      return a.coverage_weeks - b.coverage_weeks;
    });
  }, [order, records]);

  const coverageRowsFiltered = useMemo(() => {
    const q = coverageFilter.trim().toLowerCase();
    return coverageRows.filter((r) => {
      if (coverageProjectFilter) {
        const projs = itemProjectsMap[r.item];
        if (!projs || !projs.has(coverageProjectFilter)) return false;
      }
      if (!q) return true;
      return (
        r.item.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        (r.vendor || "").toLowerCase().includes(q)
      );
    });
  }, [coverageRows, coverageFilter, coverageProjectFilter, itemProjectsMap]);

  const exportCoverage = () => {
    const suffix = coverageProjectFilter ? `_${coverageProjectFilter}` : "";
    downloadCSV(`stock_coverage${suffix}_${new Date().toISOString().slice(0, 10)}.csv`, coverageRowsFiltered.map((r) => ({
      ...r,
      coverage_weeks: r.coverage_weeks === null ? "" : Math.round(r.coverage_weeks * 10) / 10,
    })));
  };

  // สร้างสรุปข้อมูล MRP ปัจจุบันให้ AI ใช้ตอบคำถาม — เน้นรายการที่ต้องสั่งซื้อ/วิกฤต เพื่อคุมขนาด context ไม่ให้ใหญ่เกินไป
  const buildAIContext = () => {
    const plannedRows = [];
    order.forEach((item) => {
      const rec = records[item];
      rec.plannedRelease.forEach((v, i) => {
        if (v > 0) {
          plannedRows.push({
            item,
            description: rec.description,
            own_project: isProjectCode(item) ? item.slice(0, 3).toUpperCase() : "",
            parent_items: (rec.parentItems || []).join(","),
            vendor: rec.vendor,
            mold_family: rec.moldFamily || "",
            release_week: weekLabels[i],
            qty: Math.round(v),
            past_due: rec.pastDue[i] ? "yes" : "no",
          });
        }
      });
    });
    const capped = plannedRows.slice(0, 300);
    const lines = capped
      .map((r) => `${r.item}|${r.description}|project=${r.own_project || "-"}|parents=${r.parent_items || "-"}|vendor=${r.vendor || "-"}|mold_family=${r.mold_family || "-"}|release_week=${r.release_week}|qty=${r.qty}|past_due=${r.past_due}`)
      .join("\n");
    const truncNote = plannedRows.length > capped.length ? ` (แสดง ${capped.length} จาก ${plannedRows.length} รายการ — ยังมีอีกที่ไม่ได้แสดง)` : "";

    const selectedLine = selected && records[selected]
      ? `\n\nItem ที่กำลังเปิดดูอยู่ตอนนี้: ${selected} (${records[selected].description}) — on-hand usable/total: ${records[selected].usableOnHand}/${records[selected].onHand} ${records[selected].unit}, safety stock: ${records[selected].safety}, vendor: ${records[selected].vendor || "-"}`
      : "";

    return [
      `วันที่รัน: ${new Date().toISOString().slice(0, 10)}`,
      `Horizon: ${horizon} สัปดาห์, History: ${historyWeeks} สัปดาห์, สัปดาห์อ้างอิงปัจจุบัน: ${weekLabels[historyWeeks] || "-"}`,
      `จำนวน item ทั้งหมดในระบบ: ${order.length}`,
      `KPI สรุป: past due releases=${kpis.pastDue}, planned orders in horizon=${kpis.ordersNeeded}, items below safety stock=${kpis.belowSafety}, expired stock=${kpis.expiredCount}, expiring within 4 wks=${kpis.expiringSoonCount}`,
      ``,
      `รายการ planned order ทั้งหมด (item|description|project|parent_items|vendor|mold_family|release_week|qty|past_due)${truncNote}:`,
      lines || "(ไม่มี planned order ในช่วง horizon ปัจจุบัน)",
      selectedLine,
    ].join("\n");
  };

  const askAI = async () => {
    const question = aiInput.trim();
    if (!question || aiLoading) return;
    setAiError("");
    const nextMessages = [...aiMessages, { role: "user", content: question }];
    setAiMessages(nextMessages);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: buildAIContext(),
          history: nextMessages.slice(0, -1),
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setAiError("Session หมดอายุ กรุณา login ใหม่");
        onLogout();
        return;
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.answer || "(ไม่มีคำตอบ)" }]);
    } catch (err) {
      setAiError(String(err && err.message ? err.message : err));
    } finally {
      setAiLoading(false);
    }
  };

  const usedInMap = useMemo(() => {
    const map = {};
    Object.entries(childrenOf).forEach(([parent, kids]) => {
      kids.forEach(({ component, qty_per }) => {
        map[component] = map[component] || [];
        map[component].push({ component: parent, qty_per });
      });
    });
    return map;
  }, [childrenOf]);

  const rawMaterialRoots = useMemo(
    () => order.filter((it) => !(childrenOf[it] && childrenOf[it].length > 0) && usedInMap[it] && usedInMap[it].length > 0),
    [order, childrenOf, usedInMap]
  );

  const computeSubtreeOrder = (itemsInProcessOrder, childMap) => {
    const map = {};
    itemsInProcessOrder.forEach((item) => {
      const rec = records[item];
      const own = rec.plannedRelease.some((v) => v > 0);
      const kids = childMap[item] || [];
      const anyChild = kids.some((k) => map[k.component]);
      map[item] = own || anyChild;
    });
    return map;
  };

  const subtreeOrderMap = useMemo(() => computeSubtreeOrder([...order].reverse(), childrenOf), [order, records, childrenOf]);
  const reversedSubtreeOrderMap = useMemo(() => computeSubtreeOrder(order, usedInMap), [order, records, usedInMap]);

  const activeTopItems = viewMode === "assembly" ? topItems : viewMode === "material" ? rawMaterialRoots : [];
  const activeChildMap = viewMode === "assembly" ? childrenOf : usedInMap;
  const activeOrderMap = viewMode === "assembly" ? subtreeOrderMap : reversedSubtreeOrderMap;

  const visibleTopItems = onlyWithOrders ? activeTopItems.filter((it) => activeOrderMap[it]) : activeTopItems;

  const kpis = useMemo(() => {
    let pastDue = 0, ordersNeeded = 0, belowSafety = 0, expiredCount = 0, expiringSoonCount = 0, varianceCount = 0, totalValue = 0, expiredValue = 0;
    Object.values(records).forEach((rec) => {
      rec.plannedRelease.forEach((v, i) => { if (v > 0) { ordersNeeded++; if (rec.pastDue[i]) pastDue++; } });
      if (rec.projOnHand[historyWeeks] < rec.safety) belowSafety++;
      if (rec.expired) expiredCount++;
      else if (rec.expiringSoon) expiringSoonCount++;
      if (rec.consumptionVariance.some((v) => v !== null && Math.abs(v) >= 0.5)) varianceCount++;
      totalValue += rec.usableValue;
      expiredValue += rec.expiredValue;
    });
    return { pastDue, ordersNeeded, belowSafety, itemCount: order.length, expiredCount, expiringSoonCount, varianceCount, totalValue, expiredValue };
  }, [records, order, historyWeeks]);

  const selectedRec = records[selected];

  return (
    <div style={{ background: COLORS.paper, minHeight: "100%", padding: isMobile ? 10 : 18, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body, input, select, button { -webkit-font-smoothing: antialiased; }
        input, select, button { transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease, transform 0.1s ease; }
        input:focus-visible, select:focus-visible, button:focus-visible {
          outline: none; box-shadow: 0 0 0 3px rgba(59,94,219,0.25); border-color: ${COLORS.steel} !important;
        }
        button:not(:disabled):hover { filter: brightness(0.97); }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.paperLine}; border-radius: 999px; border: 2px solid ${COLORS.paper}; }
        ::-webkit-scrollbar-thumb:hover { background: #C7CCD8; }
      `}</style>

      {/* title block header */}
      <div style={{
        display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr 1fr", border: `1px solid ${COLORS.paperLine}`,
        background: COLORS.card, marginBottom: 16, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, overflow: "hidden",
      }}>
        <div style={{ padding: "10px 14px", borderRight: isMobile ? "none" : `1px solid ${COLORS.paperLine}`, borderBottom: isMobile ? `1px solid ${COLORS.paperLine}` : "none" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.ink, letterSpacing: "0.01em" }}>
            MATERIAL REQUIREMENTS PLAN
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft }}>
            time-phased planning record · BOM explosion · lead-time offset
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRight: isMobile ? "none" : `1px solid ${COLORS.paperLine}`, borderBottom: isMobile ? `1px solid ${COLORS.paperLine}` : "none" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>HORIZON</div>
          <input type="number" min={4} max={52} value={horizon} disabled={isReadOnly}
            onChange={(e) => setHorizon(Math.max(4, Math.min(52, toNum(e.target.value, 12))))}
            style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.ink,
              border: "none", background: "transparent", width: "60px", outline: "none",
            }} /> <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft }}>weeks</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>history</span>
            <input type="number" min={0} max={12} value={historyWeeks} disabled={isReadOnly}
              onChange={(e) => setHistoryWeeks(Math.max(0, Math.min(12, toNum(e.target.value, 4))))}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.ink,
                border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, background: "transparent", width: "34px", outline: "none", padding: "1px 3px",
              }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>wks back</span>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
            today: {weekLabels[historyWeeks]}
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRight: isMobile ? "none" : `1px solid ${COLORS.paperLine}`, borderBottom: isMobile ? `1px solid ${COLORS.paperLine}` : "none" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>ITEMS</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{kpis.itemCount}</div>
        </div>
  <div style={{ padding: "10px 14px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>RUN DATE</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
            {new Date().toISOString().slice(0, 10)}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft, marginTop: 2 }}>
            {hydrating ? "loading data from SharePoint…" : "data loaded successfully"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 4, width: "fit-content",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 600,
              color: isReadOnly ? COLORS.amber : COLORS.moss,
              border: `1px solid ${isReadOnly ? COLORS.amber : COLORS.moss}`,
              background: isReadOnly ? "#FEF3C7" : "#DCFCE7", padding: "2px 8px", borderRadius: COLORS.radiusSm,
            }}>{isReadOnly ? "\u{1F512}" : "\u2713"} {role === "admin" ? "admin" : "user (view-only)"}</span>
            <button onClick={onLogout} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft,
              border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "2px 8px", borderRadius: COLORS.radiusSm,
            }}>logout</button>
          </div>
          {!isReadOnly && (
            <button onClick={() => { if (window.confirm("ล้างค่า order status / ค่าที่ปรับเอง / horizon ที่บันทึกไว้ทั้งหมด?")) clearSavedSettings(); }} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginTop: 4,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft,
              border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "2px 6px", borderRadius: COLORS.radiusSm,
            }}>clear saved settings</button>
          )}
          <button onClick={exportPowerBI} style={{
            display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginTop: 4,
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, fontWeight: 600, color: "#fff",
            border: `1px solid ${COLORS.steel}`, background: COLORS.steel, padding: "3px 8px", borderRadius: COLORS.radiusSm,
          }}><Download size={11} /> export for Power BI</button>
        </div>
      </div>

      {/* uploads */}
      {!isReadOnly && (
        <>
          {isMobile && (
            <button onClick={() => setUploadsOpen((o) => !o)} style={{
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 10,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.steel, fontWeight: 600,
              border: `1px solid ${COLORS.steel}`, background: COLORS.card, borderRadius: COLORS.radiusSm,
              padding: "8px 12px", width: "100%", justifyContent: "space-between",
            }}>
              <span>{"\u{1F4C1}"} Upload / data sources</span>
              {uploadsOpen ? <ChevronsUp size={13} /> : <ChevronsDown size={13} />}
            </button>
          )}
          <div style={{ display: (!isMobile || uploadsOpen) ? "flex" : "none", gap: 10, marginBottom: 16, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
            <UploadSlot label="Bill of Materials" hint="parent_item, component_item, qty_per"
              onFile={handleFile("bom", setBom)} loaded={loadedFlags.bom} count={bom.length}
          onSample={() => { setBom(SAMPLE_BOM); setLoadedFlags((f) => ({ ...f, bom: false })); }} />
        <UploadSlot label="Inventory Master" hint="item, on_hand, lead_time_weeks, lot_size, safety_stock, safety_factor, vendor, unit_price, expiry_date, mold_family (optional)"
          onFile={handleFile("inventory", setInventory)} loaded={loadedFlags.inventory} count={inventory.length}
          onSample={() => { setInventory(SAMPLE_INVENTORY); setLoadedFlags((f) => ({ ...f, inventory: false })); }} />
        <UploadSlot label="Demand Schedule" hint="item, week (e.g. 26CW25), quantity"
          onFile={handleFile("demand", setDemand)} loaded={loadedFlags.demand} count={demand.length}
          onSample={() => { setDemand(SAMPLE_DEMAND); setLoadedFlags((f) => ({ ...f, demand: false })); }} />
        <UploadSlot label="Actual Consumption (เบิกจริง)" hint="item, week (e.g. 26CW25), quantity"
          onFile={handleFile("actualConsumption", setActualConsumption)} loaded={loadedFlags.actualConsumption} count={actualConsumption.length}
          onSample={() => { setActualConsumption(SAMPLE_ACTUAL_CONSUMPTION); setLoadedFlags((f) => ({ ...f, actualConsumption: false })); }} />
        <UploadSlot label="Batches / Lots (expiry)" hint="item, batch_no, quantity, expiry_date"
          onFile={handleFile("batches", setBatches)} loaded={loadedFlags.batches} count={batches.length}
          onSample={() => { setBatches(SAMPLE_BATCHES); setLoadedFlags((f) => ({ ...f, batches: false })); }} />
        <UploadSlot label="PO Pending" hint="item, week (e.g. 26CW25), quantity, po_number, vendor"
          onFile={handlePoPendingFile} loaded={loadedFlags.poPending} count={scheduledReceiptsPO.length}
          onSample={() => { setScheduledReceiptsPO(SAMPLE_PO_PENDING); setScheduledReceiptsPOOriginal(SAMPLE_PO_PENDING); setLoadedFlags((f) => ({ ...f, poPending: false })); }} />
        <UploadSlot label="GIT (Goods In Transit)" hint="item, quantity (arrives this week, no date needed)"
          onFile={handleFile("git", setScheduledReceiptsGIT)} loaded={loadedFlags.git} count={scheduledReceiptsGIT.length}
          onSample={() => { setScheduledReceiptsGIT(SAMPLE_GIT); setLoadedFlags((f) => ({ ...f, git: false })); }} />
        <button onClick={() => {
          downloadCSV("bom_template.csv", [{ parent_item: "", component_item: "", qty_per: "" }]);
        }} style={{
          display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          color: COLORS.inkSoft, border: `1px dashed ${COLORS.paperLine}`, background: "transparent",
          padding: "4px 10px", cursor: "pointer", alignSelf: "flex-start", marginTop: "auto", marginBottom: 6,
        }}><Download size={12} /> template</button>
          </div>
        </>
      )}

      {poPendingHeaderWarning && (
        <div style={{
          border: `1px solid ${COLORS.amber}`, background: "#FEF3C7", color: "#92400E",
          padding: "6px 12px", marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
        }}>
          Couldn't find a PO number column in your PO Pending file — columns detected: {poPendingHeaderWarning.join(", ")}.
          Rename one to "po_number" (or anything containing "po") and re-upload.
        </div>
      )}

      {/* Data Validation Warnings */}
      {warnings && (warnings.demandWithoutBOM.length > 0 || warnings.missingInventory.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {warnings.demandWithoutBOM.length > 0 && (
            <div style={{ background: '#FEF3C7', border: `1px solid ${COLORS.amber}`, padding: '8px 12px', color: '#92400E', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color={COLORS.amber} style={{ minWidth: 14 }} />
              <span>
                <strong>ตรวจสอบข้อมูล:</strong> พบรายการที่มีแผนผลิต (Demand) แต่ไม่มีโครงสร้าง BOM ในระบบ: <b>{warnings.demandWithoutBOM.join(", ")}</b> <i>(หากเป็นสินค้าซื้อมาขายไป หรืออะไหล่ สามารถข้ามได้)</i>
              </span>
            </div>
          )}
          {warnings.missingInventory.length > 0 && (
            <div style={{ background: '#FEE2E2', border: `1px solid ${COLORS.rust}`, padding: '8px 12px', color: '#991B1B', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CircleAlert size={14} color={COLORS.rust} style={{ minWidth: 14 }} />
              <span>
                <strong>ข้อมูล Master ขาดหาย:</strong> พบรายการเหล่านี้อยู่ในโครงสร้าง BOM หรือ Demand แต่ไม่มีรายชื่ออยู่ใน Inventory Master: <b>{warnings.missingInventory.join(", ")}</b>
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={isMobile ? {
        display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4,
        scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch",
      } : { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <KPI label="Past due releases" value={kpis.pastDue} tone="rust" icon={CircleAlert} mobile={isMobile} />
        <KPI label="Planned orders in horizon" value={kpis.ordersNeeded} tone="steel" icon={ClipboardList} mobile={isMobile} />
        <KPI label="Items below safety stock (wk 1)" value={kpis.belowSafety} tone="amber" icon={AlertTriangle} mobile={isMobile} />
        <KPI label="Items in structure" value={kpis.itemCount} tone="moss" icon={Gauge} mobile={isMobile} />
        <KPI label="PO pending" value={scheduledReceiptsPO.length} tone="amber" icon={ClipboardList} mobile={isMobile} />
        <KPI label="Goods in transit" value={scheduledReceiptsGIT.length} tone="moss" icon={ClipboardList} mobile={isMobile} />
        <KPI label="Expired stock" value={kpis.expiredCount} tone="rust" icon={CalendarX} mobile={isMobile} />
        <KPI label="Expiring within 4 wks" value={kpis.expiringSoonCount} tone="amber" icon={CalendarX} mobile={isMobile} />
        <KPI label="Consumption variance" value={kpis.varianceCount} tone="steel" icon={Scale} mobile={isMobile} />
        <KPI label="Usable inventory value" value={kpis.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="moss" icon={Gauge} mobile={isMobile} />
        <KPI label="Value at risk (expired)" value={kpis.expiredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="rust" icon={CalendarX} mobile={isMobile} />
      </div>

      {/* main */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(showBOM || showCoverage) && (
          <button onClick={() => { setShowBOM(false); setShowCoverage(false); }} style={{
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
            color: COLORS.inkSoft, background: "transparent",
            border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
          }}>{"←"} back to dashboard</button>
        )}
        <button onClick={() => { setShowBOM((s) => !s); setShowCoverage(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showBOM ? "#fff" : COLORS.steel, background: showBOM ? COLORS.steel : "transparent",
          border: `1px solid ${COLORS.steel}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <ClipboardList size={13} /> {"\u{1F4CB} view full BOM"}
        </button>
        <button onClick={() => { setShowCoverage((s) => !s); setShowBOM(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showCoverage ? "#fff" : COLORS.moss, background: showCoverage ? COLORS.moss : "transparent",
          border: `1px solid ${COLORS.moss}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <Scale size={13} /> {"\u{1F4C8} view stock coverage"}
        </button>
      </div>

      {showCoverage ? (
        <div style={{
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
          background: COLORS.card, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px",
            borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8,
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 700, color: COLORS.ink,
            }}>
              <Scale size={16} color={COLORS.moss} /> Stock Coverage — {coverageRowsFiltered.length} items
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={coverageProjectFilter}
                onChange={(e) => setCoverageProjectFilter(e.target.value)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${coverageProjectFilter ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: coverageProjectFilter ? COLORS.amber : COLORS.ink, background: coverageProjectFilter ? "#FEF3C7" : COLORS.paper,
                }}
              >
                <option value="">All projects</option>
                {coverageProjectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="text"
                value={coverageFilter}
                onChange={(e) => setCoverageFilter(e.target.value)}
                placeholder="ค้นหา item / vendor..."
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                  border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 200,
                }}
              />
              <button onClick={exportCoverage} style={{
                display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: "#fff",
                border: `1px solid ${COLORS.moss}`, background: COLORS.moss, padding: "6px 12px", borderRadius: COLORS.radiusSm,
              }}><Download size={12} /> export coverage CSV</button>
            </div>
          </div>
          <div style={{ padding: "6px 4px", maxHeight: 640, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>
              <div style={{ width: 190 }}>ITEM</div>
              <div style={{ flex: 1 }}>COVERAGE (weeks of stock left, based on past avg consumption)</div>
              <div style={{ width: 76, textAlign: "right" }}>WEEKS</div>
            </div>
            {coverageRowsFiltered.map((r) => {
              const MAX_SCALE = 12;
              const capped = r.coverage_weeks === null ? 0 : Math.min(r.coverage_weeks, MAX_SCALE);
              const pct = (capped / MAX_SCALE) * 100;
              const barColor = r.coverage_weeks === null
                ? COLORS.paperLine
                : r.coverage_weeks < r.lead_time_weeks
                  ? COLORS.rust
                  : r.coverage_weeks < r.lead_time_weeks * 1.5
                    ? COLORS.amber
                    : COLORS.moss;
              const isSelected = selected === r.item;
              return (
                <div key={r.item} onClick={() => handleSelectItem(r.item)} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer",
                  background: isSelected ? "#E0E7FF" : "transparent", borderRadius: COLORS.radiusSm,
                }}>
                  <div style={{ width: 190, overflow: "hidden" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.item}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</div>
                  </div>
                  <div style={{ flex: 1, background: COLORS.paper, borderRadius: 6, height: 18, position: "relative", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, background: barColor, height: "100%", borderRadius: 6, transition: "width 0.2s ease" }} />
                    {r.lead_time_weeks > 0 && r.lead_time_weeks <= MAX_SCALE && (
                      <div title={`lead time: ${r.lead_time_weeks} wk`} style={{
                        position: "absolute", top: 0, bottom: 0, left: `${(r.lead_time_weeks / MAX_SCALE) * 100}%`,
                        width: 2, background: COLORS.ink, opacity: 0.4,
                      }} />
                    )}
                  </div>
                  <div style={{ width: 76, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: barColor === COLORS.paperLine ? COLORS.inkSoft : barColor }}>
                    {r.coverage_weeks === null ? "no data" : r.coverage_weeks >= MAX_SCALE ? `${Math.round(r.coverage_weeks)}+ wk` : `${r.coverage_weeks.toFixed(1)} wk`}
                  </div>
                </div>
              );
            })}
            {coverageRowsFiltered.length === 0 && (
              <div style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                ไม่พบ item ที่ตรงกับการค้นหา
              </div>
            )}
          </div>
          <div style={{ padding: "8px 14px", borderTop: `1px solid ${COLORS.paperLine}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>
            เส้นดำเข้มบนแท่ง = lead time ของ item นั้น (สีแดง = coverage ต่ำกว่า lead time / สีเหลือง = ต่ำกว่า 1.5×lead time / สีเขียว = ปลอดภัย สีเทา = ไม่มีข้อมูล consumption เทียบ)
          </div>
        </div>
      ) : showBOM ? (
        <div style={{
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
          background: COLORS.card, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px",
            borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8,
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 700, color: COLORS.ink,
            }}>
              <ClipboardList size={16} color={COLORS.steel} /> Bill of Materials — {bomRowsFiltered.length} lines
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={bomProjectFilter}
                onChange={(e) => setBomProjectFilter(e.target.value)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600,
                  border: `1px solid ${bomProjectFilter ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: bomProjectFilter ? COLORS.amber : COLORS.ink, background: bomProjectFilter ? "#FEF3C7" : COLORS.paper,
                }}
              >
                <option value="">All projects</option>
                {bomProjectOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input
                type="text"
                value={bomFilter}
                onChange={(e) => setBomFilter(e.target.value)}
                placeholder="ค้นหา parent / component / vendor..."
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                  border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 220,
                }}
              />
              <button onClick={exportBOM} style={{
                display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: "#fff",
                border: `1px solid ${COLORS.steel}`, background: COLORS.steel, padding: "6px 12px", borderRadius: COLORS.radiusSm,
              }}><Download size={12} /> export BOM CSV</button>
            </div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 640, overflowY: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: COLORS.card, zIndex: 1 }}>
                  {["PROJECT", "PARENT ITEM", "PARENT DESC", "COMPONENT ITEM", "COMPONENT DESC", "QTY/PARENT", "UNIT", "VENDOR", "LEAD TIME", "LOT SIZE", "MOLD FAMILY"].map((h) => (
                    <td key={h} style={{ padding: "8px 10px", color: COLORS.inkSoft, borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap", textAlign: h === "QTY/PARENT" || h === "LEAD TIME" || h === "LOT SIZE" ? "right" : "left" }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bomRowsFiltered.map((r, idx) => (
                  <tr key={`${r.parent_item}-${r.component_item}-${idx}`} onClick={() => handleSelectItem(r.component_item)} style={{ cursor: "pointer" }}>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.steelDeep, fontWeight: 700, whiteSpace: "nowrap" }}>{r.project || "—"}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.ink, whiteSpace: "nowrap" }}>{r.parent_item}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.parent_description}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.steel, whiteSpace: "nowrap", fontWeight: 600 }}>{r.component_item}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{r.component_description}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: "right" }}>{r.qty_per}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{r.component_unit}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{r.component_vendor || "—"}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: "right" }}>{r.component_lead_time_weeks}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: "right" }}>{r.component_lot_size}</td>
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.amber, whiteSpace: "nowrap" }}>{r.component_mold_family || "—"}</td>
                  </tr>
                ))}
                {bomRowsFiltered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft }}>ไม่พบข้อมูล BOM ที่ตรงกับการค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <>
      {isMobile && (
        <div style={{
          display: "flex", gap: 6, marginBottom: 12, background: COLORS.card,
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadow, padding: 4,
        }}>
          {[["items", "\u{1F4CB} Items"], ["details", "\u{1F4CA} Details"]].map(([tab, label]) => (
            <button key={tab} onClick={() => setMobileTab(tab)} style={{
              flex: 1, padding: "8px 6px", cursor: "pointer", border: "none", borderRadius: COLORS.radiusSm,
              background: mobileTab === tab ? COLORS.steel : "transparent",
              color: mobileTab === tab ? "#fff" : COLORS.inkSoft,
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600,
            }}>{label}</button>
          ))}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "260px 1fr", gap: 14, alignItems: "start" }}>
        <div style={{
          display: isMobile && mobileTab !== "items" ? "none" : "block",
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, overflow: "hidden",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 12px",
            borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 6,
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: COLORS.ink, textTransform: "uppercase",
            }}>
              <PackageSearch size={14} color={COLORS.steel} /> {viewMode === "assembly" ? "Item Structure" : viewMode === "material" ? "Where-Used" : viewMode === "moldFamily" ? "By Mold Family" : viewMode === "project" ? "By Project" : "By Vendor"}
            </span>
            <label style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft,
            }}>
              <input type="checkbox" checked={onlyWithOrders} onChange={(e) => setOnlyWithOrders(e.target.checked)}
                style={{ margin: 0 }} />
              orders only
            </label>
          </div>
          <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.paperLine}` }}>
            {[["assembly", "Finished good → parts"], ["project", "By project"], ["material", "Raw material → where-used"], ["vendor", "By vendor"], ...(moldFamilyGroups.length > 0 ? [["moldFamily", "By mold family"]] : [])].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                flex: 1, padding: "6px 6px", cursor: "pointer", border: "none",
                background: viewMode === mode ? COLORS.steel : "transparent",
                color: viewMode === mode ? "#FFFFFF" : COLORS.inkSoft,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา item / raw material / vendor..."
                style={{
                  width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                  border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 28px 6px 10px", color: COLORS.ink, background: COLORS.paper,
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} title="ล้างการค้นหา" style={{
                  position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                  border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft,
                  fontSize: 14, lineHeight: 1, padding: 2,
                }}>&#10005;</button>
              )}
            </div>
          </div>
          {!searchResults && (
            <div style={{ display: "flex", gap: 6, padding: "6px 12px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
              <button onClick={() => setForceOpen({ value: true, key: Date.now() })} style={{
                display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel,
                border: `1px solid ${COLORS.steel}`, background: "transparent", padding: "3px 8px", borderRadius: COLORS.radiusSm,
              }}><ChevronsDown size={11} /> expand all</button>
              <button onClick={() => setForceOpen({ value: false, key: Date.now() })} style={{
                display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft,
                border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "3px 8px", borderRadius: COLORS.radiusSm,
              }}><ChevronsUp size={11} /> collapse all</button>
            </div>
          )}
          <div style={{ padding: "6px 2px", maxHeight: 480, overflowY: "auto" }}>
            {searchResults ? (
              <>
                <div style={{ padding: "6px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
                  {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                </div>
                {searchResults.map((it) => {
                  const rec = records[it];
                  const isSelected = selected === it;
                  const critical = rec.pastDue.some(Boolean);
                  const shortage = rec.plannedRelease.some((v) => v > 0);
                  return (
                    <div key={it} onClick={() => handleSelectItem(it)} title={`${rec.description} (${rec.unit})`} style={{
                      display: "flex", flexDirection: "column", cursor: "pointer",
                      paddingLeft: 12, paddingRight: 6, paddingTop: 5, paddingBottom: 5,
                      background: isSelected ? COLORS.steel : "transparent",
                      color: isSelected ? "#FFFFFF" : COLORS.ink,
                      borderLeft: isSelected ? `3px solid ${COLORS.amber}` : "3px solid transparent",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it}</span>
                        {critical && <CircleAlert size={12} color={isSelected ? "#FEE2E2" : COLORS.rust} />}
                        {!critical && shortage && <AlertTriangle size={11} color={isSelected ? "#FEF3C7" : COLORS.amber} />}
                      </div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, paddingLeft: 0, color: isSelected ? "#E4E7EC" : COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {rec.description} {"·"} {rec.unit}{rec.vendor ? ` · ${rec.vendor}` : ""}
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <div style={{ padding: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft, textAlign: "center" }}>
                    ไม่พบ item / raw material / vendor ที่ตรงกับ "{searchQuery}"
                  </div>
                )}
              </>
            ) : viewMode === "vendor" ? (
              <VendorGroupTree groups={vendorGroups} records={records} selected={selected} onSelect={handleSelectItem}
                onlyWithOrders={onlyWithOrders} forceOpen={forceOpen} />
            ) : viewMode === "moldFamily" ? (
              <VendorGroupTree groups={moldFamilyGroups} records={records} selected={selected} onSelect={handleSelectItem}
                onlyWithOrders={onlyWithOrders} forceOpen={forceOpen} />
            ) : viewMode === "project" ? (
              <ProjectGroupTree groups={projectGroups} records={records} childrenOf={childrenOf} selected={selected} onSelect={handleSelectItem}
                onlyWithOrders={onlyWithOrders} subtreeOrderMap={subtreeOrderMap} forceOpen={forceOpen} />
            ) : (
              <>
                {visibleTopItems.map((it) => (
                  <TreeRow key={it} item={it} records={records} childrenOf={activeChildMap}
                    selected={selected} onSelect={handleSelectItem} depth={0}
                    onlyWithOrders={onlyWithOrders} subtreeOrderMap={activeOrderMap}
                    forceOpen={forceOpen} />
                ))}
                {onlyWithOrders && visibleTopItems.length === 0 && (
                  <div style={{ padding: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft, textAlign: "center" }}>
                    No items need a planned order in this horizon.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ display: isMobile && mobileTab !== "details" ? "none" : "flex", flexDirection: "column", gap: 14 }}>
          <RecordGrid rec={selectedRec} weeks={weeks} weekLabels={weekLabels} weekDates={weekDates} historyWeeks={historyWeeks}
            onAdjustPlan={adjustPlan} onResetPlanOverride={resetPlanOverride} 
            onAdjustReceipt={adjustReceipt} onResetReceiptOverride={resetReceiptOverride}
            onAdjustPOQty={adjustPOQty} poOriginalQtyMap={poOriginalQtyMap} onResetPOQty={resetPOQty}
            onAdjustPOWeek={adjustPOWeek} onResetPOWeek={resetPOWeek} poOriginalMap={poOriginalMap} 
            planOverrides={planOverrides} receiptOverrides={receiptOverrides} isMobile={isMobile}
            draftRefs={draftRefs} onAdjustDraftRef={adjustDraftRef} isReadOnly={isReadOnly}
            moldFamilyMembers={selectedRec && selectedRec.moldFamily ? (moldFamilyMap[selectedRec.moldFamily] || []).filter((it) => it !== selected) : []} />
          <PlannedOrders records={records} weeks={weeks} weekLabels={weekLabels} orderStatus={orderStatus} setOrderStatus={setOrderStatus} selectedItem={selected} isReadOnly={isReadOnly} />
        </div>
      </div>
      </>
      )}

      <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
        Note: planned orders round up to lot size; PO pending is netted against gross requirements in the week it's due, GIT is treated as arriving in week 1 (no date needed since it's already shipped). Expired on-hand stock is excluded from the plan (treated as 0). Actual consumption is compared against calculated gross requirements in the same week; variance only shows where actual data was entered. "Planned order receipt", "Planned order release", and PO pending quantities are directly editable — type a new number to override the calculated plan (amber outline marks an override; click ↺ to reset).
      </div>

      {/* AI chat — ถาม-ตอบข้อมูล MRP ด้วยภาษาธรรมชาติ */}
      <button onClick={() => setAiOpen((o) => !o)} title="ถาม AI เกี่ยวกับข้อมูลในระบบ" style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 40,
        width: 52, height: 52, borderRadius: 999, border: "none", cursor: "pointer",
        background: COLORS.steel, color: "#fff", fontSize: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: COLORS.shadowLg,
      }}>{aiOpen ? "✕" : "\u{1F916}"}</button>

      {aiOpen && (
        <div style={{
          position: "fixed", bottom: 82, right: 20, zIndex: 40,
          width: isMobile ? "calc(100vw - 32px)" : 360, maxHeight: "70vh",
          display: "flex", flexDirection: "column",
          background: COLORS.card, border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${COLORS.paperLine}`, background: COLORS.steel, color: "#fff",
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
          }}>
            {"\u{1F916}"} ถาม AI เกี่ยวกับข้อมูล MRP
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 160 }}>
            {aiMessages.length === 0 && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft, lineHeight: 1.5 }}>
                ลองถามได้เลย เช่น:
                <br />• "item ไหนใน project G8X ต้องสั่งซื้อสัปดาห์นี้บ้าง"
                <br />• "มี item อะไรค้างสั่งเกินกำหนด (past due) บ้าง"
                <br />• "สรุป item ที่ vendor ABC ต้องส่งให้เราสัปดาห์หน้า"
                <br /><br />
                <i>หมายเหตุ: AI ตอบจากข้อมูล planned order ที่คำนวณไว้แล้วในระบบเท่านั้น ไม่ได้คำนวณ MRP ใหม่เอง</i>
              </div>
            )}
            {aiMessages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "8px 12px", borderRadius: COLORS.radius,
                background: m.role === "user" ? COLORS.steel : COLORS.paper,
                color: m.role === "user" ? "#fff" : COLORS.ink,
                fontFamily: "Inter, sans-serif", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
              }}>{m.content}</div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: "flex-start", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft }}>
                กำลังคิด...
              </div>
            )}
            {aiError && (
              <div style={{ alignSelf: "flex-start", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.rust, background: "#FEE2E2", padding: "6px 10px", borderRadius: COLORS.radiusSm }}>
                เกิดข้อผิดพลาด: {aiError}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, padding: 10, borderTop: `1px solid ${COLORS.paperLine}` }}>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAI(); } }}
              placeholder="พิมพ์คำถาม..."
              disabled={aiLoading}
              style={{
                flex: 1, fontFamily: "Inter, sans-serif", fontSize: 12.5,
                border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                padding: "8px 10px", color: COLORS.ink, background: COLORS.paper,
              }}
            />
            <button onClick={askAI} disabled={aiLoading || !aiInput.trim()} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 38, cursor: aiLoading ? "default" : "pointer", border: "none", borderRadius: COLORS.radiusSm,
              background: COLORS.steel, color: "#fff", opacity: aiLoading || !aiInput.trim() ? 0.5 : 1,
            }}>{"➤"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLoggedIn }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(false);
        return;
      }
      onLoggedIn(data.role);
    } catch (err) {
      setError(String(err && err.message ? err.message : err));
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: COLORS.paper, fontFamily: "Inter, sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
      `}</style>
      <div style={{
        width: 340, background: COLORS.card, border: `1px solid ${COLORS.paperLine}`,
        borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, padding: 28,
      }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.ink, marginBottom: 4 }}>
          MRP Dashboard
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft, marginBottom: 20 }}>
          กรอกรหัสผ่านเพื่อเข้าใช้งาน
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="รหัสผ่าน"
          autoFocus
          style={{
            width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13,
            border: `1px solid ${error ? COLORS.rust : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
            padding: "10px 12px", color: COLORS.ink, background: COLORS.paper, marginBottom: 10,
          }}
        />
        {error && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.rust, marginBottom: 10 }}>
            {error}
          </div>
        )}
        <button onClick={submit} disabled={loading || !password.trim()} style={{
          width: "100%", padding: "10px 12px", cursor: loading ? "default" : "pointer",
          border: "none", borderRadius: COLORS.radiusSm, background: COLORS.steel, color: "#fff",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 700,
          opacity: loading || !password.trim() ? 0.6 : 1,
        }}>
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null); // null = ยังไม่รู้/กำลังเช็ค, "admin" | "user" = login แล้ว
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/session");
        const data = await res.json();
        setRole(data.role || null);
      } catch (e) {
        setRole(null);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (e) { /* ignore */ }
    setRole(null);
  };

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: COLORS.paper, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.inkSoft,
      }}>
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  if (!role) {
    return <LoginScreen onLoggedIn={setRole} />;
  }

  return <MRPDashboardInner role={role} onLogout={handleLogout} />;
}
