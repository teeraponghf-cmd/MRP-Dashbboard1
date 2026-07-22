import React, { useState, useMemo, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { AlertTriangle, Upload, Download, ChevronRight, ChevronDown, PackageSearch, Gauge, ClipboardList, CircleAlert, Layers, ChevronsDown, ChevronsUp, CalendarX, Scale } from "lucide-react";

// ---------- Sample data (bicycle sub-assembly) ----------
const SAMPLE_BOM = [
  { parent_item: "BIKE-100", component_item: "FRAME-STD", qty_per: 1 },
  { parent_item: "BIKE-100", component_item: "WHEEL-ASM", qty_per: 2 },
  { parent_item: "BIKE-100", component_item: "DRIVETRAIN-KIT", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "RIM-26", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "HUB-STD", qty_per: 1 },
  { parent_item: "WHEEL-ASM", component_item: "SPOKE-STD", qty_per: 32 },
  { parent_item: "DRIVETRAIN-KIT", component_item: "CHAIN-STD", qty_per: 1 },
  { parent_item: "DRIVETRAIN-KIT", component_item: "CRANKSET", qty_per: 1 },
];

const SAMPLE_INVENTORY = [
  { item: "BIKE-100", description: "Complete bicycle", unit: "EA", on_hand: 12, lead_time_weeks: 1, lot_size: 1, safety_stock: 5, safety_factor: 1, expiry_date: "" },
  { item: "FRAME-STD", description: "Standard frame, welded", unit: "EA", on_hand: 40, lead_time_weeks: 3, lot_size: 20, safety_stock: 10, safety_factor: 1.2, expiry_date: "" },
  { item: "WHEEL-ASM", description: "Wheel assembly, built", unit: "EA", on_hand: 30, lead_time_weeks: 2, lot_size: 10, safety_stock: 8, safety_factor: 1, expiry_date: "" },
  { item: "DRIVETRAIN-KIT", description: "Drivetrain kit", unit: "EA", on_hand: 25, lead_time_weeks: 2, lot_size: 15, safety_stock: 6, safety_factor: 1, expiry_date: "" },
  { item: "RIM-26", description: "26in alloy rim", unit: "EA", on_hand: 60, lead_time_weeks: 2, lot_size: 50, safety_stock: 20, safety_factor: 1, expiry_date: "" },
  { item: "HUB-STD", description: "Standard hub", unit: "EA", on_hand: 45, lead_time_weeks: 2, lot_size: 40, safety_stock: 15, safety_factor: 1, expiry_date: "" },
  { item: "SPOKE-STD", description: "Steel spoke", unit: "PCS", on_hand: 900, lead_time_weeks: 1, lot_size: 1000, safety_stock: 300, safety_factor: 1, expiry_date: "" },
  { item: "CHAIN-STD", description: "Standard chain, pre-lubed", unit: "EA", on_hand: 20, lead_time_weeks: 4, lot_size: 25, safety_stock: 10, safety_factor: 1.5, expiry_date: "" },
  { item: "CRANKSET", description: "Crankset, forged", unit: "EA", on_hand: 18, lead_time_weeks: 4, lot_size: 20, safety_stock: 8, safety_factor: 1, expiry_date: "" },
];

const SAMPLE_DEMAND = [
  { item: "BIKE-100", week: 2, quantity: 20 },
  { item: "BIKE-100", week: 4, quantity: 25 },
  { item: "BIKE-100", week: 6, quantity: 30 },
  { item: "BIKE-100", week: 8, quantity: 18 },
  { item: "BIKE-100", week: 10, quantity: 22 },
  { item: "SPOKE-STD", week: 3, quantity: 200 },
];

const SAMPLE_PO_PENDING = [
  { item: "CHAIN-STD", week: 2, quantity: 25, po_number: "TPO4471" },
  { item: "WHEEL-ASM", week: 1, quantity: 10, po_number: "TPO4455" },
];

const SAMPLE_GIT = [
  { item: "FRAME-STD", quantity: 20 },
];

const SAMPLE_ACTUAL_CONSUMPTION = [
  { item: "FRAME-STD", week: 2, quantity: 22 },
  { item: "WHEEL-ASM", week: 2, quantity: 44 },
  { item: "SPOKE-STD", week: 3, quantity: 260 },
];

const SAMPLE_BATCHES = [
  { item: "SPOKE-STD", batch_no: "SPK-B1", quantity: 300, expiry_date: "2026-07-01" },
  { item: "SPOKE-STD", batch_no: "SPK-B2", quantity: 600, expiry_date: "2026-11-01" },
  { item: "CHAIN-STD", batch_no: "CHN-B1", quantity: 8, expiry_date: "2026-07-28" },
  { item: "CHAIN-STD", batch_no: "CHN-B2", quantity: 12, expiry_date: "2026-12-01" },
];

const REQUIRED_COLS = {
  bom: ["parent_item", "component_item", "qty_per"],
  inventory: ["item", "on_hand", "lead_time_weeks", "lot_size", "safety_stock", "safety_factor", "description", "unit", "expiry_date (optional, if no batch file)"],
  demand: ["item", "week", "quantity"],
  poPending: ["item", "week", "quantity", "po_number"],
  git: ["item", "quantity"],
  actualConsumption: ["item", "week", "quantity"],
  batches: ["item", "batch_no", "quantity", "expiry_date"],
};

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Finds a value in a CSV row regardless of header casing/spacing/punctuation
// e.g. matches "po_number", "PO Number", "PO-No", "PONumber", "PO#" all to candidate "ponumber"
function getField(row, candidates, fallbackSubstrings, excludeExact) {
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/[\s_\-#.]/g, "");
    for (const cand of candidates) {
      if (norm === cand) {
        const v = row[key];
        if (v !== undefined && v !== null && String(v).trim() !== "") return v;
      }
    }
  }
  // fallback: any column whose (normalized) name contains one of the substrings,
  // skipping columns already claimed by other known fields (item/week/quantity/status)
  if (fallbackSubstrings) {
    const exclude = new Set(["item", "week", "quantity", "qty", "status", ...(excludeExact || [])]);
    for (const key of Object.keys(row)) {
      const norm = key.toLowerCase().replace(/[\s_\-#.]/g, "");
      if (exclude.has(norm)) continue;
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
// accepts "26CW29" / "2026CW29" (calendar week) or a plain number (relative week offset, 1-based)
function parseWeekToIndex(weekValue, startMonday) {
  const s = String(weekValue).trim();
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

// ---------- MRP engine ----------
function runMRP({ bom, inventory, demand, poPending, git, actualConsumption, batches, horizon }) {
  const weeks = Array.from({ length: horizon }, (_, i) => i + 1);
  const invByItem = {};
  inventory.forEach((r) => (invByItem[r.item] = r));

  const childrenOf = {}; // parent -> [{component, qty_per}]
  const parentsOf = {}; // component -> [parent]
  bom.forEach((r) => {
    childrenOf[r.parent_item] = childrenOf[r.parent_item] || [];
    childrenOf[r.parent_item].push({ component: r.component_item, qty_per: toNum(r.qty_per, 1) });
    parentsOf[r.component_item] = parentsOf[r.component_item] || [];
    parentsOf[r.component_item].push(r.parent_item);
  });

  const allItems = new Set([
    ...inventory.map((r) => r.item),
    ...demand.map((r) => r.item),
    ...bom.map((r) => r.parent_item),
    ...bom.map((r) => r.component_item),
  ]);

  // low-level coding via relaxation
  const level = {};
  allItems.forEach((it) => (level[it] = 0));
  let changed = true;
  let guard = 0;
  while (changed && guard < allItems.size + 5) {
    changed = false;
    guard++;
    bom.forEach((r) => {
      const p = level[r.parent_item] ?? 0;
      if ((level[r.component_item] ?? 0) < p + 1) {
        level[r.component_item] = p + 1;
        changed = true;
      }
    });
  }

  const order = Array.from(allItems).sort((a, b) => (level[a] || 0) - (level[b] || 0));

  const grossReq = {};
  order.forEach((it) => (grossReq[it] = new Array(horizon).fill(0)));
  const startMonday = mondayOfWeek(new Date());
  const weekLabels = weeks.map((_, i) => isoWeekLabel(new Date(startMonday.getTime() + i * 7 * 86400000)));
  const weekDates = weeks.map((_, i) => {
    const d = new Date(startMonday.getTime() + i * 7 * 86400000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  });
  const weekMondayDates = weeks.map((_, i) => new Date(startMonday.getTime() + i * 7 * 86400000).toISOString().slice(0, 10));
  demand.forEach((r) => {
    const idx = parseWeekToIndex(r.week, startMonday);
    if (idx >= 0 && idx < horizon) grossReq[r.item][idx] += toNum(r.quantity);
  });

  const schedReceiptByItem = {};
  const poPendingByItem = {};
  const gitByItem = {};
  order.forEach((it) => {
    schedReceiptByItem[it] = new Array(horizon).fill(0);
    poPendingByItem[it] = new Array(horizon).fill(0);
    gitByItem[it] = new Array(horizon).fill(0);
  });
  const poDetailsByItem = {};
  (poPending || []).forEach((r) => {
    const idx = parseWeekToIndex(r.week, startMonday);
    if (!poPendingByItem[r.item]) poPendingByItem[r.item] = new Array(horizon).fill(0);
    if (!schedReceiptByItem[r.item]) schedReceiptByItem[r.item] = new Array(horizon).fill(0);
    if (idx >= 0 && idx < horizon) {
      poPendingByItem[r.item][idx] += toNum(r.quantity);
      schedReceiptByItem[r.item][idx] += toNum(r.quantity);
      poDetailsByItem[r.item] = poDetailsByItem[r.item] || [];
      poDetailsByItem[r.item].push({
        poNumber: getField(r, ["ponumber", "ponum", "ponbr", "po", "ponr", "pono"], ["po", "ref", "doc"]) || "?", quantity: toNum(r.quantity), weekIdx: idx,
        weekLabel: weekLabels[idx], mondayDate: weekMondayDates[idx],
      });
    }
  });
  Object.values(poDetailsByItem).forEach((list) => list.sort((a, b) => a.weekIdx - b.weekIdx));
  (git || []).forEach((r) => {
    if (!gitByItem[r.item]) gitByItem[r.item] = new Array(horizon).fill(0);
    if (!schedReceiptByItem[r.item]) schedReceiptByItem[r.item] = new Array(horizon).fill(0);
    gitByItem[r.item][0] += toNum(r.quantity);
    schedReceiptByItem[r.item][0] += toNum(r.quantity);
  });

  const actualByItem = {};
  order.forEach((it) => (actualByItem[it] = new Array(horizon).fill(0)));
  (actualConsumption || []).forEach((r) => {
    const idx = parseWeekToIndex(r.week, startMonday);
    if (!actualByItem[r.item]) actualByItem[r.item] = new Array(horizon).fill(0);
    if (idx >= 0 && idx < horizon) actualByItem[r.item][idx] += toNum(r.quantity);
  });

  const batchesByItem = {};
  (batches || []).forEach((r) => {
    const qty = toNum(r.quantity);
    const dateStr = (r.expiry_date || "").trim();
    const expiryDate = dateStr ? new Date(dateStr + "T00:00:00Z") : null;
    const valid = expiryDate && !isNaN(expiryDate);
    const weeksToExpiry = valid ? Math.floor((expiryDate - startMonday) / (7 * 86400000)) : null;
    batchesByItem[r.item] = batchesByItem[r.item] || [];
    batchesByItem[r.item].push({
      batchNo: r.batch_no || "?", quantity: qty, expiryDate: dateStr,
      weeksToExpiry, expired: valid ? weeksToExpiry < 0 : false, expiringSoon: valid ? (weeksToExpiry >= 0 && weeksToExpiry <= 4) : false,
    });
  });
  Object.values(batchesByItem).forEach((list) => list.sort((a, b) => (a.weeksToExpiry ?? Infinity) - (b.weeksToExpiry ?? Infinity)));

  const records = {};

  order.forEach((item) => {
    const inv = invByItem[item] || { on_hand: 0, lead_time_weeks: 0, lot_size: 1, safety_stock: 0, description: item };
    const leadTime = Math.max(0, toNum(inv.lead_time_weeks, 0));
    const lotSize = Math.max(1, toNum(inv.lot_size, 1));
    const baseSafety = Math.max(0, toNum(inv.safety_stock, 0));
    const safetyFactor = toNum(inv.safety_factor, 1) || 1;
    const safety = baseSafety * safetyFactor;

    const itemBatches = batchesByItem[item] || [];
    let rawOnHand, effectiveOnHand, expired, expiringSoon, weeksToExpiry, expiryDateStr;

    if (itemBatches.length > 0) {
      // batch-tracked item: usable stock = sum of non-expired batches (FEFO)
      rawOnHand = itemBatches.reduce((s, b) => s + b.quantity, 0);
      effectiveOnHand = itemBatches.filter((b) => !b.expired).reduce((s, b) => s + b.quantity, 0);
      expired = effectiveOnHand === 0 && rawOnHand > 0;
      expiringSoon = itemBatches.some((b) => !b.expired && b.expiringSoon);
      const nearest = itemBatches.find((b) => !b.expired);
      weeksToExpiry = nearest ? nearest.weeksToExpiry : null;
      expiryDateStr = nearest ? nearest.expiryDate : (itemBatches[0] ? itemBatches[0].expiryDate : "");
    } else {
      // legacy single expiry_date on Inventory Master (optional)
      rawOnHand = toNum(inv.on_hand, 0);
      expired = false;
      expiringSoon = false;
      weeksToExpiry = null;
      expiryDateStr = (inv.expiry_date || "").trim();
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

    const gr = grossReq[item] || new Array(horizon).fill(0);
    const sr = schedReceiptByItem[item] || new Array(horizon).fill(0);
    const consumption = gr.map((v) => v * safetyFactor); // buffered consumption used for planning math
    const projOnHand = new Array(horizon).fill(0);
    const netReq = new Array(horizon).fill(0);
    const plannedReceipt = new Array(horizon).fill(0);
    const plannedRelease = new Array(horizon).fill(0);
    const pastDue = new Array(horizon).fill(false);

    let onHandPrev = effectiveOnHand;
    for (let i = 0; i < horizon; i++) {
      let proj = onHandPrev + sr[i] - consumption[i];
      if (proj < safety) {
        const need = safety - proj;
        const ordered = Math.ceil(need / lotSize) * lotSize;
        plannedReceipt[i] = ordered;
        proj += ordered;
      }
      projOnHand[i] = proj;
      netReq[i] = Math.max(0, safety - (onHandPrev + sr[i] - consumption[i]));
      onHandPrev = proj;
    }

    for (let i = 0; i < horizon; i++) {
      if (plannedReceipt[i] > 0) {
        const releaseIdx = i - leadTime;
        if (releaseIdx >= 0) {
          plannedRelease[releaseIdx] += plannedReceipt[i];
        } else {
          plannedRelease[0] += plannedReceipt[i];
          pastDue[0] = true;
        }
      }
    }

    // propagate dependent demand to children
    const kids = childrenOf[item] || [];
    kids.forEach(({ component, qty_per }) => {
      grossReq[component] = grossReq[component] || new Array(horizon).fill(0);
      for (let i = 0; i < horizon; i++) {
        grossReq[component][i] += plannedRelease[i] * qty_per;
      }
    });

    records[item] = {
      item,
      description: inv.description || item,
      unit: inv.unit || "EA",
      level: level[item] || 0,
      leadTime,
      lotSize,
      safety,
      baseSafety,
      safetyFactor,
      onHand: rawOnHand,
      usableOnHand: effectiveOnHand,
      expiredQty: Math.max(0, rawOnHand - effectiveOnHand),
      batches: itemBatches,
      expiryDate: expiryDateStr,
      expired,
      expiringSoon,
      weeksToExpiry,
      grossReq: gr,
      consumption,
      scheduledReceipts: sr,
      poPending: poPendingByItem[item] || new Array(horizon).fill(0),
      poPendingDetails: poDetailsByItem[item] || [],
      git: gitByItem[item] || new Array(horizon).fill(0),
      actualConsumption: actualByItem[item] || new Array(horizon).fill(0),
      consumptionVariance: gr.map((v, i) => (actualByItem[item] || [])[i] ? (actualByItem[item][i] - v) : null),
      projOnHand,
      netReq,
      plannedReceipt,
      plannedRelease,
      pastDue,
      hasParents: !!parentsOf[item],
      parentsCount: (parentsOf[item] || []).length,
      parentItems: parentsOf[item] || [],
      children: kids,
    };
  });

  return { weeks, weekLabels, weekDates, weekMondayDates, records, order, childrenOf };
}

// ---------- CSV helpers ----------
// ---------- Storage adapter ----------
// Prefers the artifact's persistent window.storage API (works inside claude.ai).
// Falls back to browser localStorage when window.storage isn't present (standalone deploy).
const STORAGE_PREFIX = "mrp_dashboard:";
async function storageGet(key) {
  try {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.get === "function") {
      const res = await window.storage.get(STORAGE_PREFIX + key, false);
      return res ? JSON.parse(res.value) : null;
    }
  } catch (e) { /* not found or unavailable */ }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch (e) { /* unavailable */ }
  return null;
}
async function storageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
      await window.storage.set(STORAGE_PREFIX + key, JSON.stringify(value), false);
      return true;
    }
  } catch (e) { /* fall through to localStorage */ }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    }
  } catch (e) { /* unavailable */ }
  return false;
}
async function storageClearAll(keys) {
  for (const key of keys) {
    try {
      if (typeof window !== "undefined" && window.storage && typeof window.storage.delete === "function") {
        await window.storage.delete(STORAGE_PREFIX + key, false);
        continue;
      }
    } catch (e) { /* ignore */ }
    try {
      if (typeof window !== "undefined" && window.localStorage) window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) { /* ignore */ }
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

function RecordGrid({ rec, weeks, weekLabels, weekDates }) {
  if (!rec) return null;
  const rows = [
    { label: "Gross requirements (calculated)", data: rec.grossReq, kind: "gr" },
    { label: `Consumption used for planning (\u00d7${rec.safetyFactor})`, data: rec.consumption, kind: "consumption" },
    { label: "Actual consumption (issued)", data: rec.actualConsumption, kind: "actual" },
    { label: "Variance (actual \u2212 calculated)", data: rec.consumptionVariance, kind: "variance" },
    { label: "PO pending", data: rec.poPending, kind: "po" },
    { label: "Goods in transit (GIT)", data: rec.git, kind: "git" },
    { label: "Projected on hand", data: rec.projOnHand, kind: "poh" },
    { label: "Net requirements", data: rec.netReq, kind: "nr" },
    { label: "Planned order receipt", data: rec.plannedReceipt, kind: "por" },
    { label: "Planned order release", data: rec.plannedRelease, kind: "prel" },
  ];

  return (
    <div style={{ border: `1px solid ${COLORS.ink}`, background: COLORS.card }}>
      {/* title block */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr", borderBottom: `1px solid ${COLORS.ink}`,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5,
      }}>
        {[
          ["ITEM", rec.item],
          ["UNIT", rec.unit],
          ["LOW-LEVEL CODE", rec.level],
          ["LEAD TIME (WK)", rec.leadTime],
          ["LOT SIZE / SS", `${rec.lotSize} / ${rec.baseSafety}${rec.safetyFactor !== 1 ? ` \u00d7${rec.safetyFactor} = ${rec.safety}` : ""}`],
          ["EXPIRY", rec.batches.length > 0
            ? `${rec.batches.length} batch${rec.batches.length === 1 ? "" : "es"}${rec.expired ? " (ALL EXPIRED)" : rec.expiredQty > 0 ? ` (${rec.expiredQty} exp.)` : ""}`
            : (rec.expiryDate ? (rec.expired ? "EXPIRED" : rec.expiryDate) : "\u2014")],
        ].map(([k, v], i) => (
          <div key={k} style={{
            padding: "6px 10px", borderRight: i < 5 ? `1px solid ${COLORS.paperLine}` : "none",
            background: k === "EXPIRY" && rec.expired ? COLORS.rust : k === "EXPIRY" && rec.expiringSoon ? "#F3DDBC" : "transparent",
          }}>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#F6D9D3" : COLORS.inkSoft, letterSpacing: "0.05em" }}>{k}</div>
            <div style={{ color: k === "EXPIRY" && rec.expired ? "#fff" : k === "EXPIRY" && rec.expiringSoon ? COLORS.amber : COLORS.ink, fontWeight: 600, fontSize: 12 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 10px 2px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
        {rec.description} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 400, color: COLORS.inkSoft }}>({rec.unit})</span>
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
                <td style={{ padding: "2px 8px" }}>QTY</td>
                <td style={{ padding: "2px 8px" }}>DUE WK</td>
                <td style={{ padding: "2px 0" }}>DATE (MON)</td>
              </tr>
            </thead>
            <tbody>
              {rec.poPendingDetails.map((p, i) => (
                <tr key={`${p.poNumber}-${i}`}>
                  <td style={{ padding: "2px 8px 2px 0", color: COLORS.ink }}>{p.poNumber}</td>
                  <td style={{ padding: "2px 8px" }}>{p.quantity}</td>
                  <td style={{ padding: "2px 8px" }}>{p.weekLabel}</td>
                  <td style={{ padding: "2px 0" }}>{p.mondayDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
          <thead>
            <tr>
              <td style={{ padding: "6px 10px", color: COLORS.inkSoft, whiteSpace: "nowrap", borderTop: `1px solid ${COLORS.paperLine}` }}>
                WEEK<div style={{ fontSize: 9, fontWeight: 400 }}>(Mon)</div>
              </td>
              {weeks.map((w, i) => (
                <td key={w} style={{
                  textAlign: "right", padding: "6px 8px", color: COLORS.inkSoft,
                  borderTop: `1px solid ${COLORS.paperLine}`, borderLeft: `1px solid ${COLORS.paperLine}`,
                  whiteSpace: "nowrap",
                }}>
                  {weekLabels[i]}
                  <div style={{ fontSize: 9, fontWeight: 400, color: COLORS.inkSoft, opacity: 0.85 }}>{weekDates[i]}</div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.kind}>
                <td style={{ padding: "6px 10px", color: COLORS.ink, whiteSpace: "nowrap", borderTop: `1px solid ${COLORS.paperLine}` }}>{r.label}</td>
                {r.data.map((v, i) => {
                  let color = COLORS.ink;
                  let bg = "transparent";
                  if (r.kind === "poh" && v < 0) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "poh" && v < rec.safety) { bg = "#F3DDBC"; }
                  if (r.kind === "prel" && v > 0 && rec.pastDue[i]) { color = "#fff"; bg = COLORS.rust; }
                  else if (r.kind === "prel" && v > 0) { bg = "#DCE7EE"; color = COLORS.steelDeep; }
                  if (r.kind === "po" && v > 0) { bg = "#F3DDBC"; color = COLORS.amber; }
                  if (r.kind === "git" && v > 0) { bg = "#E3E9D6"; color = COLORS.moss; }
                  if (r.kind === "consumption" && rec.safetyFactor !== 1 && v > 0) { bg = "#DCE7EE"; color = COLORS.steelDeep; }
                  if (r.kind === "actual" && v > 0) { bg = "#E9E4F0"; color = "#5A4A78"; }
                  if (r.kind === "variance" && v !== null) {
                    if (Math.abs(v) < 0.5) { bg = "#E3E9D6"; color = COLORS.moss; }
                    else if (v > 0) { bg = "#F3DDBC"; color = COLORS.amber; }
                    else { bg = "#F6D9D3"; color = COLORS.rust; }
                  }
                  return (
                    <td key={i} style={{
                      textAlign: "right", padding: "6px 8px", borderTop: `1px solid ${COLORS.paperLine}`,
                      borderLeft: `1px solid ${COLORS.paperLine}`, color, background: bg,
                    }}>
                      {v === null || v === undefined ? "—" : (r.kind === "variance" ? (v > 0 ? `+${Math.round(v)}` : Math.round(v)) : (v ? Math.round(v) : "—"))}
                    </td>
                  );
                })}
              </tr>
            ))}
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
  const [scheduledReceiptsGIT, setScheduledReceiptsGIT] = useState(SAMPLE_GIT);
  const [actualConsumption, setActualConsumption] = useState(SAMPLE_ACTUAL_CONSUMPTION);
  const [batches, setBatches] = useState(SAMPLE_BATCHES);
  const [orderStatus, setOrderStatus] = useState({}); // key: "item::releaseWeek" -> { status, poNumber }
  const [horizon, setHorizon] = useState(12);
  const [selected, setSelected] = useState("BIKE-100");
  const [onlyWithOrders, setOnlyWithOrders] = useState(false);
  const [viewMode, setViewMode] = useState("assembly"); // "assembly" (finished good -> parts) | "material" (raw material -> where used)
  const [forceOpen, setForceOpen] = useState(null); // null = per-row default, true = all expanded, false = all collapsed
  useEffect(() => {
    if (onlyWithOrders) setForceOpen(true);
  }, [onlyWithOrders]);
  const [loadedFlags, setLoadedFlags] = useState({ bom: false, inventory: false, demand: false, poPending: false, git: false, actualConsumption: false, batches: false });
  const [hydrated, setHydrated] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, inv, dem, po, git, ac, bt, hz, os] = await Promise.all([
        storageGet("bom"), storageGet("inventory"), storageGet("demand"),
        storageGet("poPending"), storageGet("git"), storageGet("actualConsumption"),
        storageGet("batches"), storageGet("horizon"), storageGet("orderStatus"),
      ]);
      if (cancelled) return;
      if (b) { setBom(b); setLoadedFlags((f) => ({ ...f, bom: true })); }
      if (inv) { setInventory(inv); setLoadedFlags((f) => ({ ...f, inventory: true })); }
      if (dem) { setDemand(dem); setLoadedFlags((f) => ({ ...f, demand: true })); }
      if (po) { setScheduledReceiptsPO(po); setLoadedFlags((f) => ({ ...f, poPending: true })); }
      if (git) { setScheduledReceiptsGIT(git); setLoadedFlags((f) => ({ ...f, git: true })); }
      if (ac) { setActualConsumption(ac); setLoadedFlags((f) => ({ ...f, actualConsumption: true })); }
      if (bt) { setBatches(bt); setLoadedFlags((f) => ({ ...f, batches: true })); }
      if (hz) setHorizon(hz);
      if (os) setOrderStatus(os);
      setHydrating(false);
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (hydrated) storageSet("bom", bom); }, [bom, hydrated]);
  useEffect(() => { if (hydrated) storageSet("inventory", inventory); }, [inventory, hydrated]);
  useEffect(() => { if (hydrated) storageSet("demand", demand); }, [demand, hydrated]);
  useEffect(() => { if (hydrated) storageSet("poPending", scheduledReceiptsPO); }, [scheduledReceiptsPO, hydrated]);
  useEffect(() => { if (hydrated) storageSet("git", scheduledReceiptsGIT); }, [scheduledReceiptsGIT, hydrated]);
  useEffect(() => { if (hydrated) storageSet("actualConsumption", actualConsumption); }, [actualConsumption, hydrated]);
  useEffect(() => { if (hydrated) storageSet("batches", batches); }, [batches, hydrated]);
  useEffect(() => { if (hydrated) storageSet("horizon", horizon); }, [horizon, hydrated]);
  useEffect(() => { if (hydrated) storageSet("orderStatus", orderStatus); }, [orderStatus, hydrated]);

  const PERSIST_KEYS = ["bom", "inventory", "demand", "poPending", "git", "actualConsumption", "batches", "horizon", "orderStatus"];
  const clearSavedData = async () => {
    await storageClearAll(PERSIST_KEYS);
    setBom(SAMPLE_BOM); setInventory(SAMPLE_INVENTORY); setDemand(SAMPLE_DEMAND);
    setScheduledReceiptsPO(SAMPLE_PO_PENDING); setScheduledReceiptsGIT(SAMPLE_GIT);
    setActualConsumption(SAMPLE_ACTUAL_CONSUMPTION); setBatches(SAMPLE_BATCHES); setHorizon(12); setOrderStatus({});
    setLoadedFlags({ bom: false, inventory: false, demand: false, poPending: false, git: false, actualConsumption: false, batches: false });
  };

  const handleFile = useCallback((key, setter) => (file) => {
    parseCSV(file, (rows) => {
      setter(rows);
      setLoadedFlags((f) => ({ ...f, [key]: true }));
    });
  }, []);

  const { weeks, weekLabels, weekDates, records, order, childrenOf } = useMemo(
    () => runMRP({ bom, inventory, demand, poPending: scheduledReceiptsPO, git: scheduledReceiptsGIT, actualConsumption, batches, horizon }),
    [bom, inventory, demand, scheduledReceiptsPO, scheduledReceiptsGIT, actualConsumption, batches, horizon]
  );

  const poPendingHeaderWarning = useMemo(() => {
    if (!scheduledReceiptsPO.length) return null;
    const headers = Object.keys(scheduledReceiptsPO[0]);
    const strictCands = ["ponumber", "ponum", "ponbr", "po", "ponr", "pono"];
    const fallbackSubs = ["po", "ref", "doc"];
    const exclude = new Set(["item", "week", "quantity", "qty", "status"]);
    const matched = headers.some((h) => {
      const norm = h.toLowerCase().replace(/[\s_\-#.]/g, "");
      if (exclude.has(norm)) return false;
      return strictCands.includes(norm) || fallbackSubs.some((s) => norm.includes(s));
    });
    return matched ? null : headers;
  }, [scheduledReceiptsPO]);

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

  // a true raw material: nothing beneath it in the BOM, AND something above actually consumes it
  // (excludes standalone finished goods that have no BOM structure at all)
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

  const activeTopItems = viewMode === "assembly" ? topItems : rawMaterialRoots;
  const activeChildMap = viewMode === "assembly" ? childrenOf : usedInMap;
  const activeOrderMap = viewMode === "assembly" ? subtreeOrderMap : reversedSubtreeOrderMap;

  const visibleTopItems = onlyWithOrders ? activeTopItems.filter((it) => activeOrderMap[it]) : activeTopItems;

  const kpis = useMemo(() => {
    let pastDue = 0, ordersNeeded = 0, belowSafety = 0, expiredCount = 0, expiringSoonCount = 0, varianceCount = 0;
    Object.values(records).forEach((rec) => {
      rec.plannedRelease.forEach((v, i) => { if (v > 0) { ordersNeeded++; if (rec.pastDue[i]) pastDue++; } });
      if (rec.projOnHand[0] < rec.safety) belowSafety++;
      if (rec.expired) expiredCount++;
      else if (rec.expiringSoon) expiringSoonCount++;
      if (rec.consumptionVariance.some((v) => v !== null && Math.abs(v) >= 0.5)) varianceCount++;
    });
    return { pastDue, ordersNeeded, belowSafety, itemCount: order.length, expiredCount, expiringSoonCount, varianceCount };
  }, [records, order]);

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
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
            starts {weekLabels[0]}
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
            {hydrating ? "restoring last session\u2026" : (
              <span>
                data auto-saved{" "}
                <button onClick={clearSavedData} style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, color: COLORS.rust,
                  background: "transparent", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline",
                }}>clear</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* uploads */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <UploadSlot label="Bill of Materials" hint="parent_item, component_item, qty_per"
          onFile={handleFile("bom", setBom)} loaded={loadedFlags.bom} count={bom.length}
          onSample={() => { setBom(SAMPLE_BOM); setLoadedFlags((f) => ({ ...f, bom: false })); }} />
        <UploadSlot label="Inventory Master" hint="item, on_hand, lead_time_weeks, lot_size, safety_stock, safety_factor, expiry_date"
          onFile={handleFile("inventory", setInventory)} loaded={loadedFlags.inventory} count={inventory.length}
          onSample={() => { setInventory(SAMPLE_INVENTORY); setLoadedFlags((f) => ({ ...f, inventory: false })); }} />
        <UploadSlot label="Demand Schedule" hint="item, week (e.g. 26CW29 or 1,2,3...), quantity"
          onFile={handleFile("demand", setDemand)} loaded={loadedFlags.demand} count={demand.length}
          onSample={() => { setDemand(SAMPLE_DEMAND); setLoadedFlags((f) => ({ ...f, demand: false })); }} />
        <UploadSlot label="Actual Consumption (\u0e40\u0e1a\u0e34\u0e01\u0e08\u0e23\u0e34\u0e07)" hint="item, week (e.g. 26CW29 or 1,2,3...), quantity"
          onFile={handleFile("actualConsumption", setActualConsumption)} loaded={loadedFlags.actualConsumption} count={actualConsumption.length}
          onSample={() => { setActualConsumption(SAMPLE_ACTUAL_CONSUMPTION); setLoadedFlags((f) => ({ ...f, actualConsumption: false })); }} />
        <UploadSlot label="Batches / Lots (expiry)" hint="item, batch_no, quantity, expiry_date"
          onFile={handleFile("batches", setBatches)} loaded={loadedFlags.batches} count={batches.length}
          onSample={() => { setBatches(SAMPLE_BATCHES); setLoadedFlags((f) => ({ ...f, batches: false })); }} />
        <UploadSlot label="PO Pending" hint="item, week (e.g. 26CW29 or 1,2,3...), quantity, po_number"
          onFile={handleFile("poPending", setScheduledReceiptsPO)} loaded={loadedFlags.poPending} count={scheduledReceiptsPO.length}
          onSample={() => { setScheduledReceiptsPO(SAMPLE_PO_PENDING); setLoadedFlags((f) => ({ ...f, poPending: false })); }} />
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
              <PackageSearch size={14} color={COLORS.steel} /> {viewMode === "assembly" ? "Item Structure" : "Where-Used"}
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
            {[["assembly", "Finished good \u2192 parts"], ["material", "Raw material \u2192 where-used"]].map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                flex: 1, padding: "6px 8px", cursor: "pointer", border: "none",
                background: viewMode === mode ? COLORS.steel : "transparent",
                color: viewMode === mode ? "#F4F4EE" : COLORS.inkSoft,
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
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
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <RecordGrid rec={selectedRec} weeks={weeks} weekLabels={weekLabels} weekDates={weekDates} />
          <PlannedOrders records={records} weeks={weeks} weekLabels={weekLabels} orderStatus={orderStatus} setOrderStatus={setOrderStatus} />
        </div>
      </div>

      <div style={{ marginTop: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: COLORS.inkSoft }}>
        Note: planned orders round up to lot size; PO pending is netted against gross requirements in the week it's due, GIT is treated as arriving in week 1 (no date needed since it's already shipped). Expired on-hand stock is excluded from the plan (treated as 0). Actual consumption is compared against calculated gross requirements in the same week; variance only shows where actual data was entered. Upload your own CSVs to replace the sample bicycle BOM.
      </div>
    </div>
  );
}
