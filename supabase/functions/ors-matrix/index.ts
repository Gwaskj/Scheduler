import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  // --- CORS Preflight ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  const apiKey = Deno.env.get("ORS_API_KEY");
  if (!apiKey) {
    return new Response("Missing ORS_API_KEY", {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const bodyJson = await req.json();
    const { from, tos } = bodyJson;

    // --- Validate input ---
    if (!from || typeof from.lon !== "number" || typeof from.lat !== "number") {
      return new Response(
        JSON.stringify({ error: "Invalid 'from' object" }),
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    if (!Array.isArray(tos) || tos.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid 'tos' array" }),
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const locations = [
      [from.lon, from.lat],
      ...tos.map((t) => [t.lon, t.lat]),
    ];

    const orsBody = {
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
        body: JSON.stringify(orsBody),
      }
    );

    if (!orsRes.ok) {
      const text = await orsRes.text();
      return new Response(
        JSON.stringify({ error: `ORS Matrix error: ${text}` }),
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const data = await orsRes.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
