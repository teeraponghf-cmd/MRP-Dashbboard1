import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
// เดาว่า vendor เป็นต่างประเทศ (oversea) หรือไม่ — ระบบยังไม่มีฟิลด์ประเทศ vendor ตรงๆ
// ใช้ heuristic: ถ้าชื่อ vendor ไม่มีตัวอักษรไทยเลย ถือว่าเป็น vendor ต่างประเทศ
function isOverseasVendor(vendor) {
  if (!vendor || !String(vendor).trim()) return false; // ไม่มีชื่อ vendor เลย ไม่แน่ใจ ปลอดภัยไว้ก่อนว่าไม่ใช่ oversea
  return !/[\u0E00-\u0E7F]/.test(vendor);
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
// Plan overrides are keyed "item::weekIndex". Set (or clear, when rawValue is blank) the same week for every target item.
// Returns the previous object unchanged when the value is invalid.
function setOverrideForTargets(prev, targets, weekIndex, rawValue) {
  const next = { ...prev };
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    targets.forEach((t) => { delete next[`${t}::${weekIndex}`]; });
    return next;
  }
  const n = Number(rawValue);
  if (!Number.isFinite(n) || n < 0) return prev;
  targets.forEach((t) => { next[`${t}::${weekIndex}`] = n; });
  return next;
}
function removeOverrideForTargets(prev, targets, weekIndex) {
  if (!targets.some((t) => `${t}::${weekIndex}` in prev)) return prev;
  const next = { ...prev };
  targets.forEach((t) => { delete next[`${t}::${weekIndex}`]; });
  return next;
}
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Month (of the week's Monday) for a label like "27CW05"; null when the label cannot be parsed.
function weekLabelMonth(label) {
  const m = /^(\d{2})CW(\d{1,2})$/.exec(String(label || ""));
  if (!m) return null;
  const mon = isoWeekToMonday(2000 + Number(m[1]), Number(m[2]));
  return { month: mon.getUTCMonth(), year: mon.getUTCFullYear() };
}
function parseYMD(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ""));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
function fmtYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysYMD(str, days) {
  const d = parseYMD(str);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return fmtYMD(d);
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
// Set to true to let the system create planned orders automatically when projected on-hand falls below safety stock.
const AUTO_ORDER_PLANNING = false;

function runMRP({ bom, inventory, demand, poPending, git, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides, safetyWeeksDefault, safetyOverrides }) {
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
      country: extract(r, "country", ["country", "vendorcountry", "origincountry", "ประเทศ"], ["country", "ประเทศ"]),
      is_overseas: extract(r, "is_overseas", ["isoverseas", "overseas", "oversea", "ตปท", "ต่างประเทศ"], ["oversea", "ต่างประเทศ"]),
      material_type: extract(r, "material_type", ["materialtype", "type", "category", "matcategory", "ประเภท", "ประเภทวัสดุ"], ["type", "category", "ประเภท"]),
      moldFamily: extract(r, "mold_family", ["moldfamily", "moldset", "mold", "familyname", "familygroup"], ["mold", "family"]),
      unit_price: toNum(extract(r, "unit_price", ["unitprice", "price", "cost", "ราคา"], ["price"])),
      on_hand: toNum(extract(r, "on_hand", ["onhand", "stock", "inventory", "คงคลัง"], ["hand", "stock"])),
      lead_time_weeks: toNum(extract(r, "lead_time_weeks", ["leadtime", "lt", "leadtimeweeks"], ["lead", "lt"])),
      lot_size: toNum(extract(r, "lot_size", ["lotsize", "moq", "lot"], ["lot", "moq"]), 1),
      safety_stock: toNum(extract(Object.fromEntries(Object.entries(r).filter(([k]) => !/safety.*(week|wk|cover|factor)/i.test(String(k).replace(/[\s_\-]/g, "")))), "safety_stock", ["safetystock", "ss"], ["safety", "ss"]), 1),
      safety_weeks: extract(r, "safety_weeks", ["safetyweeks", "safetywk", "ssweeks", "safetycover", "safetycoverweeks"], ["safetyweek", "ssweek", "safetycover"]),
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

  // เติม demand ช่วงอนาคตให้อัตโนมัติ (forecast) เฉพาะ item ระดับบนสุด (ไม่มี parent ใน BOM) ที่ Demand Schedule
  // ยังไม่มีข้อมูลในสัปดาห์นั้น — ใช้ค่าเฉลี่ยจาก demand ในอดีต (history weeks) เป็นฐานพยากรณ์
  // ไม่ทับข้อมูลจริงที่มีอยู่แล้ว และไม่ทำกับ raw material โดยตรง (ค่าพยากรณ์จะไหลลงไปหา raw material
  // ผ่านการระเบิด BOM ตามปกติอยู่แล้วตอน planned release ของ FG ถูกคำนวณ)
  const confirmedDemand = {};
  order.forEach((it) => (confirmedDemand[it] = [...(grossReq[it] || new Array(totalCols).fill(0))])); // snapshot ก่อนเติม forecast — คือยอดจริงล้วนๆ
  const forecastFlag = {};
  order.forEach((it) => (forecastFlag[it] = new Array(totalCols).fill(false)));
  order.forEach((item) => {
    if (parentsOf[item] && parentsOf[item].length > 0) return; // เฉพาะ top-level (FG) เท่านั้น
    const gr = grossReq[item];
    if (!gr) return;
    let histTotal = 0;
    for (let i = 0; i < HW; i++) histTotal += gr[i] || 0;
    const avgDemand = HW > 0 ? histTotal / HW : 0;
    if (avgDemand <= 0) return; // ไม่มี demand ในอดีตให้พยากรณ์ ปล่อยเป็น 0 เหมือนเดิม
    for (let i = HW; i < totalCols; i++) {
      if (!gr[i]) {
        gr[i] = avgDemand;
        forecastFlag[item][i] = true;
      }
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
    if (!rawItem) return; // ต้องมี item code อย่างน้อย ถึงจะรู้ว่าเป็นของ item ไหน
    rawItem = String(rawItem).trim().toUpperCase();
    const hasWeek = rawWeek !== undefined && rawWeek !== null && String(rawWeek).trim() !== "";
    const idx = hasWeek ? parseWeekToIndex(rawWeek, startMonday) + HW : null;
    if (!poPendingByItem[rawItem]) poPendingByItem[rawItem] = new Array(totalCols).fill(0);
    if (!schedReceiptByItem[rawItem]) schedReceiptByItem[rawItem] = new Array(totalCols).fill(0);

    // เก็บเข้า "ตารางแสดงผล" เสมอ ไม่ว่าจะมีวันที่หรือไม่ก็ตาม (PO ที่ยังไม่ได้ใส่วันที่ก็ยังต้องเห็น จะได้กรอกวันที่เพิ่มทีหลังได้)
    const inRange = idx !== null && idx >= 0 && idx < totalCols;
    poDetailsByItem[rawItem] = poDetailsByItem[rawItem] || [];
    poDetailsByItem[rawItem].push({
      poNumber: String(extract(r, "po_number", ["ponumber", "ponum", "ponbr", "ponr", "pono", "po", "เลขที่po"], ["po", "ref", "doc"]) || "?").trim(),
      vendor: String(extract(r, "vendor", ["vendor", "supplier", "ผู้ขาย"], ["vendor", "sup"]) || "").trim(),
      quantity: toNum(rawQty), weekIdx: idx === null ? Infinity : idx, rawWeek: hasWeek ? rawWeek : "",
      weekLabel: inRange ? weekLabels[idx] : (hasWeek ? String(rawWeek) : "ยังไม่ระบุวันที่"),
      mondayDate: inRange ? weekMondayDates[idx] : "",
      outOfHorizon: !inRange,
      noDate: !hasWeek,
    });

    // ใส่เข้า array คำนวณ MRP เฉพาะที่มีวันที่และอยู่ในช่วง horizon เท่านั้น (array ความยาวคงที่)
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
    let safety = baseSafety * safetyFactor;
    let safetySource = "qty";
    let safetyWeeks = null;

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

    // สำหรับ coverage: ผสมยอดเบิกจริง (ถ้ามี) เข้ากับค่าเฉลี่ย Gross Requirements (BOM/Demand) ทั้ง
    // ประวัติ+อนาคตทั้ง horizon เสมอ (เฉลี่ยเท่ากัน) — ไม่ทิ้ง demand ข้างหน้าไปแม้จะมียอดเบิกจริงอยู่แล้ว
    // ถ้าไม่มียอดเบิกจริงเลย (pastActualAvg = 0) จะใช้ค่าเฉลี่ย Gross Requirements เต็มๆ ไปก่อน (ไม่ผสมกับ 0 เพราะจะทำให้ค่าต่ำลงผิดๆ)
    // (ไม่กระทบกับตัวเลข "PAST Xw AVG" ที่โชว์ในหัวตาราง — อันนั้นยังคงอ้างอิงยอดเบิกจริงเท่านั้นเหมือนเดิม)
    const grAllTotal = gr.reduce((a, b) => a + (b || 0), 0);
    const grAllAvgForCoverage = totalCols > 0 ? grAllTotal / totalCols : 0;
    // Items with actual usage but no plan at all (gross requirements are all zero) use the actual average
    // as-is, so coverage = on-hand / actual usage. Averaging with a zero plan would halve the usage rate.
    const hasGrossReq = grAllTotal > 0;
    const avgConsumptionForCoverage = pastActualAvg > 0
      ? (hasGrossReq ? (pastActualAvg + grAllAvgForCoverage) / 2 : pastActualAvg)
      : grAllAvgForCoverage;

    // Safety stock from usage: safety = average weekly consumption x safety weeks.
    // Weeks come from the item's safety_weeks column, otherwise from the global default (0 = off).
    // If there is no usage basis (average is 0), keep the fixed safety_stock quantity.
    // One average weekly consumption is used for safety stock AND for the average line on the stock chart:
    // the mean of the weekly demand that actually drives the projection, counting only weeks that have demand
    // (empty weeks are not averaged in). Items with no plan but with actual usage use the actual average instead.
    // If neither exists it falls back to the plan-based average used for coverage.
    const avgAdjFactor = Math.max(0.5, Math.min(2.0, consumptionFactor));
    let demandSum = 0;
    let demandWeeks = 0;
    for (let i = HW; i < totalCols; i++) {
      const v = (gr[i] || 0) * avgAdjFactor;
      if (v > 0) { demandSum += v; demandWeeks++; }
    }
    let safetyBasisAvg;
    let safetyBasisKind;
    if (demandWeeks > 0) { safetyBasisAvg = demandSum / demandWeeks; safetyBasisKind = "demand"; }
    else if (pastActualAvg > 0) { safetyBasisAvg = pastActualAvg * avgAdjFactor; safetyBasisKind = "actual"; }
    else { safetyBasisAvg = avgConsumptionForCoverage; safetyBasisKind = "plan"; }
    const safetyOv = safetyOverrides && safetyOverrides[item];
    const hasSafetyOv = !!safetyOv && Number.isFinite(safetyOv.value) && safetyOv.value >= 0;
    if (hasSafetyOv) {
      // Per-item manual override set in the dashboard (takes priority over the master file and the global default)
      if (safetyOv.mode === "weeks") {
        if (safetyBasisAvg > 0) {
          safety = Math.round(safetyBasisAvg * safetyOv.value * 100) / 100;
          safetySource = "weeks-manual";
          safetyWeeks = safetyOv.value;
        }
      } else {
        safety = safetyOv.value;
        safetySource = "manual";
      }
    } else {
      const rawWeeks = inv.safety_weeks;
      const hasItemWeeks = rawWeeks !== undefined && rawWeeks !== null && String(rawWeeks).trim() !== "";
      const weeksVal = hasItemWeeks ? Math.max(0, toNum(rawWeeks, 0)) : (safetyWeeksDefault > 0 ? safetyWeeksDefault : null);
      if (weeksVal !== null && safetyBasisAvg > 0) {
        safety = Math.round(safetyBasisAvg * weeksVal * 100) / 100;
        safetySource = "weeks";
        safetyWeeks = weeksVal;
      }
    }

    // NOTE: this "consumption" field is for display only and intentionally
    // does NOT include safetyFactor or adjustedFactor anymore (see FIX #2/#3
    // below) — it should reflect raw gross requirement so it ties out with
    // what's shown to the user. Safety buffer is applied separately via
    // `safety`, and the aggregate adjustment is applied via adjustedConsumption
    // (now also stored per-row so the numbers are traceable).
    // Items with no future plan (gross requirements are zero from the current week on) but with actual usage:
    // project on-hand using the past actual average as the weekly usage, so stock depletes and replenishment
    // is triggered at safety stock. Items that have any future plan are left untouched.
    const futureGrTotal = gr.slice(HW).reduce((a, b) => a + (b || 0), 0);
    // Items with no future plan are NOT depleted by past actual usage: projected on hand stays flat at the current stock.
    const usesActualUsage = false;
    const planGr = gr;
    const consumption = planGr.map((v) => v);

    // ฟังก์ชันจำลองการวางแผน (safety-stock trigger + lot sizing + lead time offset) แยกออกมาเรียกซ้ำได้
    // เพราะต้องคำนวณ 2 รอบ: รอบหนึ่งรวม forecast (สำหรับโชว์ที่ตัว FG เอง) อีกรอบใช้ยอด confirmed ล้วนๆ
    // (สำหรับส่งต่อไปกระตุ้นคำสั่งซื้อ raw material — ไม่ให้ forecast ไปดันยอดสั่งซื้อวัตถุดิบ)
    function simulatePlan(grArr) {
      const projOnHandL = new Array(totalCols).fill(null);
      const netReqL = new Array(totalCols).fill(null);
      const plannedReceiptL = new Array(totalCols).fill(null);
      const pastDueL = new Array(totalCols).fill(false);
      const adjustedConsumptionArrL = new Array(totalCols).fill(null);
      let onHandPrevL = effectiveOnHand;
      // Usage that was not deducted in a week with incoming goods; it is deducted in the following week.
      let deferredUsage = 0;
      const incomingFlagsL = new Array(totalCols).fill(false);
      for (let fi = 0; fi < horizon; fi++) {
        const i = HW + fi;
        const adjustedFactor = Math.max(0.5, Math.min(2.0, consumptionFactor));
        const adjustedConsumption = (grArr[i] || 0) * adjustedFactor;
        adjustedConsumptionArrL[i] = adjustedConsumption;
        const expiredThisWeek = expiredByWeek[i] || 0;
        const overrideReceiptKey = `${item}::${i}`;
        const manualReceipt = receiptOverrides && receiptOverrides[overrideReceiptKey] !== undefined ? receiptOverrides[overrideReceiptKey] : 0;
        // Weeks with incoming goods (PO / GIT / manual receipt): add the goods first, deduct the usage next week.
        const hasIncoming = (sr[i] || 0) + manualReceipt > 0;
        incomingFlagsL[i] = hasIncoming;
        const usageNow = hasIncoming ? 0 : adjustedConsumption + deferredUsage;
        let proj = onHandPrevL + sr[i] - usageNow - expiredThisWeek;
        let ordered = 0;
        const releaseIdx = i - leadTime;
        if (receiptOverrides && receiptOverrides[overrideReceiptKey] !== undefined) {
          ordered = receiptOverrides[overrideReceiptKey];
        } else {
          // Automatic order planning is switched off (AUTO_ORDER_PLANNING = false): receipts only come from manual entries.
          if (AUTO_ORDER_PLANNING && proj < safety) {
            if (releaseIdx < HW && planOverrides && planOverrides[`${item}::${HW}`] !== undefined) {
              ordered = 0;
            } else {
              const need = safety - proj;
              ordered = Math.ceil(need / lotSize) * lotSize;
            }
          }
        }
        plannedReceiptL[i] = ordered;
        proj += ordered;
        projOnHandL[i] = proj;
        netReqL[i] = Math.max(0, safety - (onHandPrevL + sr[i] - usageNow - expiredThisWeek));
        deferredUsage = hasIncoming ? deferredUsage + adjustedConsumption : 0;
        onHandPrevL = proj;
      }
      const calcPlannedReleaseL = new Array(totalCols).fill(0);
      for (let fi = 0; fi < horizon; fi++) {
        const i = HW + fi;
        if (plannedReceiptL[i] > 0) {
          const releaseIdx = i - leadTime;
          if (releaseIdx >= HW) {
            calcPlannedReleaseL[releaseIdx] += plannedReceiptL[i];
          } else {
            calcPlannedReleaseL[HW] += plannedReceiptL[i];
            pastDueL[HW] = true;
          }
        }
      }
      const finalPlannedReleaseL = calcPlannedReleaseL.map((v, idx) => {
        const key = `${item}::${idx}`;
        return planOverrides && planOverrides[key] !== undefined ? planOverrides[key] : v;
      });
      return { projOnHand: projOnHandL, netReq: netReqL, plannedReceipt: plannedReceiptL, pastDue: pastDueL, adjustedConsumptionArr: adjustedConsumptionArrL, finalPlannedRelease: finalPlannedReleaseL, incomingFlags: incomingFlagsL };
    }

    // รอบหลัก: ใช้ gr เต็ม (confirmed + forecast) — ค่านี้เอาไปโชว์ที่ตัว item เองทุกแถวเหมือนเดิมทุกอย่าง
    const mainSim = simulatePlan(planGr);
    const { projOnHand, netReq, plannedReceipt, pastDue, adjustedConsumptionArr, finalPlannedRelease } = mainSim;

    // Projected on hand is only shown up to the last week that has demand (plus the following weeks that settle deferred usage).
    // Items with no demand at all keep the full horizon.
    let projEndIdx = totalCols - 1;
    {
      let lastDemandIdx = -1;
      for (let i = totalCols - 1; i >= HW; i--) {
        if ((adjustedConsumptionArr[i] || 0) > 0) { lastDemandIdx = i; break; }
      }
      if (lastDemandIdx >= 0) {
        projEndIdx = lastDemandIdx;
        while (projEndIdx < totalCols - 1 && mainSim.incomingFlags[projEndIdx]) projEndIdx++;
        for (let i = projEndIdx + 1; i < totalCols; i++) projOnHand[i] = null;
      }
    }

    // รอบสำหรับ cascade ไปยัง raw material: ถ้า item นี้มีสัปดาห์ที่เป็น forecast ให้คำนวณแยกโดยตัด forecast
    // ออกก่อน (แทนที่ด้วย 0) แล้วใช้ผลจากรอบนี้ในการกระตุ้นคำสั่งซื้อของ component แทน ไม่ใช่ finalPlannedRelease
    const itemForecastFlag = forecastFlag[item] || new Array(totalCols).fill(false);
    const hasForecastWeeks = itemForecastFlag.some(Boolean);
    let cascadeRelease = finalPlannedRelease;
    if (hasForecastWeeks) {
      const confirmedOnlyGr = gr.map((v, i) => (itemForecastFlag[i] ? 0 : v));
      cascadeRelease = simulatePlan(confirmedOnlyGr).finalPlannedRelease;
    }

    const kids = childrenOf[item] || [];
    kids.forEach(({ component, qty_per }) => {
      grossReq[component] = grossReq[component] || new Array(totalCols).fill(0);
      for (let i = 0; i < totalCols; i++) {
        if (i < HW) {
          const pastReleaseIdx = i - leadTime;
          if (pastReleaseIdx >= 0) {
            grossReq[component][pastReleaseIdx] += (gr[i] || 0) * qty_per;
          }
        } else if (AUTO_ORDER_PLANNING) {
          grossReq[component][i] += (cascadeRelease[i] || 0) * qty_per;
        } else {
          // Automatic order planning is off: there are no planned releases to explode, so explode the parent's
          // own demand directly (confirmed demand only, forecast weeks excluded), offset by the parent's lead time.
          // Needs that would fall before the current week are placed in the current week.
          const need = itemForecastFlag[i] ? 0 : (gr[i] || 0);
          if (need > 0) {
            const idx = Math.max(HW, i - leadTime);
            grossReq[component][idx] += need * qty_per;
          }
        }
      }
    });

    records[item] = {
      item,
      description: inv.description || item,
      unit: inv.unit || "EA",
      vendor: String(inv.vendor || "").trim(),
      country: String(inv.country || "").trim(),
      // ตัดสินว่า vendor เป็นต่างประเทศ (oversea) หรือไม่ — ใช้คอลัมน์ที่กรอกมาตรงๆ ก่อนเป็นอันดับแรก
      // (is_overseas ชัดเจนสุด, รองลงมาคือ country ถ้าไม่ใช่ไทย) ถ้าไม่มีทั้งสองคอลัมน์เลยค่อย fallback ไปเดาจากชื่อ vendor
      isOverseas: (() => {
        const rawFlag = String(inv.is_overseas || "").trim().toLowerCase();
        if (rawFlag) return ["yes", "y", "true", "1", "oversea", "overseas", "ต่างประเทศ"].includes(rawFlag);
        const rawCountry = String(inv.country || "").trim().toLowerCase();
        if (rawCountry) return !["thailand", "th", "ไทย", "thai"].includes(rawCountry);
        return isOverseasVendor(inv.vendor);
      })(),
      moldFamily: String(inv.moldFamily || "").trim(),
      materialType: String(inv.material_type || "").trim(),
      unitPrice: toNum(inv.unit_price, 0),
      level: level[item] || 0,
      leadTime,
      lotSize,
      safety,
      safetySource,
      safetyWeeks,
      safetyBasisAvg,
      safetyBasisKind,
      projEndIdx,
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
      isForecast: forecastFlag[item] || new Array(totalCols).fill(false),
      // แยกยอด demand ให้เห็นชัดว่าอันไหนคือยอดจริง (confirmed) อันไหนคือค่าพยากรณ์ (forecast)
      demandConfirmed: gr.map((v, i) => ((forecastFlag[item] && forecastFlag[item][i]) ? null : ((confirmedDemand[item] && confirmedDemand[item][i]) || null))),
      demandForecast: gr.map((v, i) => ((forecastFlag[item] && forecastFlag[item][i]) ? v : null)),
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
      avgConsumptionForCoverage,
      hasGrossReq,
      usesActualUsage,
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

// ---------- Shared settings (one JSON file in SharePoint, through /api/settings) ----------
// Planning data the admin edits is shared with everyone. View settings (horizon, history weeks) stay per browser.
const SHARED_SETTING_KEYS = ["orderStatus", "planOverrides", "receiptOverrides", "poOverrides", "draftRefs", "shipmentMethod", "shipmentTracking", "safetyWeeksDefault", "safetyOverrides", "planApplyFamily", "demandVersionNames", "activeDemandVersion2"];
const SHARED_SAVE_DELAY_MS = 1200;
const SHARED_POLL_MS = 60000;
function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(",")}}`;
}
async function sharedSettingsGet() {
  const r = await fetch("/api/settings", { cache: "no-store" });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}
async function sharedSettingsPut(data, baseVersion) {
  const r = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data, baseVersion }) });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}
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

const PA_BASE_URL = "https://defaultb0a451413bd9434690304b8b30ca77.f2.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/98efa377cbb84f8f92a8cecf69d97cf9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GYjaw1ng23DOassgX6tsKKM2JEA88g_dSH7pun4kOw8";

function parseCSV(file, onDone) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (res) => onDone(res.data),
  });
}

function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows);
  // ใส่ UTF-8 BOM (\uFEFF) นำหน้า กัน Excel เปิดแล้วตัวอักษรไทย/ภาษาอื่นกลายเป็นตัวอักษรมั่วๆ (mojibake)
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
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

function KPI({ label, value, tone, icon: Icon, mobile, onClick }) {
  const toneColor = tone === "rust" ? COLORS.rust : tone === "amber" ? COLORS.amber : tone === "moss" ? COLORS.moss : COLORS.steelDeep;
  return (
    <div onClick={onClick} style={{
      background: COLORS.card, border: `1px solid ${COLORS.paperLine}`, borderTop: `3px solid ${toneColor}`,
      borderRadius: COLORS.radius, boxShadow: COLORS.shadow,
      padding: "14px 16px", flex: mobile ? "0 0 auto" : 1, minWidth: mobile ? 160 : 150,
      scrollSnapAlign: mobile ? "start" : "none",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      cursor: onClick ? "pointer" : "default",
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

function StockChart({ rec, weekLabels, historyWeeks, compact, showLabels, onWeekClick, selectedWeek, size, showUsage }) {
  // size: "M" (default), "L" or "XL" - larger sizes use a smaller drawing area so everything is magnified on screen
  const cfgs = {
    M: { W: 960, H: 340, fs: 9.5, tick: 10, m: 5, lw: 2.2, perLabel: 12 },
    L: { W: 1000, H: 520, fs: 11.5, tick: 12, m: 7, lw: 3, perLabel: 14 },
    XL: { W: 760, H: 470, fs: 11.5, tick: 12, m: 7, lw: 3, perLabel: 9 },
  };
  const cfg = compact ? { W: 320, H: 130, fs: 8, tick: 8, m: 5, lw: 1.5, perLabel: 4 } : (cfgs[size] || cfgs.M);
  const { W, fs, tick, m, lw } = cfg;
  // Optional average-usage line drawn on the same axis as the stock line
  const usageOn = !compact && !!showUsage;
  // Every week gets an x label; when the weeks are too tight the labels are rotated and the chart gets extra height
  // The x axis always spans the selected horizon; the stock line itself stops at the last week with demand (later weeks are empty)
  const endIdx = rec.projOnHand.length - 1;
  const nWeeks = endIdx + 1 - historyWeeks;
  const rotateX = !compact && (W - 94) / Math.max(1, nWeeks - 1) < 46;
  const weekAreaH = rotateX ? 62 : 34;   // space for the week labels
  const monthRowH = compact ? 0 : 24;    // month row under the week labels
  const padB = compact ? 18 : weekAreaH + monthRowH + 6;
  const extraB = compact ? 0 : padB - 40;
  const H = cfg.H + extraB;
  const pad = compact ? { l: 38, r: 8, t: 8, b: 18 } : { l: 72, r: 24, t: 24, b: padB };
  const start = historyWeeks;
  const total = endIdx + 1;
  const n = total - start;
  if (n < 2) return null;
  const pts = [];
  for (let i = start; i < total; i++) {
    pts.push({
      i, k: i - start, label: weekLabels[i],
      stock: rec.projOnHand[i],
      usage: rec.adjustedConsumption[i] || 0,
      inc: (rec.poPending[i] || 0) + (rec.git[i] || 0),
      planned: rec.plannedReceipt[i] || 0,
    });
  }
  const vals = pts.map((p) => p.stock).filter((v) => v !== null && v !== undefined);
  // Average weekly demand (weeks with demand only) - the same figure used to size safety stock; plotted on the stock axis
  const avgUsage = usageOn && rec.safetyBasisAvg > 0 ? rec.safetyBasisAvg : 0;
  // Y axis in whole numbers: round step (1, 2, 5 x 10^n), bounds snapped to the step
  const rawMin = Math.min(0, ...vals, rec.safety);
  let rawMax = Math.max(...vals, rec.safety, avgUsage, 1);
  if (rawMax === rawMin) rawMax = rawMin + 1;
  const niceStep = (v) => {
    const e = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  };
  const yStep = Math.max(1, niceStep((rawMax - rawMin) / (compact ? 4 : 5)));
  const minV = Math.floor(rawMin / yStep) * yStep;
  const maxV = Math.ceil(rawMax / yStep) * yStep;
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const x = (k) => pad.l + (k / (n - 1)) * innerW;
  const y = (v) => pad.t + (1 - (v - minV) / (maxV - minV)) * innerH;
  const colW = innerW / (n - 1);
  const base = y(Math.max(minV, 0));
  const yb = pad.t + innerH;
  const line = pts.filter((p) => p.stock !== null && p.stock !== undefined);
  const linePath = line.map((p, idx) => `${idx === 0 ? "M" : "L"}${x(p.k).toFixed(1)},${y(p.stock).toFixed(1)}`).join(" ");
  const areaPath = line.length > 1
    ? `${linePath} L${x(line[line.length - 1].k).toFixed(1)},${base.toFixed(1)} L${x(line[0].k).toFixed(1)},${base.toFixed(1)} Z`
    : "";
  const yTicks = [];
  for (let t = minV; t <= maxV + 1e-9; t += yStep) yTicks.push(t);
  const valEvery = Math.max(1, Math.ceil(n / cfg.perLabel));
  const xEvery = compact ? valEvery : 1;
  const fmt = (v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);
  const num = (v) => Math.round(v).toLocaleString();
  const ltK = rec.leadTime > 0 && rec.leadTime < n ? rec.leadTime : null;
  const safetyY = y(rec.safety);
  const labelPts = new Set();
  if (showLabels && !compact && line.length > 0) {
    line.forEach((p) => { if (p.k % valEvery === 0) labelPts.add(p.k); });
    labelPts.add(line[line.length - 1].k);
    labelPts.add(line.reduce((mn, p) => (p.stock < mn.stock ? p : mn), line[0]).k);
  }
  const poByWeek = {};
  (rec.poPendingDetails || []).forEach((po) => {
    if (po.noDate || po.weekIdx === undefined || po.weekIdx === Infinity) return;
    (poByWeek[po.weekIdx] = poByWeek[po.weekIdx] || []).push(po.poNumber);
  });
  const poText = (i) => {
    const list = poByWeek[i] || [];
    if (list.length === 0) return "";
    return list.length <= 2 ? list.join(", ") : `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
  };
  const monthGroups = [];
  if (!compact) {
    pts.forEach((p) => {
      const ml = weekLabelMonth(p.label);
      const key = ml ? `${ml.year}-${ml.month}` : "?";
      const last = monthGroups[monthGroups.length - 1];
      if (last && last.key === key) last.endK = p.k;
      else monthGroups.push({ key, startK: p.k, endK: p.k, month: ml ? ml.month : null, year: ml ? ml.year : null });
    });
  }
  const monthTop = yb + weekAreaH + 2;
  const halo = { stroke: "#fff", strokeWidth: 3.5, paintOrder: "stroke", pointerEvents: "none" };
  const mono = "'IBM Plex Mono', monospace";
  // vertical positions of the marker squares and their labels (stacked above the x axis)
  const incTop = yb - m;
  const planTop = yb - 2 * m - 1;
  const planLabelY = planTop - 3;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {yTicks.map((t, idx) => (
        <g key={idx}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={COLORS.paperLine} strokeWidth="1" />
          <text x={pad.l - 5} y={y(t) + tick * 0.35} textAnchor="end" fontSize={tick} fill={COLORS.inkSoft} fontFamily={mono}>{compact ? fmt(t) : Math.round(t).toLocaleString()}</text>
        </g>
      ))}
      {rec.safety > minV && (
        <rect x={pad.l} y={safetyY} width={innerW} height={Math.max(0, pad.t + innerH - safetyY)} fill={COLORS.rust} opacity="0.07" />
      )}
      {!compact && selectedWeek !== null && selectedWeek !== undefined && selectedWeek >= start && selectedWeek < total && (
        <rect x={x(selectedWeek - start) - colW / 2} y={pad.t} width={colW} height={innerH} fill={COLORS.steel} opacity="0.14" pointerEvents="none" />
      )}
      {areaPath && <path d={areaPath} fill={COLORS.steel} opacity="0.12" />}
      <line x1={pad.l} x2={W - pad.r} y1={safetyY} y2={safetyY} stroke={COLORS.amber} strokeWidth={compact ? 1.5 : 2} strokeDasharray="6 4" />
      {!compact && showLabels && (
        <text x={W - pad.r} y={safetyY - 5} textAnchor="end" fontSize={fs + 1} fontWeight="700" fill={COLORS.amber} fontFamily={mono} {...halo}>{`SS ${num(rec.safety)}`}</text>
      )}
      {ltK !== null && (
        <g>
          <line x1={x(ltK)} x2={x(ltK)} y1={pad.t} y2={pad.t + innerH} stroke={COLORS.steel} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
          {!compact && <text x={x(ltK) + 4} y={pad.t + fs + 1} fontSize={fs} fill={COLORS.steel} fontFamily={mono}>lead time {rec.leadTime} wk</text>}
        </g>
      )}
      <path d={linePath} fill="none" stroke={COLORS.steel} strokeWidth={lw} strokeLinejoin="round" />
      {pts.map((p) => (
        <g key={p.i}>
          {p.inc > 0 && <rect x={x(p.k) - m / 2} y={incTop} width={m} height={m} fill={COLORS.moss} />}
          {p.planned > 0 && <rect x={x(p.k) - m / 2} y={planTop} width={m} height={m} fill={COLORS.steel} />}
          {p.stock !== null && p.stock !== undefined && p.stock < rec.safety && (
            <circle cx={x(p.k)} cy={y(p.stock)} r={compact ? 2 : m * 0.6} fill={COLORS.rust} />
          )}
          {!compact && showLabels && p.planned > 0 && (
            <text x={x(p.k)} y={planLabelY} textAnchor="middle" fontSize={fs} fontWeight="700" fill={COLORS.steel} fontFamily={mono} {...halo}>{num(p.planned)}</text>
          )}
          {!compact && showLabels && poText(p.i) && (
            <text x={x(p.k)} y={(p.planned > 0 ? planLabelY - fs - 3 : incTop - 3) - fs - 2} textAnchor="middle" fontSize={fs - 1} fontWeight="600" fill={COLORS.moss} fontFamily={mono} {...halo}>{poText(p.i)}</text>
          )}
          {!compact && showLabels && p.inc > 0 && (
            <text x={x(p.k)} y={p.planned > 0 ? planLabelY - fs - 3 : incTop - 3} textAnchor="middle" fontSize={fs} fontWeight="700" fill={COLORS.moss} fontFamily={mono} {...halo}>{num(p.inc)}</text>
          )}
          {labelPts.has(p.k) && p.stock !== null && p.stock !== undefined && (
            <text x={x(p.k)} y={y(p.stock) - 8 < pad.t + fs ? y(p.stock) + fs + 8 : y(p.stock) - 8} textAnchor="middle" fontSize={fs + 0.5} fontWeight="700" fill={COLORS.ink} fontFamily={mono} {...halo}>{num(p.stock)}</text>
          )}
        </g>
      ))}
      {avgUsage > 0 && (
        <g>
          <line x1={pad.l} x2={W - pad.r} y1={y(avgUsage)} y2={y(avgUsage)} stroke="#7C3AED" strokeWidth={compact ? 1.2 : 2} strokeDasharray="7 4" />
          {showLabels && (
            <text x={pad.l + 6} y={y(avgUsage) - 5} textAnchor="start" fontSize={fs + 0.5} fontWeight="700" fill="#6D28D9" fontFamily={mono} {...halo}>{`${rec.safetyBasisKind === "demand" ? "avg demand" : "avg usage"} ${num(avgUsage)}/wk`}</text>
          )}
        </g>
      )}
      {!compact && pts.map((p) => (
        <line key={`tk-${p.i}`} x1={x(p.k)} x2={x(p.k)} y1={yb} y2={yb + 4} stroke={COLORS.inkSoft} strokeWidth="1" />
      ))}
      {pts.filter((p) => p.k % xEvery === 0).map((p) => (rotateX ? (
        <text key={p.i} x={x(p.k) + 3} y={yb + 9} textAnchor="end" transform={`rotate(-90 ${x(p.k) + 3} ${yb + 9})`}
          fontSize={Math.max(7, Math.min(tick, colW * 0.95))} fill={selectedWeek === p.i ? COLORS.steelDeep : COLORS.inkSoft} fontWeight={selectedWeek === p.i ? 700 : 400} fontFamily={mono}>{p.label}</text>
      ) : (
        <text key={p.i} x={x(p.k)} y={compact ? H - 4 : yb + 24} textAnchor="middle" fontSize={compact ? 8 : tick} fill={COLORS.inkSoft} fontFamily={mono}>{p.label}</text>
      )))}
      {!compact && monthGroups.map((g, gi) => {
        const x0 = Math.max(pad.l, x(g.startK) - colW / 2);
        const x1 = Math.min(W - pad.r, x(g.endK) + colW / 2);
        const wpx = x1 - x0;
        const name = g.month === null ? "" : MONTH_ABBR[g.month];
        const full = gi === 0 || g.month === 0 ? `${name} ${g.year}` : name;
        const cw = tick * 0.62;
        const shown = wpx >= full.length * cw ? full : (wpx >= name.length * cw ? name : name.slice(0, 1));
        return (
          <g key={`mg-${gi}`}>
            {gi % 2 === 0 && <rect x={x0} y={monthTop} width={wpx} height={monthRowH - 4} fill={COLORS.steel} opacity="0.09" />}
            <line x1={x0} x2={x0} y1={monthTop} y2={monthTop + monthRowH - 4} stroke={COLORS.inkSoft} strokeWidth="1" opacity="0.5" />
            {gi > 0 && <line x1={x0} x2={x0} y1={pad.t} y2={yb} stroke={COLORS.inkSoft} strokeWidth="1" strokeDasharray="2 4" opacity="0.35" />}
            <text x={(x0 + x1) / 2} y={monthTop + monthRowH - 9} textAnchor="middle" fontSize={tick} fontWeight="700" fill={COLORS.steelDeep} fontFamily={mono}>{shown}</text>
          </g>
        );
      })}
      {!compact && pts.map((p) => (
        <rect key={`hit-${p.i}`} x={x(p.k) - colW / 2} y={pad.t} width={colW} height={innerH} fill="transparent"
          style={{ cursor: onWeekClick ? "pointer" : "default" }}
          onClick={() => { if (onWeekClick) onWeekClick(p.i); }}>
          <title>{`${p.label}\nOn hand: ${p.stock === null || p.stock === undefined ? "-" : num(p.stock)}\nUsage: ${num(p.usage)}\nIncoming (PO/GIT): ${num(p.inc)}${poText(p.i) ? ` [${(poByWeek[p.i] || []).join(", ")}]` : ""}\nPlanned receipt: ${num(p.planned)}${onWeekClick ? "\n(click to adjust planned receipt)" : ""}`}</title>
        </rect>
      ))}
    </svg>
  );
}

function RecordGrid({ rec, weeks, weekLabels, weekDates, historyWeeks, onAdjustPlan, onResetPlanOverride, onAdjustReceipt, onResetReceiptOverride, onAdjustPOQty, poOriginalQtyMap, onResetPOQty, onAdjustPOWeek, onResetPOWeek, poOriginalMap, planOverrides, receiptOverrides, isMobile, draftRefs, onAdjustDraftRef, moldFamilyMembers, isReadOnly, safetyOverride, onSetSafetyOverride }) {
  if (!rec) return null;
  const rows = [
    { label: "Gross requirements (calculated)", data: rec.grossReq, kind: "gr" },
    { label: "  \u2514 Demand (confirmed)", data: rec.demandConfirmed, kind: "demandconfirmed" },
    { label: "  \u2514 Demand (forecast)", data: rec.demandForecast, kind: "demandforecast" },
    { label: `Consumption used for planning (×${rec.consumptionFactor.toFixed(2)})${rec.usesActualUsage ? " · actual avg" : ""}`, data: rec.consumption, kind: "consumption" },
    { label: "Actual consumption (issued)", data: rec.actualConsumption, kind: "actual" },
   { label: "Variance (Qty / %)", data: rec.consumptionVariance, kind: "variance" },
    { label: "PO pending", data: rec.poPending, kind: "po" },
    { label: "Goods in transit (GIT)", data: rec.git, kind: "git" },
    { label: "Expired quantity", data: rec.expiredByWeek, kind: "expline" },
    { label: "Projected on hand", data: rec.projOnHand, kind: "poh" },
    { label: "Safety stock (SS)", data: rec.projOnHand.map((v) => (v === null || v === undefined ? null : rec.safety)), kind: "ssline" },
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
          ["LOT SIZE / SS", (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span>
                {rec.safetySource === "manual"
                  ? `${rec.lotSize} / ${rec.safety} (manual)`
                  : rec.safetySource === "weeks" || rec.safetySource === "weeks-manual"
                    ? `${rec.lotSize} / ${rec.safety} (${rec.safetyWeeks} wk x ${Math.round(rec.safetyBasisAvg * 100) / 100}/wk${rec.safetySource === "weeks-manual" ? ", manual" : ""})`
                    : `${rec.lotSize} / ${rec.baseSafety}${rec.safetyFactor !== 1 ? ` ×${rec.safetyFactor} = ${rec.safety}` : ""}`}
              </span>
              {(!isReadOnly || safetyOverride) && (
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", fontWeight: 400 }} onClick={(e) => e.stopPropagation()}>
                  {[["qty", "qty"], ["weeks", "wk"]].map(([mode, label]) => (
                    <input key={`${rec.item}-${mode}-${safetyOverride ? `${safetyOverride.mode}${safetyOverride.value}` : "none"}`}
                      type="number" min={0} step="any" disabled={isReadOnly}
                      defaultValue={safetyOverride && safetyOverride.mode === mode ? safetyOverride.value : ""}
                      placeholder={label}
                      title={mode === "qty" ? "Set safety stock for this item as a fixed quantity (clear the box to remove)" : "Set safety stock for this item as weeks of average usage (clear the box to remove)"}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v === "" && !(safetyOverride && safetyOverride.mode === mode)) return;
                        onSetSafetyOverride(rec.item, mode, v);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                      style={{
                        width: 46, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                        border: `1px solid ${safetyOverride && safetyOverride.mode === mode ? COLORS.amber : COLORS.paperLine}`,
                        borderRadius: COLORS.radiusSm, background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink, padding: "1px 3px",
                      }} />
                  ))}
                  {safetyOverride && !isReadOnly && (
                    <button onClick={() => onSetSafetyOverride(rec.item, "qty", "")} title="Remove manual safety stock" style={{
                      border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber, fontSize: 11, padding: 0, lineHeight: 1,
                    }}>&#8635;</button>
                  )}
                </div>
              )}
            </div>
          )],
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
        {rec.description} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 400, color: COLORS.inkSoft }}>({rec.unit}){rec.vendor ? ` · ${rec.vendor}` : ""}{rec.materialType ? ` · ${rec.materialType}` : ""}</span>
      </div>
      {rec.hasParents && rec.parentsCount >= 1 && (
        <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel, display: "flex", alignItems: "center", gap: 4 }}>
          <Layers size={11} /> {rec.parentsCount > 1 ? `common component — used in ${rec.parentsCount} assemblies` : `used in`}: {rec.parentItems.join(", ")}
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
                            placeholder={p.noDate ? "กรอกวันที่" : ""}
                            title="e.g. 26CW30 or 3"
                            style={{
                              width: 56, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                              border: `1px solid ${isWeekOverridden ? COLORS.amber : p.noDate ? COLORS.amber : COLORS.paperLine}`, background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink, padding: "1px 3px",
                            }} />
                        </div>
                        {p.noDate ? (
                          <span title="PO ใบนี้ยังไม่ได้ระบุวันที่ครบกำหนด — กรอกในช่อง DUE WK ด้านบนแล้วจะถูกนำไปคำนวณ MRP ให้อัตโนมัติ" style={{
                            fontSize: 8.5, padding: "0 5px", color: COLORS.amber, borderRadius: 999,
                            border: `1px solid ${COLORS.amber}`, background: "#FEF3C7", whiteSpace: "nowrap", fontWeight: 600,
                          }}>NO DATE</span>
                        ) : p.outOfHorizon && (
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
                  if (r.kind === "gr" && rec.isForecast && rec.isForecast[i] && v > 0) { bg = "#EDE9FE"; color = "#6D28D9"; }
                  if (r.kind === "demandconfirmed" && v > 0) { bg = "#DCFCE7"; color = COLORS.moss; }
                  if (r.kind === "demandforecast" && v > 0) { bg = "#EDE9FE"; color = "#6D28D9"; }
                  if (r.kind === "consumption" && rec.usesActualUsage && i >= historyWeeks && v > 0) { bg = "#DCFCE7"; color = COLORS.moss; }
                  if (r.kind === "consumption" && rec.consumptionFactor !== 1 && v > 0) { bg = "#E0E7FF"; color = COLORS.steelDeep; }
                  if (r.kind === "actual" && v > 0) { bg = "#EDE9FE"; color = "#6D28D9"; }
                  if (r.kind === "ssline" && v !== null) {
                    // แดง: stock ต่ำกว่าหรือเท่ากับ safety stock ของ item นั้นเอง (รวมกรณีเหลือ 0 พอดี)
                    // เหลือง: ยังไม่ต่ำกว่า SS แต่ buffer ที่เหลือ (stock - SS) น้อยกว่าอัตราเบิกใช้เฉลี่ย 1 สัปดาห์ (Past AVG) — ใกล้ทะลุ SS ภายในไม่ถึง 1 สัปดาห์
                    // ใช้ค่าที่ปัดเศษแล้ว (Math.round) ในการเช็คสี ให้ตรงกับตัวเลขที่โชว์บนตารางจริงๆ (กันกรณีค่าจริงเช่น 0.4 แต่โชว์ "0")
                    // The row shows the SS value itself; the colour compares real projected on-hand against it
                    // (margin = on-hand - SS) without subtracting SS from the displayed stock.
                    const marginRaw = rec.projOnHand[i] === null || rec.projOnHand[i] === undefined ? 0 : rec.projOnHand[i] - v;
                    const vRounded = Math.round(marginRaw);
                    if (vRounded <= 0) { bg = COLORS.rust; color = "#fff"; }
                    else if (rec.pastActualAvg > 0 && vRounded < rec.pastActualAvg) { bg = "#FEF3C7"; color = COLORS.amber; }
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
                        ) : (r.kind === "ssline" ? Math.round(v * 100) / 100 : r.kind === "poh" ? Math.round(v) : (v ? Math.round(v) : "—")))
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
  const [safetyWeeksDefault, setSafetyWeeksDefault] = useState(0);
  const [planApplyFamily, setPlanApplyFamily] = useState(true); // a plan typed for one item is applied to its whole mold family
  const [safetyOverrides, setSafetyOverrides] = useState({}); // item -> { mode: "qty" | "weeks", value }
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
  const [kpiModal, setKpiModal] = useState(null); // { title, columns, rows: [{item, cells}] }
  const [kpiModalFilter, setKpiModalFilter] = useState("");
  const [showCoverage, setShowCoverage] = useState(false);
  const [showShipment, setShowShipment] = useState(false);
  const [showStockChart, setShowStockChart] = useState(false);
  const [showDemandVer, setShowDemandVer] = useState(false);
  const [showInvTotal, setShowInvTotal] = useState(false);
  const [showFgRisk, setShowFgRisk] = useState(false);
  const [demandVersions, setDemandVersions] = useState([]); // [{ name, rows, source: "sharepoint" | "upload" }]
  const [savedVersionNames, setSavedVersionNames] = useState([]); // weekly demand files added by name (shared)
  const [activeDemandVersion, setActiveDemandVersion] = useState("__latest__"); // "__latest__" = newest weekly file found, "" = the current Demand Schedule file, otherwise a version name
  const [stockChartFilter, setStockChartFilter] = useState("");
  const [stockChartType, setStockChartType] = useState("");
  const [stockChartVendor, setStockChartVendor] = useState("");
  const [stockChartLimit, setStockChartLimit] = useState(24);
  const [stockChartLabels, setStockChartLabels] = useState(true);
  const [stockChartGroup, setStockChartGroup] = useState(true);
  const [stockChartModal, setStockChartModal] = useState(false);
  const [stockChartSize, setStockChartSize] = useState("L");
  const [stockChartUsage, setStockChartUsage] = useState(true);
  useEffect(() => {
    if (!stockChartModal) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setStockChartModal(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stockChartModal]);
  const [stockChartWeek, setStockChartWeek] = useState(null);
  const [shipmentFilter, setShipmentFilter] = useState("");
  const [shipmentMethod, setShipmentMethod] = useState({}); // "item::poNumber" -> "sea" | "air" (override จากค่าที่ระบบแนะนำ)
  const [shipmentTracking, setShipmentTracking] = useState({}); // "item::poNumber" -> { status, actualArrivalDate }
  const SEA_WEEKS = 10;
  const AIR_WEEKS = 2;
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
      const [savedOrderStatus, savedPlanOverrides, savedReceiptOverrides, savedHorizon, savedHistoryWeeks, savedPoOverrides, savedDraftRefs, savedShipmentMethod, savedShipmentTracking, savedSafetyWeeks, savedSafetyOverrides, savedPlanFamily, savedDemandVerNames, savedActiveDemandVer] = await Promise.all([
        storageGet("orderStatus"),
        storageGet("planOverrides"),
        storageGet("receiptOverrides"),
        storageGet("horizon"),
        storageGet("historyWeeks"),
        storageGet("poOverrides"),
        storageGet("draftRefs"),
        storageGet("shipmentMethod"),
        storageGet("shipmentTracking"),
        storageGet("safetyWeeksDefault"),
        storageGet("safetyOverrides"),
        storageGet("planApplyFamily"),
        storageGet("demandVersionNames"),
        storageGet("activeDemandVersion2"),
      ]);
      if (savedOrderStatus) setOrderStatus(savedOrderStatus);
      if (savedPlanOverrides) setPlanOverrides(savedPlanOverrides);
      if (savedReceiptOverrides) setReceiptOverrides(savedReceiptOverrides);
      if (savedHorizon !== null && savedHorizon !== undefined) setHorizon(savedHorizon);
      if (savedHistoryWeeks !== null && savedHistoryWeeks !== undefined) setHistoryWeeks(savedHistoryWeeks);
      if (savedPoOverrides) setPoOverrides(savedPoOverrides);
      if (savedDraftRefs) setDraftRefs(savedDraftRefs);
      if (savedShipmentMethod) setShipmentMethod(savedShipmentMethod);
      if (savedShipmentTracking) setShipmentTracking(savedShipmentTracking);
      if (savedSafetyWeeks !== null && savedSafetyWeeks !== undefined) setSafetyWeeksDefault(Number(savedSafetyWeeks) || 0);
      if (savedSafetyOverrides) setSafetyOverrides(savedSafetyOverrides);
      if (savedPlanFamily !== null && savedPlanFamily !== undefined) setPlanApplyFamily(!!savedPlanFamily);
      if (typeof savedActiveDemandVer === "string") setActiveDemandVersion(savedActiveDemandVer);
      if (Array.isArray(savedDemandVerNames)) {
        setSavedVersionNames(savedDemandVerNames);
        savedDemandVerNames.forEach((nm) => { fetchDemandVersion(nm).then((res) => { if (res.ok) setDemandVersions((prev) => (prev.some((v) => v.name === nm) ? prev : [...prev, { name: nm, rows: res.rows, source: "sharepoint" }])); }); });
      }
      setSettingsLoaded(true);
    })();
  }, []);

  // บันทึกอัตโนมัติทุกครั้งที่มีการเปลี่ยนแปลง (รอให้โหลดค่าเก่าเสร็จก่อน กันเขียนทับด้วยค่าว่างตอนเปิดหน้า)
  useEffect(() => { if (settingsLoaded) storageSet("orderStatus", orderStatus); }, [orderStatus, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("planOverrides", planOverrides); }, [planOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("receiptOverrides", receiptOverrides); }, [receiptOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("horizon", horizon); }, [horizon, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("historyWeeks", historyWeeks); }, [historyWeeks, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("safetyWeeksDefault", safetyWeeksDefault); }, [safetyWeeksDefault, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("safetyOverrides", safetyOverrides); }, [safetyOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("planApplyFamily", planApplyFamily); }, [planApplyFamily, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("activeDemandVersion2", activeDemandVersion); }, [activeDemandVersion, settingsLoaded]);

  // Weekly demand versions: fetch a named file from SharePoint (same Power Automate flow) or upload a CSV for this session
  const fetchDemandVersion = async (name) => {
    try {
      const response = await fetch(`${PA_BASE_URL}&filename=${encodeURIComponent(name)}`);
      if (!response.ok) return { ok: false, error: `Could not load "${name}" (HTTP ${response.status}).` };
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data || [];
      const probe = rows[0] || {};
      const hasCols = rows.length > 0 && !!extract(probe, "item", ["item", "part", "material"], ["item"]) && extract(probe, "week", ["week", "wk", "cw"], ["week"]) !== undefined;
      if (!hasCols) return { ok: false, error: `"${name}" has no item / week / quantity columns, or the file was not found.` };
      return { ok: true, rows };
    } catch (e) {
      return { ok: false, error: `Could not load "${name}": ${String(e && e.message ? e.message : e)}` };
    }
  };
  const addDemandVersionFetch = async (name) => {
    const res = await fetchDemandVersion(name);
    if (!res.ok) return res;
    setDemandVersions((prev) => [...prev.filter((v) => v.name !== name), { name, rows: res.rows, source: "sharepoint" }]);
    const names = Array.from(new Set([...demandVersions.filter((v) => v.source === "sharepoint").map((v) => v.name), name]));
    storageSet("demandVersionNames", names);
    setSavedVersionNames(names);
    return { ok: true, count: res.rows.length };
  };
  const addDemandVersionUpload = (label, file) => {
    parseCSV(file, (rows) => setDemandVersions((prev) => [...prev.filter((v) => v.name !== label), { name: label, rows, source: "upload" }]));
  };
  const removeDemandVersion = (name) => {
    setDemandVersions((prev) => prev.filter((v) => v.name !== name));
    const remaining = savedVersionNames.filter((n) => n !== name);
    storageSet("demandVersionNames", remaining);
    setSavedVersionNames(remaining);
    if (resolvedActiveName === name) setActiveDemandVersion("");
  };
  // Auto-discover the weekly files ("Demand CW47", "Demand CW48", ...) for the last 8 weeks up to next week; missing ones are skipped silently
  const autoLoadDemandVersions = async () => {
    const now = Date.now();
    for (let k = -8; k <= 1; k++) {
      const wk = isoWeekLabel(new Date(now + k * 7 * 86400000)).split("CW")[1];
      const name = `Demand CW${wk}`;
      const res = await fetchDemandVersion(name);
      if (res.ok) setDemandVersions((prev) => [...prev.filter((v) => v.name !== name), { name, rows: res.rows, source: "sharepoint", sortKey: k }]);
    }
  };
  const latestVersion = demandVersions.reduce((best, v) => (!best || (v.sortKey ?? -99) >= (best.sortKey ?? -99) ? v : best), null);
  const resolvedActiveName = activeDemandVersion === "__latest__" ? (latestVersion ? latestVersion.name : "") : activeDemandVersion;
  const activeVersionRows = resolvedActiveName ? (demandVersions.find((v) => v.name === resolvedActiveName) || {}).rows : null;
  const effectiveDemand = activeVersionRows || demand;
  useEffect(() => { if (settingsLoaded) storageSet("poOverrides", poOverrides); }, [poOverrides, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("draftRefs", draftRefs); }, [draftRefs, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("shipmentMethod", shipmentMethod); }, [shipmentMethod, settingsLoaded]);
  useEffect(() => { if (settingsLoaded) storageSet("shipmentTracking", shipmentTracking); }, [shipmentTracking, settingsLoaded]);

  // ---------------------------------------------------------
  // Shared settings sync: everyone reads the admin's plan from SharePoint; the admin's edits are saved there.
  // Local storage stays as an offline copy. Saves are debounced, and a save never overwrites a newer version
  // (the server answers 409 and the admin chooses which version to keep).
  // ---------------------------------------------------------
  const [sharedReady, setSharedReady] = useState(false);
  const [sync, setSync] = useState({ state: "loading", at: null, msg: "", conflict: null, updatedAt: null });
  const sharedVersionRef = useRef(0);
  const lastSyncedRef = useRef(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const saveTimerRef = useRef(null);
  const sharedPayload = useMemo(() => ({
    orderStatus, planOverrides, receiptOverrides, poOverrides, draftRefs, shipmentMethod, shipmentTracking,
    safetyWeeksDefault, safetyOverrides, planApplyFamily, demandVersionNames: savedVersionNames, activeDemandVersion2: activeDemandVersion,
  }), [orderStatus, planOverrides, receiptOverrides, poOverrides, draftRefs, shipmentMethod, shipmentTracking, safetyWeeksDefault, safetyOverrides, planApplyFamily, savedVersionNames, activeDemandVersion]);
  const payloadRef = useRef(sharedPayload);
  payloadRef.current = sharedPayload;

  // Apply a shared version to the screen and remember it as the synced state (so it is not saved back)
  const applyShared = (data) => {
    const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
    const cur = payloadRef.current;
    const pick = (k, norm) => (k in data ? norm(data[k]) : cur[k]);
    const next = {
      orderStatus: pick("orderStatus", obj),
      planOverrides: pick("planOverrides", obj),
      receiptOverrides: pick("receiptOverrides", obj),
      poOverrides: pick("poOverrides", obj),
      draftRefs: pick("draftRefs", obj),
      shipmentMethod: pick("shipmentMethod", obj),
      shipmentTracking: pick("shipmentTracking", obj),
      safetyWeeksDefault: pick("safetyWeeksDefault", (v) => Number(v) || 0),
      safetyOverrides: pick("safetyOverrides", obj),
      planApplyFamily: pick("planApplyFamily", (v) => v !== false),
      demandVersionNames: Array.isArray(data.demandVersionNames) ? data.demandVersionNames.filter((n) => typeof n === "string") : cur.demandVersionNames,
      activeDemandVersion2: typeof data.activeDemandVersion2 === "string" ? data.activeDemandVersion2 : cur.activeDemandVersion2,
    };
    lastSyncedRef.current = stableStringify(next);
    setOrderStatus(next.orderStatus);
    setPlanOverrides(next.planOverrides);
    setReceiptOverrides(next.receiptOverrides);
    setPoOverrides(next.poOverrides);
    setDraftRefs(next.draftRefs);
    setShipmentMethod(next.shipmentMethod);
    setShipmentTracking(next.shipmentTracking);
    setSafetyWeeksDefault(next.safetyWeeksDefault);
    setSafetyOverrides(next.safetyOverrides);
    setPlanApplyFamily(next.planApplyFamily);
    setActiveDemandVersion(next.activeDemandVersion2);
    setSavedVersionNames(next.demandVersionNames);
    storageSet("demandVersionNames", next.demandVersionNames);
    next.demandVersionNames.forEach((nm) => {
      fetchDemandVersion(nm).then((res) => {
        if (res.ok) setDemandVersions((prev) => (prev.some((v) => v.name === nm) ? prev : [...prev, { name: nm, rows: res.rows, source: "sharepoint" }]));
      });
    });
  };

  const pushShared = async () => {
    if (isReadOnly) return;
    if (savingRef.current) { pendingRef.current = true; return; }
    const data = payloadRef.current;
    const json = stableStringify(data);
    if (json === lastSyncedRef.current) { setSync((s) => ({ ...s, state: "saved" })); return; }
    savingRef.current = true;
    setSync((s) => ({ ...s, state: "saving", msg: "" }));
    try {
      const { status, body } = await sharedSettingsPut(data, sharedVersionRef.current);
      if (status === 200) {
        sharedVersionRef.current = body.version;
        lastSyncedRef.current = json;
        setSync({ state: "saved", at: new Date(), msg: "", conflict: null, updatedAt: body.updatedAt });
      } else if (status === 409) {
        setSync((s) => ({ ...s, state: "conflict", msg: "Someone else saved a newer plan.", conflict: body.current || null }));
      } else {
        setSync((s) => ({ ...s, state: "error", msg: body.error || `HTTP ${status}` }));
      }
    } catch (e) {
      setSync((s) => ({ ...s, state: "error", msg: String(e && e.message ? e.message : e) }));
    } finally {
      savingRef.current = false;
      if (pendingRef.current) { pendingRef.current = false; pushShared(); }
    }
  };

  // Pull the latest shared version (skipped while the admin has unsaved edits)
  const pullShared = async (initial = false) => {
    if (savingRef.current) return;
    if (!initial && !isReadOnly && stableStringify(payloadRef.current) !== lastSyncedRef.current) return;
    try {
      const res = await sharedSettingsGet();
      if (res.data) {
        if (initial || res.version !== sharedVersionRef.current) {
          sharedVersionRef.current = res.version;
          applyShared(res.data);
        }
      } else {
        sharedVersionRef.current = res.version || 0;
        if (initial && !isReadOnly) {
          // First run: nothing shared yet, so upload this admin's existing local plan
          lastSyncedRef.current = null;
          setTimeout(pushShared, 0);
        } else if (initial) {
          lastSyncedRef.current = stableStringify(payloadRef.current);
        }
      }
      setSync((s) => ({ ...s, state: s.state === "conflict" ? "conflict" : "saved", at: new Date(), msg: "", updatedAt: res.updatedAt || s.updatedAt }));
    } catch (e) {
      setSync((s) => ({ ...s, state: "offline", msg: String(e && e.message ? e.message : e) }));
      if (initial) lastSyncedRef.current = stableStringify(payloadRef.current);
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    pullShared(true).then(() => setSharedReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded]);

  // Admin edits: save to SharePoint a moment after the last change
  useEffect(() => {
    if (!sharedReady) return;
    const json = stableStringify(sharedPayload);
    if (isReadOnly || sync.state === "conflict") return;
    if (json === lastSyncedRef.current) return;
    setSync((s) => ({ ...s, state: "pending" }));
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(pushShared, SHARED_SAVE_DELAY_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedPayload, sharedReady]);

  // Refresh every minute and whenever the tab comes back into view
  useEffect(() => {
    if (!sharedReady) return;
    const onVisible = () => { if (document.visibilityState === "visible") pullShared(false); };
    const timer = setInterval(() => { if (document.visibilityState === "visible") pullShared(false); }, SHARED_POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("focus", onVisible); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedReady]);

  // Warn the admin before closing the page with edits that have not reached SharePoint yet
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (isReadOnly) return;
      if (["pending", "saving", "error", "conflict"].includes(sync.state)) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [sync.state, isReadOnly]);

  const resolveConflict = (keep) => {
    const current = sync.conflict;
    if (!current) return;
    sharedVersionRef.current = current.version || 0;
    if (keep === "theirs") {
      if (current.data) applyShared(current.data);
      setSync({ state: "saved", at: new Date(), msg: "", conflict: null, updatedAt: current.updatedAt });
    } else {
      setSync((s) => ({ ...s, state: "pending", conflict: null }));
      lastSyncedRef.current = null;
      setTimeout(pushShared, 0);
    }
  };

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

  const updateShipmentTracking = (key, patch) => {
    setShipmentTracking((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || { status: "not_shipped", actualArrivalDate: "", eta: "" }), ...patch },
    }));
  };

  // Freight (Sea / Air) per PO: arrival = ETD + freight lead time; the arrival week is applied as the PO due week.
  const freightLeadWeeks = (method) => (method === "air" ? AIR_WEEKS : method === "sea" ? SEA_WEEKS : 0);
  const freightEtd = (tr, method) => (method && tr && tr.eta ? addDaysYMD(tr.eta, -7 * freightLeadWeeks(method)) : ((tr && tr.etd) || ""));
  const setPoFreight = (item, poNumber, patch) => {
    const key = `${item}::${poNumber}`;
    const tr = shipmentTracking[key] || {};
    const curMethod = shipmentMethod[key] || "";
    const method = patch.method !== undefined ? patch.method : curMethod;
    const etd = patch.etd !== undefined ? patch.etd : freightEtd(tr, curMethod);
    if (patch.method !== undefined) {
      setShipmentMethod((prev) => {
        const next = { ...prev };
        if (patch.method) next[key] = patch.method; else delete next[key];
        return next;
      });
    }
    const eta = method && etd ? addDaysYMD(etd, 7 * freightLeadWeeks(method)) : "";
    updateShipmentTracking(key, { etd, ...(eta ? { eta } : {}) });
    if (eta) {
      const d = parseYMD(eta);
      if (d) adjustPOWeek(item, poNumber, isoWeekLabel(d));
    }
  };

  // Set or clear a per-item safety stock override. value === null/"" clears it.
  const setSafetyOverride = (item, mode, rawValue) => {
    setSafetyOverrides((prev) => {
      const next = { ...prev };
      const n = rawValue === null || rawValue === "" || rawValue === undefined ? NaN : Number(rawValue);
      if (!Number.isFinite(n) || n < 0) { delete next[item]; return next; }
      next[item] = { mode, value: n };
      return next;
    });
  };

  const clearSavedSettings = async () => {
    await storageClearAll(["orderStatus", "planOverrides", "receiptOverrides", "horizon", "historyWeeks", "poOverrides", "draftRefs", "shipmentMethod", "shipmentTracking", "safetyWeeksDefault", "safetyOverrides", "planApplyFamily"]);
    setOrderStatus({});
    setPlanOverrides({});
    setReceiptOverrides({});
    setDraftRefs({});
    setHorizon(12);
    setHistoryWeeks(4);
    setSafetyWeeksDefault(0);
    setSafetyOverrides({});
    setPlanApplyFamily(true);
    setPoOverrides({});
    setShipmentMethod({});
    setShipmentTracking({});
  };

  // ---------------------------------------------------------
  // ดึงข้อมูลจาก SharePoint (แบบต่อคิว ป้องกัน Server บล็อก)
  // ---------------------------------------------------------
  useEffect(() => {

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
      autoLoadDemandVersions();
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
    () => runMRP({ bom, inventory, demand: effectiveDemand, poPending: scheduledReceiptsPO, git: scheduledReceiptsGIT, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides, safetyWeeksDefault, safetyOverrides }),
    [bom, inventory, effectiveDemand, scheduledReceiptsPO, scheduledReceiptsGIT, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides, safetyWeeksDefault, safetyOverrides]
  );

  // Items that receive a plan typed for `item`: the whole mold family when "apply to mold family" is on.
  const planTargets = (item) => {
    if (!planApplyFamily) return [item];
    const fam = records[item] && records[item].moldFamily;
    return fam && moldFamilyMap[fam] && moldFamilyMap[fam].length > 0 ? moldFamilyMap[fam] : [item];
  };
  const adjustPlan = (item, weekIndex, rawValue) => {
    const targets = planTargets(item);
    setPlanOverrides((prev) => setOverrideForTargets(prev, targets, weekIndex, rawValue));
  };
  const resetPlanOverride = (item, weekIndex) => {
    const targets = planTargets(item);
    setPlanOverrides((prev) => removeOverrideForTargets(prev, targets, weekIndex));
  };

  const adjustReceipt = (item, weekIndex, rawValue) => {
    const targets = planTargets(item);
    setReceiptOverrides((prev) => setOverrideForTargets(prev, targets, weekIndex, rawValue));
  };
  const resetReceiptOverride = (item, weekIndex) => {
    const targets = planTargets(item);
    setReceiptOverrides((prev) => removeOverrideForTargets(prev, targets, weekIndex));
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
          material_type: rec.materialType || "",
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
          material_type: rec.materialType || "",
        on_hand_usable: rec.usableOnHand,
        on_hand_total: rec.onHand,
        expired_qty: rec.expiredQty,
        safety_stock_base: rec.baseSafety,
        safety_factor: rec.safetyFactor,
        safety_stock_effective: rec.safety,
        safety_weeks: rec.safetyWeeks === null ? "" : rec.safetyWeeks,
        safety_stock_source: rec.safetySource,
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
          material_type: rec.materialType || "",
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

  const materialTypeMap = useMemo(() => {
    const map = {};
    order.forEach((it) => {
      const mt = records[it].materialType;
      if (!mt) return;
      map[mt] = map[mt] || [];
      map[mt].push(it);
    });
    Object.values(map).forEach((list) => list.sort());
    return map;
  }, [order, records]);

  const materialTypeGroups = useMemo(() => {
    return Object.keys(materialTypeMap).sort().map((t) => ({ vendor: t, items: materialTypeMap[t] }));
  }, [materialTypeMap]);

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
        (rec.vendor || "").toLowerCase().includes(q) ||
        (rec.materialType || "").toLowerCase().includes(q)
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
          component_material_type: crec ? (crec.materialType || "") : "",
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
        (r.component_vendor || "").toLowerCase().includes(q) ||
        (r.component_material_type || "").toLowerCase().includes(q)
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
      const avg = rec.avgConsumptionForCoverage;
      const coverageWeeks = avg > 0 ? rec.usableOnHand / avg : null;
      return {
        item,
        description: rec.description,
        unit: rec.unit,
        vendor: rec.vendor,
        on_hand_usable: rec.usableOnHand,
        avg_weekly_consumption: avg,
        is_bom_estimate: rec.pastActualAvg === 0 && avg > 0, // ไม่มียอดเบิกจริงเลย ใช้ค่าเฉลี่ยจาก BOM/Demand ล้วนๆ
        is_blended: rec.pastActualAvg > 0 && rec.hasGrossReq,
        is_actual_only: rec.pastActualAvg > 0 && !rec.hasGrossReq, // no plan, actual usage only
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

  // Import Shipment Planning: เทียบ coverage ของแต่ละ item กับ lead time ของ Sea (10wk) / Air (2wk)
  // เพื่อแนะนำว่าควรส่งทางเรือ (ถูกแต่ช้า) หรือทางอากาศ (แพงแต่เร็ว) ให้ถึงทันก่อนสต็อกหมด
  // แสดงเฉพาะ item ที่มี PO pending เปิดอยู่จริงเท่านั้น
  // Stock chart page: items ordered by the smallest projected margin above safety stock (riskiest first)
  const stockChartRows = useMemo(() => {
    const q = stockChartFilter.trim().toLowerCase();
    const rows = [];
    order.forEach((item) => {
      const rec = records[item];
      if (stockChartType && rec.materialType !== stockChartType) return;
      if (stockChartVendor && (rec.vendor || "Unassigned") !== stockChartVendor) return;
      if (q && !(item.toLowerCase().includes(q) || (rec.description || "").toLowerCase().includes(q) || (rec.vendor || "").toLowerCase().includes(q))) return;
      let minMargin = Infinity;
      for (let i = historyWeeks; i < rec.projOnHand.length; i++) {
        const v = rec.projOnHand[i];
        if (v !== null && v !== undefined) minMargin = Math.min(minMargin, v - rec.safety);
      }
      rows.push({ item, family: rec.moldFamily || "", minMargin: minMargin === Infinity ? 0 : minMargin });
    });
    if (stockChartGroup) {
      // Group by mold family (families A-Z, items without a family last); riskiest first inside each group
      rows.sort((a, b) => {
        if (!a.family !== !b.family) return a.family ? -1 : 1;
        if (a.family !== b.family) return a.family.localeCompare(b.family);
        return a.minMargin - b.minMargin;
      });
    } else {
      rows.sort((a, b) => a.minMargin - b.minMargin);
    }
    return rows;
  }, [order, records, historyWeeks, stockChartFilter, stockChartType, stockChartVendor, stockChartGroup]);

  const STATUS_TRACKING_OPTIONS = [
    { value: "not_shipped", label: "ยังไม่ส่ง", bg: "#E4E7EC", color: COLORS.inkSoft },
    { value: "in_transit", label: "กำลังขนส่ง", bg: "#E0E7FF", color: COLORS.steelDeep },
    { value: "arrived", label: "มาถึงแล้ว (รอตรวจรับ)", bg: "#FEF3C7", color: COLORS.amber },
    { value: "received", label: "ตรวจรับแล้ว", bg: "#DCFCE7", color: COLORS.moss },
  ];

  const shipmentRows = useMemo(() => {
    const rows = [];
    order.forEach((item) => {
      const rec = records[item];
      if (!(rec.poPendingDetails && rec.poPendingDetails.length > 0 && rec.isOverseas)) return;
      const avg = rec.avgConsumptionForCoverage;
      const coverageWeeks = avg > 0 ? rec.usableOnHand / avg : null;
      let recommended;
      if (coverageWeeks === null) recommended = "sea"; // ไม่มีข้อมูล consumption ให้เทียบ ใช้ทางเลือกประหยัดเป็นค่าเริ่มต้น
      else if (coverageWeeks < AIR_WEEKS) recommended = "critical";
      else if (coverageWeeks < SEA_WEEKS) recommended = "air";
      else recommended = "sea";

      rec.poPendingDetails.forEach((p) => {
        const key = `${item}::${p.poNumber}`;
        const chosen = shipmentMethod[key] || (recommended === "critical" ? "air" : recommended);
        const chosenWeeks = chosen === "air" ? AIR_WEEKS : SEA_WEEKS;
        const tracking = shipmentTracking[key] || { status: "not_shipped", actualArrivalDate: "", eta: "" };
        // ตั้ง ETA เอง (รู้จากผู้ให้บริการขนส่ง) แล้วให้ระบบคำนวณ ETD ย้อนกลับให้ (ETD = ETA − lead time)
        // ถ้ายังไม่กรอก ETA เลย ใช้ค่าเริ่มต้นเป็นวันนี้ + lead time ไปก่อน
        const manualEta = tracking.eta ? new Date(tracking.eta + "T00:00:00Z") : null;
        const etaDate = manualEta && !isNaN(manualEta) ? manualEta : new Date(Date.now() + chosenWeeks * 7 * 86400000);
        const etdDate = new Date(etaDate.getTime() - chosenWeeks * 7 * 86400000);
        const willArriveInTime = coverageWeeks === null ? true : coverageWeeks >= chosenWeeks;
        rows.push({
          key,
          item,
          poNumber: p.poNumber,
          description: rec.description,
          unit: rec.unit,
          vendor: p.vendor || rec.vendor,
          qty: p.quantity,
          dueWeek: p.weekLabel,
          onHand: rec.usableOnHand,
          coverageWeeks,
          recommended,
          chosen,
          willArriveInTime,
          eta: tracking.eta || "",
          etaDate: etaDate.toISOString().slice(0, 10),
          etdDate: etdDate.toISOString().slice(0, 10),
          status: tracking.status,
          actualArrivalDate: tracking.actualArrivalDate || "",
        });
      });
    });
    return rows.sort((a, b) => {
      const av = a.coverageWeeks === null ? Infinity : a.coverageWeeks;
      const bv = b.coverageWeeks === null ? Infinity : b.coverageWeeks;
      return av - bv;
    });
  }, [order, records, shipmentMethod, shipmentTracking]);

  const shipmentRowsFiltered = useMemo(() => {
    const q = shipmentFilter.trim().toLowerCase();
    if (!q) return shipmentRows;
    return shipmentRows.filter((r) =>
      r.item.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.vendor || "").toLowerCase().includes(q)
    );
  }, [shipmentRows, shipmentFilter]);

  const setShipmentMethodForKey = (key, method) => {
    setShipmentMethod((prev) => ({ ...prev, [key]: method }));
  };

  const exportShipment = () => {
    downloadCSV(`import_shipment_plan_${new Date().toISOString().slice(0, 10)}.csv`, shipmentRowsFiltered.map((r) => ({
      item: r.item, po_number: r.poNumber, description: r.description, unit: r.unit, vendor: r.vendor,
      qty: r.qty, due_week: r.dueWeek,
      on_hand_usable: r.onHand,
      coverage_weeks: r.coverageWeeks === null ? "" : Math.round(r.coverageWeeks * 10) / 10,
      recommended_method: r.recommended,
      chosen_method: r.chosen,
      will_arrive_in_time: r.willArriveInTime ? "yes" : "no",
      eta_date: r.etaDate,
      etd_date_calc: r.etdDate,
      tracking_status: r.status,
      actual_arrival_date: r.actualArrivalDate,
    })));
  };

  // สร้างสรุปข้อมูล MRP ปัจจุบันให้ AI ใช้ตอบคำถาม — เน้นรายการที่ต้องสั่งซื้อ/วิกฤต เพื่อคุมขนาด context ไม่ให้ใหญ่เกินไป
  const buildAIContext = (question) => {
    // 0) หา item code หรือ project code ที่ถูกพิมพ์มาในคำถามโดยตรง แล้วดึงข้อมูลแบบละเอียดใส่ไว้บนสุดเสมอ
    //    ไม่ว่าจะโดน cap ของ "สรุป item ทั้งหมด" ด้านล่างหรือไม่ก็ตาม — กันปัญหา AI หา item ไม่เจอเวลาระบบมี item เยอะมาก
    const qUpper = (question || "").toUpperCase().replace(/[^A-Z0-9]/g, " ");
    const directItemMatches = order.filter((it) => qUpper.includes(it.toUpperCase()));
    const mentionedProjects = projectGroups.map((g) => g.project).filter((p) => qUpper.includes(p));
    const projectMatchItems = new Set();
    mentionedProjects.forEach((p) => {
      Object.entries(itemProjectsMap).forEach(([it, set]) => { if (set.has(p)) projectMatchItems.add(it); });
    });
    const guaranteedItems = Array.from(new Set([...directItemMatches, ...projectMatchItems]));

    let guaranteedSection = "";
    if (guaranteedItems.length > 0) {
      const gLines = guaranteedItems.slice(0, 500).map((item) => {
        const rec = records[item];
        const avg = rec.avgConsumptionForCoverage;
        const coverageWeeks = avg > 0 ? (rec.usableOnHand / avg).toFixed(1) : "no-data";
        const projSet = itemProjectsMap[item];
        const projects = projSet && projSet.size > 0 ? Array.from(projSet).join(",") : (isProjectCode(item) ? item.slice(0, 3).toUpperCase() : "");
        const basic = `${item}|${rec.description}|unit=${rec.unit}|project=${projects || "-"}|vendor=${rec.vendor || "-"}|mold_family=${rec.moldFamily || "-"}|on_hand_usable=${rec.usableOnHand}|on_hand_total=${rec.onHand}|safety_stock=${rec.safety}|coverage_weeks=${coverageWeeks}|lead_time_wk=${rec.leadTime}`;
        const wkStart = historyWeeks;
        const wkEnd = Math.min(wkStart + 8, weekLabels.length);
        const snapshot = [];
        for (let i = wkStart; i < wkEnd; i++) {
          snapshot.push(`${weekLabels[i]}: on_hand=${rec.projOnHand[i] ?? "-"}, planned_release=${rec.plannedRelease[i] || 0}`);
        }
        return `${basic}\n  แนวโน้ม 8 สัปดาห์ข้างหน้า: ${snapshot.join(" | ")}`;
      }).join("\n");
      const gTrunc = guaranteedItems.length > 500 ? ` (แสดง 500 จาก ${guaranteedItems.length} รายการที่ตรงกับคำถาม)` : "";
      guaranteedSection = `\n=== ข้อมูลที่ตรงกับคำถามของคุณโดยตรง${gTrunc} ===\n${gLines}\n`;
    }

    // สรุปข้อมูลทุก item ให้ AI ใช้ตอบคำถามทั่วไปได้ (ไม่ใช่แค่รายการที่ต้องสั่งซื้อ)
    // เรียง item ที่เป็น FG/project code ให้มาก่อนเสมอ กันไม่ให้ถูกตัดออกเวลามี raw material เยอะมาก
    const ITEM_CAP = 4000; // Gemini รับ context ได้ถึง ~1M token จึงกั๊กน้อยกว่าเดิมมาก
    const projectCodedItems = order.filter((it) => isProjectCode(it) || (itemProjectsMap[it] && itemProjectsMap[it].size > 0));
    const otherItems = order.filter((it) => !(isProjectCode(it) || (itemProjectsMap[it] && itemProjectsMap[it].size > 0)));
    const orderedForContext = [...projectCodedItems, ...otherItems];
    const itemLines = orderedForContext.slice(0, ITEM_CAP).map((item) => {
      const rec = records[item];
      const avg = rec.avgConsumptionForCoverage;
      const coverageWeeks = avg > 0 ? (rec.usableOnHand / avg).toFixed(1) : "no-data";
      const ownProject = isProjectCode(item) ? item.slice(0, 3).toUpperCase() : "";
      const projSet = itemProjectsMap[item];
      const projects = projSet && projSet.size > 0 ? Array.from(projSet).join(",") : ownProject;
      return `${item}|${rec.description}|project=${projects || "-"}|vendor=${rec.vendor || "-"}|mold_family=${rec.moldFamily || "-"}|on_hand_usable=${rec.usableOnHand}|safety_stock=${rec.safety}|coverage_weeks=${coverageWeeks}|lead_time_wk=${rec.leadTime}`;
    }).join("\n");
    const itemTruncNote = orderedForContext.length > ITEM_CAP ? ` (แสดง ${ITEM_CAP} จาก ${orderedForContext.length} รายการ — เรียง item ที่มี project มาก่อนแล้ว ยังมีอีกที่ไม่ได้แสดง)` : "";

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
          material_type: rec.materialType || "",
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
      guaranteedSection,
      `สรุปข้อมูล item ทั้งหมด (item|description|project|vendor|mold_family|on_hand_usable|safety_stock|coverage_weeks|lead_time_wk)${itemTruncNote}:`,
      itemLines || "(ไม่มีข้อมูล item)",
      ``,
      `รายการ planned order (item ที่ต้องสั่งซื้อในช่วง horizon) (item|description|project|parent_items|vendor|mold_family|release_week|qty|past_due)${truncNote}:`,
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
          context: buildAIContext(question),
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

  // Detail view of the selected material on the stock chart page (big chart, week editor, legend, open POs).
  // Used both in the top card and in the pop-up opened from the small charts.
  // Export every material currently listed on the stock chart page (after the filters) as weekly rows
  const exportStockChartCSV = () => {
    const out = [];
    stockChartRows.forEach((row) => {
      const rec = records[row.item];
      if (!rec) return;
      const poNos = {};
      (rec.poPendingDetails || []).forEach((po) => {
        if (po.noDate || po.weekIdx === undefined || po.weekIdx === Infinity) return;
        (poNos[po.weekIdx] = poNos[po.weekIdx] || []).push(po.poNumber);
      });
      for (let i = historyWeeks; i < rec.projOnHand.length; i++) {
        out.push({
          item: rec.item,
          description: rec.description || "",
          vendor: rec.vendor || "",
          material_type: rec.materialType || "",
          mold_family: rec.moldFamily || "",
          week: weekLabels[i],
          week_start_date: weekMondayDates[i] || "",
          projected_on_hand: rec.projOnHand[i] === null || rec.projOnHand[i] === undefined ? "" : Math.round(rec.projOnHand[i]),
          safety_stock: Math.round(rec.safety),
          usage: Math.round(rec.adjustedConsumption[i] || 0),
          incoming_po_git: Math.round((rec.poPending[i] || 0) + (rec.git[i] || 0)),
          po_numbers: (poNos[i] || []).join(' / '),
          planned_receipt: Math.round(rec.plannedReceipt[i] || 0),
          run_date: new Date().toISOString().slice(0, 10),
        });
      }
    });
    downloadCSV(`stock_chart_${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  // Open PO table rows for one material (same data as the Open POs table under the chart)
  const poExportRows = (rec) => (rec.poPendingDetails || []).map((po) => {
    const fKey = `${rec.item}::${po.poNumber}`;
    const fMethod = shipmentMethod[fKey] || "";
    const fEtd = freightEtd(shipmentTracking[fKey] || {}, fMethod);
    const fEta = fMethod && fEtd ? addDaysYMD(fEtd, 7 * freightLeadWeeks(fMethod)) : "";
    return {
      item: rec.item, description: rec.description || "", unit: rec.unit || "", po_number: po.poNumber, vendor: po.vendor || "",
      quantity: Math.round(po.quantity), freight: fMethod, etd: fEtd || "", arrival: fEta || "",
      due_week: po.noDate ? "no date yet" : po.weekLabel, due_monday_date: po.mondayDate || "", outside_horizon: po.outOfHorizon && !po.noDate ? "yes" : "no",
      run_date: new Date().toISOString().slice(0, 10),
    };
  });
  const exportStockChartPOs = () => {
    const out = [];
    stockChartRows.forEach((row) => { const rec = records[row.item]; if (rec) out.push(...poExportRows(rec)); });
    downloadCSV(`stock_chart_open_pos_${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  // Save the chart that is currently open (page or pop-up) as a PNG image
  const exportStockChartPNG = () => {
    if (!selectedRec) return;
    const holders = document.querySelectorAll("[data-stockchart-detail] svg");
    const svg = holders[holders.length - 1];
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    const w = vb.width || 1000;
    const h = vb.height || 500;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", w);
    clone.setAttribute("height", h);
    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const poRows = poExportRows(selectedRec);
      const rowH = 22;
      const tableH = poRows.length > 0 ? 40 + (poRows.length + 1) * rowH + 12 : 0;
      const canvas = document.createElement("canvas");
      canvas.width = w * scale;
      canvas.height = (h + tableH) * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, h * scale);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.fillStyle = "#6B7280";
      ctx.font = "11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${selectedRec.item} \u00b7 exported ${new Date().toISOString().slice(0, 10)}`, w - 12, 14);
      ctx.restore();
      if (poRows.length > 0) {
        ctx.scale(scale, scale);
        const mono = "'IBM Plex Mono', monospace";
        const heads = ["PO #", "VENDOR", "QTY", "FREIGHT", "ETD", "ARRIVAL", "DUE WK"];
        const cells = poRows.map((r) => [r.po_number, r.vendor || "-", r.quantity.toLocaleString(), r.freight || "-", r.etd || "-", r.arrival || "-", r.due_monday_date ? `${r.due_week} (Mon ${r.due_monday_date})` : r.due_week]);
        ctx.font = `700 12px ${mono}`;
        const widths = heads.map((hd, c) => Math.max(ctx.measureText(hd).width, ...cells.map((row) => ctx.measureText(String(row[c])).width)) + 24);
        const totalQty = poRows.reduce((sum, r) => sum + r.quantity, 0);
        ctx.fillStyle = "#B45309";
        ctx.font = `700 13px ${mono}`;
        ctx.fillText(`Open POs (${poRows.length}) - ${totalQty.toLocaleString()} ${selectedRec.unit || ""}`, 24, h + 22);
        let y = h + 40 + rowH * 0.7;
        ctx.font = `700 12px ${mono}`;
        ctx.fillStyle = "#6B7280";
        let x = 24;
        heads.forEach((hd, c) => { ctx.textAlign = c === 2 ? "right" : "left"; ctx.fillText(hd, c === 2 ? x + widths[c] - 24 : x, y); x += widths[c]; });
        ctx.font = `400 12px ${mono}`;
        cells.forEach((row) => {
          y += rowH;
          x = 24;
          row.forEach((val, c) => { ctx.textAlign = c === 2 ? "right" : "left"; ctx.fillStyle = c === 0 ? "#166534" : "#111827"; ctx.fillText(String(val), c === 2 ? x + widths[c] - 24 : x, y); x += widths[c]; });
        });
        ctx.textAlign = "left";
      }
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stock_chart_${selectedRec.item}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  const renderStockChartDetail = () => {
    if (!selectedRec) return null;
    return (
              <div data-stockchart-detail="1" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, fontWeight: 700, color: COLORS.steel }}>{selectedRec.item}</span>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, color: COLORS.ink }}>{selectedRec.description}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: COLORS.inkSoft }}>
                    {selectedRec.vendor ? `${selectedRec.vendor} · ` : ""}{selectedRec.materialType ? `${selectedRec.materialType} · ` : ""}on hand {Math.round(selectedRec.usableOnHand).toLocaleString()} {selectedRec.unit} · safety stock {selectedRec.safety} · lead time {selectedRec.leadTime} wk
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginBottom: 4 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft, marginRight: 10 }}>
                    <input type="checkbox" checked={stockChartUsage} onChange={(e) => setStockChartUsage(e.target.checked)} style={{ margin: 0 }} />
                    show avg demand
                  </label>
                  <button onClick={exportStockChartPNG} style={{
                    display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginRight: 10,
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: COLORS.steelDeep,
                    border: `1px solid ${COLORS.steelDeep}`, background: "transparent", padding: "2px 10px", borderRadius: COLORS.radiusSm,
                  }}><Download size={12} /> save chart as PNG</button>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, marginRight: 4 }}>chart size</span>
                  {["M", "L", "XL"].map((sz) => (
                    <button key={sz} onClick={() => setStockChartSize(sz)} style={{
                      cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, padding: "2px 10px",
                      borderRadius: COLORS.radiusSm, border: `1px solid ${COLORS.steel}`,
                      background: stockChartSize === sz ? COLORS.steel : "transparent", color: stockChartSize === sz ? "#fff" : COLORS.steel,
                    }}>{sz}</button>
                  ))}
                </div>
                <StockChart rec={selectedRec} weekLabels={weekLabels} historyWeeks={historyWeeks}
                  showLabels={stockChartLabels} onWeekClick={setStockChartWeek} selectedWeek={stockChartWeek} size={stockChartSize} showUsage={stockChartUsage} />
                <div style={{ marginTop: 10, border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 700, color: COLORS.steelDeep, background: COLORS.paper }}>
                    Plan entry - type a quantity in a week, clear the box to remove it
                    {planApplyFamily && selectedRec.moldFamily && moldFamilyMap[selectedRec.moldFamily] && moldFamilyMap[selectedRec.moldFamily].length > 1 && (
                      <span style={{ marginLeft: 10, color: COLORS.amber, fontWeight: 600 }}>
                        applies to all {moldFamilyMap[selectedRec.moldFamily].length} items in mold family "{selectedRec.moldFamily}": {moldFamilyMap[selectedRec.moldFamily].join(", ")}
                      </span>
                    )}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                      <thead>
                        <tr>
                          <td style={{ position: "sticky", left: 0, background: COLORS.card, padding: "4px 10px", minWidth: 130, zIndex: 1 }} />
                          {selectedRec.projOnHand.map((_, i) => i >= historyWeeks && (
                            <td key={i} onClick={() => setStockChartWeek(i)} style={{
                              padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap", cursor: "pointer",
                              color: stockChartWeek === i ? COLORS.steelDeep : COLORS.inkSoft, fontWeight: stockChartWeek === i ? 700 : 400,
                              background: stockChartWeek === i ? "#E0E7FF" : "transparent",
                            }}>{weekLabels[i]}</td>
                          ))}
                        </tr>
                        <tr>
                          <td style={{ position: "sticky", left: 0, background: COLORS.card, padding: "0 10px 3px", color: COLORS.inkSoft, fontSize: 10.5, zIndex: 1 }}>month</td>
                          {selectedRec.projOnHand.map((_, i) => {
                            if (i < historyWeeks) return null;
                            const ml = weekLabelMonth(weekLabels[i]);
                            const prev = i > historyWeeks ? weekLabelMonth(weekLabels[i - 1]) : null;
                            const changed = !prev || !ml || prev.month !== ml.month;
                            return (
                              <td key={i} style={{
                                padding: "0 6px 3px", textAlign: "center", fontSize: 10.5, whiteSpace: "nowrap",
                                color: changed ? COLORS.steelDeep : COLORS.inkSoft, fontWeight: changed ? 700 : 400,
                                borderLeft: changed && i > historyWeeks ? `1px solid ${COLORS.paperLine}` : "none",
                                background: stockChartWeek === i ? "#E0E7FF" : "transparent",
                              }}>{ml ? MONTH_ABBR[ml.month] : ""}</td>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ position: "sticky", left: 0, background: COLORS.card, padding: "3px 10px", color: COLORS.inkSoft, zIndex: 1 }}>On hand</td>
                          {selectedRec.projOnHand.map((v, i) => i >= historyWeeks && (
                            <td key={i} style={{ padding: "3px 6px", textAlign: "right", color: v !== null && v !== undefined && v < selectedRec.safety ? COLORS.rust : COLORS.ink, background: stockChartWeek === i ? "#E0E7FF" : "transparent" }}>
                              {v === null || v === undefined ? "-" : Math.round(v).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td style={{ position: "sticky", left: 0, background: COLORS.card, padding: "3px 10px", fontWeight: 700, color: COLORS.steel, zIndex: 1 }}>Planned receipt</td>
                          {selectedRec.projOnHand.map((_, i) => {
                            if (i < historyWeeks) return null;
                            const k = `${selectedRec.item}::${i}`;
                            const isOv = receiptOverrides[k] !== undefined;
                            const cur = selectedRec.plannedReceipt[i] ? Math.round(selectedRec.plannedReceipt[i] * 100) / 100 : "";
                            return (
                              <td key={i} style={{ padding: "2px 3px", background: stockChartWeek === i ? "#E0E7FF" : "transparent" }}>
                                <input key={`${k}-r-${isOv ? receiptOverrides[k] : "a"}-${cur}`} type="number" min={0} step="any" disabled={isReadOnly} defaultValue={cur}
                                  onFocus={() => setStockChartWeek(i)}
                                  onBlur={(e) => { if (e.target.value !== String(cur)) adjustReceipt(selectedRec.item, i, e.target.value); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                  style={{
                                    width: 66, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, padding: "2px 4px",
                                    border: `1px solid ${isOv ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                                    background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                                  }} />
                              </td>
                            );
                          })}
                        </tr>
                        <tr>
                          <td style={{ position: "sticky", left: 0, background: COLORS.card, padding: "3px 10px", fontWeight: 700, color: COLORS.steelDeep, zIndex: 1 }}>Planned release</td>
                          {selectedRec.projOnHand.map((_, i) => {
                            if (i < historyWeeks) return null;
                            const k = `${selectedRec.item}::${i}`;
                            const isOv = planOverrides[k] !== undefined;
                            const cur = selectedRec.plannedRelease[i] ? Math.round(selectedRec.plannedRelease[i] * 100) / 100 : "";
                            return (
                              <td key={i} style={{ padding: "2px 3px", background: stockChartWeek === i ? "#E0E7FF" : "transparent" }}>
                                <input key={`${k}-p-${isOv ? planOverrides[k] : "a"}-${cur}`} type="number" min={0} step="any" disabled={isReadOnly} defaultValue={cur}
                                  onFocus={() => setStockChartWeek(i)}
                                  onBlur={(e) => { if (e.target.value !== String(cur)) adjustPlan(selectedRec.item, i, e.target.value); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                  style={{
                                    width: 66, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, padding: "2px 4px",
                                    border: `1px solid ${isOv ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                                    background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                                  }} />
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {(() => {
                  const ov = safetyOverrides[selectedRec.item];
                  const avgTxt = Math.round(selectedRec.safetyBasisAvg * 100) / 100;
                  const srcTxt = selectedRec.safetySource === "manual" ? "manual quantity"
                    : selectedRec.safetySource === "weeks-manual" ? `manual: ${selectedRec.safetyWeeks} wk x ${avgTxt}/wk`
                    : selectedRec.safetySource === "weeks" ? `${selectedRec.safetyWeeks} wk x ${avgTxt}/wk (from master / default)`
                    : "fixed quantity from master";
                  return (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8, padding: "8px 10px",
                      background: COLORS.paper, border: `1px solid ${ov ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.ink,
                    }}>
                      <b style={{ color: COLORS.amber }}>Safety stock {Math.round(selectedRec.safety * 100) / 100} {selectedRec.unit}</b>
                      <span style={{ color: COLORS.inkSoft, fontSize: 12 }}>{srcTxt}</span>
                      {[["qty", "qty", selectedRec.unit], ["weeks", "weeks of avg usage", "wk"]].map(([mode, title, unitLabel]) => (
                        <label key={mode} style={{ display: "flex", alignItems: "center", gap: 5 }} title={title}>
                          set {unitLabel === "wk" ? "weeks" : "qty"}
                          <input key={`${selectedRec.item}-${mode}-${ov ? `${ov.mode}${ov.value}` : "none"}`} type="number" min={0} step="any" disabled={isReadOnly}
                            defaultValue={ov && ov.mode === mode ? ov.value : ""} placeholder={unitLabel}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v === "" && !(ov && ov.mode === mode)) return;
                              setSafetyOverride(selectedRec.item, mode, v);
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            style={{
                              width: 90, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700,
                              border: `1px solid ${ov && ov.mode === mode ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                              padding: "3px 6px", background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                            }} />
                          {unitLabel}
                        </label>
                      ))}
                      {ov && !isReadOnly && (
                        <button onClick={() => setSafetyOverride(selectedRec.item, "qty", "")} title="Remove manual safety stock" style={{
                          border: `1px solid ${COLORS.amber}`, background: "transparent", color: COLORS.amber, borderRadius: COLORS.radiusSm,
                          cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: "2px 8px",
                        }}>{"\u21BA"} reset</button>
                      )}
                    </div>
                  );
                })()}
                {stockChartWeek !== null && stockChartWeek >= historyWeeks && stockChartWeek < selectedRec.projOnHand.length ? (() => {
                  const wi = stockChartWeek;
                  const ovKey = `${selectedRec.item}::${wi}`;
                  const isOv = receiptOverrides[ovKey] !== undefined;
                  const relIdx = wi - selectedRec.leadTime;
                  const stockAt = selectedRec.projOnHand[wi];
                  return (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8, padding: "8px 10px",
                      background: COLORS.paper, border: `1px solid ${isOv ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: COLORS.ink,
                    }}>
                      <b>{weekLabels[wi]}</b>
                      <span style={{ color: COLORS.inkSoft }}>on hand {stockAt === null || stockAt === undefined ? "-" : Math.round(stockAt).toLocaleString()} {selectedRec.unit}</span>
                      <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        planned receipt
                        <input key={`${ovKey}-${isOv ? receiptOverrides[ovKey] : "auto"}`} type="number" min={0} step="any" disabled={isReadOnly}
                          defaultValue={selectedRec.plannedReceipt[wi] ? Math.round(selectedRec.plannedReceipt[wi] * 100) / 100 : ""}
                          placeholder="0"
                          onBlur={(e) => adjustReceipt(selectedRec.item, wi, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                          style={{
                            width: 110, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, fontWeight: 700,
                            border: `1px solid ${isOv ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "3px 6px",
                            background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                          }} />
                        {selectedRec.unit}
                      </label>
                      {isOv && !isReadOnly && (
                        <button onClick={() => resetReceiptOverride(selectedRec.item, wi)} title="Remove manual receipt for this week" style={{
                          border: `1px solid ${COLORS.amber}`, background: "transparent", color: COLORS.amber, borderRadius: COLORS.radiusSm,
                          cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "2px 8px",
                        }}>{"\u21BA"} reset</button>
                      )}
                      <span style={{ color: COLORS.inkSoft }}>
                        {selectedRec.leadTime > 0 ? (relIdx >= historyWeeks ? `release by ${weekLabels[relIdx]}` : "release date already passed") : "release same week"}
                      </span>
                      <button onClick={() => setStockChartWeek(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft, fontSize: 14 }}>&#10005;</button>
                    </div>
                  );
                })() : (
                  !isReadOnly && <div style={{ marginTop: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.inkSoft }}>Click a week on the chart to adjust its planned receipt.</div>
                )}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: COLORS.inkSoft }}>
                  <span><span style={{ color: COLORS.steel, fontWeight: 700 }}>{"\u2501"}</span> projected on hand</span>
                  <span><span style={{ color: COLORS.amber, fontWeight: 700 }}>{"\u254C"}</span> safety stock</span>
                  <span><span style={{ color: COLORS.steel }}>{"\u2506"}</span> lead time</span>
                  <span><span style={{ color: COLORS.moss }}>{"\u25A0"}</span> PO / GIT arrival</span>
                  <span><span style={{ color: COLORS.steel }}>{"\u25A0"}</span> planned receipt</span>
                  <span><span style={{ color: COLORS.rust }}>{"\u25CF"}</span> below safety stock</span>
                  {stockChartUsage && <span><span style={{ color: "#7C3AED" }}>{"\u2501"}</span> average demand per week, weeks with demand only (same axis)</span>}
                </div>
                {selectedRec.poPendingDetails && selectedRec.poPendingDetails.length > 0 && (
                  <div style={{ marginTop: 10, overflowX: "auto" }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 700, color: COLORS.amber, marginBottom: 4 }}>
                      Open POs ({selectedRec.poPendingDetails.length}) - {Math.round(selectedRec.poPendingDetails.reduce((sum, po) => sum + po.quantity, 0)).toLocaleString()} {selectedRec.unit}
                    </div>
                    <table style={{ borderCollapse: "collapse", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ color: COLORS.inkSoft }}>
                          {["PO #", "VENDOR", "QTY", "FREIGHT", "ETD", "ARRIVAL (ETD + freight)", "DUE WK (editable)"].map((h) => <td key={h} style={{ padding: "2px 14px 2px 0", textAlign: h === "QTY" ? "right" : "left" }}>{h}</td>)}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRec.poPendingDetails.map((po, idx) => (
                          <tr key={`${po.poNumber}-${idx}`}>
                            <td style={{ padding: "2px 14px 2px 0", fontWeight: 700, color: COLORS.moss }}>{po.poNumber}</td>
                            <td style={{ padding: "2px 14px 2px 0", color: COLORS.inkSoft }}>{po.vendor || "-"}</td>
                            <td style={{ padding: "2px 14px 2px 0", textAlign: "right" }}>{Math.round(po.quantity).toLocaleString()}</td>
                            {(() => {
                              const fKey = `${selectedRec.item}::${po.poNumber}`;
                              const fMethod = shipmentMethod[fKey] || "";
                              const fTr = shipmentTracking[fKey] || {};
                              const fEtd = freightEtd(fTr, fMethod);
                              const fEta = fMethod && fEtd ? addDaysYMD(fEtd, 7 * freightLeadWeeks(fMethod)) : "";
                              const fEtaDate = fEta ? parseYMD(fEta) : null;
                              const inputStyle = {
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600, padding: "2px 6px",
                                borderRadius: COLORS.radiusSm, background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                              };
                              return (
                                <>
                                  <td style={{ padding: "2px 14px 2px 0" }}>
                                    <select value={fMethod} disabled={isReadOnly} onChange={(e) => setPoFreight(selectedRec.item, po.poNumber, { method: e.target.value })}
                                      style={{ ...inputStyle, border: `1px solid ${fMethod === "air" ? COLORS.amber : fMethod === "sea" ? COLORS.moss : COLORS.paperLine}` }}>
                                      <option value="">- not set -</option>
                                      <option value="sea">Sea ({SEA_WEEKS} wk)</option>
                                      <option value="air">Air ({AIR_WEEKS} wk)</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: "2px 14px 2px 0" }}>
                                    <input key={`${fKey}-etd-${fEtd}`} type="date" defaultValue={fEtd} disabled={isReadOnly}
                                      title="Date the goods leave the supplier (ETD). With a freight method set, arrival = ETD + freight lead time."
                                      onBlur={(e) => { if (e.target.value !== fEtd) setPoFreight(selectedRec.item, po.poNumber, { etd: e.target.value }); }}
                                      style={{ ...inputStyle, border: `1px solid ${fEtd ? COLORS.steel : COLORS.paperLine}` }} />
                                  </td>
                                  <td style={{ padding: "2px 14px 2px 0", color: fEta ? COLORS.ink : COLORS.inkSoft, whiteSpace: "nowrap" }}>
                                    {fEta ? `${fEta} (${isoWeekLabel(fEtaDate)})` : (fMethod ? "enter ETD" : "-")}
                                  </td>
                                </>
                              );
                            })()}
                            <td style={{ padding: "2px 0" }}>
                              {(() => {
                                const origW = poOriginalMap[`${selectedRec.item}::${po.poNumber}`];
                                const isWkOv = origW !== undefined && String(origW.week) !== String(po.rawWeek);
                                return (
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <input key={`${po.poNumber}-${idx}-${po.rawWeek}`} type="text" defaultValue={po.rawWeek} disabled={isReadOnly}
                                      placeholder="e.g. 27CW05" title="Due week, e.g. 27CW05 or a week number. Press Enter to apply."
                                      onBlur={(e) => { if (e.target.value.trim() !== String(po.rawWeek).trim()) adjustPOWeek(selectedRec.item, po.poNumber, e.target.value); }}
                                      onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                                      style={{
                                        width: 100, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700,
                                        border: `1px solid ${isWkOv || po.noDate ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                                        padding: "2px 6px", background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                                      }} />
                                    <span style={{ color: COLORS.inkSoft }}>
                                      {po.noDate ? "no date yet" : `${po.weekLabel}${po.mondayDate ? ` (Mon ${po.mondayDate})` : ""}`}{po.outOfHorizon && !po.noDate ? " - outside chart" : ""}
                                    </span>
                                    {isWkOv && !isReadOnly && (
                                      <button onClick={() => resetPOWeek(selectedRec.item, po.poNumber)} title={`Reset to original (${origW.week})`} style={{
                                        border: `1px solid ${COLORS.amber}`, background: "transparent", color: COLORS.amber, borderRadius: COLORS.radiusSm,
                                        cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, padding: "1px 7px",
                                      }}>{"\u21BA"} reset</button>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
    );
  };

  const openKpiModal = (kind) => {
    let title = "";
    let columns = [];
    let rows = [];
    switch (kind) {
      case "pastDue": {
        title = "Past due releases";
        columns = ["ITEM", "DESCRIPTION", "RELEASE WEEK", "QTY"];
        order.forEach((item) => {
          const rec = records[item];
          rec.plannedRelease.forEach((v, i) => {
            if (v > 0 && rec.pastDue[i]) rows.push({ item, cells: [item, rec.description, weekLabels[i], Math.round(v)] });
          });
        });
        break;
      }
      case "ordersNeeded": {
        title = "Planned orders in horizon";
        columns = ["ITEM", "DESCRIPTION", "RELEASE WEEK", "QTY", "PAST DUE"];
        order.forEach((item) => {
          const rec = records[item];
          rec.plannedRelease.forEach((v, i) => {
            if (v > 0) rows.push({ item, cells: [item, rec.description, weekLabels[i], Math.round(v), rec.pastDue[i] ? "yes" : "no"] });
          });
        });
        break;
      }
      case "belowSafety": {
        title = "Items below safety stock (wk 1)";
        columns = ["ITEM", "DESCRIPTION", "ON HAND", "SAFETY STOCK"];
        order.forEach((item) => {
          const rec = records[item];
          if (rec.projOnHand[historyWeeks] < rec.safety) rows.push({ item, cells: [item, rec.description, rec.projOnHand[historyWeeks], rec.safety] });
        });
        break;
      }
      case "itemCount": {
        title = "Items in structure";
        columns = ["ITEM", "DESCRIPTION", "VENDOR", "UNIT"];
        order.forEach((item) => {
          const rec = records[item];
          rows.push({ item, cells: [item, rec.description, rec.vendor || "\u2014", rec.unit] });
        });
        break;
      }
      case "poPending": {
        title = "PO pending";
        columns = ["ITEM", "PO #", "VENDOR", "QTY", "DUE WEEK"];
        order.forEach((item) => {
          const rec = records[item];
          (rec.poPendingDetails || []).forEach((p) => {
            rows.push({ item, cells: [item, p.poNumber, p.vendor || "\u2014", p.quantity, p.weekLabel] });
          });
        });
        break;
      }
      case "git": {
        title = "Goods in transit";
        columns = ["ITEM", "DESCRIPTION", "QTY"];
        order.forEach((item) => {
          const rec = records[item];
          const gitTotal = (rec.git || []).reduce((s, v) => s + v, 0);
          if (gitTotal > 0) rows.push({ item, cells: [item, rec.description, gitTotal] });
        });
        break;
      }
      case "expired": {
        title = "Expired stock";
        columns = ["ITEM", "DESCRIPTION", "EXPIRED QTY", "EXPIRED VALUE"];
        order.forEach((item) => {
          const rec = records[item];
          if (rec.expired) rows.push({ item, cells: [item, rec.description, rec.expiredQty, rec.expiredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })] });
        });
        break;
      }
      case "expiringSoon": {
        title = "Expiring within 4 wks";
        columns = ["ITEM", "DESCRIPTION", "WEEKS TO EXPIRY", "EXPIRY DATE"];
        order.forEach((item) => {
          const rec = records[item];
          if (rec.expiringSoon) rows.push({ item, cells: [item, rec.description, rec.weeksToExpiry, rec.expiryDate || "\u2014"] });
        });
        break;
      }
      case "variance": {
        title = "Consumption variance";
        columns = ["ITEM", "DESCRIPTION", "WEEKS W/ VARIANCE"];
        order.forEach((item) => {
          const rec = records[item];
          const count = rec.consumptionVariance.filter((v) => v !== null && Math.abs(v) >= 0.5).length;
          if (count > 0) rows.push({ item, cells: [item, rec.description, count] });
        });
        break;
      }
      case "usableValue": {
        title = "Usable inventory value";
        columns = ["ITEM", "DESCRIPTION", "USABLE QTY", "VALUE"];
        order.forEach((item) => {
          const rec = records[item];
          if (rec.usableValue > 0) rows.push({ item, cells: [item, rec.description, rec.usableOnHand, rec.usableValue] });
        });
        rows.sort((a, b) => b.cells[3] - a.cells[3]);
        rows = rows.map((r) => ({ ...r, cells: [...r.cells.slice(0, 3), r.cells[3].toLocaleString(undefined, { maximumFractionDigits: 0 })] }));
        break;
      }
      case "expiredValue": {
        title = "Value at risk (expired)";
        columns = ["ITEM", "DESCRIPTION", "EXPIRED QTY", "VALUE"];
        order.forEach((item) => {
          const rec = records[item];
          if (rec.expiredValue > 0) rows.push({ item, cells: [item, rec.description, rec.expiredQty, rec.expiredValue] });
        });
        rows.sort((a, b) => b.cells[3] - a.cells[3]);
        rows = rows.map((r) => ({ ...r, cells: [...r.cells.slice(0, 3), r.cells[3].toLocaleString(undefined, { maximumFractionDigits: 0 })] }));
        break;
      }
      default:
        return;
    }
    setKpiModalFilter("");
    setKpiModal({ title, columns, rows });
  };

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
          <input type="number" min={4} max={156} value={horizon} disabled={isReadOnly}
            onChange={(e) => setHorizon(Math.max(4, Math.min(156, toNum(e.target.value, 12))))}
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
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }} title="Safety stock = average weekly consumption x this many weeks (0 = off, use the fixed safety_stock quantity). An item's own safety_weeks column overrides it.">
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>safety</span>
            <input type="number" min={0} max={104} step={0.5} value={safetyWeeksDefault} disabled={isReadOnly}
              onChange={(e) => setSafetyWeeksDefault(Math.max(0, Math.min(104, toNum(e.target.value, 0))))}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.ink,
                border: `1px solid ${safetyWeeksDefault > 0 ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm, background: "transparent", width: "44px", outline: "none", padding: "1px 3px",
              }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>wks x usage</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, cursor: isReadOnly ? "default" : "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}
            title="When on, a plan typed for one item (planned receipt / release) is applied to every item in the same mold family: same week, same quantity.">
            <input type="checkbox" checked={planApplyFamily} disabled={isReadOnly} onChange={(e) => setPlanApplyFamily(e.target.checked)} style={{ margin: 0 }} />
            plan applies to whole mold family
          </label>
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
            <SyncBadge sync={sync} isReadOnly={isReadOnly} onRetry={() => (isReadOnly ? pullShared(false) : pushShared())} onResolve={resolveConflict} />
            <button onClick={onLogout} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft,
              border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "2px 8px", borderRadius: COLORS.radiusSm,
            }}>logout</button>
          </div>
          {!isReadOnly && (
            <button onClick={() => { if (window.confirm("Clear all saved plans for EVERYONE (order status, planned receipts, PO edits, safety stock overrides, freight)? Horizon and history weeks on this browser are reset too.")) clearSavedSettings(); }} style={{
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
        <UploadSlot label="Inventory Master" hint="item, on_hand, lead_time_weeks, lot_size, safety_stock, safety_factor, vendor, unit_price, expiry_date, mold_family, country, is_overseas, material_type, safety_weeks (optional)"
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
        <KPI label="Past due releases" value={kpis.pastDue} tone="rust" icon={CircleAlert} mobile={isMobile} onClick={() => openKpiModal("pastDue")} />
        <KPI label="Planned orders in horizon" value={kpis.ordersNeeded} tone="steel" icon={ClipboardList} mobile={isMobile} onClick={() => openKpiModal("ordersNeeded")} />
        <KPI label="Items below safety stock (wk 1)" value={kpis.belowSafety} tone="amber" icon={AlertTriangle} mobile={isMobile} onClick={() => openKpiModal("belowSafety")} />
        <KPI label="Items in structure" value={kpis.itemCount} tone="moss" icon={Gauge} mobile={isMobile} onClick={() => openKpiModal("itemCount")} />
        <KPI label="PO pending" value={scheduledReceiptsPO.length} tone="amber" icon={ClipboardList} mobile={isMobile} onClick={() => openKpiModal("poPending")} />
        <KPI label="Goods in transit" value={scheduledReceiptsGIT.length} tone="moss" icon={ClipboardList} mobile={isMobile} onClick={() => openKpiModal("git")} />
        <KPI label="Expired stock" value={kpis.expiredCount} tone="rust" icon={CalendarX} mobile={isMobile} onClick={() => openKpiModal("expired")} />
        <KPI label="Expiring within 4 wks" value={kpis.expiringSoonCount} tone="amber" icon={CalendarX} mobile={isMobile} onClick={() => openKpiModal("expiringSoon")} />
        <KPI label="Consumption variance" value={kpis.varianceCount} tone="steel" icon={Scale} mobile={isMobile} onClick={() => openKpiModal("variance")} />
        <KPI label="Usable inventory value" value={kpis.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="moss" icon={Gauge} mobile={isMobile} onClick={() => openKpiModal("usableValue")} />
        <KPI label="Value at risk (expired)" value={kpis.expiredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="rust" icon={CalendarX} mobile={isMobile} onClick={() => openKpiModal("expiredValue")} />
      </div>

      {/* main */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(showBOM || showCoverage || showShipment || showStockChart || showDemandVer || showInvTotal || showFgRisk) && (
          <button onClick={() => { setShowBOM(false); setShowCoverage(false); setShowShipment(false); setShowStockChart(false); setShowDemandVer(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
            display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
            color: COLORS.inkSoft, background: "transparent",
            border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
          }}>{"←"} back to dashboard</button>
        )}
        <button onClick={() => { setShowBOM((s) => !s); setShowCoverage(false); setShowShipment(false); setShowStockChart(false); setShowDemandVer(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showBOM ? "#fff" : COLORS.steel, background: showBOM ? COLORS.steel : "transparent",
          border: `1px solid ${COLORS.steel}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <ClipboardList size={13} /> {"\u{1F4CB} view full BOM"}
        </button>
        <button onClick={() => { setShowCoverage((s) => !s); setShowBOM(false); setShowShipment(false); setShowStockChart(false); setShowDemandVer(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showCoverage ? "#fff" : COLORS.moss, background: showCoverage ? COLORS.moss : "transparent",
          border: `1px solid ${COLORS.moss}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <Scale size={13} /> {"\u{1F4C8} view stock coverage"}
        </button>
        <button onClick={() => { setShowShipment((s) => !s); setShowBOM(false); setShowCoverage(false); setShowStockChart(false); setShowDemandVer(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showShipment ? "#fff" : COLORS.amber, background: showShipment ? COLORS.amber : "transparent",
          border: `1px solid ${COLORS.amber}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <ClipboardList size={13} /> {"\u2708\uFE0F view import shipment plan"}
        </button>
        <button onClick={() => { setShowStockChart((s) => !s); setShowBOM(false); setShowCoverage(false); setShowShipment(false); setShowDemandVer(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showStockChart ? "#fff" : COLORS.steelDeep, background: showStockChart ? COLORS.steelDeep : "transparent",
          border: `1px solid ${COLORS.steelDeep}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <Gauge size={13} /> {"\u{1F4C9} view stock charts"}
        </button>
        <button onClick={() => { setShowFgRisk((s) => !s); setShowBOM(false); setShowCoverage(false); setShowShipment(false); setShowStockChart(false); setShowDemandVer(false); setShowInvTotal(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showFgRisk ? "#fff" : COLORS.rust, background: showFgRisk ? COLORS.rust : "transparent",
          border: `1px solid ${COLORS.rust}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <CircleAlert size={13} /> {"\u{1F6A8} view FG at risk"}
        </button>
        <button onClick={() => { setShowInvTotal((s) => !s); setShowBOM(false); setShowCoverage(false); setShowShipment(false); setShowStockChart(false); setShowDemandVer(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showInvTotal ? "#fff" : COLORS.moss, background: showInvTotal ? COLORS.moss : "transparent",
          border: `1px solid ${COLORS.moss}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <Layers size={13} /> {"\u{1F4CA} view total inventory"}
        </button>
        <button onClick={() => { setShowDemandVer((s) => !s); setShowBOM(false); setShowCoverage(false); setShowShipment(false); setShowStockChart(false); setShowInvTotal(false); setShowFgRisk(false); }} style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          color: showDemandVer ? "#fff" : COLORS.rust, background: showDemandVer ? COLORS.rust : "transparent",
          border: `1px solid ${COLORS.rust}`, borderRadius: COLORS.radiusSm, padding: "6px 12px",
        }}>
          <Layers size={13} /> {"demand versions" + (resolvedActiveName ? ` (${resolvedActiveName})` : "")}
        </button>
      </div>

      {showFgRisk ? (
        <FgRiskPage
          records={records} order={order} weekLabels={weekLabels} weekMondayDates={weekMondayDates} historyWeeks={historyWeeks} isMobile={isMobile}
          onOpenItem={(item) => { setSelected(item); setShowFgRisk(false); setShowStockChart(true); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : showInvTotal ? (
        <InventoryOverviewPage
          records={records} order={order} weekLabels={weekLabels} weekMondayDates={weekMondayDates} historyWeeks={historyWeeks}
          vendorGroups={vendorGroups} materialTypeGroups={materialTypeGroups} isMobile={isMobile}
          onOpenItem={(item) => { setSelected(item); setShowInvTotal(false); setShowStockChart(true); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : showDemandVer ? (
        <DemandVersionsPage
          isReadOnly={isReadOnly} current={demand} versions={demandVersions.slice().sort((x, y) => (x.sortKey ?? 99) - (y.sortKey ?? 99))} activeName={resolvedActiveName}
          onSetActive={setActiveDemandVersion} onAddFetch={addDemandVersionFetch} onAddUpload={addDemandVersionUpload} onRemove={removeDemandVersion}
          mrpParams={{ bom, inventory, poPending: scheduledReceiptsPO, git: scheduledReceiptsGIT, actualConsumption, batches, horizon, historyWeeks, planOverrides, receiptOverrides, safetyWeeksDefault, safetyOverrides }}
        />
      ) : showStockChart ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{
            border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
            background: COLORS.card, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px",
              borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
                <Gauge size={16} color={COLORS.steelDeep} /> Stock chart - projected on hand ({stockChartRows.length} items)
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select value={stockChartVendor} onChange={(e) => { setStockChartVendor(e.target.value); setStockChartLimit(24); }} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600, maxWidth: 220,
                  border: `1px solid ${stockChartVendor ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px",
                  color: stockChartVendor ? COLORS.amber : COLORS.ink, background: stockChartVendor ? "#FEF3C7" : COLORS.paper,
                }}>
                  <option value="">All vendors</option>
                  {vendorGroups.map((g) => <option key={g.vendor} value={g.vendor}>{g.vendor} ({g.items.length})</option>)}
                </select>
                {materialTypeGroups.length > 0 && (
                  <select value={stockChartType} onChange={(e) => { setStockChartType(e.target.value); setStockChartLimit(24); }} style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 600,
                    border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px", color: COLORS.ink, background: COLORS.paper,
                  }}>
                    <option value="">All material types</option>
                    {materialTypeGroups.map((g) => <option key={g.vendor} value={g.vendor}>{g.vendor}</option>)}
                  </select>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft }}>
                  <input type="checkbox" checked={stockChartGroup} onChange={(e) => { setStockChartGroup(e.target.checked); setStockChartLimit(24); }} style={{ margin: 0 }} />
                  group by mold family
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft }}>
                  <input type="checkbox" checked={stockChartLabels} onChange={(e) => setStockChartLabels(e.target.checked)} style={{ margin: 0 }} />
                  show values
                </label>
                <button onClick={exportStockChartCSV} style={{
                  display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: "#fff",
                  border: `1px solid ${COLORS.steelDeep}`, background: COLORS.steelDeep, padding: "6px 12px", borderRadius: COLORS.radiusSm,
                }}><Download size={12} /> export data (CSV)</button>
                <button onClick={exportStockChartPOs} style={{
                  display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: COLORS.amber,
                  border: `1px solid ${COLORS.amber}`, background: "transparent", padding: "6px 12px", borderRadius: COLORS.radiusSm,
                }}><Download size={12} /> export open POs (CSV)</button>
                <input type="text" value={stockChartFilter} onChange={(e) => { setStockChartFilter(e.target.value); setStockChartLimit(24); }}
                  placeholder="Search item / description / vendor..."
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, border: `1px solid ${COLORS.paperLine}`,
                    borderRadius: COLORS.radiusSm, padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 220,
                  }} />
              </div>
            </div>
            {selectedRec ? (
              renderStockChartDetail()
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>Select a material below to see its chart.</div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
            {stockChartRows.slice(0, stockChartLimit).map((row, idx, arr) => {
              const rec = records[row.item];
              const isSel = selected === row.item;
              const showHeader = stockChartGroup && (idx === 0 || arr[idx - 1].family !== row.family);
              const familyCount = showHeader ? stockChartRows.filter((r) => r.family === row.family).length : 0;
              return (
                <React.Fragment key={row.item}>
                  {showHeader && (
                    <div style={{
                      gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 6, padding: "6px 4px 2px",
                      fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, fontWeight: 700, color: row.family ? COLORS.amber : COLORS.inkSoft,
                      borderBottom: `1px solid ${COLORS.paperLine}`,
                    }}>
                      <Layers size={13} /> {row.family ? `Mold family: ${row.family}` : "No mold family"}
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 400, color: COLORS.inkSoft }}>({familyCount} items)</span>
                    </div>
                  )}
                  <div onClick={() => { handleSelectItem(row.item); setStockChartWeek(null); setStockChartModal(true); }} style={{
                    cursor: "pointer", background: COLORS.card, borderRadius: COLORS.radius, boxShadow: COLORS.shadow,
                    border: `1px solid ${isSel ? COLORS.steel : COLORS.paperLine}`, padding: "8px 10px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, fontWeight: 700, color: COLORS.steel }}>{rec.item}</span>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>{Math.round(rec.usableOnHand).toLocaleString()} {rec.unit}</span>
                    </div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 4 }}>{rec.description}</div>
                    <StockChart rec={rec} weekLabels={weekLabels} historyWeeks={historyWeeks} compact />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {stockChartRows.length > stockChartLimit && (
            <button onClick={() => setStockChartLimit((l) => l + 24)} style={{
              alignSelf: "center", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
              color: COLORS.steel, background: "transparent", border: `1px solid ${COLORS.steel}`, borderRadius: COLORS.radiusSm, padding: "6px 16px",
            }}>Show 24 more ({stockChartRows.length - stockChartLimit} remaining)</button>
          )}
          {stockChartRows.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>No materials match the filter.</div>
          )}
        </div>
      ) : showShipment ? (
        <div style={{
          border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
          background: COLORS.card, overflow: "hidden",
        }}>
          {poPendingHeaderWarning && (
            <div style={{
              border: `1px solid ${COLORS.amber}`, background: "#FEF3C7", color: "#92400E",
              padding: "6px 12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
            }}>
              ไม่พบคอลัมน์เลข PO ในไฟล์ PO Pending — คอลัมน์ที่ตรวจพบ: {poPendingHeaderWarning.join(", ")}.
              ลองเปลี่ยนชื่อคอลัมน์ให้มีคำว่า "po" อยู่ในชื่อ (เช่น "po_number") แล้วอัปโหลดใหม่ — ตอนนี้เลข PO จะโชว์เป็น "?" สีส้มในตารางแทน
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px",
            borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8,
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14, fontWeight: 700, color: COLORS.ink,
            }}>
              {"\u2708\uFE0F"} Import Shipment Planning — {shipmentRowsFiltered.length} items
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 400, color: COLORS.inkSoft }}>
                (Sea {SEA_WEEKS} wk · Air {AIR_WEEKS} wk)
              </span>
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={shipmentFilter}
                onChange={(e) => setShipmentFilter(e.target.value)}
                placeholder="ค้นหา item / vendor..."
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                  border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 200,
                }}
              />
              <button onClick={exportShipment} style={{
                display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: "#fff",
                border: `1px solid ${COLORS.amber}`, background: COLORS.amber, padding: "6px 12px", borderRadius: COLORS.radiusSm,
              }}><Download size={12} /> export shipment plan</button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, padding: "6px 14px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap" }}>
            {STATUS_TRACKING_OPTIONS.map((s) => {
              const count = shipmentRowsFiltered.filter((r) => r.status === s.value).length;
              return (
                <span key={s.value} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: s.color,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: s.bg, border: `1px solid ${s.color}`, display: "inline-block" }} />
                  {s.label}: {count}
                </span>
              );
            })}
          </div>
          <div style={{ overflowX: "auto", maxHeight: 640, overflowY: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: COLORS.card, zIndex: 1 }}>
                  {["ITEM", "PO #", "QTY", "DESCRIPTION", "VENDOR", "COVERAGE (WK)", "RECOMMENDED", "METHOD", "ETA", "ETD (calc)", "ARRIVED?", "TRACKING STATUS", "ACTUAL ARRIVAL"].map((h) => (
                    <td key={h} style={{ padding: "8px 10px", color: COLORS.inkSoft, borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap" }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipmentRowsFiltered.map((r) => {
                  const recTone = r.recommended === "critical" ? COLORS.rust : r.recommended === "air" ? COLORS.amber : COLORS.moss;
                  const recLabel = r.recommended === "critical" ? "\u26A0\uFE0F CRITICAL" : r.recommended === "air" ? "\u2708\uFE0F AIR" : "\u{1F6A2} SEA";
                  const statusMeta = STATUS_TRACKING_OPTIONS.find((s) => s.value === r.status) || STATUS_TRACKING_OPTIONS[0];
                  return (
                    <tr key={r.key} onClick={() => handleSelectItem(r.item)} style={{ cursor: "pointer" }}>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.steel, fontWeight: 600, whiteSpace: "nowrap" }}>{r.item}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: r.poNumber === "?" ? COLORS.amber : COLORS.ink, fontWeight: r.poNumber === "?" ? 700 : 400, whiteSpace: "nowrap" }} title={r.poNumber === "?" ? "ระบบหาเลข PO จากไฟล์ PO Pending ไม่เจอ — เช็คว่าคอลัมน์ชื่อ PO ในไฟล์ตั้งชื่อว่าอะไร (ควรมีคำว่า po อยู่ในชื่อคอลัมน์)" : undefined}>{r.poNumber}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: "right", whiteSpace: "nowrap" }}>{r.qty} {r.unit}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{r.vendor || "\u2014"}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, textAlign: "right" }}>{r.coverageWeeks === null ? "no data" : r.coverageWeeks.toFixed(1)}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap" }}>
                        <span style={{ color: recTone, fontWeight: 700, fontSize: 10.5 }}>{recLabel}</span>
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.paperLine}` }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.chosen}
                          disabled={isReadOnly}
                          onChange={(e) => setShipmentMethodForKey(r.key, e.target.value)}
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600, padding: "3px 6px",
                            borderRadius: 999, cursor: isReadOnly ? "default" : "pointer",
                            background: r.chosen === "air" ? "#FEF3C7" : "#DCFCE7",
                            color: r.chosen === "air" ? COLORS.amber : COLORS.moss,
                            border: `1px solid ${r.chosen === "air" ? COLORS.amber : COLORS.moss}`,
                          }}
                        >
                          <option value="sea">Sea ({SEA_WEEKS}wk)</option>
                          <option value="air">Air ({AIR_WEEKS}wk)</option>
                        </select>
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.paperLine}` }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="date"
                          value={r.eta}
                          disabled={isReadOnly}
                          title="ETA — วันที่คาดว่าจะถึงจริง (กรอกจากที่ผู้ให้บริการขนส่งแจ้งมา) ระบบจะคำนวณ ETD ย้อนกลับให้อัตโนมัติ"
                          onChange={(e) => updateShipmentTracking(r.key, { eta: e.target.value })}
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 6px",
                            border: `1px solid ${r.eta ? COLORS.steel : COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                            background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                          }}
                        />
                      </td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft, whiteSpace: "nowrap" }} title="คำนวณย้อนกลับจาก ETA − lead time">{r.etdDate}</td>
                      <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap" }}>
                        {r.willArriveInTime ? (
                          <span style={{ color: COLORS.moss, fontWeight: 600, fontSize: 10.5 }}>{"\u2713"} ทันเวลา</span>
                        ) : (
                          <span style={{ color: COLORS.rust, fontWeight: 600, fontSize: 10.5 }}>{"\u2715"} ไม่ทัน</span>
                        )}
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.paperLine}` }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.status}
                          disabled={isReadOnly}
                          onChange={(e) => updateShipmentTracking(r.key, { status: e.target.value })}
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600, padding: "3px 6px",
                            borderRadius: 999, cursor: isReadOnly ? "default" : "pointer",
                            background: statusMeta.bg, color: statusMeta.color,
                            border: `1px solid ${statusMeta.color}`,
                          }}
                        >
                          {STATUS_TRACKING_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "4px 8px", borderBottom: `1px solid ${COLORS.paperLine}` }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="date"
                          value={r.actualArrivalDate}
                          disabled={isReadOnly}
                          onChange={(e) => updateShipmentTracking(r.key, { actualArrivalDate: e.target.value })}
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "3px 6px",
                            border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                            background: isReadOnly ? "transparent" : "#fff", color: COLORS.ink,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
                {shipmentRowsFiltered.length === 0 && (
                  <tr><td colSpan={13} style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft }}>ไม่มี item ที่ต้องวางแผนนำเข้าในตอนนี้</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "8px 14px", borderTop: `1px solid ${COLORS.paperLine}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>
            แสดงเฉพาะ item ที่มี PO pending เปิดอยู่ และ vendor เป็นต่างประเทศ (oversea — เดาจากชื่อ vendor ที่ไม่มีตัวอักษรไทย) — RECOMMENDED คำนวณจาก coverage (on-hand \u00f7 อัตราเบิกใช้เฉลี่ย) เทียบกับ lead time ของ Sea/Air — {"\u26A0\uFE0F"} CRITICAL หมายถึง coverage ต่ำกว่า Air lead time แล้ว (แม้ส่งทางอากาศก็อาจไม่ทัน ควรเร่งเป็นพิเศษ) — เปลี่ยนวิธีขนส่งได้ที่ช่อง METHOD จะบันทึกไว้ให้อัตโนมัติ
          </div>
        </div>
      ) : showCoverage ? (
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
                  <div style={{ width: 90, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: barColor === COLORS.paperLine ? COLORS.inkSoft : barColor }} title={r.is_bom_estimate ? "ไม่มียอดเบิกจริงในไฟล์ Actual Consumption เลย — คำนวณ coverage จากค่าเฉลี่ย Gross Requirements (BOM/Demand) ล้วนๆ" : r.is_blended ? "ผสมยอดเบิกจริงกับค่าเฉลี่ย Gross Requirements (BOM/Demand ทั้งอดีต+อนาคต) เข้าด้วยกัน" : undefined}>
                    {r.coverage_weeks === null ? "no data" : r.coverage_weeks >= MAX_SCALE ? `${Math.round(r.coverage_weeks)}+ wk` : `${r.coverage_weeks.toFixed(1)} wk`}
                    {r.is_bom_estimate && <div style={{ fontSize: 8.5, fontWeight: 600, color: "#6D28D9" }}>(BOM est.)</div>}
                    {r.is_blended && <div style={{ fontSize: 8.5, fontWeight: 600, color: COLORS.steel }}>(blended)</div>}
                    {r.is_actual_only && <div style={{ fontSize: 8.5, fontWeight: 600, color: COLORS.moss }}>(actual only)</div>}
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
                  {["PROJECT", "PARENT ITEM", "PARENT DESC", "COMPONENT ITEM", "COMPONENT DESC", "QTY/PARENT", "UNIT", "VENDOR", "LEAD TIME", "LOT SIZE", "MOLD FAMILY", "MATERIAL TYPE"].map((h) => (
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
                    <td style={{ padding: "6px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.moss, whiteSpace: "nowrap" }}>{r.component_material_type || "—"}</td>
                  </tr>
                ))}
                {bomRowsFiltered.length === 0 && (
                  <tr><td colSpan={12} style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft }}>ไม่พบข้อมูล BOM ที่ตรงกับการค้นหา</td></tr>
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
              <PackageSearch size={14} color={COLORS.steel} /> {viewMode === "assembly" ? "Item Structure" : viewMode === "material" ? "Where-Used" : viewMode === "moldFamily" ? "By Mold Family" : viewMode === "materialType" ? "By Material Type" : viewMode === "project" ? "By Project" : "By Vendor"}
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
            {[["assembly", "Finished good → parts"], ["project", "By project"], ["material", "Raw material → where-used"], ["vendor", "By vendor"], ...(moldFamilyGroups.length > 0 ? [["moldFamily", "By mold family"]] : []), ...(materialTypeGroups.length > 0 ? [["materialType", "By material type"]] : [])].map(([mode, label]) => (
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
            ) : viewMode === "materialType" ? (
              <VendorGroupTree groups={materialTypeGroups} records={records} selected={selected} onSelect={handleSelectItem}
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
            safetyOverride={selectedRec ? safetyOverrides[selectedRec.item] : undefined} onSetSafetyOverride={setSafetyOverride}
            moldFamilyMembers={selectedRec && selectedRec.moldFamily ? (moldFamilyMap[selectedRec.moldFamily] || []).filter((it) => it !== selected) : []} />
          <PlannedOrders records={records} weeks={weeks} weekLabels={weekLabels} orderStatus={orderStatus} setOrderStatus={setOrderStatus} selectedItem={selected} isReadOnly={isReadOnly} />
        </div>
      </div>
      </>
      )}

      <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
        Note: planned orders round up to lot size; PO pending is netted against gross requirements in the week it's due, GIT is treated as arriving in week 1 (no date needed since it's already shipped). Expired on-hand stock is excluded from the plan (treated as 0). Actual consumption is compared against calculated gross requirements in the same week; variance only shows where actual data was entered. "Planned order receipt", "Planned order release", and PO pending quantities are directly editable — type a new number to override the calculated plan (amber outline marks an override; click ↺ to reset). In a week with incoming goods (PO, GIT or a manual receipt) the goods are added to stock first and that week's usage is deducted in the following week. Gross requirements marked with a superscript <b style={{ color: "#6D28D9" }}>F</b> are auto-forecasted from historical average demand — the Demand Schedule file has no confirmed order for that week yet (top-level items only; raw material requirements below them inherit the forecast automatically through the BOM explosion).
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
                <br />• "item 14001071 เหลือ stock เท่าไหร่ coverage กี่สัปดาห์"
                <br />• "project RS3 มี item อะไรบ้าง vendor ไหนบ้าง"
                <br /><br />
                <i>หมายเหตุ: AI ตอบจากข้อมูลสรุป stock/coverage/planned order ที่คำนวณไว้แล้วในระบบเท่านั้น ไม่ได้คำนวณ MRP ใหม่เอง และอาจไม่เห็นรายละเอียดทุกสัปดาห์ของทุก item</i>
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

      {/* Stock chart pop-up: opens from the small charts so the page does not need to be scrolled back up */}
      {showStockChart && stockChartModal && selectedRec && (
        <div onClick={() => setStockChartModal(false)} style={{
          position: "fixed", inset: 0, zIndex: 70, background: "rgba(16,24,40,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: isMobile ? 8 : 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: isMobile ? "100%" : "min(1700px, 98vw)", maxHeight: "96vh", overflowY: "auto",
            background: COLORS.card, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px",
              borderBottom: `1px solid ${COLORS.paperLine}`, position: "sticky", top: 0, background: COLORS.card, zIndex: 2,
            }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
                Stock chart - {selectedRec.item}
              </span>
              <button onClick={() => setStockChartModal(false)} title="Close (Esc)" style={{
                border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft, fontSize: 18, lineHeight: 1, padding: 4,
              }}>&#10005;</button>
            </div>
            {renderStockChartDetail()}
          </div>
        </div>
      )}

      {/* KPI detail modal */}
      {kpiModal && (
        <div onClick={() => setKpiModal(null)} style={{
          position: "fixed", inset: 0, zIndex: 60, background: "rgba(16,24,40,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: isMobile ? "100%" : 640, maxHeight: "80vh", display: "flex", flexDirection: "column",
            background: COLORS.card, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "12px 16px",
              borderBottom: `1px solid ${COLORS.paperLine}`,
            }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
                {kpiModal.title} ({kpiModal.rows.length})
              </span>
              <button onClick={() => setKpiModal(null)} style={{
                border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft, fontSize: 18, lineHeight: 1, padding: 4,
              }}>&#10005;</button>
            </div>
            <div style={{ padding: "8px 16px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
              <input
                type="text"
                value={kpiModalFilter}
                onChange={(e) => setKpiModalFilter(e.target.value)}
                placeholder="ค้นหาในลิสต์นี้..."
                autoFocus
                style={{
                  width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                  border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm,
                  padding: "6px 10px", color: COLORS.ink, background: COLORS.paper,
                }}
              />
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: COLORS.card }}>
                    {kpiModal.columns.map((c) => (
                      <td key={c} style={{ padding: "6px 10px", color: COLORS.inkSoft, borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap" }}>{c}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpiModal.rows
                    .filter((r) => !kpiModalFilter.trim() || r.cells.some((c) => String(c).toLowerCase().includes(kpiModalFilter.trim().toLowerCase())))
                    .slice(0, 500)
                    .map((r, idx) => (
                      <tr key={`${r.item}-${idx}`} onClick={() => { handleSelectItem(r.item); setKpiModal(null); }} style={{ cursor: "pointer" }}>
                        {r.cells.map((c, i) => (
                          <td key={i} style={{ padding: "5px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: i === 0 ? COLORS.steel : COLORS.ink, fontWeight: i === 0 ? 600 : 400, whiteSpace: "nowrap" }}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  {kpiModal.rows.filter((r) => !kpiModalFilter.trim() || r.cells.some((c) => String(c).toLowerCase().includes(kpiModalFilter.trim().toLowerCase()))).length === 0 && (
                    <tr><td colSpan={kpiModal.columns.length} style={{ padding: 20, textAlign: "center", color: COLORS.inkSoft }}>ไม่พบรายการที่ตรงกับการค้นหา</td></tr>
                  )}
                </tbody>
              </table>
              {kpiModal.rows.length > 500 && (
                <div style={{ padding: "8px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
                  แสดง 500 รายการแรก จากทั้งหมด {kpiModal.rows.length} รายการ — ใช้ช่องค้นหาด้านบนเพื่อกรองแคบลง
                </div>
              )}
            </div>
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

// ---------- Demand versions (weekly demand files, e.g. "Demand CW47") ----------
// ---------- Shared plan sync badge ----------
function SyncBadge({ sync, isReadOnly, onRetry, onResolve }) {
  const mono = "'IBM Plex Mono', monospace";
  const time = (d) => { const t = d ? new Date(d) : null; return t && !Number.isNaN(t.getTime()) ? t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""; };
  const look = {
    loading: { text: "loading shared plan\u2026", color: COLORS.inkSoft, bg: "transparent" },
    saved: { text: `shared plan ${isReadOnly ? "updated" : "saved"} ${time(sync.updatedAt || sync.at)}`, color: COLORS.moss, bg: "transparent" },
    pending: { text: "unsaved changes\u2026", color: COLORS.amber, bg: "transparent" },
    saving: { text: "saving to SharePoint\u2026", color: COLORS.steel, bg: "transparent" },
    error: { text: "not saved - click to retry", color: COLORS.rust, bg: "#FEE2E2" },
    offline: { text: isReadOnly ? "shared plan unavailable - click to retry" : "shared plan unavailable - saved on this computer only", color: COLORS.rust, bg: "#FEE2E2" },
    conflict: { text: "a newer plan was saved by someone else", color: COLORS.rust, bg: "#FEE2E2" },
  }[sync.state] || { text: sync.state, color: COLORS.inkSoft, bg: "transparent" };
  const clickable = sync.state === "error" || sync.state === "offline";
  const small = { fontFamily: mono, fontSize: 9.5, fontWeight: 600, cursor: "pointer", padding: "2px 6px", borderRadius: COLORS.radiusSm };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <span onClick={clickable ? onRetry : undefined} title={sync.msg || (sync.updatedAt ? `Last saved ${new Date(sync.updatedAt).toLocaleString()}` : "")}
        style={{ fontFamily: mono, fontSize: 9.5, fontWeight: 600, color: look.color, background: look.bg, border: `1px solid ${look.color}`, padding: "2px 8px", borderRadius: COLORS.radiusSm, cursor: clickable ? "pointer" : "default", whiteSpace: "nowrap" }}>
        {look.text}
      </span>
      {sync.state === "conflict" && !isReadOnly && (
        <>
          <button onClick={() => onResolve("theirs")} style={{ ...small, color: "#fff", background: COLORS.steelDeep, border: `1px solid ${COLORS.steelDeep}` }}>load newer plan</button>
          <button onClick={() => { if (window.confirm("Overwrite the newer plan with the plan on this screen?")) onResolve("mine"); }} style={{ ...small, color: COLORS.rust, background: "transparent", border: `1px solid ${COLORS.rust}` }}>keep mine</button>
        </>
      )}
    </span>
  );
}

// ---------- FG risk page ----------
// For every finished good (top-level item in the BOM: no parents, with components or demand), walk its BOM tree
// and find the first week anything in it runs short (projected on hand < 0) or drops below safety stock.
// A component shortage hits the FG later by the lead times of the parents above it
// (the BOM is exploded from demand with a lead-time offset), so each problem is shown as the week the FG is affected.
// A shortage in the current week is treated as affecting the FG now (its need was already late).
function firstWeekWhere(rec, start, test) {
  const arr = rec.projOnHand;
  for (let i = start; i < arr.length; i++) {
    const v = arr[i];
    if (v !== null && v !== undefined && test(v, i)) return i;
  }
  return -1;
}

function FgRiskPage({ records, order, weekLabels, weekMondayDates, historyWeeks, isMobile, onOpenItem }) {
  const mono = "'IBM Plex Mono', monospace";
  const [includeSafety, setIncludeSafety] = useState(true);
  const [statusFilter, setStatusFilter] = useState(""); // "" | "short" | "safety" | "ok"
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const start = historyWeeks;
  const total = weekLabels.length;
  const nWeeks = Math.max(0, total - start);
  const lastIdx = total - 1;
  const SHORT_EPS = -0.5; // ignore rounding noise

  // Problems of every item on its own: first shortage week, short qty, recovery week, first below-safety week
  const itemProblems = useMemo(() => {
    const out = {};
    order.forEach((item) => {
      const rec = records[item];
      if (!rec) return;
      const shortIdx = firstWeekWhere(rec, start, (v) => v < SHORT_EPS);
      const safetyIdx = (rec.safety || 0) > 0 ? firstWeekWhere(rec, start, (v) => v < rec.safety) : -1;
      let minQty = 0;
      let recoverIdx = -1;
      const shortWeeks = new Array(total).fill(false);
      const lowWeeks = new Array(total).fill(false);
      for (let i = start; i < total; i++) {
        const v = rec.projOnHand[i];
        if (v === null || v === undefined) continue;
        if (v < SHORT_EPS) { shortWeeks[i] = true; minQty = Math.min(minQty, v); }
        else if ((rec.safety || 0) > 0 && v < rec.safety) lowWeeks[i] = true;
        if (shortIdx >= 0 && recoverIdx < 0 && i > shortIdx && v >= 0) recoverIdx = i;
      }
      out[item] = { shortIdx, safetyIdx, minQty, recoverIdx, shortWeeks, lowWeeks };
    });
    return out;
  }, [order, records, start, total]);

  const fgList = useMemo(() => order.filter((item) => {
    const rec = records[item];
    if (!rec || rec.hasParents) return false;
    const hasDemand = (rec.grossReq || []).some((v, i) => i >= start && v > 0);
    return (rec.children || []).length > 0 || hasDemand;
  }), [order, records, start]);

  // item -> number of FGs whose BOM contains it
  const analysis = useMemo(() => {
    const usedBy = {};
    const trees = {};
    fgList.forEach((fg) => {
      const nodes = {}; // item -> { offset (smallest), level, path }
      const walk = (item, offset, level, path) => {
        if (path.includes(item)) return; // cycle guard
        const prevNode = nodes[item];
        if (!prevNode || offset < prevNode.offset) nodes[item] = { offset, level, path: [...path, item] };
        const rec = records[item];
        if (!rec) return;
        (rec.children || []).forEach(({ component }) => walk(component, offset + (rec.leadTime || 0), level + 1, [...path, item]));
      };
      walk(fg, 0, 0, []);
      trees[fg] = nodes;
      Object.keys(nodes).forEach((it) => { if (it !== fg) usedBy[it] = (usedBy[it] || 0) + 1; });
    });

    const impactOf = (idx, offset) => (idx < 0 ? -1 : idx <= start ? start : Math.min(lastIdx, idx + offset));

    const rows = fgList.map((fg) => {
      const rec = records[fg];
      const nodes = trees[fg];
      const problems = [];
      const cellShort = new Array(total).fill(false);
      const cellLow = new Array(total).fill(false);
      Object.keys(nodes).forEach((it) => {
        const p = itemProblems[it];
        const r = records[it];
        if (!p || !r) return;
        const { offset, level, path } = nodes[it];
        for (let i = start; i < total; i++) {
          if (p.shortWeeks[i]) cellShort[impactOf(i, offset)] = true;
          else if (includeSafety && p.lowWeeks[i]) cellLow[impactOf(i, offset)] = true;
        }
        const shortImpact = impactOf(p.shortIdx, offset);
        const lowImpact = includeSafety ? impactOf(p.safetyIdx, offset) : -1;
        if (shortImpact < 0 && lowImpact < 0) return;
        problems.push({
          item: it, rec: r, level, offset, path,
          shortIdx: p.shortIdx, shortImpact, minQty: p.minQty, recoverIdx: p.recoverIdx,
          safetyIdx: includeSafety ? p.safetyIdx : -1, lowImpact,
          sharedWith: it === fg ? 0 : (usedBy[it] || 1) - 1,
        });
      });
      problems.sort((a, b) => {
        const ak = a.shortImpact >= 0 ? a.shortImpact : 1e6 + a.lowImpact;
        const bk = b.shortImpact >= 0 ? b.shortImpact : 1e6 + b.lowImpact;
        return ak - bk || a.level - b.level || a.item.localeCompare(b.item);
      });
      const shorts = problems.filter((p) => p.shortImpact >= 0);
      const lows = problems.filter((p) => p.shortImpact < 0 && p.lowImpact >= 0);
      const firstShort = shorts.length ? Math.min(...shorts.map((p) => p.shortImpact)) : -1;
      const firstLow = problems.filter((p) => p.lowImpact >= 0).length ? Math.min(...problems.filter((p) => p.lowImpact >= 0).map((p) => p.lowImpact)) : -1;
      const status = firstShort >= 0 ? "short" : firstLow >= 0 ? "safety" : "ok";
      const limiting = status === "short" ? shorts[0] : status === "safety" ? problems[0] : null;
      const firstDemandIdx = (rec.grossReq || []).findIndex((v, i) => i >= start && v > 0);
      return { fg, rec, problems, shorts, lows, firstShort, firstLow, status, limiting, cellShort, cellLow, firstDemandIdx, treeSize: Object.keys(nodes).length - 1 };
    });
    const rank = { short: 0, safety: 1, ok: 2 };
    rows.sort((a, b) => rank[a.status] - rank[b.status]
      || (a.status === "short" ? a.firstShort - b.firstShort : 0)
      || (a.status === "safety" ? a.firstLow - b.firstLow : 0)
      || b.shorts.length - a.shorts.length
      || a.fg.localeCompare(b.fg));
    return rows;
  }, [fgList, records, itemProblems, includeSafety, start, total, lastIdx]);

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return analysis.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (qq && !(r.fg.toLowerCase().includes(qq) || (r.rec.description || "").toLowerCase().includes(qq)
        || r.problems.some((p) => p.item.toLowerCase().includes(qq)))) return false;
      return true;
    });
  }, [analysis, statusFilter, q]);

  const counts = { short: 0, safety: 0, ok: 0 };
  analysis.forEach((r) => { counts[r.status] += 1; });
  const earliest = analysis.find((r) => r.status === "short");

  const wk = (idx) => (idx >= 0 ? weekLabels[idx] : "-");
  const wkFull = (idx) => (idx >= 0 ? `${weekLabels[idx]}${weekMondayDates[idx] ? ` (Mon ${weekMondayDates[idx]})` : ""}` : "-");
  const weeksAway = (idx) => (idx < 0 ? "" : idx === start ? "now" : `in ${idx - start} wk`);
  const STATUS = {
    short: { label: "Will run short", bg: "#FEE2E2", color: COLORS.rust },
    safety: { label: "Below safety", bg: "#FEF3C7", color: COLORS.amber },
    ok: { label: "OK", bg: "#DCFCE7", color: COLORS.moss },
  };

  const exportCSV = () => {
    const rows = [];
    analysis.forEach((r) => {
      if (r.problems.length === 0) {
        rows.push({ fg: r.fg, fg_description: r.rec.description, fg_status: STATUS[r.status].label, fg_first_shortage_week: "", fg_first_below_safety_week: "", problem_item: "", problem_description: "", bom_level: "", item_first_shortage_week: "", fg_affected_week: "", max_short_qty: "", unit: "", back_to_zero_week: "", item_first_below_safety_week: "", shared_with_other_fgs: "" });
        return;
      }
      r.problems.forEach((p) => rows.push({
        fg: r.fg, fg_description: r.rec.description, fg_status: STATUS[r.status].label,
        fg_first_shortage_week: wk(r.firstShort) === "-" ? "" : wk(r.firstShort),
        fg_first_below_safety_week: wk(r.firstLow) === "-" ? "" : wk(r.firstLow),
        problem_item: p.item, problem_description: p.rec.description, bom_level: p.level,
        item_first_shortage_week: p.shortIdx >= 0 ? wk(p.shortIdx) : "",
        fg_affected_week: p.shortImpact >= 0 ? wk(p.shortImpact) : p.lowImpact >= 0 ? wk(p.lowImpact) : "",
        max_short_qty: p.minQty < 0 ? Math.round(-p.minQty) : "",
        unit: p.rec.unit, back_to_zero_week: p.recoverIdx >= 0 ? wk(p.recoverIdx) : (p.shortIdx >= 0 ? "not within horizon" : ""),
        item_first_below_safety_week: p.safetyIdx >= 0 ? wk(p.safetyIdx) : "",
        shared_with_other_fgs: p.sharedWith,
      }));
    });
    downloadCSV(`fg_risk_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const cellW = isMobile ? 9 : 14;
  const labelEvery = Math.max(1, Math.ceil(48 / (cellW + 1)));
  const heat = (r) => (
    <div style={{ display: "flex", gap: 1 }}>
      {Array.from({ length: nWeeks }).map((_, k) => {
        const i = start + k;
        const bg = r.cellShort[i] ? COLORS.rust : r.cellLow[i] ? "#FBBF24" : "#E4E7EC";
        const isDemand = (r.rec.grossReq[i] || 0) > 0;
        return (
          <span key={k} title={`${wkFull(i)}${r.cellShort[i] ? " - shortage" : r.cellLow[i] ? " - below safety" : ""}${isDemand ? ` - FG demand ${Math.round(r.rec.grossReq[i]).toLocaleString()}` : ""}`}
            style={{ width: cellW, height: 16, background: bg, borderRadius: 2, boxShadow: isDemand ? `inset 0 -3px 0 ${COLORS.steelDeep}` : "none", flex: "0 0 auto" }} />
        );
      })}
    </div>
  );

  const btn = { fontFamily: mono, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "6px 12px", borderRadius: COLORS.radiusSm };
  const stat = (label, value, sub, tone, filterKey) => (
    <button onClick={() => { if (filterKey) setStatusFilter(statusFilter === filterKey ? "" : filterKey); }} style={{
      flex: "1 1 160px", padding: "10px 14px", textAlign: "left", cursor: filterKey ? "pointer" : "default",
      border: "none", borderLeft: `3px solid ${tone}`, background: statusFilter && statusFilter === filterKey ? COLORS.paper : "transparent",
    }}>
      <div style={{ fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.ink }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>{sub}</div>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
            <CircleAlert size={16} color={COLORS.rust} /> Finished goods at risk ({analysis.length} FGs, earliest first)
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>
              <input type="checkbox" checked={includeSafety} onChange={(e) => setIncludeSafety(e.target.checked)} style={{ margin: 0 }} /> count below safety stock as a warning
            </label>
            <button onClick={exportCSV} style={{ ...btn, color: "#fff", border: `1px solid ${COLORS.steelDeep}`, background: COLORS.steelDeep, display: "flex", alignItems: "center", gap: 4 }}>
              <Download size={12} /> export (CSV)
            </button>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search FG or component..."
              style={{ fontFamily: mono, fontSize: 11.5, border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 200 }} />
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "10px 6px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
          {stat("Will run short", counts.short, "click to show only these", COLORS.rust, "short")}
          {includeSafety && stat("Below safety only", counts.safety, "click to show only these", COLORS.amber, "safety")}
          {stat("OK within horizon", counts.ok, "click to show only these", COLORS.moss, "ok")}
          {stat("First FG to be hit", earliest ? earliest.fg : "-", earliest ? `${wk(earliest.firstShort)} (${weeksAway(earliest.firstShort)}), by ${earliest.limiting.item}` : "no shortage within horizon", COLORS.rust, null)}
        </div>

        {analysis.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: COLORS.inkSoft, fontFamily: mono, fontSize: 11 }}>No finished goods found. Load a BOM and demand to see which FGs are at risk.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: COLORS.paper, color: COLORS.inkSoft, textAlign: "left" }}>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>FG</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>FG affected from</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>Runs out first</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600, whiteSpace: "nowrap", textAlign: "right" }}>Items short</th>
                  <th style={{ padding: "7px 10px", fontWeight: 600 }}>
                    <div style={{ display: "flex", gap: 1 }}>
                      {Array.from({ length: nWeeks }).map((_, k) => (
                        <span key={k} style={{ width: cellW, flex: "0 0 auto", fontSize: 9, fontWeight: 400, overflow: "visible", whiteSpace: "nowrap" }}>{k % labelEvery === 0 ? weekLabels[start + k] : ""}</span>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const st = STATUS[r.status];
                  const isOpen = !!open[r.fg];
                  const affected = r.status === "short" ? r.firstShort : r.status === "safety" ? r.firstLow : -1;
                  const lim = r.limiting;
                  return (
                    <React.Fragment key={r.fg}>
                      <tr style={{ borderTop: `1px solid ${COLORS.paperLine}`, cursor: r.problems.length ? "pointer" : "default", background: isOpen ? "#F8FAFF" : "transparent" }}
                        onClick={() => r.problems.length && setOpen((o) => ({ ...o, [r.fg]: !o[r.fg] }))}>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {r.problems.length ? (isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span style={{ width: 13 }} />}
                            <button onClick={(e) => { e.stopPropagation(); onOpenItem(r.fg); }} title="Open this item's stock chart"
                              style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: COLORS.steel, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>{r.fg}</button>
                          </span>
                          <div style={{ color: COLORS.inkSoft, fontSize: 10.5, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", paddingLeft: 17 }}>{r.rec.description}</div>
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ background: st.bg, color: st.color, fontWeight: 700, fontSize: 10.5, padding: "2px 8px", borderRadius: 999 }}>{st.label}</span>
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap", fontWeight: 700, color: affected >= 0 ? st.color : COLORS.inkSoft }}>
                          {affected >= 0 ? <>{wk(affected)} <span style={{ fontWeight: 400, color: COLORS.inkSoft }}>({weeksAway(affected)})</span></> : "-"}
                        </td>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          {lim ? (
                            <>
                              <span style={{ fontWeight: 700 }}>{lim.item}</span>
                              <span style={{ color: COLORS.inkSoft }}>{lim.item === r.fg ? " (FG itself)" : ` (level ${lim.level})`}</span>
                              {lim.shortIdx >= 0 && <div style={{ color: COLORS.inkSoft, fontSize: 10.5 }}>short {Math.round(-lim.minQty).toLocaleString()} {lim.rec.unit} from {wk(lim.shortIdx)}</div>}
                            </>
                          ) : <span style={{ color: COLORS.inkSoft }}>-</span>}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: r.shorts.length ? COLORS.rust : COLORS.inkSoft, fontWeight: r.shorts.length ? 700 : 400 }}>
                          {r.shorts.length} / {r.treeSize + 1}
                        </td>
                        <td style={{ padding: "7px 10px" }}>{heat(r)}</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={6} style={{ padding: "0 10px 12px 34px", background: "#F8FAFF" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                              <thead>
                                <tr style={{ color: COLORS.inkSoft, textAlign: "left" }}>
                                  {["Item", "Level", "Runs short", "FG affected", "Max short", "Back to zero", "Below safety from", "Also used by"].map((h) => (
                                    <th key={h} style={{ padding: "6px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {r.problems.map((p) => (
                                  <tr key={p.item} style={{ borderTop: `1px solid ${COLORS.paperLine}` }}>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
                                      <button onClick={() => onOpenItem(p.item)} title={`Path: ${p.path.join(" > ")}`}
                                        style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: COLORS.steel, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>{p.item}</button>
                                      <span style={{ color: COLORS.inkSoft, marginLeft: 6 }}>{p.rec.description}</span>
                                    </td>
                                    <td style={{ padding: "5px 8px" }}>{p.level === 0 ? "FG" : p.level}</td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap", color: p.shortIdx >= 0 ? COLORS.rust : COLORS.inkSoft, fontWeight: p.shortIdx >= 0 ? 700 : 400 }}>{p.shortIdx >= 0 ? wk(p.shortIdx) : "-"}</td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>
                                      {p.shortImpact >= 0 ? wk(p.shortImpact) : p.lowImpact >= 0 ? <span style={{ color: COLORS.amber }}>{wk(p.lowImpact)} (low)</span> : "-"}
                                      {p.offset > 0 && p.shortIdx > start && <span style={{ color: COLORS.inkSoft }}> +{p.offset} wk LT</span>}
                                    </td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{p.minQty < 0 ? `${Math.round(-p.minQty).toLocaleString()} ${p.rec.unit}` : "-"}</td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{p.shortIdx < 0 ? "-" : p.recoverIdx >= 0 ? wk(p.recoverIdx) : <span style={{ color: COLORS.rust }}>not in horizon</span>}</td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap", color: COLORS.amber }}>{p.safetyIdx >= 0 ? wk(p.safetyIdx) : "-"}</td>
                                    <td style={{ padding: "5px 8px", whiteSpace: "nowrap", color: COLORS.inkSoft }}>{p.sharedWith > 0 ? `${p.sharedWith} other FG${p.sharedWith > 1 ? "s" : ""}` : "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderTop: `1px solid ${COLORS.paperLine}`, fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, background: COLORS.rust, borderRadius: 2 }} />shortage hits the FG</span>
          {includeSafety && <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, background: "#FBBF24", borderRadius: 2 }} />below safety stock</span>}
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, background: "#E4E7EC", borderRadius: 2, boxShadow: `inset 0 -3px 0 ${COLORS.steelDeep}` }} />week with FG demand</span>
          <span>A component shortage is shown in the week it reaches the FG (its week plus the lead times of the parents above it). Click a row for the full list.</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Total inventory page ----------
// Aggregates the projected on hand of every item (after filters) into one weekly total.
// - Value mode: qty x unit price (meaningful across units). Quantity mode: raw qty summed as-is.
// - After an item's last week with demand its projected on hand is not shown on the item chart.
//   Here it is extended to the end of the horizon: receipts (PO / GIT / planned) are still added, and usage is either
//   zero ("hold") or a moving average of weekly usage taken when demand ends ("ma"). Items with no demand at all are
//   not extended (no plan = no depletion of on hand).
// - Negative projected on hand is counted as shortage, below the zero line, and is not netted against stock.
const INV_GROUP_COLORS = ["#3B5EDB", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#DB2777", "#65A30D"];
const INV_OTHER_COLOR = "#98A2B3";
const INV_SHORTAGE_COLOR = "#DC2626";
const INV_MAX_GROUPS = 7;

function invGroupKey(rec, groupBy) {
  if (groupBy === "materialType") return rec.materialType || "Unassigned";
  if (groupBy === "vendor") return rec.vendor || "Unassigned";
  if (groupBy === "kind") return isProjectCode(rec.item) ? "Finished goods / projects" : "Raw materials";
  if (groupBy === "moldFamily") return rec.moldFamily || "No mold family";
  return "Total";
}

function fmtInvNum(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "M";
  if (a >= 1e4) return (v / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "k";
  return Math.round(v).toLocaleString();
}

function InventoryOverviewPage({ records, order, weekLabels, weekMondayDates, historyWeeks, vendorGroups, materialTypeGroups, isMobile, onOpenItem }) {
  const mono = "'IBM Plex Mono', monospace";
  const [measure, setMeasure] = useState("value"); // "value" | "qty"
  const [groupBy, setGroupBy] = useState("materialType");
  const [scope, setScope] = useState("all"); // "all" | "raw" | "fg"
  const [vendor, setVendor] = useState("");
  const [mType, setMType] = useState("");
  const [q, setQ] = useState("");
  const [showSafety, setShowSafety] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [selWeek, setSelWeek] = useState(null);
  const [breakdownLimit, setBreakdownLimit] = useState(25);
  const [tailMode, setTailMode] = useState("ma"); // after the last week with demand: "ma" = moving-average usage, "hold" = no usage
  const [maBasis, setMaBasis] = useState("planned"); // "planned" = last N weeks of planned usage, "actual" = last N weeks of actual consumption
  const [maWeeks, setMaWeeks] = useState(4);

  const start = historyWeeks;
  const total = weekLabels.length;
  const nWeeks = Math.max(0, total - start);

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return order.filter((item) => {
      const rec = records[item];
      if (!rec) return false;
      if (scope === "raw" && isProjectCode(item)) return false;
      if (scope === "fg" && !isProjectCode(item)) return false;
      if (vendor && (rec.vendor || "Unassigned") !== vendor) return false;
      if (mType && rec.materialType !== mType) return false;
      if (qq && !(item.toLowerCase().includes(qq) || (rec.description || "").toLowerCase().includes(qq) || (rec.vendor || "").toLowerCase().includes(qq))) return false;
      return true;
    });
  }, [order, records, scope, vendor, mType, q]);

  // Moving-average weekly usage of one item, fixed at the point its demand ends
  const maUsageOf = useCallback((rec) => {
    if (maBasis === "actual") {
      const from = Math.max(0, start - maWeeks);
      const n = start - from;
      if (n <= 0) return 0;
      let sum = 0;
      for (let i = from; i < start; i++) sum += rec.actualConsumption[i] || 0;
      return sum / n;
    }
    let lastDemand = -1;
    for (let i = rec.adjustedConsumption.length - 1; i >= start; i--) {
      if ((rec.adjustedConsumption[i] || 0) > 0) { lastDemand = i; break; }
    }
    if (lastDemand < 0) return 0;
    const from = Math.max(start, lastDemand - maWeeks + 1);
    let sum = 0;
    for (let i = from; i <= lastDemand; i++) sum += rec.adjustedConsumption[i] || 0;
    return sum / (lastDemand - from + 1);
  }, [maBasis, maWeeks, start]);

  // Per item, per week: projected quantity, extended past the last week with demand.
  // est[k] = true where the value is an estimate (moving-average usage was deducted).
  const series = useMemo(() => {
    const out = {};
    const est = {};
    const maOf = {};
    items.forEach((item) => {
      const rec = records[item];
      const arr = new Array(nWeeks).fill(0);
      const flags = new Array(nWeeks).fill(false);
      const ma = tailMode === "ma" ? maUsageOf(rec) : 0;
      maOf[item] = ma;
      let prev = rec.usableOnHand || 0;
      let deferred = 0;
      let extending = false;
      for (let k = 0; k < nWeeks; k++) {
        const i = start + k;
        const v = rec.projOnHand[i];
        if (!extending && v !== null && v !== undefined && Number.isFinite(v)) {
          prev = v;
          arr[k] = v;
          continue;
        }
        // Past the end of the item's projection: same rule as the MRP (incoming week adds goods first, usage moves to next week)
        extending = true;
        const incoming = (rec.scheduledReceipts[i] || 0) + (rec.plannedReceipt[i] || 0);
        const usageNow = incoming > 0 ? 0 : ma + deferred;
        deferred = incoming > 0 ? deferred + ma : 0;
        prev = prev + incoming - usageNow - (rec.expiredByWeek[i] || 0);
        arr[k] = prev;
        flags[k] = ma > 0;
      }
      out[item] = arr;
      est[item] = flags;
    });
    return { qty: out, est, maOf };
  }, [items, records, nWeeks, start, tailMode, maUsageOf]);

  const factor = useCallback((rec) => (measure === "value" ? (rec.unitPrice || 0) : 1), [measure]);

  const agg = useMemo(() => {
    const groupTotals = {};
    const byGroup = {}; // group -> weekly positive totals
    const shortage = new Array(nWeeks).fill(0);
    const safety = new Array(nWeeks).fill(0);
    const belowSafety = new Array(nWeeks).fill(0);
    const incoming = new Array(nWeeks).fill(0);
    const usage = new Array(nWeeks).fill(0);
    const estimated = new Array(nWeeks).fill(0);
    let nowTotal = 0;
    items.forEach((item) => {
      const rec = records[item];
      const f = factor(rec);
      const g = invGroupKey(rec, groupBy);
      byGroup[g] = byGroup[g] || new Array(nWeeks).fill(0);
      nowTotal += Math.max(0, rec.usableOnHand || 0) * f;
      const s = series.qty[item];
      const e = series.est[item];
      for (let k = 0; k < nWeeks; k++) {
        const i = start + k;
        const qty = s[k];
        if (qty >= 0) byGroup[g][k] += qty * f; else shortage[k] += -qty * f;
        safety[k] += (rec.safety || 0) * f;
        if ((rec.safety || 0) > 0 && qty < rec.safety) belowSafety[k] += 1;
        if (e[k]) estimated[k] += 1;
        incoming[k] += ((rec.poPending[i] || 0) + (rec.git[i] || 0) + (rec.plannedReceipt[i] || 0)) * f;
        usage[k] += ((e[k] ? series.maOf[item] : (rec.adjustedConsumption[i] || 0))) * f;
      }
    });
    Object.keys(byGroup).forEach((g) => { groupTotals[g] = byGroup[g].reduce((a, b) => a + b, 0); });
    let groups = Object.keys(byGroup).sort((a, b) => groupTotals[b] - groupTotals[a]);
    let stacks = groups.map((g, idx) => ({ key: g, color: INV_GROUP_COLORS[idx % INV_GROUP_COLORS.length], values: byGroup[g] }));
    if (groups.length > INV_MAX_GROUPS) {
      const keep = stacks.slice(0, INV_MAX_GROUPS - 1);
      const rest = stacks.slice(INV_MAX_GROUPS - 1);
      const other = new Array(nWeeks).fill(0);
      rest.forEach((st) => st.values.forEach((v, k) => { other[k] += v; }));
      stacks = [...keep, { key: `Other (${rest.length})`, color: INV_OTHER_COLOR, values: other }];
    }
    const totals = new Array(nWeeks).fill(0);
    stacks.forEach((st) => st.values.forEach((v, k) => { totals[k] += v; }));
    const units = Array.from(new Set(items.map((it) => records[it].unit || "EA")));
    const noPrice = items.filter((it) => !(records[it].unitPrice > 0)).length;
    return { stacks, totals, shortage, safety, belowSafety, incoming, usage, estimated, nowTotal, units, noPrice };
  }, [items, records, series, groupBy, factor, nWeeks, start]);

  const selK = selWeek !== null && selWeek >= 0 && selWeek < nWeeks ? selWeek : null;

  const breakdown = useMemo(() => {
    if (selK === null) return [];
    return items.map((item) => {
      const rec = records[item];
      const qty = series.qty[item][selK];
      return { item, rec, qty, value: qty * factor(rec), est: series.est[item][selK], ma: series.maOf[item] };
    }).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [selK, items, records, series, factor]);

  // ---- KPIs ----
  const endTotal = nWeeks ? agg.totals[nWeeks - 1] : 0;
  let peakK = 0, lowK = 0;
  agg.totals.forEach((v, k) => { if (v > agg.totals[peakK]) peakK = k; if (v < agg.totals[lowK]) lowK = k; });
  const shortageWeeks = agg.shortage.filter((v) => v > 0).length;
  const unitWord = measure === "value" ? "value" : (agg.units.length === 1 ? agg.units[0] : "qty");

  // ---- Chart geometry ----
  const W = 1000;
  const rotate = (W - 100) / Math.max(1, nWeeks) < 46;
  const pad = { l: 72, r: 20, t: 24, b: rotate ? 70 : 40 };
  const H = 400 + (rotate ? 30 : 0);
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const maxPos = Math.max(1, ...agg.totals.map((v, k) => v), ...(showSafety ? agg.safety : [0]));
  const maxNeg = Math.max(0, ...agg.shortage);
  const niceStep = (v) => { const e = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1e-9)))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; };
  const step = niceStep((maxPos + maxNeg) / 5);
  const yMax = Math.ceil(maxPos / step) * step;
  const yMin = -Math.ceil(maxNeg / step) * step;
  const y = (v) => pad.t + ((yMax - v) / (yMax - yMin || 1)) * innerH;
  const slot = innerW / Math.max(1, nWeeks);
  const barW = Math.max(4, Math.min(48, slot * 0.68));
  const xC = (k) => pad.l + slot * (k + 0.5);
  const ticks = [];
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v);
  const labelEvery = Math.max(1, Math.ceil(nWeeks / (rotate ? 40 : 20)));

  const exportCSV = () => {
    const rows = [];
    for (let k = 0; k < nWeeks; k++) {
      const row = { week: weekLabels[start + k], week_start_date: weekMondayDates[start + k] || "" };
      agg.stacks.forEach((st) => { row[st.key] = Math.round(st.values[k] * 100) / 100; });
      row[`total_${unitWord}`] = Math.round(agg.totals[k] * 100) / 100;
      row.shortage = Math.round(agg.shortage[k] * 100) / 100;
      row.safety_stock = Math.round(agg.safety[k] * 100) / 100;
      row.incoming = Math.round(agg.incoming[k] * 100) / 100;
      row.usage = Math.round(agg.usage[k] * 100) / 100;
      row.items_below_safety = agg.belowSafety[k];
      row.items_estimated = agg.estimated[k];
      rows.push(row);
    }
    downloadCSV(`total_inventory_${measure}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportPNG = () => {
    const svg = document.querySelector("[data-inventory-overview] svg");
    if (!svg) return;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", W);
    clone.setAttribute("height", H);
    const xml = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.fillStyle = "#6B7280";
      ctx.font = `11px ${mono}`;
      ctx.textAlign = "right";
      ctx.fillText(`Total inventory (${unitWord}) \u00b7 ${items.length} items \u00b7 exported ${new Date().toISOString().slice(0, 10)}`, W - 12, 14);
      const a = document.createElement("a");
      a.download = `total_inventory_${new Date().toISOString().slice(0, 10)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  };

  const selectStyle = (active) => ({
    fontFamily: mono, fontSize: 11.5, fontWeight: 600, maxWidth: 220,
    border: `1px solid ${active ? COLORS.amber : COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px",
    color: active ? COLORS.amber : COLORS.ink, background: active ? "#FEF3C7" : COLORS.paper,
  });
  const segBtn = (on) => ({
    fontFamily: mono, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "6px 10px",
    border: "none", background: on ? COLORS.steelDeep : "transparent", color: on ? "#fff" : COLORS.inkSoft,
  });
  const stat = (label, value, sub, tone) => (
    <div style={{ flex: "1 1 160px", padding: "10px 14px", borderLeft: `3px solid ${tone}` }}>
      <div style={{ fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>{label}</div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.ink }}>{value}</div>
      {sub && <div style={{ fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, overflow: "hidden" }}>
        {/* header + filters */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
            <Layers size={16} color={COLORS.steelDeep} /> Total inventory - projected on hand ({items.length} items)
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", border: `1px solid ${COLORS.steelDeep}`, borderRadius: COLORS.radiusSm, overflow: "hidden" }}>
              <button style={segBtn(measure === "value")} onClick={() => setMeasure("value")}>value</button>
              <button style={segBtn(measure === "qty")} onClick={() => setMeasure("qty")}>quantity</button>
            </div>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={selectStyle(false)}>
              <option value="materialType">Split by material type</option>
              <option value="vendor">Split by vendor</option>
              <option value="kind">Split by raw material / finished good</option>
              <option value="moldFamily">Split by mold family</option>
              <option value="none">No split</option>
            </select>
            <select value={scope} onChange={(e) => setScope(e.target.value)} style={selectStyle(scope !== "all")}>
              <option value="all">All items</option>
              <option value="raw">Raw materials only</option>
              <option value="fg">Finished goods / projects only</option>
            </select>
            <select value={vendor} onChange={(e) => setVendor(e.target.value)} style={selectStyle(!!vendor)}>
              <option value="">All vendors</option>
              {vendorGroups.map((g) => <option key={g.vendor} value={g.vendor}>{g.vendor} ({g.items.length})</option>)}
            </select>
            {materialTypeGroups.length > 0 && (
              <select value={mType} onChange={(e) => setMType(e.target.value)} style={selectStyle(!!mType)}>
                <option value="">All material types</option>
                {materialTypeGroups.map((g) => <option key={g.vendor} value={g.vendor}>{g.vendor}</option>)}
              </select>
            )}
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item / description / vendor..."
              style={{ fontFamily: mono, fontSize: 11.5, border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px", color: COLORS.ink, background: COLORS.paper, minWidth: 200 }} />
          </div>
        </div>

        {/* summary */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "10px 6px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
          {stat(`On hand now (${unitWord})`, fmtInvNum(agg.nowTotal), "usable stock, before planning", COLORS.steel)}
          {nWeeks > 0 && stat("End of horizon", fmtInvNum(endTotal), `${weekLabels[start + nWeeks - 1]} \u00b7 ${agg.nowTotal ? ((endTotal - agg.nowTotal) / agg.nowTotal * 100 >= 0 ? "+" : "") + ((endTotal - agg.nowTotal) / agg.nowTotal * 100).toFixed(0) + "% vs now" : ""}`, COLORS.moss)}
          {nWeeks > 0 && stat("Peak / lowest week", `${fmtInvNum(agg.totals[peakK])} / ${fmtInvNum(agg.totals[lowK])}`, `${weekLabels[start + peakK]} / ${weekLabels[start + lowK]}`, COLORS.amber)}
          {stat("Weeks with shortage", `${shortageWeeks} / ${nWeeks}`, shortageWeeks ? `max ${fmtInvNum(Math.max(...agg.shortage))}` : "no projected shortage", shortageWeeks ? COLORS.rust : COLORS.moss)}
        </div>

        {/* notes */}
        {(measure === "qty" && agg.units.length > 1) || (measure === "value" && agg.noPrice > 0) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#FFFBEB", borderBottom: `1px solid ${COLORS.paperLine}`, fontFamily: mono, fontSize: 11, color: "#92400E" }}>
            <AlertTriangle size={13} />
            {measure === "qty" && agg.units.length > 1
              ? `Mixed units (${agg.units.slice(0, 6).join(", ")}${agg.units.length > 6 ? ", ..." : ""}) are summed as-is. Filter to one material type, or switch to value.`
              : `${agg.noPrice} item${agg.noPrice > 1 ? "s have" : " has"} no unit price and add 0 to the value total.`}
          </div>
        ) : null}

        {/* chart */}
        <div data-inventory-overview style={{ padding: "8px 10px 4px" }}>
          {nWeeks < 1 || items.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: COLORS.inkSoft, fontFamily: mono, fontSize: 11 }}>No items match these filters. Clear a filter to see the total.</div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} fontFamily={mono}>
              <rect x="0" y="0" width={W} height={H} fill="#FFFFFF" />
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#98A2B3" : "#EEF0F4"} strokeWidth={v === 0 ? 1.2 : 1} />
                  <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#667085">{fmtInvNum(v)}</text>
                </g>
              ))}
              {agg.totals.map((tot, k) => {
                let acc = 0;
                const isSel = selK === k;
                return (
                  <g key={k} style={{ cursor: "pointer" }} onClick={() => { setSelWeek(isSel ? null : k); setBreakdownLimit(25); }}>
                    <rect x={pad.l + slot * k} y={pad.t} width={slot} height={innerH} fill={isSel ? "#EEF2FF" : "transparent"} />
                    {agg.stacks.map((st) => {
                      const v = st.values[k];
                      if (v <= 0) return null;
                      const y1 = y(acc + v);
                      const y0 = y(acc);
                      acc += v;
                      return <rect key={st.key} x={xC(k) - barW / 2} y={y1} width={barW} height={Math.max(0.5, y0 - y1)} fill={st.color} opacity={selK === null || isSel ? 1 : 0.45} />;
                    })}
                    {agg.shortage[k] > 0 && (
                      <rect x={xC(k) - barW / 2} y={y(0)} width={barW} height={Math.max(1, y(-agg.shortage[k]) - y(0))} fill={INV_SHORTAGE_COLOR} opacity={selK === null || isSel ? 0.9 : 0.4} />
                    )}
                    {agg.estimated[k] > 0 && (
                      <rect x={xC(k) - barW / 2} y={H - pad.b + 2} width={barW} height={3} fill={COLORS.inkSoft} opacity={0.55} />
                    )}
                    {showLabels && (
                      <text x={xC(k)} y={y(tot) - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#344054">{fmtInvNum(tot)}</text>
                    )}
                    <title>{`${weekLabels[start + k]}${weekMondayDates[start + k] ? ` (Mon ${weekMondayDates[start + k]})` : ""}\nTotal: ${fmtInvNum(tot)}${agg.shortage[k] ? `\nShortage: ${fmtInvNum(agg.shortage[k])}` : ""}\nSafety stock: ${fmtInvNum(agg.safety[k])}\nIncoming: ${fmtInvNum(agg.incoming[k])}  Usage: ${fmtInvNum(agg.usage[k])}\nItems below safety: ${agg.belowSafety[k]}${agg.estimated[k] ? `\nEstimated (moving-average usage): ${agg.estimated[k]} items` : ""}`}</title>
                  </g>
                );
              })}
              {showSafety && (
                <polyline fill="none" stroke={COLORS.amber} strokeWidth="2" strokeDasharray="6 4"
                  points={agg.safety.map((v, k) => `${xC(k)},${y(v)}`).join(" ")} style={{ pointerEvents: "none" }} />
              )}
              {agg.totals.map((_, k) => (k % labelEvery === 0 ? (
                <text key={k} x={xC(k)} y={H - pad.b + 16} fontSize="11" fill={selK === k ? COLORS.steelDeep : "#667085"} fontWeight={selK === k ? 700 : 400}
                  textAnchor={rotate ? "end" : "middle"} transform={rotate ? `rotate(-45 ${xC(k)} ${H - pad.b + 16})` : undefined}>
                  {weekLabels[start + k]}
                </text>
              ) : null))}
            </svg>
          )}
        </div>

        {/* legend + actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 14px 12px", borderTop: `1px solid ${COLORS.paperLine}` }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: mono, fontSize: 11, color: COLORS.ink }}>
            {agg.stacks.map((st) => (
              <span key={st.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: st.color }} />{st.key}
              </span>
            ))}
            {agg.shortage.some((v) => v > 0) && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: INV_SHORTAGE_COLOR }} />shortage (below zero)</span>
            )}
            {showSafety && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 16, borderTop: `2px dashed ${COLORS.amber}` }} />safety stock</span>
            )}
            {agg.estimated.some((v) => v > 0) && (
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 3, background: COLORS.inkSoft, opacity: 0.55 }} />includes estimated usage</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>after last demand week:</span>
            <select value={tailMode} onChange={(e) => setTailMode(e.target.value)} style={selectStyle(false)}>
              <option value="ma">deduct moving-average usage</option>
              <option value="hold">hold stock (no usage)</option>
            </select>
            {tailMode === "ma" && (
              <>
                <select value={maBasis} onChange={(e) => setMaBasis(e.target.value)} style={selectStyle(false)}>
                  <option value="planned">of planned usage</option>
                  <option value="actual">of actual consumption</option>
                </select>
                <select value={maWeeks} onChange={(e) => setMaWeeks(Number(e.target.value))} style={selectStyle(false)}>
                  {[2, 4, 6, 8, 12].map((n) => <option key={n} value={n}>last {n} weeks</option>)}
                </select>
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>
              <input type="checkbox" checked={showSafety} onChange={(e) => setShowSafety(e.target.checked)} style={{ margin: 0 }} /> safety stock line
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} style={{ margin: 0 }} /> show values
            </label>
            <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 600, color: "#fff", border: `1px solid ${COLORS.steelDeep}`, background: COLORS.steelDeep, padding: "6px 12px", borderRadius: COLORS.radiusSm }}>
              <Download size={12} /> export weekly totals (CSV)
            </button>
            <button onClick={exportPNG} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontFamily: mono, fontSize: 11, fontWeight: 600, color: COLORS.steelDeep, border: `1px solid ${COLORS.steelDeep}`, background: "transparent", padding: "6px 12px", borderRadius: COLORS.radiusSm }}>
              <Download size={12} /> save chart (PNG)
            </button>
          </div>
        </div>
        <div style={{ padding: "0 14px 10px", fontFamily: mono, fontSize: 10.5, color: COLORS.inkSoft }}>
          {`Click a week to see which items make up its total. After an item's last week with demand, receipts are still added and ${tailMode === "ma" ? `usage is ${maBasis === "actual" ? `the average actual consumption of the last ${maWeeks} history weeks` : `the average planned usage of the last ${maWeeks} weeks before demand ends`}` : "no usage is deducted"}. Items with no demand at all are not depleted.`}
        </div>
      </div>

      {/* week breakdown */}
      {selK !== null && (
        <div style={{ border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadow, background: COLORS.card, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
              {weekLabels[start + selK]}{weekMondayDates[start + selK] ? ` (Mon ${weekMondayDates[start + selK]})` : ""}: {fmtInvNum(agg.totals[selK])} {unitWord}
              {agg.shortage[selK] > 0 ? `, shortage ${fmtInvNum(agg.shortage[selK])}` : ""}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelWeek(Math.max(0, selK - 1))} disabled={selK === 0} style={{ fontFamily: mono, fontSize: 11, cursor: "pointer", border: `1px solid ${COLORS.paperLine}`, background: "transparent", borderRadius: COLORS.radiusSm, padding: "4px 10px" }}>{"\u2190"} prev week</button>
              <button onClick={() => setSelWeek(Math.min(nWeeks - 1, selK + 1))} disabled={selK === nWeeks - 1} style={{ fontFamily: mono, fontSize: 11, cursor: "pointer", border: `1px solid ${COLORS.paperLine}`, background: "transparent", borderRadius: COLORS.radiusSm, padding: "4px 10px" }}>next week {"\u2192"}</button>
              <button onClick={() => setSelWeek(null)} style={{ fontFamily: mono, fontSize: 11, cursor: "pointer", border: `1px solid ${COLORS.paperLine}`, background: "transparent", borderRadius: COLORS.radiusSm, padding: "4px 10px" }}>close</button>
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: mono, fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: COLORS.paper, color: COLORS.inkSoft, textAlign: "left" }}>
                  {["Item", "Description", "Group", "Projected on hand", "Safety stock", measure === "value" ? "Value" : "Qty", "Share"].map((h, idx) => (
                    <th key={h} style={{ padding: "7px 10px", fontWeight: 600, textAlign: idx >= 3 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.slice(0, breakdownLimit).map((r) => {
                  const below = (r.rec.safety || 0) > 0 && r.qty < r.rec.safety;
                  return (
                    <tr key={r.item} style={{ borderTop: `1px solid ${COLORS.paperLine}` }}>
                      <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                        <button onClick={() => onOpenItem(r.item)} title="Open this item's stock chart" style={{ fontFamily: mono, fontSize: 11.5, fontWeight: 700, color: COLORS.steel, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>{r.item}</button>
                      </td>
                      <td style={{ padding: "6px 10px", color: COLORS.inkSoft, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.rec.description}</td>
                      <td style={{ padding: "6px 10px", color: COLORS.inkSoft, whiteSpace: "nowrap" }}>{invGroupKey(r.rec, groupBy)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: r.qty < 0 ? COLORS.rust : below ? COLORS.amber : COLORS.ink, fontWeight: r.qty < 0 || below ? 700 : 400, whiteSpace: "nowrap" }}>{Math.round(r.qty).toLocaleString()} {r.rec.unit}{r.est ? <span title={`Estimated: moving-average usage ${Math.round(r.ma).toLocaleString()} ${r.rec.unit}/wk`} style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 600, color: COLORS.inkSoft, border: `1px solid ${COLORS.paperLine}`, borderRadius: 3, padding: "0 4px" }}>est.</span> : null}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: COLORS.inkSoft }}>{Math.round(r.rec.safety || 0).toLocaleString()}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: r.value < 0 ? COLORS.rust : COLORS.ink }}>{measure === "value" ? r.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : Math.round(r.value).toLocaleString()}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", color: COLORS.inkSoft }}>{agg.totals[selK] > 0 && r.value > 0 ? `${(r.value / agg.totals[selK] * 100).toFixed(1)}%` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {breakdown.length > breakdownLimit && (
            <div style={{ padding: 10, textAlign: "center" }}>
              <button onClick={() => setBreakdownLimit((n) => n + 50)} style={{ fontFamily: mono, fontSize: 11, cursor: "pointer", border: `1px solid ${COLORS.paperLine}`, background: "transparent", borderRadius: COLORS.radiusSm, padding: "6px 14px" }}>
                show more ({breakdown.length - breakdownLimit} left)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function aggDemand(rows) {
  const m = {};
  (rows || []).forEach((r) => {
    let it = extract(r, "item", ["item", "part", "material", "รหัส"], ["item"]);
    const wk = extract(r, "week", ["week", "wk", "cw", "สัปดาห์"], ["week"]);
    const q = extract(r, "quantity", ["quantity", "qty", "amount", "จำนวน"], ["qty", "quant"]);
    if (!it || wk === undefined || wk === null) return;
    it = String(it).trim().toUpperCase();
    const w = String(wk).trim().replace(/\s+/g, "").toUpperCase();
    if (!m[it]) m[it] = {};
    m[it][w] = (m[it][w] || 0) + toNum(q);
  });
  return m;
}

function diffDemand(rowsA, rowsB) {
  const A = aggDemand(rowsA);
  const B = aggDemand(rowsB);
  const sum = (o) => Object.values(o || {}).reduce((s, v) => s + v, 0);
  const base = mondayOfWeek(new Date());
  const wkOrder = (w) => parseWeekToIndex(w, base);
  const items = Array.from(new Set([...Object.keys(A), ...Object.keys(B)]));
  const lines = [];
  const weekTotals = {};
  const newItems = [];
  const removedItems = [];
  items.forEach((it) => {
    const a = A[it] || {};
    const b = B[it] || {};
    const sa = sum(a);
    const sb = sum(b);
    const itemKind = sa <= 0 && sb > 0 ? "NEW ITEM" : sa > 0 && sb <= 0 ? "REMOVED ITEM" : "";
    if (itemKind === "NEW ITEM") newItems.push(it);
    if (itemKind === "REMOVED ITEM") removedItems.push(it);
    Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).forEach((w) => {
      const qa = a[w] || 0;
      const qb = b[w] || 0;
      if (!weekTotals[w]) weekTotals[w] = { a: 0, b: 0 };
      weekTotals[w].a += qa;
      weekTotals[w].b += qb;
      if (qa === qb) return;
      const kind = itemKind || (qa <= 0 && qb > 0 ? "NEW WEEK" : qa > 0 && qb <= 0 ? "DROPPED" : qb > qa ? "UP" : "DOWN");
      lines.push({ item: it, week: w, a: qa, b: qb, delta: qb - qa, kind });
    });
  });
  lines.sort((x, y) => wkOrder(x.week) - wkOrder(y.week) || x.item.localeCompare(y.item));
  const weeks = Object.keys(weekTotals).sort((x, y) => wkOrder(x) - wkOrder(y));
  return { lines, weeks, weekTotals, newItems: newItems.sort(), removedItems: removedItems.sort() };
}

function DemandVersionsPage({ isReadOnly, current, versions, activeName, onSetActive, onAddFetch, onAddUpload, onRemove, mrpParams }) {
  const mono = "'IBM Plex Mono', monospace";
  const options = versions.map((v) => ({ id: v.name, label: v.name }));
  const getRows = (id) => ((versions.find((v) => v.name === id) || {}).rows || []);
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [fetchName, setFetchName] = useState("");
  const [uploadLabel, setUploadLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [q, setQ] = useState("");
  const [impactOn, setImpactOn] = useState(false);
  const validIds = options.map((o) => o.id);
  const defB = options.length ? options[options.length - 1].id : "";
  const defA = options.length > 1 ? options[options.length - 2].id : defB;
  const a = validIds.includes(idA) ? idA : defA;
  const b = validIds.includes(idB) ? idB : defB;

  const diff = useMemo(() => diffDemand(getRows(a), getRows(b)), [a, b, versions]);
  const impact = useMemo(() => {
    if (!impactOn || a === b) return null;
    const ra = runMRP({ ...mrpParams, demand: getRows(a) });
    const rb = runMRP({ ...mrpParams, demand: getRows(b) });
    const hw = rb.historyWeeks || 0;
    const stat = (rec) => {
      if (!rec) return { need: 0, margin: null };
      let need = 0;
      let margin = null;
      for (let i = hw; i < rec.consumption.length; i++) need += rec.consumption[i] || 0;
      for (let i = hw; i < rec.projOnHand.length; i++) {
        const v = rec.projOnHand[i];
        if (v !== null && v !== undefined) margin = margin === null ? v - rec.safety : Math.min(margin, v - rec.safety);
      }
      return { need, margin };
    };
    const rows = [];
    new Set([...Object.keys(ra.records), ...Object.keys(rb.records)]).forEach((it) => {
      const sa = stat(ra.records[it]);
      const sb = stat(rb.records[it]);
      const d = sb.need - sa.need;
      if (Math.abs(d) < 0.5) return;
      const rec = rb.records[it] || ra.records[it];
      const status = (sa.margin === null || sa.margin >= 0) && sb.margin !== null && sb.margin < 0 ? "NEW SHORTAGE"
        : sa.margin !== null && sa.margin < 0 && (sb.margin === null || sb.margin >= 0) ? "RESOLVED"
        : !ra.records[it] ? "NEW ITEM" : "";
      rows.push({ item: it, description: rec.description || "", type: rec.materialType || "", needA: sa.need, needB: sb.need, delta: d, marginA: sa.margin, marginB: sb.margin, status });
    });
    rows.sort((x, y) => (x.status === "NEW SHORTAGE" ? 0 : 1) - (y.status === "NEW SHORTAGE" ? 0 : 1) || Math.abs(y.delta) - Math.abs(x.delta));
    return rows;
  }, [impactOn, a, b, versions, mrpParams]);

  const nameOf = (id) => (options.find((o) => o.id === id) || {}).label || id;
  const fmt = (v) => (v === null || v === undefined ? "-" : Math.round(v).toLocaleString());
  const kindColor = (k) => (k === "NEW ITEM" || k === "NEW WEEK" || k === "UP" ? COLORS.moss : COLORS.rust);
  const box = { border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radius, boxShadow: COLORS.shadowLg, background: COLORS.card, padding: 14, marginBottom: 14 };
  const btn = (primary, disabled) => ({ fontFamily: mono, fontSize: 11, fontWeight: 600, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, border: `1px solid ${COLORS.steel}`, background: primary ? COLORS.steel : "transparent", color: primary ? "#fff" : COLORS.steel, borderRadius: COLORS.radiusSm, padding: "6px 12px" });
  const sel = { fontFamily: mono, fontSize: 11.5, border: `1px solid ${COLORS.paperLine}`, borderRadius: COLORS.radiusSm, padding: "6px 10px", background: COLORS.card, color: COLORS.ink };
  const th = { textAlign: "right", padding: "4px 8px", fontSize: 10, color: COLORS.inkSoft, borderBottom: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap" };
  const td = { textAlign: "right", padding: "3px 8px", whiteSpace: "nowrap" };

  const shownLines = diff.lines.filter((l) => (!kindFilter || l.kind === kindFilter) && (!q || l.item.toLowerCase().includes(q.toLowerCase())));
  const counts = {};
  diff.lines.forEach((l) => { counts[l.kind] = (counts[l.kind] || 0) + 1; });

  const doFetch = async () => {
    if (!fetchName.trim()) return;
    setBusy(true); setMsg("");
    const res = await onAddFetch(fetchName.trim());
    setBusy(false);
    setMsg(res.ok ? `Loaded "${fetchName.trim()}" (${res.count} rows).` : res.error);
    if (res.ok) setFetchName("");
  };

  return (
    <div style={{ fontFamily: mono, color: COLORS.ink }}>
      <div style={box}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Demand versions (one file per week)</div>
        <div style={{ fontSize: 10.5, color: COLORS.inkSoft, marginBottom: 10 }}>
          Weekly files named "Demand CW47", "Demand CW48", ... are picked up from SharePoint automatically (last 8 weeks up to next week). The newest one drives the MRP until you choose another week. Compare two versions to see what was added or changed. The manual add boxes are only for files outside that range.
        </div>
        <table style={{ borderCollapse: "collapse", fontSize: 11.5, width: "100%", marginBottom: 10 }}>
          <tbody>
            {options.map((o) => {
              const isActive = activeName === o.id;
              const v = versions.find((x) => x.name === o.id);
              return (
                <tr key={o.id || "cur"} style={{ borderBottom: `1px solid ${COLORS.paperLine}` }}>
                  <td style={{ padding: "5px 8px", fontWeight: isActive ? 700 : 400 }}>{o.label}</td>
                  <td style={{ padding: "5px 8px", color: COLORS.inkSoft }}>{getRows(o.id).length.toLocaleString()} rows{v ? (v.source === "upload" ? " · uploaded (this session only)" : " · SharePoint") : ""}</td>
                  <td style={{ padding: "5px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                    {isActive ? <span style={{ color: COLORS.moss, fontWeight: 700 }}>IN USE</span> : (
                      <button disabled={isReadOnly} onClick={() => onSetActive(o.id)} style={btn(false, isReadOnly)}>use for MRP</button>
                    )}
                    {v && !isReadOnly && <button onClick={() => onRemove(o.id)} style={{ ...btn(false), marginLeft: 6, color: COLORS.rust, borderColor: COLORS.rust }}>remove</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {options.length === 0 && <div style={{ fontSize: 11, color: COLORS.rust, marginBottom: 10 }}>No weekly demand file found yet. Put files named like "Demand CW47" in SharePoint, or add one below.</div>}
        {!isReadOnly && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input value={fetchName} onChange={(e) => setFetchName(e.target.value)} placeholder="SharePoint file name, e.g. Demand CW47" style={{ ...sel, width: 260 }} />
              <button disabled={busy || !fetchName.trim()} onClick={doFetch} style={btn(true, busy || !fetchName.trim())}>{busy ? "loading..." : "fetch from SharePoint"}</button>
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <input value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} placeholder="Label, e.g. Demand CW48" style={{ ...sel, width: 200 }} />
              <input type="file" accept=".csv,text/csv" disabled={!uploadLabel.trim()} onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) { onAddUpload(uploadLabel.trim(), f); setUploadLabel(""); e.target.value = ""; } }} style={{ fontSize: 11 }} />
            </span>
          </div>
        )}
        {msg && <div style={{ marginTop: 8, fontSize: 10.5, color: msg.startsWith("Loaded") ? COLORS.moss : COLORS.rust }}>{msg}</div>}
      </div>

      <div style={box}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700 }}>Compare</span>
          <select value={a} onChange={(e) => setIdA(e.target.value)} style={sel}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          <span style={{ fontSize: 11 }}>{"→"}</span>
          <select value={b} onChange={(e) => setIdB(e.target.value)} style={sel}>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
          <button disabled={a === b} onClick={() => downloadCSV("demand_changes.csv", diff.lines.map((l) => ({ item: l.item, week: l.week, [nameOf(a)]: l.a, [nameOf(b)]: l.b, delta: l.delta, change: l.kind })))} style={btn(false, a === b)}>export changes CSV</button>
        </div>
        {a === b ? (
          <div style={{ fontSize: 11, color: COLORS.inkSoft }}>Pick two different versions to compare.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {[["NEW ITEM", diff.newItems.length], ["NEW WEEK", counts["NEW WEEK"] || 0], ["UP", counts.UP || 0], ["DOWN", counts.DOWN || 0], ["DROPPED", counts.DROPPED || 0], ["REMOVED ITEM", diff.removedItems.length]].map(([k, n]) => (
                <button key={k} onClick={() => setKindFilter(kindFilter === k ? "" : k)} style={{ fontFamily: mono, fontSize: 10.5, fontWeight: 700, cursor: "pointer", border: `1px solid ${kindColor(k)}`, background: kindFilter === k ? kindColor(k) : "transparent", color: kindFilter === k ? "#fff" : kindColor(k), borderRadius: COLORS.radiusSm, padding: "4px 10px" }}>{k} {n}</button>
              ))}
            </div>
            {diff.newItems.length > 0 && (
              <div style={{ fontSize: 11, marginBottom: 10 }}><b style={{ color: COLORS.moss }}>Newly added items:</b> {diff.newItems.join(", ")}</div>
            )}
            {diff.removedItems.length > 0 && (
              <div style={{ fontSize: 11, marginBottom: 10 }}><b style={{ color: COLORS.rust }}>Removed items:</b> {diff.removedItems.join(", ")}</div>
            )}
            <div style={{ overflowX: "auto", marginBottom: 12 }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr><th style={{ ...th, textAlign: "left" }}>Total per week</th>{diff.weeks.map((w) => <th key={w} style={th}>{w}</th>)}</tr></thead>
                <tbody>
                  {[["a", nameOf(a)], ["b", nameOf(b)]].map(([k, label]) => (
                    <tr key={k}><td style={{ ...td, textAlign: "left", color: COLORS.inkSoft }}>{label}</td>{diff.weeks.map((w) => <td key={w} style={td}>{fmt(diff.weekTotals[w][k])}</td>)}</tr>
                  ))}
                  <tr><td style={{ ...td, textAlign: "left", fontWeight: 700 }}>Change</td>{diff.weeks.map((w) => { const d = diff.weekTotals[w].b - diff.weekTotals[w].a; return <td key={w} style={{ ...td, fontWeight: 700, color: d > 0 ? COLORS.moss : d < 0 ? COLORS.rust : COLORS.inkSoft }}>{d === 0 ? "-" : (d > 0 ? "+" : "") + fmt(d)}</td>; })}</tr>
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item" style={{ ...sel, width: 200 }} />
              <span style={{ fontSize: 10.5, color: COLORS.inkSoft }}>{shownLines.length.toLocaleString()} changed lines</span>
            </div>
            <div style={{ maxHeight: 360, overflow: "auto", border: `1px solid ${COLORS.paperLine}` }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                <thead style={{ position: "sticky", top: 0, background: COLORS.card }}><tr><th style={{ ...th, textAlign: "left" }}>Item</th><th style={th}>Week</th><th style={th}>{nameOf(a)}</th><th style={th}>{nameOf(b)}</th><th style={th}>Change</th><th style={{ ...th, textAlign: "left" }}>Type</th></tr></thead>
                <tbody>
                  {shownLines.slice(0, 1000).map((l, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.paperLine}` }}>
                      <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{l.item}</td><td style={td}>{l.week}</td><td style={td}>{fmt(l.a)}</td><td style={td}>{fmt(l.b)}</td>
                      <td style={{ ...td, color: kindColor(l.kind), fontWeight: 700 }}>{(l.delta > 0 ? "+" : "") + fmt(l.delta)}</td>
                      <td style={{ ...td, textAlign: "left", color: kindColor(l.kind), fontWeight: 700 }}>{l.kind}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {a !== b && (
        <div style={box}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700 }}>Material impact</span>
            {!impactOn && <button onClick={() => setImpactOn(true)} style={btn(true)}>calculate impact</button>}
            {impactOn && <button onClick={() => setImpactOn(false)} style={btn(false)}>hide</button>}
            <span style={{ fontSize: 10.5, color: COLORS.inkSoft }}>Runs the MRP for both versions and lists every item (FG and material) whose total requirement changes.</span>
          </div>
          {impact && (
            <div style={{ maxHeight: 420, overflow: "auto", border: `1px solid ${COLORS.paperLine}` }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                <thead style={{ position: "sticky", top: 0, background: COLORS.card }}><tr>
                  <th style={{ ...th, textAlign: "left" }}>Item</th><th style={{ ...th, textAlign: "left" }}>Description</th><th style={{ ...th, textAlign: "left" }}>Type</th>
                  <th style={th}>Need A</th><th style={th}>Need B</th><th style={th}>Change</th><th style={th}>Min margin A</th><th style={th}>Min margin B</th><th style={{ ...th, textAlign: "left" }}>Status</th>
                </tr></thead>
                <tbody>
                  {impact.slice(0, 500).map((r) => (
                    <tr key={r.item} style={{ borderBottom: `1px solid ${COLORS.paperLine}` }}>
                      <td style={{ ...td, textAlign: "left", fontWeight: 600 }}>{r.item}</td>
                      <td style={{ ...td, textAlign: "left", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</td>
                      <td style={{ ...td, textAlign: "left" }}>{r.type}</td>
                      <td style={td}>{fmt(r.needA)}</td><td style={td}>{fmt(r.needB)}</td>
                      <td style={{ ...td, fontWeight: 700, color: r.delta > 0 ? COLORS.moss : COLORS.rust }}>{(r.delta > 0 ? "+" : "") + fmt(r.delta)}</td>
                      <td style={{ ...td, color: r.marginA !== null && r.marginA < 0 ? COLORS.rust : COLORS.ink }}>{fmt(r.marginA)}</td>
                      <td style={{ ...td, color: r.marginB !== null && r.marginB < 0 ? COLORS.rust : COLORS.ink }}>{fmt(r.marginB)}</td>
                      <td style={{ ...td, textAlign: "left", fontWeight: 700, color: r.status === "NEW SHORTAGE" ? COLORS.rust : COLORS.moss }}>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {impact.length === 0 && <div style={{ padding: 14, fontSize: 11, color: COLORS.inkSoft }}>No item requirement changes between these two versions.</div>}
            </div>
          )}
        </div>
      )}
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
