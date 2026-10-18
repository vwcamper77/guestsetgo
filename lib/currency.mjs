// Fixed local price books. Stripe Price IDs, not these display values, determine charges.
export const PRICE_BOOKS = Object.freeze({
  GBP: Object.freeze({ hostMonthly: 6, hostAnnual: 60, agencyMonthly: 4, assisted: 79, minimumAgency: 20, annualSaving: 12 }),
  USD: Object.freeze({ hostMonthly: 8, hostAnnual: 80, agencyMonthly: 5, assisted: 99, minimumAgency: 25, annualSaving: 16 }),
});

export function normaliseCurrency(value) {
  return value === "USD" ? "USD" : "GBP";
}

export function priceBook(value) {
  return PRICE_BOOKS[normaliseCurrency(value)];
}

export function money(value, valueCurrency = "GBP") {
  const currency = normaliseCurrency(valueCurrency);
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-GB", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(value);
}

// Marketing copy originally authored in GBP. Replace only known price figures;
// never do a live FX conversion or imply that the card will be charged in GBP.
const USD_MAP = { 139: 179, 79: 99, 60: 80, 20: 25, 12: 16, 6: 8, 4: 5 };
export function localisePrices(text, currency = "GBP") {
  if (typeof text !== "string" || normaliseCurrency(currency) === "GBP") return text;
  return text.replace(/£(139|79|60|20|12|6|4)(?!\d)/g, (_, amount) => "$" + USD_MAP[amount]);
}
