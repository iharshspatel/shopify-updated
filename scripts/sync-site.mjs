#!/usr/bin/env node
/**
 * Replaces {{SITE_ORIGIN}}, {{CAL_BOOKING_URL}}, and {{SITE_HOST}} in tracked files.
 * SITE_HOST is the hostname from siteOrigin (for footer display).
 */
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const config = JSON.parse(readFileSync(join(root, "site-config.json"), "utf8"));

const siteOrigin = config.siteOrigin.replace(/\/$/, "");
const calBookingUrl = config.calBookingUrl;
let siteHost;
try {
  siteHost = new URL(siteOrigin).hostname;
} catch {
  console.error("Invalid siteOrigin in site-config.json");
  process.exit(1);
}

const files = [
  "index.html",
  "llms.txt",
  "robots.txt",
  "sitemap.xml",
  "blog/index.html",
  "blog/why-is-my-shopify-store-slow/index.html",
];

let updated = 0;
for (const rel of files) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.warn("sync-site: skip missing:", rel);
    continue;
  }
  let text = readFileSync(path, "utf8");
  text = text.replaceAll("{{SITE_ORIGIN}}", siteOrigin);
  text = text.replaceAll("{{CAL_BOOKING_URL}}", calBookingUrl);
  text = text.replaceAll("{{SITE_HOST}}", siteHost);
  writeFileSync(path, text);
  updated++;
}

console.log("sync-site: updated", updated, "files");
console.log("  siteOrigin:", siteOrigin);
console.log("  siteHost:", siteHost);
