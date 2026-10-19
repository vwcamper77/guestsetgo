import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as currencyLib from "../lib/currency.mjs";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { transform } = require("next/dist/build/swc");
async function compile(path, dependencies) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const compiled = await transform(source, { filename: "CurrencyTest.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2020" }, module: { type: "commonjs" } });
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled.code)(id => dependencies[id] || require(id), module, module.exports);
  return module.exports;
}
const plans = await compile("../lib/plans.js", {});

test("homepage prices and FAQ render consistently in both currencies", async () => {
  for (const currency of ["GBP", "USD"]) {
    const mod = await compile("../components/LocalizedPricing.js", { "@/lib/plans": plans, "@/lib/currency.mjs": currencyLib, "./CurrencyProvider": { useCurrency: () => ({ currency }) } });
    const html = renderToStaticMarkup(React.createElement(mod.LandingPricing));
    assert.ok(html.includes(currency === "USD" ? "$8 per property / month" : "£6 per property / month"));
    assert.ok(html.includes(currency === "USD" ? "$179 for the first year" : "£139 for the first year"));
    assert.ok(html.includes(currency === "USD" ? "minimum bill $25/month" : "minimum bill £20/month"));
    if (currency === "USD") assert.ok(!html.includes("£"));
    const faq = renderToStaticMarkup(React.createElement(mod.PricingFaqs, { faqs: [["Price?", "£6/month or £60/year, conversion £79."]] }));
    assert.ok(faq.includes(currency === "USD" ? "$8/month or $80/year, conversion $99." : "£6/month or £60/year, conversion £79."));
  }
});

test("billing renders selected totals, annual savings and locked legacy GBP accounts", async () => {
  for (const [preference, billingCurrency] of [["USD", null], ["GBP", null], ["USD", "GBP"], ["GBP", "USD"]]) {
    let stateIndex = 0;
    const states = [{ account: { billingCurrency }, planLabel: "Host", allowance: 1, publishedCount: 0 }, [{ id: "p1", name: "Cottage" }], { host: 2, agency: 5 }, "year", "p1", "", ""];
    const mod = await compile("../app/dashboard/billing/page.js", {
      react: { ...React, useState: () => [states[stateIndex++], () => {}], useEffect: () => {}, useCallback: fn => fn },
      "next/navigation": { useSearchParams: () => new URLSearchParams() },
      "@/components/AuthProvider": { useAuth: () => ({ api: () => {} }) },
      "@/components/CurrencyProvider": { useCurrency: () => ({ currency: preference, ready: true }) },
      "@/lib/currency.mjs": currencyLib, "@/lib/plans": plans,
    });
    const html = renderToStaticMarkup(React.createElement(mod.default));
    const usd = (billingCurrency || preference) === "USD";
    assert.ok(html.includes(usd ? "Total: $160 paid upfront each year" : "Total: £120 paid upfront each year"));
    assert.ok(html.includes(usd ? "Total: $25 each month" : "Total: £20 each month"));
    assert.ok(html.includes(usd ? "save $16" : "save £12"));
    assert.ok(html.includes(usd ? "Buy folder conversion — $99 once" : "Buy folder conversion — £79 once"));
    assert.equal(/aria-label="Billing currency"[^>]*disabled/.test(html), !!billingCurrency);
  }
});

test("saved preference wins; manual choice wins over a late geo response", async () => {
  const originalWindow = globalThis.window, originalFetch = globalThis.fetch;
  try {
    for (const saved of ["GBP", "USD", null]) {
      const states = ["GBP", false]; let index = 0, effect, resolveFetch, calls = 0, stored = saved;
      globalThis.window = { localStorage: { getItem: () => saved, setItem: (_, value) => { stored = value; } } };
      globalThis.fetch = () => { calls++; return new Promise(resolve => { resolveFetch = resolve; }); };
      const mod = await compile("../components/CurrencyProvider.js", {
        react: { ...React, useState: initial => { const i = index++; return [states[i] ?? initial, value => { states[i] = value; }]; }, useEffect: fn => { effect = fn; }, useRef: () => ({ current: false }) },
        "@/lib/currency.mjs": currencyLib,
      });
      const element = mod.CurrencyProvider({ children: null });
      effect();
      if (saved) { assert.equal(states[0], saved); assert.equal(calls, 0); assert.equal(states[1], true); }
      else {
        element.props.value.setCurrency("GBP");
        resolveFetch({ ok: true, json: async () => ({ currency: "USD" }) });
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(states[0], "GBP"); assert.equal(stored, "GBP"); assert.equal(states[1], true);
      }
    }
  } finally { globalThis.window = originalWindow; globalThis.fetch = originalFetch; }
});
