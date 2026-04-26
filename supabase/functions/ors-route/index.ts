import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("ORS_API_KEY");
  if (!apiKey) {
    return new Response("Missing ORS_API_KEY", { status: 500 });
  }

  const { from, to } = await req.json();

  const body = {
    coordinates: [
      [from.lon, from.lat],
      [to.lon, to.lat],
    ],
  };

  const orsRes = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!orsRes.ok) {
    const text = await orsRes.text();
    return new Response(`ORS Route error: ${text}`, { status: 500 });
  }

  const data = await orsRes.json();
  const feature = data.features?.[0];

  if (!feature) {
    return new Response("No route features returned", { status: 500 });
  }

  const summary = feature.properties?.summary ?? {};

  return new Response(
    JSON.stringify({
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
      geometry: feature.geometry.coordinates,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
