const CANONICAL_ORIGIN = "https://www.guestsetgo.com";

const PATH_REDIRECTS = [
  ["/demo", "/sample"],
  ["/demo.html", "/sample"],
  ["/pricing", "/#pricing"],
  ["/faq", "/#faq"],
  ["/faqs", "/#faq"],
  ["/journal", "/blog"],
  ["/compare", "/vs"],
  ["/comparisons", "/vs"],
  ["/favicon.ico", "/icon.svg"],
  ["/apple-touch-icon.png", "/icon.svg"],
  ["/apple-touch-icon-precomposed.png", "/icon.svg"],
];

function publicRedirects() {
  return [
    ...PATH_REDIRECTS.map(([source, destination]) => ({
      source,
      destination: destination.startsWith("/#") ? `${CANONICAL_ORIGIN}${destination}` : destination,
      permanent: true,
    })),
    { source: "/", has: [{ type: "host", value: "guestsetgo.com" }], destination: CANONICAL_ORIGIN, permanent: true },
    { source: "/:path+", has: [{ type: "host", value: "guestsetgo.com" }], destination: `${CANONICAL_ORIGIN}/:path+`, permanent: true },
  ];
}

module.exports = { publicRedirects, CANONICAL_ORIGIN, PATH_REDIRECTS };
