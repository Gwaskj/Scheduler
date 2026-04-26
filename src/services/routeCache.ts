// src/services/routeCache.ts

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../ors-client";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface RouteData {
  distanceMeters: number;
  durationSeconds: number;
  geometry: any;
}

interface CacheEntry {
  timestamp: number;
  data: RouteData;
}

const CACHE_KEY = "ors-route-cache";
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();

// Persistent cache
function loadPersistent(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistent(cache: Record<string, CacheEntry>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

const persistentCache = loadPersistent();

// Create a stable key for two coordinates
function makeKey(from: LatLon, to: LatLon): string {
  return `${from.lat},${from.lon}->${to.lat},${to.lon}`;
}

// --------------------------------------
// Main function: getRoute()
// --------------------------------------
export async function getRoute(
  from: LatLon,
  to: LatLon
): Promise<RouteData> {
  const key = makeKey(from, to);

  // 1. Check memory cache
  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.timestamp < CACHE_TTL) {
    return mem.data;
  }

  // 2. Check persistent cache
  const stored = persistentCache[key];
  if (stored && Date.now() - stored.timestamp < CACHE_TTL) {
    memoryCache.set(key, stored);
    return stored.data;
  }

  // 3. Fetch from Supabase Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/ors-route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ from, to }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("ORS route error:", text);
    throw new Error("ORS route request failed");
  }

  const data: RouteData = await response.json();

  // 4. Save to both caches
  const entry: CacheEntry = {
    timestamp: Date.now(),
    data,
  };

  memoryCache.set(key, entry);
  persistentCache[key] = entry;
  savePersistent(persistentCache);

  return data;
}
