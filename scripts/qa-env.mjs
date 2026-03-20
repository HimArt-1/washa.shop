#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const projectRoot = process.cwd();
const envFiles = [".env.local", ".env.vercel", ".env"];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

for (const file of envFiles) {
  loadEnvFile(path.join(projectRoot, file));
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function extractProjectRef(urlValue) {
  try {
    const hostname = new URL(urlValue).hostname;
    const firstSegment = hostname.split(".")[0];
    return firstSegment || null;
  } catch {
    return null;
  }
}

function addResult(results, ok, label, detail) {
  results.push({ ok, label, detail });
}

const results = [];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const projectRef = extractProjectRef(supabaseUrl);
const anonPayload = anonKey ? decodeJwtPayload(anonKey) : null;
const servicePayload = serviceRoleKey ? decodeJwtPayload(serviceRoleKey) : null;
const anonRef = anonPayload?.ref || null;
const serviceRef = servicePayload?.ref || null;

addResult(results, Boolean(projectRef), "NEXT_PUBLIC_SUPABASE_URL", projectRef ? `project ref = ${projectRef}` : "missing or invalid URL");
addResult(results, Boolean(anonKey), "NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey ? "present" : "missing");
addResult(results, Boolean(serviceRoleKey), "SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey ? "present" : "missing");

if (projectRef && anonRef) {
  addResult(
    results,
    projectRef === anonRef,
    "Anon key matches URL project",
    `url ref = ${projectRef}, anon ref = ${anonRef}`
  );
}

if (projectRef && serviceRef) {
  addResult(
    results,
    projectRef === serviceRef,
    "Service role key matches URL project",
    `url ref = ${projectRef}, service ref = ${serviceRef}`
  );
}

if (anonPayload?.role) {
  addResult(results, anonPayload.role === "anon", "Anon key role", `role = ${anonPayload.role}`);
}

if (servicePayload?.role) {
  addResult(results, servicePayload.role === "service_role", "Service role key role", `role = ${servicePayload.role}`);
}

const failed = results.filter((item) => !item.ok);

async function runLiveCheck(label, key, expectedRole) {
  if (!supabaseUrl || !key) return;

  try {
    const client = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: AbortSignal.timeout(8000),
          }),
      },
    });

    const { error } = await client.from("products").select("id", { head: true, count: "exact" }).limit(1);

    addResult(
      results,
      !error,
      `${label} live query`,
      error ? error.message : `query succeeded using ${expectedRole}`
    );
  } catch (error) {
    addResult(
      results,
      false,
      `${label} live query`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

await runLiveCheck("Anon key", anonKey, "anon");
await runLiveCheck("Service role key", serviceRoleKey, "service_role");

const finalFailures = results.filter((item) => !item.ok);

console.log("\nSupabase environment preflight\n");
for (const result of results) {
  const mark = result.ok ? "PASS" : "FAIL";
  console.log(`${mark.padEnd(5)} ${result.label}`);
  console.log(`      ${result.detail}`);
}

if (finalFailures.length > 0) {
  console.error(`\n${finalFailures.length} preflight check(s) failed.`);
  process.exit(1);
}

console.log("\nAll Supabase environment checks passed.");
