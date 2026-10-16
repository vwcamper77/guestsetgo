import test from "node:test";
import assert from "node:assert/strict";
import { arrivalLinks, arrivalValidation, what3wordsAddress } from "../lib/arrival.mjs";

test("arrival URLs preserve exact coordinates and route from the named landmark", () => {
  const links = arrivalLinks({ arrivalLocation: " 51.5, -0.12 ", address: "Old address", arrivalLandmark: "Harbour Hotel & Café, Sample Road" });
  assert.equal(new URL(links.map).searchParams.get("query"), "51.5, -0.12");
  const route = new URL(links.landmarkRoute);
  assert.equal(route.searchParams.get("origin"), "Harbour Hotel & Café, Sample Road");
  assert.equal(route.searchParams.get("destination"), "51.5, -0.12");
  assert.equal(route.searchParams.get("travelmode"), "walking");
  assert.equal(new URL(links.directions).searchParams.has("origin"), false);
});

test("old properties fall back to their address and missing details create no empty links", () => {
  assert.equal(arrivalLinks({ address: "Sample Cottage, Kent" }).destination, "Sample Cottage, Kent");
  const links = arrivalLinks({});
  for (const field of ["map", "directions", "landmarkRoute", "what3words"]) assert.equal(links[field], "");
});

test("what3words accepts three-word addresses and official links but never arbitrary URLs", () => {
  for (const value of ["///filled.count.soap", "filled.count.soap", "https://what3words.com/filled.count.soap?share=true"]) assert.equal(what3wordsAddress(value), "filled.count.soap");
  for (const value of ["javascript:alert(1)", "https://evil.example/filled.count.soap", "https://what3words.com.evil.example/filled.count.soap", "https://what3words.com@evil.example/filled.count.soap", "https://what3words.com/filled.count.soap/extra", "two.words", "51.5,-0.12"]) assert.equal(what3wordsAddress(value), "");
});

test("invalid entrance coordinates and what3words inputs produce actionable validation", () => {
  for (const value of ["91,0", "0,181", "12,", "12,1.2.3"]) assert.match(arrivalValidation({ arrivalLocation: value }), /coordinates/);
  assert.match(arrivalValidation({ arrivalLocation: "https://maps.app.goo.gl/example" }), /rather than a Maps link/);
  assert.match(arrivalValidation({ what3words: "one.word" }), /three words/);
  assert.equal(arrivalValidation({ arrivalLocation: "0,0", what3words: "///filled.count.soap" }), "");
  assert.equal(arrivalValidation({}), "");
});
