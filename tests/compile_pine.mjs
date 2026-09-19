import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const srcPath = resolve("src/VWAP_Suite.pine");
const source = readFileSync(srcPath, "utf8");
const url =
  "https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=Guest&pine_id=00000000-0000-0000-0000-000000000000";

const body = new URLSearchParams({ source });
const res = await fetch(url, {
  method: "POST",
  headers: {
    Accept: "application/json",
    Referer: "https://www.tradingview.com/",
    Origin: "https://www.tradingview.com",
    "User-Agent": "Mozilla/5.0 VWAP-Suite-Live-Abnahme",
  },
  body,
});

const text = await res.text();
writeFileSync(resolve("tests/compile_raw.json"), text, "utf8");
if (!res.ok) {
  console.error("HTTP", res.status, text.slice(0, 2000));
  process.exit(1);
}
const obj = JSON.parse(text);
const result = obj.result ?? {};
const errors = result.errors2 ?? result.errors ?? obj.errors ?? [];
const warnings = result.warnings2 ?? result.warnings ?? [];
console.log(JSON.stringify({
  http: res.status,
  success: obj.success,
  errorCount: Array.isArray(errors) ? errors.length : errors,
  warningCount: Array.isArray(warnings) ? warnings.length : warnings,
  errors,
  warnings,
}, null, 2));
if (obj.success === false || (Array.isArray(errors) && errors.length > 0)) {
  process.exit(2);
}
