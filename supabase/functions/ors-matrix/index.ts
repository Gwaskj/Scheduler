import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("ORS_API_KEY");
  if (!apiKey) {
    return new Response("Missing ORS_API_KEY", { status: 500 });
  }

  const { from, tos } = await req.json();

  const locations = [
    [from.lon, from.lat],
    ...tos.map((t) => [t.lon, t.lat]),
  ];

  const body = {
    locations,
    metrics: ["duration", "distance"],
    units: "m",
  };

  const orsRes = await fetch(
    "https://api.openrouteservice.org/v2/matrix/driving-car",
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
    return new Response(`ORS Matrix error: ${text}`, { status: 500 });
  }

  const data = await orsRes.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
