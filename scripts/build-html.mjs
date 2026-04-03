#!/usr/bin/env node
/**
 * Expands <!-- @include path/from/repo/root.html --> in templates/*.html
 * and writes the same relative path at repo root. Nested includes (e.g. in partials)
 * use paths relative to the repository root. If site-config.json exists, replaces
 * {{SITE_ORIGIN}}, {{SITE_HOST}}, and {{CAL_BOOKING_URL}} so booking links work
 * without a separate step. Run `npm run sync` for llms.txt, robots.txt, sitemap.xml.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "fs";
import { dirname, join, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const templatesDir = join(root, "templates");

const INCLUDE_RE = /<!--\s*@include\s+([^\s]+)\s*-->/g;
const MAX_DEPTH = 8;

function applySitePlaceholders(content) {
  const configPath = join(root, "site-config.json");
  if (!existsSync(configPath)) {
    return content;
  }
  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    console.warn("build-html: skip placeholders (invalid site-config.json)");
    return content;
  }
  const siteOrigin = String(config.siteOrigin || "").replace(/\/$/, "");
  const calBookingUrl = String(config.calBookingUrl || "");
  if (!siteOrigin || !calBookingUrl) {
    console.warn("build-html: skip placeholders (missing siteOrigin or calBookingUrl)");
    return content;
  }
  let siteHost;
  try {
    siteHost = new URL(siteOrigin).hostname;
  } catch {
    console.warn("build-html: skip placeholders (invalid siteOrigin URL)");
    return content;
  }
  return content
    .replaceAll("{{SITE_ORIGIN}}", siteOrigin)
    .replaceAll("{{CAL_BOOKING_URL}}", calBookingUrl)
    .replaceAll("{{SITE_HOST}}", siteHost);
}

function expandIncludes(content, depth = 0, stack = []) {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `Include depth exceeded ${MAX_DEPTH} (stack: ${stack.join(" → ")})`
    );
  }
  return content.replace(INCLUDE_RE, (match, includePath) => {
    const fullPath = join(root, includePath);
    if (!existsSync(fullPath)) {
      throw new Error(`build-html: include not found: ${includePath}`);
    }
    let inner = readFileSync(fullPath, "utf8");
    inner = inner.replace(/\n$/, "");
    return expandIncludes(inner, depth + 1, [...stack, includePath]);
  });
}

function collectHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectHtmlFiles(p));
    } else if (entry.name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

function main() {
  if (!existsSync(templatesDir)) {
    console.error("build-html: missing templates/ directory");
    process.exit(1);
  }

  const files = collectHtmlFiles(templatesDir);
  let written = 0;

  for (const absTemplate of files) {
    const relOut = relative(templatesDir, absTemplate);
    const outPath = join(root, relOut);
    const raw = readFileSync(absTemplate, "utf8");
    const expanded = applySitePlaceholders(expandIncludes(raw));
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, expanded, "utf8");
    written++;
    console.log("build-html:", relOut);
  }

  console.log("build-html: wrote", written, "file(s)");
}

main();
