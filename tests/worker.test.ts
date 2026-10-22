import { test } from "node:test";
import assert from "node:assert/strict";
import worker, { imageType, validConfig, type Env } from "../worker/index";
import { submissionSchema, ledgerSchema, reviewSchema } from "../shared/schema";
const env: Env = {
  ASSETS: {
    fetch: async () =>
      new Response('<html lang="id">ArahBaik</html>', {
        headers: { "Content-Type": "text/html" },
      }),
  },
};
const configured: Env = {
  ...env,
  SUPABASE_URL: "https://test.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};
test("unconfigured Worker has honest 503 and never fake directory data", async () => {
  const r = await worker.fetch(
    new Request("https://arahbaik.test/api/directory"),
    env,
  );
  assert.equal(r.status, 503);
  assert.match(((await r.json()) as { error: string }).error, /disiapkan/);
});
test("health reports configuration; frontend still loads without credentials", async () => {
  const health = await worker.fetch(
    new Request("https://arahbaik.test/api/health"),
    env,
  );
  assert.equal(health.status, 503);
  const r = await worker.fetch(new Request("https://arahbaik.test/"), env);
  assert.equal(r.status, 200);
  assert.match(
    r.headers.get("Content-Security-Policy")!,
    /frame-ancestors 'none'/,
  );
});
test("secret/service role keys are never exposed as public configuration", () => {
  assert.equal(
    validConfig({ ...configured, SUPABASE_PUBLISHABLE_KEY: "sb_secret_bad" }),
    false,
  );
  const payload = btoa(JSON.stringify({ role: "service_role" }));
  assert.equal(
    validConfig({
      ...configured,
      SUPABASE_PUBLISHABLE_KEY: `ey.${payload}.sig`,
    }),
    false,
  );
  assert.equal(validConfig(configured), true);
});
test("public config only contains URL and publishable key", async () => {
  const r = await worker.fetch(
    new Request("https://arahbaik.test/api/config"),
    configured,
  );
  assert.deepEqual(await r.json(), {
    url: configured.SUPABASE_URL,
    publishableKey: configured.SUPABASE_PUBLISHABLE_KEY,
  });
  assert.equal(r.headers.get("Cache-Control"), "no-store");
});
test("cross-origin writes, unauthenticated writes, and rate excess fail closed", async () => {
  assert.equal(
    (
      await worker.fetch(
        new Request("https://arahbaik.test/api/submissions", {
          method: "POST",
          headers: { origin: "https://evil.test" },
        }),
        configured,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://arahbaik.test/api/submissions", {
          method: "POST",
        }),
        configured,
      )
    ).status,
    401,
  );
  const r = await worker.fetch(
    new Request("https://arahbaik.test/api/config"),
    {
      ...configured,
      API_RATE_LIMIT: { limit: async () => ({ success: false }) },
    },
  );
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("Retry-After"), "60");
});
test("file validation identifies actual image headers and rejects SVG/HTML", () => {
  assert.equal(
    imageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "png",
  );
  assert.equal(imageType(new Uint8Array([255, 216, 255, 224])), "jpg");
  assert.equal(imageType(new TextEncoder().encode("RIFF1234WEBP")), "webp");
  assert.equal(
    imageType(new TextEncoder().encode('<svg onload="alert(1)">')),
    null,
  );
});
test("schema rejects role injection, missing checks, invalid dates and fake monetary values", () => {
  assert.equal(submissionSchema.safeParse({ role: "admin" }).success, false);
  assert.equal(
    reviewSchema.safeParse({
      decision: "approve",
      notes: "Bukti diperiksa",
      identity_checked: true,
      qris_checked: false,
    }).success,
    false,
  );
  const v = {
    entry_date: "2026-10-22",
    kind: "income",
    category: "Iklan",
    description: "Pemasukan iklan bulan ini",
    amount: 10000,
  };
  assert.equal(ledgerSchema.safeParse(v).success, true);
  assert.equal(ledgerSchema.safeParse({ ...v, amount: -1 }).success, false);
  assert.equal(
    ledgerSchema.safeParse({ ...v, entry_date: "2026-02-30" }).success,
    false,
  );
});
