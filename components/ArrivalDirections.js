import { arrivalLinks } from "@/lib/arrival.mjs";

export default function ArrivalDirections({ property }) {
  const links = arrivalLinks(property);
  return <div className="arrival-directions">
    {links.destination && <>
      <p><b>{property.arrivalLocation ? "Property entrance" : "Property address"}</b><br />{links.destination}</p>
      <div className="btnrow"><a className="btn solid" href={links.directions} target="_blank" rel="noopener noreferrer">Get directions in Google Maps ↗</a><a className="btn" href={links.map} target="_blank" rel="noopener noreferrer">View location pin ↗</a></div>
    </>}
    {links.what3words && <div className="gnote"><b>what3words entrance location</b><br /><a href={links.what3words} target="_blank" rel="noopener noreferrer">///{links.words} ↗</a></div>}
    {links.landmark && <div className="arrival-landmark">
      <h3>From the nearby landmark</h3>
      <ol className="arrival-waypoints"><li><span aria-hidden="true">A</span><div><b>Start here</b><p>{links.landmark}</p></div></li><li><span aria-hidden="true">B</span><div><b>{property.name || "Your holiday home"}</b><p>{links.destination || "Follow the host's directions below."}</p></div></li></ol>
      {links.landmarkRoute && <a className="btn solid" href={links.landmarkRoute} target="_blank" rel="noopener noreferrer">Walking route from the landmark ↗</a>}
    </div>}
    {!!property.landmarkSteps?.length && <div><h3>The last few turns</h3><ol className="gsteps">{property.landmarkSteps.map((step, i) => <li key={i}>{step}</li>)}</ol></div>}
  </div>;
}
