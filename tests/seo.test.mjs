import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { priceBook } from "../lib/currency.mjs";
import { linkOrigin, publicSiteUrl } from "../lib/site-url.mjs";
import { absolutePublicUrl, articleStructuredData, homeStructuredData, indexablePaths, publicDocuments, publicPageMetadata, robotsAllows } from "../lib/seo.mjs";
import { beginCheckoutEvent, isPublicAnalyticsPath, pageViewParams, signUpEvent } from "../lib/analytics-events.mjs";

const require = createRequire(import.meta.url);
const { publicRedirects, CANONICAL_ORIGIN } = require("../lib/public-redirects.js");

test("canonical host, sitemap URLs and public pages agree on www", () => {
  assert.equal(publicSiteUrl("https://guestsetgo.com"), "https://www.guestsetgo.com");
  assert.equal(publicSiteUrl("https://www.guestsetgo.com/blog"), "https://www.guestsetgo.com");
  assert.equal(publicSiteUrl("http://localhost:3000"), "https://www.guestsetgo.com");
  assert.equal(linkOrigin("https://guestsetgo.com"), "https://www.guestsetgo.com");
  assert.equal(linkOrigin("http://localhost:3000"), "http://localhost:3000");
  assert.equal(CANONICAL_ORIGIN, publicSiteUrl());
  assert.equal(absolutePublicUrl("/"), "https://www.guestsetgo.com");
  const urls = indexablePaths().map((path) => absolutePublicUrl(path));
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) assert.equal(url.startsWith("https://www.guestsetgo.com"), true);
  assert.ok(urls.includes("https://www.guestsetgo.com/sample"));
  assert.ok(urls.includes("https://www.guestsetgo.com/blog/diy-holiday-let-welcome-book"));
  assert.equal(urls.some((url) => url.includes("dashboard") || url.includes("/login") || url.includes("/g/")), false);
});

test("every indexable page has a unique title and description and stays crawlable", () => {
  const docs = publicDocuments();
  assert.deepEqual(docs.map((doc) => doc.path).sort(), indexablePaths().slice().sort());
  assert.equal(new Set(docs.map((doc) => doc.title)).size, docs.length);
  assert.equal(new Set(docs.map((doc) => doc.description)).size, docs.length);
  for (const doc of docs) {
    assert.ok(doc.title.length > 8);
    assert.ok(doc.description.length > 40);
    assert.equal(robotsAllows(doc.path), true);
  }
  for (const path of ["/dashboard", "/dashboard/billing", "/admin", "/login", "/signup", "/g/private", "/api/me"]) assert.equal(robotsAllows(path), false);
  assert.equal(publicPageMetadata(docs.find((doc) => doc.path === "/vs")).openGraph.images[0], "/opengraph-image");
  assert.equal(publicPageMetadata({ path: "/blog/diy-holiday-let-welcome-book", title: "Guide", description: "A practical guide for hosts writing their own welcome book.", image: false }).openGraph.images, undefined);
});

test("structured data uses listed GBP prices and does not invent reviews", () => {
  const prices = priceBook("GBP");
  const graph = homeStructuredData([["Question?", "Answer with £6 hosting."]]);
  const json = JSON.stringify(graph);
  assert.equal(json.includes("aggregateRating"), false);
  assert.equal(json.includes("review"), false);
  const offers = graph["@graph"].find((node) => node["@type"] === "SoftwareApplication").offers;
  assert.deepEqual(offers.map((offer) => [offer.priceCurrency, offer.price]), [
    ["GBP", String(prices.hostMonthly)],
    ["GBP", String(prices.hostAnnual)],
    ["GBP", String(prices.agencyMonthly)],
    ["GBP", String(prices.assisted)],
  ]);
  assert.deepEqual([prices.hostMonthly, prices.hostAnnual, prices.agencyMonthly, prices.assisted], [6, 60, 4, 79]);
  const article = articleStructuredData({ headline: "Guide", description: "A guide.", path: "/blog/diy-holiday-let-welcome-book", breadcrumbs: [["Home", "/"], ["Journal", "/blog"], ["Guide", "/blog/diy-holiday-let-welcome-book"]] });
  assert.deepEqual(article["@graph"].map((node) => node["@type"]), ["Article", "BreadcrumbList"]);
  assert.equal(article["@graph"][1].itemListElement.at(-1).item, "https://www.guestsetgo.com/blog/diy-holiday-let-welcome-book");
});

test("analytics page views cover public routes and checkout uses listed prices", () => {
  for (const path of ["/", "/blog", "/blog/diy-holiday-let-welcome-book", "/vs", "/vs/touch-stay", "/sample", "/about", "/sharing", "/privacy"]) {
    assert.equal(isPublicAnalyticsPath(path), true);
    assert.equal(pageViewParams({ origin: "https://www.guestsetgo.com", pathname: path, title: "T" }).page_referrer, undefined);
  }
  for (const path of ["/dashboard", "/dashboard/billing", "/login", "/signup", "/admin", "/g/private", "/api/me"]) assert.equal(pageViewParams({ origin: "https://www.guestsetgo.com", pathname: path, title: "T", referrer: "https://www.google.com/" }), null);
  const referred = pageViewParams({ origin: "https://www.guestsetgo.com", pathname: "/blog", title: "Journal", referrer: "https://www.google.com/" });
  assert.equal(referred.page_location, "https://www.guestsetgo.com/blog");
  assert.equal(referred.page_referrer, "https://www.google.com/");
  assert.deepEqual(signUpEvent("email"), { method: "email" });
  assert.equal(signUpEvent("password"), null);
  assert.deepEqual(beginCheckoutEvent({ plan: "host", quantity: "2", interval: "month", currency: "gbp" }), { currency: "GBP", value: 12, items: [{ item_name: "Host hosting monthly", quantity: 2, price: 6 }] });
  assert.equal(beginCheckoutEvent({ plan: "host", quantity: 1, interval: "year", currency: "GBP" }).value, 60);
  assert.equal(beginCheckoutEvent({ plan: "agency", quantity: 5, interval: "month", currency: "GBP" }).value, 20);
  assert.equal(beginCheckoutEvent({ plan: "assisted", quantity: 9, interval: "month", currency: "GBP" }).value, 79);
  assert.equal(beginCheckoutEvent({ plan: "host", quantity: 1, interval: "month", currency: "USD" }).value, 8);
  assert.equal(beginCheckoutEvent({ plan: "starter", quantity: 1, interval: "month", currency: "GBP" }), null);
});

test("dead public URLs redirect to the page that replaced them", () => {
  const redirects = publicRedirects();
  const destination = Object.fromEntries(redirects.filter((rule) => !rule.has).map((rule) => [rule.source, rule.destination]));
  assert.equal(destination["/demo.html"], "/sample");
  assert.equal(destination["/demo"], "/sample");
  assert.equal(destination["/pricing"], "https://www.guestsetgo.com/#pricing");
  assert.equal(destination["/journal"], "/blog");
  assert.equal(destination["/compare"], "/vs");
  assert.equal(destination["/favicon.ico"], "/icon.svg");
  assert.equal(redirects.some((rule) => rule.destination.includes("/dashboard")), false);
  const host = redirects.find((rule) => rule.has);
  assert.equal(host.has[0].value, "guestsetgo.com");
  assert.equal(host.destination.startsWith("https://www.guestsetgo.com"), true);
});
