import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { trackedPath, referralHost } from "../lib/analytics.mjs";

test("analytics excludes private areas and removes link secrets", () => {
  for (const path of ["/admin", "/dashboard/properties/private", "/api/me", "/login", "/signup", "//external.test", null]) assert.equal(trackedPath(path), null);
  assert.equal(trackedPath("/about?email=private@example.com#secret"), "/about");
  assert.equal(trackedPath("/g/private-guide?code=1234"), "/g/[guidebook]");
});

test("referrals retain only external hostnames", () => {
  assert.equal(referralHost("https://search.example/query?email=private", "https://guestsetgo.com"), "search.example");
  assert.equal(referralHost("https://guestsetgo.com/private", "https://guestsetgo.com"), "Direct / internal");
  assert.equal(referralHost("invalid", "https://guestsetgo.com"), "Direct / internal");
});

test("admin access includes the requested exact email and configured admins", async () => {
  const source = (await readFile(new URL("../lib/auth-server.js", import.meta.url), "utf8")).replace(/^import .*;\r?$/gm, "");
  const { isAdminEmail } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  assert.equal(isAdminEmail("gavinferns@hotail.com"), true);
  assert.equal(isAdminEmail("GAVINFERNS@HOTAIL.COM"), true);
  assert.equal(isAdminEmail("gavinferns@hotmail.com"), false);
  assert.equal(isAdminEmail("someone@example.com"), false);
  assert.equal(isAdminEmail(null), false);
});
