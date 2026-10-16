import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const sandbox = JSON.parse(readFileSync("output/host-qa/sandbox.json", "utf8"));
if (!sandbox.secret_key.includes("_test_")) throw new Error("Only a test sandbox key is allowed.");
const listener = readFileSync("output/host-qa/stripe-listen.log", "utf8");
const secret = listener.match(/whsec_[A-Za-z0-9]+/)?.[0];
if (!secret) throw new Error("The sandbox webhook listener is not ready.");
const output = execFileSync(process.execPath, ["scripts/stripe-setup.mjs"], { encoding: "utf8", env: { ...process.env, STRIPE_SECRET_KEY: sandbox.secret_key }, maxBuffer: 2000000 });
const prices = Object.fromEntries([...output.matchAll(/^(STRIPE_[A-Z_]+)=(\S+)$/gm)].map((m) => [m[1], m[2]]));
let env = readFileSync(".env.local", "utf8");
const overrides = { ...prices, STRIPE_SECRET_KEY: sandbox.secret_key, STRIPE_WEBHOOK_SECRET: secret, NEXT_PUBLIC_SITE_URL: "http://localhost:3103" };
for (const [key, value] of Object.entries(overrides)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, `${key}=${value}`) : `${env.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(".env.qa.local", env);
console.log("Isolated payment QA environment prepared. Production environment and prices unchanged.");
