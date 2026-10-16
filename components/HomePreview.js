"use client";

import { useState } from "react";
import { PhotoGuide } from "@/components/Guidebook";
import { sampleProperty } from "@/lib/sample-guide";

export default function HomePreview({ interactive = false }) {
  const [selected, setSelected] = useState("heating");
  const guide = sampleProperty.photoGuides.find(g => g.id === selected);
  return <div className={`home-phone ${interactive ? "home-phone-interactive" : ""}`}>
    <div className="home-phone-speaker" aria-hidden="true" />
    <div className="home-phone-screen">
      <div className="home-phone-brand"><img src="/brand/guestsetgo-logo.png" alt="GuestSetGo" width="2172" height="724" /><span aria-hidden="true">☰</span></div>
      {interactive ? <>
        <div className="home-preview-tabs" role="group" aria-label="Choose a sample walkthrough">{sampleProperty.photoGuides.map(g => <button key={g.id} type="button" aria-pressed={selected === g.id} onClick={() => setSelected(g.id)}>{g.id === "kitchen" ? "Kitchen" : g.id === "hot-tub" ? "Hot tub" : "Heating"}</button>)}</div>
        <PhotoGuide g={guide} />
      </> : <>
        <img className="home-property-photo" src="/home/cottage.jpg" alt="A leafy holiday-home setting" width="800" height="533" />
        <div className="home-property-title"><span>YOUR STAY, MADE SIMPLE</span><h2>Rosewood Cottage</h2><p>Your guest guide</p></div>
        <nav className="home-guide-menu" aria-label="Preview the sample guide">
          {[["⌂", "Welcome", "arrive"], ["↗", "Getting here", "arrive"], ["⌁", "Wi-Fi", "wifi"], ["☀", "Heating & hot water", "g-heating"], ["♧", "Kitchen appliances", "g-kitchen"], ["≈", "Hot tub", "g-hot-tub"], ["✓", "Check-out", "leave"]].map(([icon, label, id]) => <a key={label} href={`/sample#${id}`}><span aria-hidden="true">{icon}</span>{label}<span aria-hidden="true">›</span></a>)}
        </nav>
      </>}
    </div>
  </div>;
}
