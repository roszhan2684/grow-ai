import { expect, test } from "@playwright/test";

/** The golden demo route from the spec, end to end, against a production build. */
test("golden demo: overview → account → warm path → agent → campaign → attribution → break it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/app");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("accounts warming");

  await page.getByRole("link", { name: /Acme Robotics/ }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acme Robotics");
  await expect(page.getByText("14 days ago", { exact: true })).toBeVisible();
  await expect(page.getByText("Maya Okafor → Lena Fischer → Tomas Lindqvist").first()).toBeVisible();

  await page.getByRole("link", { name: "Ask the agent →" }).click();
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByText(/Top recommendation for Acme Robotics/)).toBeVisible();
  await page.getByRole("button", { name: "Approve & execute once" }).click();
  await expect(page.getByText(/Executed once/)).toBeVisible();

  await page.getByRole("button", { name: "Send a message to Tomas at Acme Robotics" }).click();
  await expect(page.getByText("Paused: waiting for human approval. Nothing was sent.").first()).toBeVisible();

  await page.goto("/app/campaigns");
  const ceo = page.locator("textarea").first();
  await ceo.fill("We deliver guaranteed 100% uptime.");
  await expect(page.getByRole("button", { name: "Approve" }).first()).toBeDisabled();
  await page.getByRole("button", { name: "Revert" }).first().click();
  await page.getByRole("button", { name: "Approve" }).first().click();
  await expect(page.getByRole("button", { name: "Approved" }).first()).toBeVisible();

  await page.goto("/app/attribution");
  await expect(page.getByText("Not causal proof.")).toBeVisible();
  await expect(page.getByText("1.000000").first()).toBeVisible();

  await page.goto("/app/jobs");
  await page.getByRole("button", { name: /Duplicate webhook/ }).click();
  await expect(page.getByText(/4\/4 assertions/)).toBeVisible({ timeout: 15_000 });

  await page.goto("/app");
  await expect(page.getByText("5 of 6 complete").or(page.getByText("6 of 6 complete"))).toBeVisible();
  expect(errors).toEqual([]);
});

test("public site renders proof from the benchmark artifact", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Turn B2B relationships into a system.");
  await expect(page.getByText(/Loaded from benchmarks\/results\/latest.json/)).toBeVisible();
  await page.goto("/benchmarks");
  await expect(page.getByText("Replay determinism")).toBeVisible();
});

test("signed webhook endpoint rejects forgeries", async ({ request }) => {
  const r = await request.post("/api/webhooks/hubspot", { data: { provider: "hubspot" }, headers: { "x-grow-signature": "AAAA", "x-grow-timestamp": String(Date.now()) } });
  expect(r.status()).toBe(401);
});
