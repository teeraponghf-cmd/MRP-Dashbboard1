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
  { item: "RIM-26", description: "26in alloy rim", unit: "EA", vendor: "Apex Metal Works", unit_price: 9.5, on_hand: 60, lead_time_weeks: 2, lot_size: 50, safety_stock: 20, safety_factor: 1, expiry_date: "" },
  { item: "HUB-STD", description: "Standard hub", unit: "EA", vendor: "SpinCraft Wheels Co.", unit_price: 6.2, on_hand: 45, lead_time_weeks: 2, lot_size: 40, safety_stock: 15, safety_factor: 1, expiry_date: "" },
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

// ---------- ISO week helpers ----------
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
      unit_price: toNum(extract(r, "unit_price", ["unitprice", "price", "cost", "ราคา"], ["price"])),
      on_hand: toNum(extract(r, "on_hand", ["onhand", "stock", "inventory", "คงคลัง"], ["hand", "stock"])),
      lead_time_weeks: toNum(extract(r, "lead_time_weeks", ["leadtime", "lt", "leadtimeweeks"], ["lead", "lt"])),
      lot_size: toNum(extract(r, "lot_size", ["lotsize", "moq", "lot"], ["lot", "moq"]), 1),
      safety_stock: toNum(extract(r, "safety_stock", ["safetystock", "ss"], ["safety", "ss"])),
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
    const expiryDate = dateStr ? new Date(dateStr + "T00:00:00Z") : null;
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
    let rawOnHand, effectiveOnHand, expired, expiringSoon, weeksToExpiry, expiryDateStr;

    if (itemBatches.length > 0) {
      rawOnHand = itemBatches.reduce((s, b) => s + b.quantity, 0);
      effectiveOnHand = itemBatches.filter((b) => !b.expired).reduce((s, b) => s + b.quantity, 0);
      expired = effectiveOnHand === 0 && rawOnHand > 0;
      expiringSoon = itemBatches.some((b) => !b.expired && b.expiringSoon);
      const nearest = itemBatches.find((b) => !b.expired);
      weeksToExpiry = nearest ? nearest.weeksToExpiry : null;
      expiryDateStr = nearest ? nearest.expiryDate : (itemBatches[0] ? itemBatches[0].expiryDate : "");
    } else {
      rawOnHand = toNum(inv.on_hand, 0);
      expired = false;
      expiringSoon = false;
      weeksToExpiry = null;
      expiryDateStr = String(inv.expiry_date || "").trim();
      if (expiryDateStr) {
        const expiryDate = new Date(expiryDateStr + "T00:00:00Z");
        if (!isNaN(expiryDate)) {
          weeksToExpiry = Math.floor((expiryDate - startMonday) / (7 * 86400000));
          expired = weeksToExpiry < 0;
          expiringSoon = !expired && weeksToExpiry <= 4;
        }
      }
      effectiveOnHand = expired ? 0 : rawOnHand;
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

      let proj = onHandPrev + sr[i] - adjustedConsumption;
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
      netReq[i] = Math.max(0, safety - (onHandPrev + sr[i] - adjustedConsumption));
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
  ink: "#16233A",
  inkSoft: "#5C6B7D",
  paper: "#E9EAE2",
  paperLine: "#CBCBBB",
  card: "#F4F4EE",
  steel: "#3F6386",
  steelDeep: "#2A4A66",
  amber: "#C9821F",
  rust: "#AE402B",
  moss: "#57764E",
};

function UploadSlot({ label, hint, onFile, loaded, count, onSample }) {
  return (
    <div style={{
      border: `1px solid ${COLORS.paperLine}`,
      background: COLORS.card,
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
          border: `1px solid ${COLORS.steel}`, padding: "4px 8px",
        }}>
          <Upload size={12} /> upload .csv
          <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => {
            if (e.target.files?.[0]) onFile(e.target.files[0]);
          }} />
        </label>
        <button onClick={onSample} style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft,
          border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "4px 8px", cursor: "pointer",
        }}>use sample</button>
      </div>
    </div>
  );
}

function KPI({ label, value, tone, icon: Icon }) {
  const toneColor = tone === "rust" ? COLORS.rust : tone === "amber" ? COLORS.amber : tone === "moss" ? COLORS.moss : COLORS.steelDeep;
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.paperLine}`, borderTop: `3px solid ${toneColor}`,
      padding: "14px 16px", flex: 1, minWidth: 150,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: toneColor, marginBottom: 6 }}>
        <Icon size={14} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: COLORS.ink }}>{value}</div>
    </div>
  );
}

function TreeRow({ item, records, childrenOf, selected, onSelect, depth, onlyWithOrders, subtreeOrderMap, forceOpen, clearForce }) {
  const [open, setOpen] = useState(depth < 1);
  const effectiveOpen = forceOpen !== null ? forceOpen : open;
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
          color: isSelected ? "#F4F4EE" : COLORS.ink,
          borderLeft: isSelected ? `3px solid ${COLORS.amber}` : "3px solid transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {kids.length > 0 ? (
            <span onClick={(e) => {
              e.stopPropagation();
              setOpen(!effectiveOpen);
              if (forceOpen !== null) clearForce();
            }} style={{ display: "flex" }}>
              {effectiveOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          ) : <span style={{ width: 13 }} />}
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item}
          </span>
          {rec.parentsCount > 1 && (
            <span title={`shared across ${rec.parentsCount} assemblies: ${rec.parentItems.join(", ")}`} style={{
              display: "flex", alignItems: "center", gap: 2, fontSize: 9.5, fontFamily: "'IBM Plex Mono', monospace",
              color: isSelected ? "#EAF1F6" : COLORS.steel, border: `1px solid ${isSelected ? "#EAF1F6" : COLORS.steel}`,
              padding: "0 3px", lineHeight: "14px",
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
          color: isSelected ? "#DCE3E9" : COLORS.inkSoft,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {rec.description} · {rec.unit}
        </div>
      </div>
      {effectiveOpen && kids.map((k) => (
        <TreeRow key={k.component} item={k.component} records={records} childrenOf={childrenOf}
          selected={selected} onSelect={onSelect} depth={depth + 1}
          onlyWithOrders={onlyWithOrders} subtreeOrderMap={subtreeOrderMap}
          forceOpen={forceOpen} clearForce={clearForce} />
      ))}
    </div>
  );
}

function VendorGroupRow({ vendor, items, records, selected, onSelect, onlyWithOrders, forceOpen, clearForce }) {
  const [open, setOpen] = useState(true);
  const effectiveOpen = forceOpen !== null ? forceOpen : open;
  const visibleItems = onlyWithOrders ? items.filter((it) => records[it].plannedRelease.some((v) => v > 0)) : items;
  if (onlyWithOrders && visibleItems.length === 0) return null;
  const anyCritical = visibleItems.some((it) => records[it].pastDue.some(Boolean));
  const anyShortage = visibleItems.some((it) => records[it].plannedRelease.some((v) => v > 0));

  return (
    <div>
      <div
        onClick={() => { setOpen(!effectiveOpen); if (forceOpen !== null) clearForce(); }}
        style={{
          display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          padding: "5px 6px", background: COLORS.paper, borderLeft: `3px solid ${COLORS.steel}`,
        }}
      >
        {effectiveOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11.5, fontWeight: 700, color: COLORS.ink, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {vendor} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 400, color: COLORS.inkSoft, fontSize: 10.5 }}>({visibleItems.length})</span>
        </span>
        {anyCritical && <CircleAlert size={12} color={COLORS.rust} />}
        {!anyCritical && anyShortage && <AlertTriangle size={11} color={COLORS.amber} />}
      </div>
      {effectiveOpen && visibleItems.map((it) => {
        const rec = records[it];
        const isSelected = selected === it;
        const critical = rec.pastDue.some(Boolean);
        const shortage = rec.plannedRelease.some((v) => v > 0);
        return (
          <div key={it} onClick={() => onSelect(it)} title={`${rec.description} (${rec.unit})`} style={{
            display: "flex", flexDirection: "column", cursor: "pointer",
            paddingLeft: 22, paddingRight: 6, paddingTop: 4, paddingBottom: 4,
            background: isSelected ? COLORS.steel : "transparent",
            color: isSelected ? "#F4F4EE" : COLORS.ink,
            borderLeft: isSelected ? `3px solid ${COLORS.amber}` : "3px solid transparent",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it}</span>
              {critical && <CircleAlert size={12} color={isSelected ? "#FFD9CE" : COLORS.rust} />}
              {!critical && shortage && <AlertTriangle size={11} color={isSelected ? "#FFE9C6" : COLORS.amber} />}
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, paddingLeft: 17, color: isSelected ? "#DCE3E9" : COLORS.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {rec.description} {"\u00b7"} {rec.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VendorGroupTree({ groups, records, selected, onSelect, onlyWithOrders, forceOpen, clearForce }) {
  return (
    <div>
      {groups.map((g) => (
        <VendorGroupRow key={g.vendor} vendor={g.vendor} items={g.items} records={records}
          selected={selected} onSelect={onSelect} onlyWithOrders={onlyWithOrders}
          forceOpen={forceOpen} clearForce={clearForce} />
      ))}
    </div>
  );
}

function RecordGrid({ rec, weeks, weekLabels, weekDates, historyWeeks, onAdjustPlan, onResetPlanOverride, onAdjustReceipt, onResetReceiptOverride, onAdjustPOQty, poOriginalQtyMap, onResetPOQty, onAdjustPOWeek, onResetPOWeek, poOriginalMap, planOverrides, receiptOverrides }) {
  if (!rec) return null;
  const rows = [
    { label: "Gross requirements (calculated)", data: rec.grossReq, kind: "gr" },
    { label: `Consumption used for planning (\u00d7${rec.safetyFactor})`, data: rec.consumption, kind: "consumption" },
    { label: "Actual consumption (issued)", data: rec.actualConsumption, kind: "actual" },
   { label: "Variance (Qty / %)", data: rec.consumptionVariance, kind: "variance" },
    { label: "PO pending", data: rec.poPending, kind: "po" },
    { label: "Goods in transit (GIT)", data: rec.git, kind: "git" },
    { label: "Projected on hand", data: rec.projOnHand, kind: "poh" },
    { label: "Net requirements", data: rec.netReq, kind: "nr" },
    { label: "Planned order receipt", data: rec.plannedReceipt, kind: "por" },
    { label: "Planned order release", data: rec.plannedRelease, kind: "prel" },
  ];

  const formattedAvg = rec.pastActualAvg.toLocaleString(undefined, { maximumFractionDigits: 1 });

  // --- เริ่มคำนวณ Variance รวมของอดีต ---
  const pastGrossTotal = rec.grossReq.slice(0, historyWeeks).reduce((a, b) => a + b, 0);
  const pastVarianceTotal = rec.pastActualTotal - pastGrossTotal;
  
  let pastVarPctStr = "";
  if (pastGrossTotal === 0 && rec.pastActualTotal === 0) {
    pastVarPctStr = "0%";
  } else if (pastGrossTotal === 0 && rec.pastActualTotal > 0) {
    pastVarPctStr = "+\u221E%";
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
    <div style={{ border: `1px solid ${COLORS.ink}`, background: COLORS.card }}>
      {/* title block */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${COLORS.ink}`,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
      }}>
        {[
          ["ITEM", rec.item],
          ["UNIT", rec.unit],
          ["LEAD TIME (WK)", rec.leadTime],
          ["LOT SIZE / SS", `${rec.lotSize} / ${rec.baseSafety}${rec.safetyFactor !== 1 ? ` \u00d7${rec.safetyFactor} = ${rec.safety}` : ""}`],
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
            : (rec.expiryDate ? (rec.expired ? "EXPIRED" : rec.expiryDate) : "\u2014")],
          ["UNIT PRICE / VALUE", rec.unitPrice > 0
            ? `${rec.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} \u00d7 ${rec.usableOnHand} = ${rec.usableValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : "\u2014"],
        ].map(([k, v], i) => (
          <div key={k} style={{
            padding: "6px 10px", borderRight: i < 6 ? `1px solid ${COLORS.paperLine}` : "none",
            background: k === "EXPIRY" && rec.expired ? COLORS.rust : k === "EXPIRY" && rec.expiringSoon ? "#F3DDBC" : k.includes("AVG") ? "#E3E9D6" : "transparent",
          }}>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#F6D9D3" : k.includes("AVG") ? COLORS.moss : COLORS.inkSoft, letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#fff" : k === "EXPIRY" && rec.expiringSoon ? COLORS.amber : COLORS.ink, fontWeight: 600, fontSize: 12 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 10px 2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
        {rec.description} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 400, color: COLORS.inkSoft }}>({rec.unit}){rec.vendor ? ` \u00b7 ${rec.vendor}` : ""}</span>
      </div>
      {rec.parentsCount > 1 && (
        <div style={{ padding: "0 10px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel, display: "flex", alignItems: "center", gap: 4 }}>
          <Layers size={11} /> common component — used in {rec.parentsCount} assemblies: {rec.parentItems.join(", ")}
        </div>
      )}
      {rec.batches.length > 0 ? (
        <div style={{ padding: "0 10px 8px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <CalendarX size={11} /> batch breakdown (FEFO order) — usable {rec.usableOnHand} / total {rec.onHand} {rec.unit}
            {rec.expiredQty > 0 && <span style={{ color: COLORS.rust }}>&nbsp;{"\u00b7"} {rec.expiredQty} {rec.unit} expired, excluded</span>}
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
                  <td style={{ padding: "2px 8px" }}>{b.expiryDate || "\u2014"}</td>
                  <td style={{ padding: "2px 0" }}>
                    <span style={{
                      fontSize: 9.5, padding: "1px 5px",
                      color: b.expired ? "#fff" : b.expiringSoon ? COLORS.amber : COLORS.moss,
                      background: b.expired ? COLORS.rust : b.expiringSoon ? "#F3DDBC" : "#E3E9D6",
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
        <td style={{ padding: "2px 8px", color: COLORS.inkSoft }}>{p.vendor || "\u2014"}</td>
                    <td style={{ padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                        {isQtyOverridden && (
                          <button onClick={() => onResetPOQty(rec.item, p.poNumber)} title={`reset to original (${origQty})`} style={{
                            border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber,
                            fontSize: 9, padding: 0, lineHeight: 1,
                          }}>&#8635;</button>
                        )}
                        <input type="number" min={0} value={p.quantity}
                          onChange={(e) => onAdjustPOQty(rec.item, p.poNumber, e.target.value)}
                          style={{
                            width: 48, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                            border: `1px solid ${isQtyOverridden ? COLORS.amber : COLORS.paperLine}`, background: "#fff", color: COLORS.ink, padding: "1px 3px",
                          }} />
                      </div>
                    </td>
              
                     <td style={{ padding: "0 4px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                          {isWeekOverridden && (
                            <button onClick={() => onResetPOWeek(rec.item, p.poNumber)} title={`reset to original (${origWeek.week})`} style={{
                              border: "none", background: "transparent", cursor: "pointer", color: COLORS.amber,
                              fontSize: 9, padding: 0, lineHeight: 1,
                            }}>&#8635;</button>
                          )}
                          <input type="text" defaultValue={p.rawWeek}
                            onBlur={(e) => onAdjustPOWeek(rec.item, p.poNumber, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            title="e.g. 26CW30 or 3"
                            style={{
                              width: 56, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
                              border: `1px solid ${isWeekOverridden ? COLORS.amber : COLORS.paperLine}`, background: "#fff", color: COLORS.ink, padding: "1px 3px",
                            }} />
                        </div>
                        {p.outOfHorizon && (
                          <span title="วันครบกำหนดอยู่นอกช่วง horizon/history ที่ตั้งไว้ตอนนี้ — ไม่ถูกนำไปคำนวณ MRP" style={{
                            fontSize: 8.5, padding: "0 4px", color: COLORS.inkSoft,
                            border: `1px solid ${COLORS.paperLine}`, whiteSpace: "nowrap",
                          }}>OUT OF VIEW</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "2px 0", color: COLORS.inkSoft }}>{p.mondayDate || "\u2014"}</td>
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
                  whiteSpace: "nowrap", background: i < historyWeeks ? "#F1F1EA" : "transparent",
                }}>
                  {weekLabels[i]}
                  <div style={{ fontSize: 9, fontWeight: 400, color: "inherit", opacity: 0.85 }}>{weekDates[i]}{i < historyWeeks ? " (past)" : ""}</div>
                </td>
              ))}
            </tr>
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
        whiteSpace: "nowrap", background: i < historyWeeks ? "#F1F1EA" : "transparent",
      }}>
        {weekLabels[i]}
        <div style={{ fontSize: 9, fontWeight: 400, color: "inherit", opacity: 0.85 }}>{weekDates[i]}{i < historyWeeks ? " (past)" : ""}</div>
      </td>
    ))}
    <td style={{
      textAlign: "right", padding: "6px 10px", color: COLORS.ink, fontWeight: 700,
      borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `2px solid ${COLORS.ink}`,
      whiteSpace: "nowrap", background: COLORS.paper,
    }}>
      TOTAL
      <div style={{ fontSize: 9, fontWeight: 400, color: COLORS.inkSoft }}>{weeks.length} wk</div>
    </td>
  </tr>
</thead>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kind}>
                <td style={{ padding: "6px 10px", color: COLORS.ink, whiteSpace: "nowrap", borderTop: `1px solid ${COLORS.paperLine}` }}>{r.label}</td>
                {r.data.map((v, i) => {
                  let color = COLORS.ink;
                  let bg = "transparent";
                  if (r.kind === "poh" && v < 0) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "poh" && v !== null && v < rec.safety) { bg = "#F3DDBC"; }
                  if (r.kind === "prel" && v > 0 && rec.pastDue[i]) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "prel" && v > 0) { bg = "#DCE7EE"; color = COLORS.steelDeep; }
                  if (r.kind === "po" && v > 0) { bg = "#F3DDBC"; color = COLORS.amber; }
                  if (r.kind === "git" && v > 0) { bg = "#E3E9D6"; color = COLORS.moss; }
                  if (r.kind === "consumption" && rec.safetyFactor !== 1 && v > 0) { bg = "#DCE7EE"; color = COLORS.steelDeep; }
                  if (r.kind === "actual" && v > 0) { bg = "#E9E4F0"; color = "#5A4A78"; }
                  
                  // Variance Rendering
                  if (r.kind === "variance" && v !== null) {
                    if (v === 0 && rec.grossReq[i] === 0 && rec.actualConsumption[i] === 0) {
                      bg = "transparent"; color = COLORS.inkSoft; 
                    } else if (Math.abs(v) < 0.5) { 
                      bg = "#E3E9D6"; color = COLORS.moss; 
                    } else if (v > 0) { 
                      bg = "#F3DDBC"; color = COLORS.amber; 
                    } else { 
                      bg = "#F6D9D3"; color = COLORS.rust; 
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
                    ? `LT = ${rec.leadTime} wk \u2192 Arrives: ${i + rec.leadTime < weeks.length ? weekLabels[i + rec.leadTime] : "Out of horizon"}`
                    : `Receipt in ${weekLabels[i]} \u2192 Pushes On-Hand up`;

                 return (
                    <td key={i} style={{
                      textAlign: "right", padding: isEditable ? "3px 4px" : "6px 8px", borderTop: `1px solid ${COLORS.paperLine}`,
                      borderLeft: i === historyWeeks ? `2px solid ${COLORS.steel}` : `1px solid ${COLORS.paperLine}`,
                      color, background: isPast && bg === "transparent" ? "#F1F1EA" : bg,
                      outline: isOverridden ? `2px solid ${COLORS.amber}` : "none", outlineOffset: "-2px",
                    }}>
                      {isEditable ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                          {isOverridden && (
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
                            onChange={(e) => onAdjust(rec.item, i, e.target.value)}
                            style={{
                              width: 42, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5,
                              border: "none", background: "transparent", color, padding: "3px 2px",
                            }}
                          />
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
                              pctStr = "-\u221E%"; 
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
                        ) : (v ? Math.round(v) : "—"))
                      )}
                    </td>
                  );
                })}
                <td style={{
                  textAlign: "right", padding: "6px 10px", fontWeight: 700, color: COLORS.ink,
                  borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `2px solid ${COLORS.ink}`,
                  background: COLORS.paper, whiteSpace: "nowrap",
                }}>
                  {Math.round(total).toLocaleString()}
                </td>
              </tr>
            );
          })}                    </td>
                  );
                 <td style={{
        textAlign: "right", padding: "6px 10px", fontWeight: 700, color: COLORS.ink,
        borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `2px solid ${COLORS.ink}`,
        background: COLORS.paper, whiteSpace: "nowrap",
      }}>
        {Math.round(total).toLocaleString()}
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
  { value: "pending", label: "Pending", bg: "#DCE7EE", color: COLORS.steelDeep },
  { value: "released", label: "Released to buyer", bg: "#F3DDBC", color: COLORS.amber },
  { value: "ordered", label: "PO placed", bg: "#E3E9D6", color: COLORS.moss },
  { value: "received", label: "Received", bg: "#E9E4F0", color: "#5A4A78" },
];

function PlannedOrders({ records, weeks, weekLabels, orderStatus, setOrderStatus }) {
  const [hideReceived, setHideReceived] = useState(false);
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

  const visibleRows = hideReceived ? rows.filter((r) => getEntry(r.key).status !== "received") : rows;
  const counts = rows.reduce((acc, r) => {
    const s = getEntry(r.key).status;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const exportCSV = () => {
    const data = rows.map((r) => ({
      item: r.item, description: records[r.item].description, unit: r.unit,
      release_week: r.releaseWeek, due_week: r.receiptWeek, quantity: r.qty,
      lead_time_weeks: r.leadTime, past_due: r.pastDue ? "yes" : "no",
      status: getEntry(r.key).status, po_number: getEntry(r.key).poNumber || "",
    }));
    downloadCSV(`order_plan_${new Date().toISOString().slice(0, 10)}.csv`, data);
  };

  return (
    <div style={{ border: `1px solid ${COLORS.paperLine}`, background: COLORS.card }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px",
        borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 6,
      }}>
        <span style={{
          display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: COLORS.ink, textTransform: "uppercase",
        }}>
          <ClipboardList size={14} color={COLORS.steel} /> Order Planning ({rows.length})
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            border: `1px solid ${COLORS.steel}`, background: "transparent", padding: "3px 8px",
          }}><Download size={11} /> export order plan</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "6px 12px", borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap" }}>
        {STATUS_OPTIONS.map((s) => (
          <span key={s.value} style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: s.color,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 8, height: 8, background: s.bg, border: `1px solid ${s.color}`, display: "inline-block" }} />
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
                      <span style={{ marginLeft: 4, fontSize: 9, color: "#fff", background: COLORS.rust, padding: "1px 4px" }}>LATE</span>
                    )}
                  </td>
                  <td style={{ padding: "5px 10px", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.ink }}>{r.item}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>{r.qty}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}`, color: COLORS.inkSoft }}>{r.unit}</td>
                  <td style={{ padding: "5px 10px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>{r.receiptWeek}</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>
                    <select value={entry.status} onChange={(e) => updateEntry(r.key, { status: e.target.value })} style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, padding: "2px 4px",
                      background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.color}`,
                    }}>
                      {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "4px 8px", textAlign: "right", borderBottom: `1px solid ${COLORS.paperLine}` }}>
                    <input type="text" value={entry.poNumber} placeholder="TPO####"
                      onChange={(e) => updateEntry(r.key, { poNumber: e.target.value })}
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, width: 78, textAlign: "right",
                        border: `1px solid ${COLORS.paperLine}`, padding: "2px 4px", background: "#fff", color: COLORS.ink,
                      }} />
                  </td>
                </tr>
              );
            })}
            {visibleRows.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 14, textAlign: "center", color: COLORS.inkSoft }}>
                {rows.length === 0 ? "No planned orders in this horizon." : "All planned orders are marked received."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MRPDashboard() {
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
  const [selected, setSelected] = useState("BIKE-100");
  const [onlyWithOrders, setOnlyWithOrders] = useState(false);
  const [viewMode, setViewMode] = useState("assembly");
  const [forceOpen, setForceOpen] = useState(null);
  
  useEffect(() => {
    if (onlyWithOrders) setForceOpen(true);
  }, [onlyWithOrders]);
  
  const [loadedFlags, setLoadedFlags] = useState({ bom: false, inventory: false, demand: false, poPending: false, git: false, actualConsumption: false, batches: false });
  const [hydrated, setHydrated] = useState(false);
const [hydrating, setHydrating] = useState(true);
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

  const { weeks, weekLabels, weekDates, records, order, childrenOf, warnings } = useMemo(
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
    setScheduledReceiptsPO((prev) => prev.map((r) => {
      const matchesItem = r.item === item;
      const rPo = getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"], ["po", "ref", "doc"]);
      return matchesItem && rPo === poNumber ? { ...r, quantity: n } : r;
    }));
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
    setScheduledReceiptsPO((prev) => prev.map((r) => {
      const matchesItem = r.item === item;
      const rPo = getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"], ["po", "ref", "doc"]);
      return matchesItem && rPo === poNumber ? { ...r, week: rawValue } : r;
    }));
  };
  const resetPOWeek = (item, poNumber) => {
    const orig = poOriginalMap[`${item}::${poNumber}`];
    if (!orig) return;
    setScheduledReceiptsPO((prev) => prev.map((r) => {
      const matchesItem = r.item === item;
      const rPo = getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"], ["po", "ref", "doc"]);
      return matchesItem && rPo === poNumber ? { ...r, week: orig.week } : r;
    }));
  };

  const resetPOQty = (item, poNumber) => {
    const orig = poOriginalQtyMap[`${item}::${poNumber}`];
    if (orig === undefined) return;
    setScheduledReceiptsPO((prev) => prev.map((r) => {
      const matchesItem = r.item === item;
      const rPo = getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono", "เลขที่po"], ["po", "ref", "doc"]);
      return matchesItem && rPo === poNumber ? { ...r, quantity: orig } : r;
    }));
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

  const topItems = useMemo(() => order.filter((it) => !records[it].hasParents), [order, records]);

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
    <div style={{ background: COLORS.paper, minHeight: "100%", padding: 18, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* title block header */}
      <div style={{
        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", border: `1px solid ${COLORS.ink}`,
        background: COLORS.card, marginBottom: 16,
      }}>
        <div style={{ padding: "10px 14px", borderRight: `1px solid ${COLORS.ink}` }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: COLORS.ink, letterSpacing: "0.01em" }}>
            MATERIAL REQUIREMENTS PLAN
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft }}>
            time-phased planning record · BOM explosion · lead-time offset
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRight: `1px solid ${COLORS.ink}` }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>HORIZON</div>
          <input type="number" min={4} max={26} value={horizon}
            onChange={(e) => setHorizon(Math.max(4, Math.min(26, toNum(e.target.value, 12))))}
            style={{
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.ink,
              border: "none", background: "transparent", width: "60px", outline: "none",
            }} /> <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: COLORS.inkSoft }}>weeks</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>history</span>
            <input type="number" min={0} max={12} value={historyWeeks}
              onChange={(e) => setHistoryWeeks(Math.max(0, Math.min(12, toNum(e.target.value, 4))))}
              style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: COLORS.ink,
                border: `1px solid ${COLORS.paperLine}`, background: "transparent", width: "34px", outline: "none", padding: "1px 3px",
              }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft }}>wks back</span>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
            today: {weekLabels[historyWeeks]}
          </div>
        </div>
        <div style={{ padding: "10px 14px", borderRight: `1px solid ${COLORS.ink}` }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>ITEMS</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{kpis.itemCount}</div>
        </div>
  <div style={{ padding: "10px 14px" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft, letterSpacing: "0.06em" }}>RUN DATE</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.ink }}>
            {new Date().toISOString().slice(0, 10)}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.inkSoft, marginTop: 2 }}>
            {hydrating ? "loading data from SharePoint\u2026" : "data loaded successfully"}
          </div>
        </div>
      </div>

      {/* uploads */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <UploadSlot label="Bill of Materials" hint="parent_item, component_item, qty_per"
          onFile={handleFile("bom", setBom)} loaded={loadedFlags.bom} count={bom.length}
          onSample={() => { setBom(SAMPLE_BOM); setLoadedFlags((f) => ({ ...f, bom: false })); }} />
        <UploadSlot label="Inventory Master" hint="item, on_hand, lead_time_weeks, lot_size, safety_stock, safety_factor, vendor, unit_price, expiry_date"
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

      {poPendingHeaderWarning && (
        <div style={{
          border: `1px solid ${COLORS.amber}`, background: "#F3DDBC", color: "#5C4419",
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
            <div style={{ background: '#F3DDBC', border: `1px solid ${COLORS.amber}`, padding: '8px 12px', color: '#5C4419', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} color={COLORS.amber} style={{ minWidth: 14 }} />
              <span>
                <strong>ตรวจสอบข้อมูล:</strong> พบรายการที่มีแผนผลิต (Demand) แต่ไม่มีโครงสร้าง BOM ในระบบ: <b>{warnings.demandWithoutBOM.join(", ")}</b> <i>(หากเป็นสินค้าซื้อมาขายไป หรืออะไหล่ สามารถข้ามได้)</i>
              </span>
            </div>
          )}
          {warnings.missingInventory.length > 0 && (
            <div style={{ background: '#F6D9D3', border: `1px solid ${COLORS.rust}`, padding: '8px 12px', color: '#6A2B1D', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CircleAlert size={14} color={COLORS.rust} style={{ minWidth: 14 }} />
              <span>
                <strong>ข้อมูล Master ขาดหาย:</strong> พบรายการเหล่านี้อยู่ในโครงสร้าง BOM หรือ Demand แต่ไม่มีรายชื่ออยู่ใน Inventory Master: <b>{warnings.missingInventory.join(", ")}</b>
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <KPI label="Past due releases" value={kpis.pastDue} tone="rust" icon={CircleAlert} />
        <KPI label="Planned orders in horizon" value={kpis.ordersNeeded} tone="steel" icon={ClipboardList} />
        <KPI label="Items below safety stock (wk 1)" value={kpis.belowSafety} tone="amber" icon={AlertTriangle} />
        <KPI label="Items in structure" value={kpis.itemCount} tone="moss" icon={Gauge} />
        <KPI label="PO pending" value={scheduledReceiptsPO.length} tone="amber" icon={ClipboardList} />
        <KPI label="Goods in transit" value={scheduledReceiptsGIT.length} tone="moss" icon={ClipboardList} />
        <KPI label="Expired stock" value={kpis.expiredCount} tone="rust" icon={CalendarX} />
        <KPI label="Expiring within 4 wks" value={kpis.expiringSoonCount} tone="amber" icon={CalendarX} />
        <KPI label="Consumption variance" value={kpis.varianceCount} tone="steel" icon={Scale} />
        <KPI label="Usable inventory value" value={kpis.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="moss" icon={Gauge} />
        <KPI label="Value at risk (expired)" value={kpis.expiredValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} tone="rust" icon={CalendarX} />
      </div>

      {/* main */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ border: `1px solid ${COLORS.paperLine}`, background: COLORS.card }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 12px",
            borderBottom: `1px solid ${COLORS.paperLine}`, flexWrap: "wrap", rowGap: 6,
          }}>
            <span style={{
              display: "flex", alignItems: "center", gap: 6, fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: COLORS.ink, textTransform: "uppercase",
            }}>
              <PackageSearch size={14} color={COLORS.steel} /> {viewMode === "assembly" ? "Item Structure" : viewMode === "material" ? "Where-Used" : "By Vendor"}
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
            {[["assembly", "Finished good \u2192 parts"], ["material", "Raw material \u2192 where-used"], ["vendor", "By vendor"]].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                flex: 1, padding: "6px 6px", cursor: "pointer", border: "none",
                background: viewMode === mode ? COLORS.steel : "transparent",
                color: viewMode === mode ? "#F4F4EE" : COLORS.inkSoft,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5,
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, padding: "6px 12px", borderBottom: `1px solid ${COLORS.paperLine}` }}>
            <button onClick={() => setForceOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.steel,
              border: `1px solid ${COLORS.steel}`, background: "transparent", padding: "3px 8px",
            }}><ChevronsDown size={11} /> expand all</button>
            <button onClick={() => setForceOpen(false)} style={{
              display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: COLORS.inkSoft,
              border: `1px solid ${COLORS.paperLine}`, background: "transparent", padding: "3px 8px",
            }}><ChevronsUp size={11} /> collapse all</button>
          </div>
          <div style={{ padding: "6px 2px", maxHeight: 480, overflowY: "auto" }}>
            {viewMode === "vendor" ? (
              <VendorGroupTree groups={vendorGroups} records={records} selected={selected} onSelect={setSelected}
                onlyWithOrders={onlyWithOrders} forceOpen={forceOpen} clearForce={() => setForceOpen(null)} />
            ) : (
              <>
                {visibleTopItems.map((it) => (
                  <TreeRow key={it} item={it} records={records} childrenOf={activeChildMap}
                    selected={selected} onSelect={setSelected} depth={0}
                    onlyWithOrders={onlyWithOrders} subtreeOrderMap={activeOrderMap}
                    forceOpen={forceOpen} clearForce={() => setForceOpen(null)} />
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

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <RecordGrid rec={selectedRec} weeks={weeks} weekLabels={weekLabels} weekDates={weekDates} historyWeeks={historyWeeks}
            onAdjustPlan={adjustPlan} onResetPlanOverride={resetPlanOverride} 
            onAdjustReceipt={adjustReceipt} onResetReceiptOverride={resetReceiptOverride}
            onAdjustPOQty={adjustPOQty} poOriginalQtyMap={poOriginalQtyMap} onResetPOQty={resetPOQty}
            onAdjustPOWeek={adjustPOWeek} onResetPOWeek={resetPOWeek} poOriginalMap={poOriginalMap} 
            planOverrides={planOverrides} receiptOverrides={receiptOverrides} />
          <PlannedOrders records={records} weeks={weeks} weekLabels={weekLabels} orderStatus={orderStatus} setOrderStatus={setOrderStatus} />
        </div>
      </div>

      <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
        Note: planned orders round up to lot size; PO pending is netted against gross requirements in the week it's due, GIT is treated as arriving in week 1 (no date needed since it's already shipped). Expired on-hand stock is excluded from the plan (treated as 0). Actual consumption is compared against calculated gross requirements in the same week; variance only shows where actual data was entered. "Planned order receipt", "Planned order release", and PO pending quantities are directly editable \u2014 type a new number to override the calculated plan (amber outline marks an override; click \u21ba to reset).
      </div>
    </div>
  );
}
