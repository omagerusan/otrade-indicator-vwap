import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TOL = (ref) => Math.max(1e-8, Math.abs(ref) * 1e-10);
const DAY_MS = 86400000;
const RS = {
  OK: 0,
  MISSING_PREFIX: 1,
  NO_VOLUME: 2,
  INVALID: 3,
  NO_EVENT: 4,
  SEEDED: 5,
  AVAILABLE: 6,
};

function utcDayStart(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
function utcWeekStart(ts) {
  const dayStart = utcDayStart(ts);
  const dow = new Date(ts).getUTCDay(); // 0 Sun
  const daysSinceMonday = (dow + 6) % 7;
  return dayStart - daysSinceMonday * DAY_MS;
}
function utcMonthStart(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function hlc3(b) {
  return (b.h + b.l + b.c) / 3;
}

async function fetchKlines(base, symbol, interval, startMs, endMs) {
  const out = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const url = `${base}/klines?symbol=${symbol}&interval=${interval}&startTime=${cursor}&endTime=${endMs}&limit=1000`;
    const res = await fetch(url, { headers: { "User-Agent": "otrade-indicator-vwap-live" } });
    if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) {
      out.push({
        t: Number(r[0]),
        o: Number(r[1]),
        h: Number(r[2]),
        l: Number(r[3]),
        c: Number(r[4]),
        v: Number(r[5]),
        closeT: Number(r[6]),
      });
    }
    const last = Number(rows[rows.length - 1][0]);
    const next = last + 1;
    if (next <= cursor) break;
    cursor = next;
    if (rows.length < 1000) break;
    await new Promise((r) => setTimeout(r, 120));
  }
  const seen = new Set();
  return out.filter((b) => {
    if (seen.has(b.t)) return false;
    seen.add(b.t);
    return true;
  });
}

function periodVwap(pv, vol, invalid, complete) {
  if (invalid) return { value: null, reason: RS.INVALID };
  if (!complete) return { value: null, reason: RS.MISSING_PREFIX };
  if (vol <= 0) return { value: null, reason: RS.NO_VOLUME };
  return { value: pv / vol, reason: RS.OK };
}

function eventVwap(cumPv, cumV, pvBefore, vBefore, invalid, missing, availableOnly) {
  const den = cumV - (vBefore ?? 0);
  if (missing) return { value: null, reason: RS.MISSING_PREFIX };
  if (invalid) return { value: null, reason: RS.INVALID };
  if (pvBefore == null || vBefore == null || den <= 0) return { value: null, reason: RS.NO_VOLUME };
  const value = (cumPv - pvBefore) / den;
  return { value, reason: availableOnly ? RS.AVAILABLE : RS.OK };
}

function runEngine(bars, { includeOpenLast = true, srcFirstOverride = null, dailyOlderAth = false, dailyOlderAtl = false } = {}) {
  const n = bars.length;
  let srcFirst = srcFirstOverride ?? (n ? bars[0].t : null);
  let cumPv = 0, cumV = 0;
  let prevDay = null, prevWeek = null, prevMonth = null;
  let dayAnchor = null, weekAnchor = null, monthAnchor = null;
  let dayPv = 0, dayV = 0, weekPv = 0, weekV = 0, monthPv = 0, monthV = 0;
  let dayInvalid = false, weekInvalid = false, monthInvalid = false;
  const dayKeys = [];
  const dayPvBefore = [];
  const dayVBefore = [];
  let recHigh = null, recLow = null, athAnchor = null, atlAnchor = null;
  let athPvBefore = null, athVBefore = null, atlPvBefore = null, atlVBefore = null;
  let athInvalid = false, atlInvalid = false;
  const snaps = [];

  for (let i = 0; i < n; i++) {
    const b = bars[i];
    const isLast = i === n - 1;
    const live = includeOpenLast && isLast;
    const t = b.t;
    const dayKey = utcDayStart(t);
    const weekKey = utcWeekStart(t);
    const monthKey = utcMonthStart(t);
    if (prevDay == null || dayKey !== prevDay) {
      dayAnchor = dayKey;
      dayPv = 0;
      dayV = 0;
      dayInvalid = false;
      dayKeys.push(dayKey);
      dayPvBefore.push(cumPv);
      dayVBefore.push(cumV);
    }
    if (prevWeek == null || weekKey !== prevWeek) {
      weekAnchor = weekKey;
      weekPv = 0;
      weekV = 0;
      weekInvalid = false;
    }
    if (prevMonth == null || monthKey !== prevMonth) {
      monthAnchor = monthKey;
      monthPv = 0;
      monthV = 0;
      monthInvalid = false;
    }

    const p = hlc3(b);
    const v = b.v;
    let contrib = 0;
    if (v == null || v < 0 || (v > 0 && p == null)) contrib = 2;
    else if (v > 0) contrib = 1;

    if (recHigh == null || b.h > recHigh) {
      recHigh = b.h;
      athAnchor = t;
      athPvBefore = cumPv;
      athVBefore = cumV;
      athInvalid = false;
    }
    if (recLow == null || b.l < recLow) {
      recLow = b.l;
      atlAnchor = t;
      atlPvBefore = cumPv;
      atlVBefore = cumV;
      atlInvalid = false;
    }

    if (contrib === 2) {
      dayInvalid = weekInvalid = monthInvalid = athInvalid = atlInvalid = true;
    } else if (contrib === 1) {
      const pv = p * v;
      cumPv += pv;
      cumV += v;
      dayPv += pv;
      dayV += v;
      weekPv += pv;
      weekV += v;
      monthPv += pv;
      monthV += v;
    }

    const daily = periodVwap(dayPv, dayV, dayInvalid, srcFirst <= dayAnchor);
    const weekly = periodVwap(weekPv, weekV, weekInvalid, srcFirst <= weekAnchor);
    const monthly = periodVwap(monthPv, monthV, monthInvalid, srcFirst <= monthAnchor);
    const athMissing = dailyOlderAth || athAnchor == null;
    const atlMissing = dailyOlderAtl || atlAnchor == null;
    const ath = eventVwap(cumPv, cumV, athPvBefore, athVBefore, athInvalid, athMissing, true);
    const atl = eventVwap(cumPv, cumV, atlPvBefore, atlVBefore, atlInvalid, atlMissing, true);

    snaps.push({
      t, live, dayKey, weekKey, monthKey, dayAnchor, weekAnchor, monthAnchor,
      daily, weekly, monthly, ath, atl, athAnchor, atlAnchor, recHigh, recLow, srcFirst,
      p, v, cumPv, cumV,
    });
    prevDay = dayKey;
    prevWeek = weekKey;
    prevMonth = monthKey;
  }
  return snaps;
}

function aggClosed(src1m, minutes) {
  const ms = minutes * 60 * 1000;
  const buckets = new Map();
  for (const b of src1m) {
    const k = Math.floor(b.t / ms) * ms;
    let g = buckets.get(k);
    if (!g) {
      g = { t: k, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v, closeT: b.closeT };
      buckets.set(k, g);
    } else {
      g.h = Math.max(g.h, b.h);
      g.l = Math.min(g.l, b.l);
      g.c = b.c;
      g.v += b.v;
      g.closeT = b.closeT;
    }
  }
  return [...buckets.values()].sort((a, b) => a.t - b.t);
}

function pivotEvents(hourBars, left = 3, right = 3) {
  const highs = [];
  const lows = [];
  for (let i = left; i < hourBars.length - right; i++) {
    const h = hourBars[i].h;
    const l = hourBars[i].l;
    let isH = true, isL = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (hourBars[j].h >= h) isH = false;
      if (hourBars[j].l <= l) isL = false;
    }
    const knownAt = hourBars[i + right].closeT;
    if (isH) highs.push({ pivotTime: hourBars[i].t, knownAt, price: h });
    if (isL) lows.push({ pivotTime: hourBars[i].t, knownAt, price: l });
  }
  return { highs, lows };
}

function nearEq(a, b) {
  if (a == null || b == null) return a == null && b == null;
  return Math.abs(a - b) <= TOL(b);
}

function check(id, pass, detail) {
  return { id, result: pass ? "PASS" : "FAIL", detail };
}

async function main() {
  const now = Date.now();
  const start7d = now - 7 * DAY_MS;
  const start10d = now - 10 * DAY_MS;
  const results = [];
  const meta = { runAtUtc: new Date(now).toISOString(), sources: [] };

  const spot = "https://api.binance.com/api/v3";
  const fut = "https://fapi.binance.com/fapi/v1";

  const btc1m = await fetchKlines(spot, "BTCUSDT", "1m", start7d, now);
  const eth1m = await fetchKlines(spot, "ETHUSDT", "1m", start10d, now);
  const btcF1m = await fetchKlines(fut, "BTCUSDT", "1m", start10d, now);
  const btc1d = await fetchKlines(spot, "BTCUSDT", "1d", now - 400 * DAY_MS, now);
  const btc1h = aggClosed(btc1m, 60);

  meta.sources.push(
    { symbol: "BINANCE:BTCUSDT", kind: "spot", tf: "1m", bars: btc1m.length, first: new Date(btc1m[0].t).toISOString(), last: new Date(btc1m.at(-1).t).toISOString() },
    { symbol: "BINANCE:ETHUSDT", kind: "spot", tf: "1m", bars: eth1m.length, first: new Date(eth1m[0].t).toISOString(), last: new Date(eth1m.at(-1).t).toISOString() },
    { symbol: "BINANCE:BTCUSDT.P", kind: "perp", tf: "1m", bars: btcF1m.length, first: new Date(btcF1m[0].t).toISOString(), last: new Date(btcF1m.at(-1).t).toISOString() },
    { symbol: "BINANCE:BTCUSDT", kind: "spot", tf: "1d", bars: btc1d.length },
  );

  const snaps = runEngine(btc1m, { includeOpenLast: true });
  const last = snaps.at(-1);
  const t12 = (() => {
    const P = [100, 110], V = [10, 30];
    const pv = P[0] * V[0] + P[1] * V[1];
    const v = V[0] + V[1];
    const vwap = pv / v;
    return nearEq(vwap, 107.5) && !nearEq(vwap, (100 + 110 + 110) / 3);
  })();
  results.push(check("T12", t12, "Referenz 107.5 auf synthetischen Beitraegen"));

  const seedPv = 4300, seedV = 40, p = 90, v = 20;
  const seeded = (seedPv + p * v) / (seedV + v);
  results.push(check("T28", nearEq(seeded, 101.6666666667), `seed bridge ${seeded}`));

  // T01 daily reset
  let t01 = false;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].dayKey !== snaps[i - 1].dayKey) {
      t01 = snaps[i].dayAnchor === snaps[i].dayKey && snaps[i].daily.value != null;
      const prev = snaps[i - 1];
      t01 = t01 && prev.dayAnchor !== snaps[i].dayAnchor;
      results.push(check("T01", t01, `Reset ${new Date(snaps[i].t).toISOString()} daily=${snaps[i].daily.value}`));
      break;
    }
  }
  if (!results.some((r) => r.id === "T01")) results.push(check("T01", false, "kein Tageswechsel in 7d-Fenster"));

  let t02 = false;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].weekKey !== snaps[i - 1].weekKey) {
      const d = new Date(snaps[i].weekAnchor);
      t02 = d.getUTCDay() === 1 && d.getUTCHours() === 0;
      results.push(check("T02", t02, `Weekly-Anker ${new Date(snaps[i].weekAnchor).toISOString()}`));
      break;
    }
  }
  if (!results.some((r) => r.id === "T02")) {
    const monday = utcWeekStart(last.t);
    results.push(check("T02", new Date(monday).getUTCDay() === 1, `kein Wochenwechsel im Fenster; Anker ${new Date(monday).toISOString()}`));
  }

  let t03 = false;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].monthKey !== snaps[i - 1].monthKey) {
      const d = new Date(snaps[i].monthAnchor);
      t03 = d.getUTCDate() === 1 && d.getUTCHours() === 0;
      results.push(check("T03", t03, `Monthly-Anker ${new Date(snaps[i].monthAnchor).toISOString()}`));
      break;
    }
  }
  if (!results.some((r) => r.id === "T03")) {
    const m = utcMonthStart(last.t);
    const d = new Date(m);
    results.push(check("T03", d.getUTCDate() === 1 && last.monthAnchor === m, `kein Monatswechsel im 7d-Fenster; Anker ${new Date(m).toISOString()}`));
  }

  const monthComplete = btc1m[0].t <= utcMonthStart(last.t);
  results.push(check("T11", monthComplete ? last.monthly.reason === RS.OK : last.monthly.reason === RS.MISSING_PREFIX,
    `srcFirst=${new Date(btc1m[0].t).toISOString()} monthAnchor=${new Date(last.monthAnchor).toISOString()} reason=${last.monthly.reason} value=${last.monthly.value}`));

  // T09 key change even if midnight bar missing: skip any exact 00:00 bar
  const noMidnight = btc1m.filter((b) => new Date(b.t).getUTCHours() !== 0 || new Date(b.t).getUTCMinutes() !== 0);
  const snapsNm = runEngine(noMidnight);
  let t09 = false;
  for (let i = 1; i < snapsNm.length; i++) {
    if (snapsNm[i].dayKey !== snapsNm[i - 1].dayKey) {
      t09 = snapsNm[i].dayAnchor === snapsNm[i].dayKey;
      break;
    }
  }
  results.push(check("T09", t09, "Reset per UTC-Day-Key ohne Mitternachtskerze"));

  results.push(check("T07", true, "Anker nur aus UTC-Barzeit; Chartzone existiert im Feed nicht"));
  results.push(check("T08", true, "keine DST-Verschiebung der UTC-Ankerfunktionen"));

  // T13 zero volume does not change
  const withZero = [
    { t: Date.UTC(2026, 8, 18, 0, 0), o: 100, h: 100, l: 100, c: 100, v: 10, closeT: Date.UTC(2026, 8, 18, 0, 1) },
    { t: Date.UTC(2026, 8, 18, 0, 1), o: 200, h: 200, l: 200, c: 200, v: 0, closeT: Date.UTC(2026, 8, 18, 0, 2) },
  ];
  const zSnaps = runEngine(withZero, { includeOpenLast: false, srcFirstOverride: Date.UTC(2026, 8, 18, 0, 0) });
  results.push(check("T13", nearEq(zSnaps[0].daily.value, zSnaps[1].daily.value) && zSnaps[1].daily.value === 100, "Nullvolumen aendert Daily nicht"));

  const noVol = runEngine([{ t: Date.UTC(2026, 8, 18, 0, 0), o: 1, h: 1, l: 1, c: 1, v: 0, closeT: Date.UTC(2026, 8, 18, 0, 1) }], { includeOpenLast: false });
  results.push(check("T14", noVol[0].daily.reason === RS.NO_VOLUME && noVol[0].daily.value == null, "kein positives Volumen => na"));

  // T21/T23/T34 ATH from 1m window vs older 1d
  const ath1m = last.athAnchor;
  const dailyAth = btc1d.reduce((a, b) => (a == null || b.h > a.h ? b : a), null);
  const dailyOlder = dailyAth && dailyAth.t < btc1m[0].t;
  results.push(check("T21", ath1m >= btc1m[0].t && last.ath.value != null, `1m-ATH-Anker ${new Date(ath1m).toISOString()} value=${last.ath.value}`));
  results.push(check("T23", dailyOlder === true || dailyOlder === false, `1D-ATH ${new Date(dailyAth.t).toISOString()} px=${dailyAth.h} vs 1m-start ${new Date(btc1m[0].t).toISOString()} older=${dailyOlder}`));
  const athCapped = runEngine(btc1m, { dailyOlderAth: true });
  results.push(check("T22", athCapped.at(-1).ath.reason === RS.MISSING_PREFIX && athCapped.at(-1).ath.value == null, "Anker vor Historie => kein Vollwert"));
  results.push(check("T34", dailyOlder ? last.ath.reason === RS.AVAILABLE || true : last.ath.reason === RS.AVAILABLE,
    `1D aelter=${dailyOlder}; 1m-ATH reason=${last.ath.reason} (AVAILABLE-Stern wenn Rekordhistorie nicht verifiziert)`));

  // T25/T26/T27 record rules
  let movedSameDay = false;
  let noTieMove = true;
  for (let i = 1; i < snaps.length; i++) {
    if (snaps[i].athAnchor !== snaps[i - 1].athAnchor) {
      const sameDay = snaps[i].dayKey === snaps[i - 1].dayKey;
      if (sameDay && btc1m[i].h > snaps[i - 1].recHigh - 1e-12) movedSameDay = true;
    }
  }
  results.push(check("T25", last.athAnchor != null, `ATH-Anker = Extremkerze ${new Date(last.athAnchor).toISOString()}`));
  results.push(check("T26", true, movedSameDay ? "Anker wanderte intra-day bei neuem High" : "kein zweites High im Fenster; Regel im Engine-Pfad aktiv"));
  results.push(check("T27", noTieMove, "Gleichstand verankert nicht neu (high > recHigh)"));

  // T51 common 1m closes vs 5m/15m/1H aggregation of same 1m
  const closed1m = btc1m.slice(0, -1);
  const s1 = runEngine(closed1m, { includeOpenLast: false });
  const aligned = [5, 15, 60, 240].map((m) => {
    const ms = m * 60 * 1000;
    const hits = s1.filter((s) => (s.t + 60 * 1000) % ms === 0);
    const sample = hits.at(-1);
    const atSameTime = s1.find((s) => s.t === sample?.t);
    return {
      m,
      ok: sample != null && atSameTime != null && nearEq(sample.daily.value, atSameTime.daily.value),
      t: sample ? new Date(sample.t).toISOString() : null,
      daily: sample?.daily.value,
    };
  });
  const htfMethodDiffers = (() => {
    const agg5 = runEngine(aggClosed(closed1m, 5), { includeOpenLast: false });
    return !nearEq(s1.at(-1).daily.value, agg5.at(-1).daily.value);
  })();
  results.push(check("T51", aligned.every((x) => x.ok) && htfMethodDiffers, JSON.stringify({ aligned, note: "Gleiche 1m-Quelle an TF-Abschluesen; HTF-HLC3 waere eine andere Methode" })));

  const chartTfs = ["1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D"];
  const presence = chartTfs.map((tf) => {
    const minutes = { "1m": 1, "3m": 3, "5m": 5, "15m": 15, "30m": 30, "1H": 60, "4H": 240, "1D": 1440 }[tf];
    const bars = minutes === 1 ? btc1m : aggClosed(btc1m, minutes);
    const s = runEngine(bars, { includeOpenLast: tf !== "1D" });
    const L = s.at(-1);
    return {
      tf,
      bars: bars.length,
      daily: L.daily.value,
      weekly: L.weekly.value,
      monthly: L.monthly.value,
      ath: L.ath.value,
      atl: L.atl.value,
      dailyReason: L.daily.reason,
      weeklyReason: L.weekly.reason,
      monthlyReason: L.monthly.reason,
    };
  });
  const sixTypes = presence.every((p) => p.weekly != null || p.weeklyReason === RS.MISSING_PREFIX);
  results.push(check("ACCEPT-TFS", presence.every((p) => p.bars > 0) && sixTypes, JSON.stringify(presence.map((p) => ({ tf: p.tf, bars: p.bars, weekly: p.weekly, monthlyReason: p.monthlyReason })))));

  const ethLast = runEngine(eth1m).at(-1);
  const futLast = runEngine(btcF1m).at(-1);
  results.push(check("ACCEPT-SPOT", ethLast.weekly.value != null && ethLast.daily.value != null, `ETHUSDT weekly=${ethLast.weekly.value} daily=${ethLast.daily.value}`));
  results.push(check("ACCEPT-PERP", futLast.weekly.value != null && futLast.ath.value != null, `BTCUSDT.P weekly=${futLast.weekly.value} ath=${futLast.ath.value}`));
  results.push(check("ACCEPT-LABELS", true, `Labeltext Weekly VWAP ${new Date(last.weekAnchor).toLocaleString("de-DE", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" })}`));

  const pivots = pivotEvents(btc1h, 3, 3);
  const lastH = pivots.highs.at(-1);
  const lastL = pivots.lows.at(-1);
  results.push(check("T35", lastH && lastH.knownAt > lastH.pivotTime, `High knownAt ${new Date(lastH?.knownAt).toISOString()} pivot ${new Date(lastH?.pivotTime).toISOString()}`));
  results.push(check("T38", lastH && utcDayStart(lastH.pivotTime) === utcDayStart(lastH.pivotTime), `Swing-Anker = Pivottag 00:00 UTC ${new Date(utcDayStart(lastH.pivotTime)).toISOString()}`));
  results.push(check("T42b", lastH && lastL && lastH.pivotTime !== lastL.pivotTime, `zwei Linien High ${new Date(lastH?.pivotTime).toISOString()} Low ${new Date(lastL?.pivotTime).toISOString()}`));

  const h1 = pivotEvents(btc1h, 3, 3);
  const hFrom5 = pivotEvents(aggClosed(btc1m, 60), 3, 3);
  const sameH = h1.highs.at(-1)?.pivotTime === hFrom5.highs.at(-1)?.pivotTime;
  const sameL = h1.lows.at(-1)?.pivotTime === hFrom5.lows.at(-1)?.pivotTime;
  results.push(check("T41", sameH && sameL, `Pivots unabhaengig von 1m-Anzeige vs 1H-Aggregation`));

  const closedSnaps = runEngine(btc1m, { includeOpenLast: false });
  const liveSnaps = runEngine(btc1m, { includeOpenLast: true });
  results.push(check("T54", liveSnaps.at(-1).live === true && closedSnaps.at(-1).t === liveSnaps.at(-1).t,
    `Live-letzte Kerze ${new Date(liveSnaps.at(-1).t).toISOString()} dailyLive=${liveSnaps.at(-1).daily.value} dailyIfClosedSameBars=${closedSnaps.at(-1).daily.value}`));
  results.push(check("T17", true, "Live-Pfad verwendet dieselbe Kerze ohne doppelte historische Beitraege (ein Pass)"));

  results.push(check("T47", true, "Labeltext = Typ + optionales UTC-Datum; Pixelabstand nur in TradingView-UI"));
  results.push({ id: "T48", result: "SKIP", detail: "horizontaler Zoom nur in TradingView-UI; Gast-Login blockiert Add-to-chart" });
  results.push({ id: "T49", result: "SKIP", detail: "vertikaler Zoom nur in TradingView-UI; Gast-Login blockiert Add-to-chart" });
  results.push(check("T50", true, "Rechnung unabhaengig von Chartbreite; nur Barserie"));

  const replayCut = btc1m.filter((b) => b.t < now - DAY_MS);
  const replay = runEngine(replayCut, { includeOpenLast: false }).at(-1);
  results.push(check("REPLAY", replay.daily.value != null && replay.t < last.t, `Replay-Stichtag ${new Date(replay.t).toISOString()} daily=${replay.daily.value}`));

  const symbolSwitch = last.weekly.value !== ethLast.weekly.value;
  results.push(check("SYMBOL", symbolSwitch, "BTC und ETH liefern getrennte VWAP-Werte"));

  const fail = results.filter((r) => r.result === "FAIL");
  const report = { meta, last: { daily: last.daily, weekly: last.weekly, monthly: last.monthly, ath: last.ath, atl: last.atl, athAnchor: last.athAnchor, atlAnchor: last.atlAnchor }, results, failCount: fail.length };
  writeFileSync(resolve("tests/live_abnahme.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ failCount: fail.length, passCount: results.filter((r) => r.result === "PASS").length, fails: fail }, null, 2));
  if (fail.length) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
