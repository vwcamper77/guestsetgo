import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as arrival from "../lib/arrival.mjs";
const require = createRequire(import.meta.url);
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { transform } = require("next/dist/build/swc");
const arrivalSource = await readFile(new URL("../components/ArrivalDirections.js", import.meta.url), "utf8");
const arrivalCompiled = await transform(arrivalSource, { filename: "ArrivalDirections.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2020" }, module: { type: "commonjs" } });
const arrivalModule = { exports: {} };
new Function("require", "module", "exports", arrivalCompiled.code)((id) => id === "@/lib/arrival.mjs" ? arrival : require(id), arrivalModule, arrivalModule.exports);

const source = await readFile(new URL("../components/Guidebook.js", import.meta.url), "utf8");
const compiled = await transform(source, { filename: "Guidebook.jsx", jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } }, target: "es2020" }, module: { type: "commonjs" } });
const module = { exports: {} };
new Function("require", "module", "exports", compiled.code)((id) => id === "@/lib/slug" ? { waNumber: () => "" } : id === "@/lib/arrival.mjs" ? arrival : id === "./ArrivalDirections" ? arrivalModule.exports : require(id), module, module.exports);
const Guidebook = module.exports.default;
const property = { name: "Empty sections test", slug: "test", wifiName: "Guest", photoGuides: [], houseInfo: [], parking: [], picks: [], checkoutTasks: [], emergency: [] };

test("empty guide sections render no stray numeric text between cards", () => {
  const html = renderToStaticMarkup(React.createElement(Guidebook, { property, preview: true }));
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
  assert.equal(main.replace(/<section\b[\s\S]*?<\/section>/g, "").trim(), "");
  assert.ok(!html.includes('id="local"'));
  assert.ok(!html.includes('id="leave"'));
});

test("populated optional sections still render alongside the branded footer", () => {
  const html = renderToStaticMarkup(React.createElement(Guidebook, { property: { ...property, houseInfo: [{ title: "Heating", body: "Use the control" }], checkoutTasks: ["Close windows"] }, preview: true }));
  assert.ok(html.includes('id="howto"'));
  assert.ok(html.includes('id="leave"'));
  assert.ok(html.includes('alt="GuestSetGo"'));
});

const localPick = { id: "cafe", name: "Example Café", type: "Café", dest: "Example Café, High Street & Harbour", steps: ["Turn left at the gate."] };
const renderPick = (fields = {}, pick = localPick) => renderToStaticMarkup(React.createElement(Guidebook, { property: { ...property, address: "10 Sample Road, Kent", picks: [pick], ...fields }, preview: true }));
const mapUrl = (html) => new URL(html.match(/<section[^>]*id="local"[^>]*>([\s\S]*?)<\/section>/)[1].match(/href="(https:\/\/www.google.com\/maps\/dir\/[^\"]+)"/)[1].replaceAll("&amp;", "&"));

test("local picks expose A-to-B walking directions outside collapsed instructions", () => {
  const html = renderPick({ origin: "  Sample starting point  " });
  const url = mapUrl(html);
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("origin"), "Sample starting point");
  assert.equal(url.searchParams.get("destination"), localPick.dest);
  assert.equal(url.searchParams.get("travelmode"), "walking");
  const withoutDetails = html.replace(/<details\b[\s\S]*?<\/details>/g, "");
  assert.ok(withoutDetails.includes("Walking directions in Google Maps"));
  assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
});

test("walking directions use the property address by default and allow a missing starting point", () => {
  assert.equal(mapUrl(renderPick()).searchParams.get("origin"), "10 Sample Road, Kent");
  const html = renderPick({ address: "", origin: "" });
  assert.equal(mapUrl(html).searchParams.has("origin"), false);
  assert.ok(html.includes("Choose your starting point in Google Maps."));
});

test("a missing destination shows no broken Maps link and preserves written directions", () => {
  const html = renderPick({}, { ...localPick, dest: "  " });
  const local = html.match(/<section[^>]*id="local"[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.ok(!local.includes("https://www.google.com/maps/dir/"));
  assert.ok(html.includes("Turn left at the gate."));
});

test("arrival directions expose the precise entrance, landmark route and last turns before check-in", () => {
  const html = renderToStaticMarkup(React.createElement(Guidebook, { property: { ...property, arrivalLocation: "51.5,-0.12", arrivalLandmark: "Example Hotel, Sample Road", what3words: "///filled.count.soap", landmarkSteps: ["Keep the hotel behind you.", "Follow the road around the corner."] }, preview: true }));
  assert.ok(html.includes('href="#find"'));
  assert.ok(html.indexOf('id="find"') < html.indexOf('id="arrive"'));
  assert.ok(html.includes("Walking route from the landmark"));
  assert.ok(html.includes("Follow the road around the corner."));
  assert.ok(html.includes('href="https://what3words.com/filled.count.soap"'));
});

test("front-of-property photo appears in the welcome header with a useful alternative description", () => {
  const photo = { img: "https://firebasestorage.googleapis.com/v0/b/example/o/front.jpg?alt=media", alt: "White cottage with a green front door" };
  const html = renderToStaticMarkup(React.createElement(Guidebook, { property: { ...property, propertyPhoto: photo }, preview: true }));
  const header = html.match(/<header\b[\s\S]*?<\/header>/)[0];
  assert.ok(header.includes('class="gb-hero gb-hero-with-photo"'));
  assert.ok(header.includes('alt="White cottage with a green front door"'));
  assert.ok(header.includes("Front of the property"));
  const fallback = renderToStaticMarkup(React.createElement(Guidebook, { property: { ...property, propertyPhoto: { ...photo, alt: "" } }, preview: true }));
  assert.ok(fallback.includes('alt="Front of Empty sections test"'));
  const oldGuide = renderToStaticMarkup(React.createElement(Guidebook, { property, preview: true }));
  assert.ok(!oldGuide.includes("gb-property-photo"));
});
