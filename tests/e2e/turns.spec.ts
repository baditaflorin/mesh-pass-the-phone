import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";

test("two peers agree on and advance a deterministic current-holder turn", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", {
    storagePrefix: "mesh-pass-the-phone",
  });

  try {
    await a.getByLabel("Your display name").fill("Ari");
    await b.getByLabel("Your display name").fill("Bea");
    await a.getByRole("button", { name: "Start round" }).click();
    await expect(b.getByText(/Turn 1:/)).toBeVisible({ timeout: 10_000 });

    const completeA = a.getByRole("button", { name: "I completed this prompt" });
    const completeB = b.getByRole("button", { name: "I completed this prompt" });
    if (await completeA.isEnabled()) await completeA.click();
    else await completeB.click();

    await expect(a.getByText(/Turn 2:/)).toBeVisible({ timeout: 10_000 });
    await expect(b.getByText(/Turn 2:/)).toBeVisible({ timeout: 10_000 });
  } finally {
    await cleanup();
  }
});
