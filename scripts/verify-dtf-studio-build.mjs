#!/usr/bin/env node

import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve("washa-dtf-studio/dist");
const indexPath = path.join(distRoot, "index.html");
const v4Path = path.join(distRoot, "v4.html");
const publicBase = "/design/washa-ai/app/";
const productionClerkFrontendApi = "clerk.washa.shop";

function decodeClerkFrontendApi(publishableKey) {
  const encoded = publishableKey.split("_")[2] || "";
  try {
    return Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  } catch {
    return "";
  }
}

function normalizeJwks(payload) {
  if (!payload || !Array.isArray(payload.keys)) return null;
  return payload.keys
    .map((key) => [
      key.kid,
      key.kty,
      key.n,
      key.e,
      key.x,
      key.crv,
    ].filter(Boolean).join(":"))
    .sort();
}

async function verifyNoCircularChunkImports() {
  const assetRoot = path.join(distRoot, "assets");
  const assetEntries = await readdir(assetRoot, { recursive: true });
  const scriptPaths = assetEntries
    .filter((entry) => entry.endsWith(".js"))
    .map((entry) => path.resolve(assetRoot, entry));
  const scriptSet = new Set(scriptPaths);
  const graph = new Map();

  for (const scriptPath of scriptPaths) {
    const source = await readFile(scriptPath, "utf8");
    const dependencies = [
      ...source.matchAll(/\b(?:import|export)(?:[^"']*?\bfrom)?["'](\.[^"']+\.js)["']/g),
    ]
      .map((match) => path.resolve(path.dirname(scriptPath), match[1]))
      .filter((dependencyPath) => scriptSet.has(dependencyPath));

    graph.set(scriptPath, dependencies);
  }

  const visited = new Set();
  const visiting = new Set();
  const stack = [];

  function visit(scriptPath) {
    if (visited.has(scriptPath)) return;
    if (visiting.has(scriptPath)) {
      const cycleStart = stack.indexOf(scriptPath);
      const cycle = [...stack.slice(cycleStart), scriptPath]
        .map((entry) => path.relative(distRoot, entry));
      throw new Error(`WASHA AI build contains a circular chunk import:\n${cycle.join(" -> ")}`);
    }

    visiting.add(scriptPath);
    stack.push(scriptPath);
    for (const dependencyPath of graph.get(scriptPath) || []) {
      visit(dependencyPath);
    }
    stack.pop();
    visiting.delete(scriptPath);
    visited.add(scriptPath);
  }

  for (const scriptPath of scriptPaths) {
    visit(scriptPath);
  }
}

async function verifyProductionClerkInstance() {
  if (process.env.VERCEL_ENV !== "production") return;

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  const secretKey = process.env.CLERK_SECRET_KEY || "";
  const frontendApi = decodeClerkFrontendApi(publishableKey);

  if (frontendApi !== productionClerkFrontendApi) {
    throw new Error(`Vercel Production Clerk frontend domain must be ${productionClerkFrontendApi}.`);
  }

  const [frontendResponse, backendResponse] = await Promise.all([
    fetch(`https://${frontendApi}/.well-known/jwks.json`),
    fetch("https://api.clerk.com/v1/jwks", {
      headers: { Authorization: `Bearer ${secretKey}` },
    }),
  ]);

  if (!frontendResponse.ok || !backendResponse.ok) {
    throw new Error("Unable to verify the Clerk Production instance during the Vercel build.");
  }

  const [frontendJwks, backendJwks] = await Promise.all([
    frontendResponse.json(),
    backendResponse.json(),
  ]);
  const frontendKeys = normalizeJwks(frontendJwks);
  const backendKeys = normalizeJwks(backendJwks);

  if (
    !frontendKeys
    || !backendKeys
    || frontendKeys.length === 0
    || JSON.stringify(frontendKeys) !== JSON.stringify(backendKeys)
  ) {
    throw new Error("Clerk Production publishable and secret keys do not resolve to the same instance.");
  }
}

async function main() {
  await verifyNoCircularChunkImports();

  const shellPaths = [indexPath, v4Path];
  const shellSources = await Promise.all(shellPaths.map((shellPath) => readFile(shellPath, "utf8")));
  const references = shellSources.flatMap((html) => [
      ...html.matchAll(/(?:src|href)=["']([^"']+)["']/g),
    ]
      .map((match) => match[1])
      .filter((reference) => reference.startsWith(publicBase)));

  if (references.length === 0) {
    throw new Error(`No WASHA AI assets were found in ${shellPaths.join(", ")}`);
  }

  const missing = [];
  for (const reference of new Set(references)) {
    const relativePath = reference.slice(publicBase.length);
    const assetPath = path.resolve(distRoot, relativePath);

    if (!assetPath.startsWith(`${distRoot}${path.sep}`)) {
      missing.push(`${reference} (unsafe path)`);
      continue;
    }

    try {
      await access(assetPath);
    } catch {
      missing.push(reference);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `WASHA AI build references missing assets:\n${missing.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  const scriptReferences = [...new Set(references)]
    .filter((reference) => reference.endsWith(".js"));
  const scriptContents = await Promise.all(
    scriptReferences.map((reference) => readFile(
      path.resolve(distRoot, reference.slice(publicBase.length)),
      "utf8",
    )),
  );
  const bundledScripts = scriptContents.join("\n");
  const publishableEnvironments = new Set(
    [...bundledScripts.matchAll(/\bpk_(live|test)_[A-Za-z0-9_$-]+/g)]
      .map((match) => match[1]),
  );

  if (publishableEnvironments.size === 0) {
    throw new Error("WASHA AI build does not contain a Clerk publishable key.");
  }

  if (/\bsk_(?:live|test)_[A-Za-z0-9_$-]+/.test(bundledScripts)) {
    throw new Error("WASHA AI build unexpectedly contains a Clerk secret key.");
  }

  if (process.env.VERCEL_ENV === "production" && !publishableEnvironments.has("live")) {
    throw new Error("WASHA AI Vercel Production build does not contain a Clerk production publishable key.");
  }

  await verifyProductionClerkInstance();

  console.log(`WASHA AI build verified (${new Set(references).size} assets).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
