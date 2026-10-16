const text = (value) => typeof value === "string" ? value.trim() : "";

export function what3wordsAddress(value) {
  let words = text(value);
  if (/^https?:\/\//i.test(words)) {
    try {
      const url = new URL(words);
      if (!["what3words.com", "www.what3words.com"].includes(url.hostname) || url.username || url.password || url.port) return "";
      words = decodeURIComponent(url.pathname.slice(1));
    } catch { return ""; }
  }
  words = words.replace(/^\/{3}/, "").replace(/\/$/, "");
  return /^[\p{L}]+\.[\p{L}]+\.[\p{L}]+$/u.test(words) ? words.toLowerCase() : "";
}

export function arrivalDestination(property) {
  return text(property.arrivalLocation) || text(property.address);
}

export function arrivalValidation(property) {
  const location = text(property.arrivalLocation);
  if (/https?:\/\//i.test(location)) return "For the entrance location, enter a full address or latitude, longitude rather than a Maps link.";
  if (/^[-+\d.\s]*,[-+\d.\s]*$/.test(location)) {
    const parts = location.split(",").map(v => v.trim());
    const [lat, lng] = parts.map(Number);
    if (parts.some(v => !v) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "Enter valid coordinates: latitude from -90 to 90, longitude from -180 to 180.";
  }
  if (text(property.what3words) && !what3wordsAddress(property.what3words)) return "Enter three words separated by dots, such as ///word.word.word, or a full what3words.com address link.";
  return "";
}

export function arrivalLinks(property) {
  const destination = arrivalDestination(property);
  const landmark = text(property.arrivalLandmark);
  const words = what3wordsAddress(property.what3words);
  const directions = new URLSearchParams({ api: "1", destination });
  const route = new URLSearchParams({ api: "1", origin: landmark, destination, travelmode: "walking" });
  return {
    destination, landmark, words,
    map: destination ? `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query: destination })}` : "",
    directions: destination ? `https://www.google.com/maps/dir/?${directions}` : "",
    landmarkRoute: destination && landmark ? `https://www.google.com/maps/dir/?${route}` : "",
    what3words: words ? `https://what3words.com/${encodeURIComponent(words)}` : "",
  };
}
