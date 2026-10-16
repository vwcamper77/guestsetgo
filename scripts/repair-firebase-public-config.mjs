// Repair only the public Firebase browser API key; never export production secrets.
// node --env-file=.env.local scripts/repair-firebase-public-config.mjs
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!/^AIza[0-9A-Za-z_-]{35}$/.test(key || "")) throw new Error("The local public Firebase API key has an invalid format.");
const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${key}`);
const config = await response.json();
if (!response.ok || !config.authorizedDomains?.includes("www.guestsetgo.com")) throw new Error("Firebase key/domain verification failed.");
const provider = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ providerId: "google.com", continueUri: "https://www.guestsetgo.com/" }) });
const result = await provider.json();
if (!provider.ok || new URL(result.authUri).hostname !== "accounts.google.com") throw new Error("Google provider verification failed.");
const cli = join(dirname(process.execPath), "node_modules", "vercel", "dist", "index.js");
if (!existsSync(cli)) throw new Error("Vercel CLI entrypoint not found.");
execFileSync(process.execPath, [cli, "env", "update", "NEXT_PUBLIC_FIREBASE_API_KEY", "production", "--yes", "--project", "guestsetgo"], { input: key, stdio: ["pipe", "pipe", "pipe"] });
console.log("Validated Firebase public key and Google provider; updated only NEXT_PUBLIC_FIREBASE_API_KEY in production. No key or production secrets printed.");
