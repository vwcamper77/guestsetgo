import { handle, ok, requireUser, requireProperty, HttpError } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const SYSTEM = `You help holiday-let hosts write short guest instructions from a photo of something in their property (a remote control, fuse box, appliance, bin store, etc). Reply with JSON only, no other text: {"title": a short heading guests will read, "area": where in the property it is, "steps": an array of up to 4 short, plain, imperative instructions a guest can follow}. Base this on what's visible in the photo. If the host gave a note, treat it as the source of truth for anything the photo alone doesn't make clear.`;

export const POST = handle(async (req, { params }) => {
  const user = await requireUser(req);
  await requireProperty(user, params.id);

  const { imageUrl, note } = await req.json().catch(() => ({}));
  if (!imageUrl) throw new HttpError(400, "No photo to look at.");
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, "AI assist isn't set up yet.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: note ? `Host's note: ${note}` : "No extra note from the host." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error("OpenAI error", res.status, await res.text().catch(() => ""));
    throw new HttpError(502, "The AI assist didn't respond. Try again, or fill it in yourself.");
  }

  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    throw new HttpError(502, "The AI assist gave an unexpected reply. Try again.");
  }

  return ok({
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 80) : "",
    area: typeof parsed.area === "string" ? parsed.area.slice(0, 80) : "",
    steps: Array.isArray(parsed.steps) ? parsed.steps.filter((s) => typeof s === "string").slice(0, 4) : [],
  });
});
