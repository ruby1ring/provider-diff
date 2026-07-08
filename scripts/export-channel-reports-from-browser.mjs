#!/usr/bin/env node
/**
 * Export channel reports from browser localStorage into outputs/ for offline scanning.
 * Run while npm run dev is active and you have reports in the UI.
 *
 * Usage: node scripts/export-channel-reports-from-browser.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "outputs/channel-reports-export.json");
const STORAGE_KEY = "noctua-channel-reports-v1";
const UI_URL = process.env.NOCTUA_UI_URL || "http://127.0.0.1:4173/web/#channel-reports";

async function exportViaPlaywright() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return null;
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(UI_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    const data = await page.evaluate((key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        return [];
      }
    }, STORAGE_KEY);
    return data;
  } finally {
    await browser.close();
  }
}

async function main() {
  const data = await exportViaPlaywright();
  if (!data) {
    console.error("Playwright not available. Export manually:");
    console.error(`  1. Open ${UI_URL}`);
    console.error("  2. DevTools Console:");
    console.error(`     copy(JSON.stringify(JSON.parse(localStorage.getItem("${STORAGE_KEY}")||"[]"),null,2))`);
    console.error(`  3. Save to ${path.relative(ROOT, OUT)}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`[export] ${data.length} channel report(s) → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
