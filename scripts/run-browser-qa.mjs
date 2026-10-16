// Local QA wrapper: keep browser command echoes, credentials and auth state out of tool output.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
const phase = process.argv[2];
if (!/^[a-z0-9-]+$/.test(phase || "")) throw new Error("Choose a QA phase.");
const root = "output/host-qa";
const fixture = JSON.parse(readFileSync(`${root}/run.json`, "utf8"));
let output;
try {
  output = execFileSync(process.execPath, [join(dirname(process.execPath), "node_modules/npm/bin/npx-cli.js"), "--yes", "--package", "@playwright/cli", "playwright-cli", "-s=guestsetgo-qa", "run-code", "--filename", `${root}/${phase}.js`], { encoding: "utf8", timeout: 180000, maxBuffer: 4000000 });
} catch (e) { output = `${e.stdout || ""}\n${e.stderr || ""}`; }
writeFileSync(`${root}/${phase}.log`, output);
const summary = output.split("### Ran Playwright code")[0].replaceAll(fixture.password, "[QA PASSWORD REDACTED]");
console.log(summary.slice(0, 6000));
const result = output.match(/### Result\s*\n([^\n]+)/);
if (result) { try { const data = JSON.parse(result[1]); fixture.results ||= {}; fixture.results[phase] = data; writeFileSync(`${root}/run.json`, JSON.stringify(fixture)); } catch {} }
if (output.includes("### Error") || !result) process.exitCode = 1;
