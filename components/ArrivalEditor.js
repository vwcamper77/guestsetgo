"use client";
import { Text, StringList } from "./editors";
import ArrivalDirections from "./ArrivalDirections";
import { arrivalDestination, arrivalValidation } from "@/lib/arrival.mjs";

export default function ArrivalEditor({ property, onChange }) {
  const issue = arrivalValidation(property);
  const hasDetails = arrivalDestination(property) || property.arrivalLandmark || property.what3words || property.landmarkSteps?.length;
  return <div className="arrival-editor">
    <h2>Help guests find the property</h2>
    <p className="small muted">A postcode can lead to the wrong road or entrance. Add the exact entrance and explain the last few turns from a recognisable landmark.</p>
    <Text label="Property entrance — full address or coordinates" value={property.arrivalLocation} onChange={v => onChange({ arrivalLocation: v })} placeholder="Full address, or latitude, longitude" hint="Optional: defaults to the address in Basics. To pinpoint an entrance, right-click it on Google Maps and copy the latitude and longitude. Check the pin before sharing." />
    <Text label="what3words entrance location (optional)" value={property.what3words} onChange={v => onChange({ what3words: v })} placeholder="///word.word.word or a what3words.com address link" hint="Use the three words for the same entrance. This opens what3words; it does not automatically convert the words into Google Maps coordinates." />
    <a className="small" href="https://what3words.com/" target="_blank" rel="noopener noreferrer">Find your entrance on what3words ↗</a>
    <Text label="Nearby landmark — starting point (A)" value={property.arrivalLandmark} onChange={v => onChange({ arrivalLandmark: v })} placeholder="e.g. Harbour Hotel, High Street, town and postcode" hint="Use a specific name and address so Google Maps starts at the right place. The final approach route is on foot." />
    <StringList label="From the landmark to your door, step by step" items={property.landmarkSteps || []} onChange={v => onChange({ landmarkSteps: v })} addLabel="Add a direction" placeholder="e.g. With the hotel behind you, turn right and follow the road around the corner." />
    {issue && <p className="error" role="alert">{issue}</p>}
    {!issue && hasDetails ? <div className="panel"><h3>Check what guests will see</h3><ArrivalDirections property={property} /></div> : !hasDetails && <p className="notice">Add an entrance location or your property address to enable the Google Maps buttons.</p>}
  </div>;
}
