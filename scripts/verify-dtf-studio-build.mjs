#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";

const distRoot = path.resolve("washa-dtf-studio/dist");
const indexPath = path.join(distRoot, "index.html");
const publicBase = "/design/washa-ai/app/";

async function main() {
  const html = await readFile(indexPath, "utf8");
  const references = [
    ...html.matchAll(/(?:src|href)=["']([^"']+)["']/g),
  ]
    .map((match) => match[1])
    .filter((reference) => reference.startsWith(publicBase));

  if (references.length === 0) {
    throw new Error(`No WASHA AI assets were found in ${indexPath}`);
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

  console.log(`WASHA AI build verified (${new Set(references).size} assets).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
