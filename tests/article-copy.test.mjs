import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { articleBodyLines, articleLinks, articles } from "../lib/editorial.mjs";
import { articleStructuredData } from "../lib/seo.mjs";

function approvedLines(markdown) {
  const body = markdown.replaceAll("\r\n", "\n").replace(/^---[\s\S]*?---\n/, "");
  const lines = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line || line === "---" || line.startsWith("# ")) continue;
    const text = line
      .replace(/^#{2,3}\s+/, "")
      .replace(/^- /, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1");
    lines.push(text);
  }
  return lines;
}

test("holiday let information pack keeps the approved British English copy", () => {
  const article = articles.find((item) => item.slug === "holiday-let-information-pack-template");
  const markdown = readFileSync(new URL("./fixtures/holiday-let-information-pack-template.md", import.meta.url), "utf8");
  assert.equal(article.title, "Holiday let information pack template: what to include (UK)");
  assert.equal(article.description, "A practical holiday let information pack template for UK hosts: the sections guests need, the safety details official guidance expects, and how to keep it up to date.");
  assert.equal(article.kicker, "The practical host series · 03");
  assert.deepEqual(articleBodyLines(article), approvedLines(markdown));
  assert.deepEqual(articleLinks(article), [
    ["/blog/diy-holiday-let-welcome-book", "making a holiday let welcome book yourself"],
    ["https://www.gov.uk/guidance/letting-out-a-self-catering-holiday-home-in-england-rules-and-regulations", "letting out a self-catering holiday home in England"],
    ["/vs/paper-welcome-folder", "paper welcome folder comparison page"],
    ["/blog/convert-welcome-folder-to-digital-guide", "how to convert a welcome folder into a digital guide"],
    ["/sample", "Explore the sample guide"],
  ]);
  const graph = articleStructuredData({
    headline: article.title,
    description: article.description,
    path: `/blog/${article.slug}`,
    date: article.published,
    wordCount: 1200,
    image: { url: `/editorial/${article.image}`, width: article.imageWidth, height: article.imageHeight },
    faqs: article.faqs,
    kinds: ["Article", "BlogPosting"],
    breadcrumbs: [["Home", "/"], ["Journal", "/blog"], [article.title, `/blog/${article.slug}`]],
  });
  assert.deepEqual(graph["@graph"].map((node) => node["@type"]), [["Article", "BlogPosting"], "FAQPage", "BreadcrumbList"]);
  assert.equal(graph["@graph"][0].datePublished, "2026-11-16");
  assert.equal(graph["@graph"][0].image.url, "https://www.guestsetgo.com/editorial/holiday-let-information-pack-template.jpg");
  assert.deepEqual(graph["@graph"][1].mainEntity.map((question) => question.name), article.faqs.map(([question]) => question));
  assert.equal(graph["@graph"][2].itemListElement.at(-1).item, "https://www.guestsetgo.com/blog/holiday-let-information-pack-template");
});
