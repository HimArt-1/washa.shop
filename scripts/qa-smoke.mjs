#!/usr/bin/env node

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3003";

const routes = [
  { path: "/", expectedStatus: 200 },
  { path: "/join", expectedStatus: 200 },
  { path: "/store", expectedStatus: 200 },
  { path: "/dashboard", expectedStatuses: [200, 307, 308], protected: true },
  { path: "/dashboard/applications", expectedStatuses: [200, 307, 308], protected: true },
  { path: "/dashboard/settings", expectedStatuses: [200, 307, 308], protected: true },
  { path: "/dashboard/support", expectedStatuses: [200, 307, 308], protected: true },
  { path: "/dashboard/products-inventory", expectedStatuses: [200, 307, 308], protected: true },
];

function isHtml(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("text/html");
}

async function run() {
  console.log(`\nSmoke QA against ${baseUrl}\n`);
  const failures = [];

  for (const route of routes) {
    const url = new URL(route.path, baseUrl).toString();
    try {
      const response = await fetch(url, {
        redirect: "manual",
        headers: {
          "user-agent": "wusha-qa-smoke/1.0",
        },
      });

      const expectedStatuses = route.expectedStatuses ?? [route.expectedStatus ?? 200];
      const isExpectedStatus = expectedStatuses.includes(response.status);
      const isProtectedRedirect =
        route.protected === true &&
        (response.status === 307 || response.status === 308) &&
        (response.headers.get("location") || "").includes("/sign-in");
      const ok = isExpectedStatus && (isHtml(response) || isProtectedRedirect);
      const mark = ok ? "PASS" : "FAIL";
      const redirectNote = isProtectedRedirect ? ` -> ${response.headers.get("location")}` : "";
      console.log(`${mark.padEnd(5)} ${route.path} -> ${response.status}${redirectNote}`);

      if (!ok) {
        failures.push({
          path: route.path,
          status: response.status,
          contentType: response.headers.get("content-type") || "unknown",
        });
      }
    } catch (error) {
      console.log(`FAIL  ${route.path} -> request error`);
      failures.push({
        path: route.path,
        status: "request_error",
        contentType: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (failures.length > 0) {
    console.error("\nSmoke QA failures:");
    for (const failure of failures) {
      console.error(`- ${failure.path}: ${failure.status} (${failure.contentType})`);
    }
    process.exit(1);
  }

  console.log("\nSmoke QA passed.");
}

await run();
