// src/ors-client.ts

export const SUPABASE_URL = "https://oedkdgfnkrfupuwcroqt.supabase.co";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------- MATRIX ----------
export async function getMatrix(
  from: { lat: number; lon: number },
  tos: { lat: number; lon: number }[]
) {
  const url = `${SUPABASE_URL}/functions/v1/ors-matrix`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ from, tos }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Matrix error:", text);
    throw new Error("Matrix API error");
  }

  const data = await res.json();

  if (!data.durations || !data.distances) {
    throw new Error("Matrix returned incomplete data");
  }

  return data;
}
