"use client";
import Link from "next/link";
import { PLANS, ASSISTED } from "@/lib/plans";
import { localisePrices, money, priceBook } from "@/lib/currency.mjs";
import { useCurrency } from "./CurrencyProvider";

export function LocalisedText({ text }) {
  const { currency } = useCurrency();
  return localisePrices(text, currency);
}

export function PricingFaqs({ faqs }) {
  const { currency } = useCurrency();
  return faqs.map(([question, answer]) => <details className="acc" key={question}>
    <summary>{question}</summary>
    <div className="acc-body">{localisePrices(answer, currency)}</div>
  </details>);
}

export function LandingPricing() {
  const { currency } = useCurrency();
  const prices = priceBook(currency);
  return <>
    <div className="grid2">
      {Object.values(PLANS).map((pl) => (
        <div className={`ticket ${pl.id === "host" ? "feature" : ""}`} key={pl.id}>
          {pl.id === "host" && <span className="flag">Most hosts</span>}
          <h3>{pl.name}</h3>
          <div className="amount">{localisePrices(pl.price, currency)}</div>
          <p>{localisePrices(pl.summary, currency)}</p>
          <ul>{pl.features.map((f) => <li key={f}>{localisePrices(f, currency)}</li>)}</ul>
          <Link className={`btn ${pl.id === "host" ? "solid" : ""}`} href={`/signup?next=${encodeURIComponent(`/dashboard/billing?plan=${pl.id}`)}`}>Choose {pl.name}</Link>
        </div>
      ))}
    </div>
    <aside className="conversion-offer" aria-label="Optional welcome folder conversion">
      <span className="k">Optional one-time service · not a hosting plan</span>
      <h3>Welcome folder conversion</h3>
      <div className="amount">{localisePrices(ASSISTED.price, currency)}</div>
      <p>{localisePrices(ASSISTED.description, currency)}</p>
      <p><b>One-property example:</b> {money(prices.assisted, currency)} conversion + {money(prices.hostAnnual, currency)} annual hosting = <b>{money(prices.assisted + prices.hostAnnual, currency)} for the first year</b>. Hosting then renews at {money(prices.hostAnnual, currency)}/year until cancelled. Or choose {money(prices.hostMonthly, currency)}/month hosting. Build the guide yourself and you only pay for hosting after your trial.</p>
      <ul><li>Document uploads unlock only after the {money(prices.assisted, currency)} payment</li><li>One batch of up to eight folder-page, brochure or card photos</li><li>AI conversion and preparation help; you approve the draft</li></ul>
      <div><Link className="btn" href="/signup?next=%2Fdashboard">Choose optional folder conversion</Link></div>
    </aside>
  </>;
}
