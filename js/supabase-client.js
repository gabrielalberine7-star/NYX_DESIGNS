import { PUBLIC_CONFIG } from "./config.js";

let clientPromise;
const signedUrlCache = new Map();

export function hasSupabaseConfig() {
  return Boolean(PUBLIC_CONFIG.supabaseUrl && PUBLIC_CONFIG.supabaseAnonKey);
}

export async function getSupabaseClient() {
  if (!hasSupabaseConfig()) return null;
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2.52.1?bundle")
      .then(({ createClient }) => createClient(PUBLIC_CONFIG.supabaseUrl, PUBLIC_CONFIG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      }));
  }
  return clientPromise;
}

export async function getSignedAsset(storagePath, expiresIn = 3600) {
  if (!storagePath) return "";
  const cached = signedUrlCache.get(storagePath);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  const client = await getSupabaseClient();
  if (!client) return "";
  const { data, error } = await client.storage.from("portfolio").createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  signedUrlCache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000 });
  return data.signedUrl;
}

export function clearSignedAsset(storagePath) {
  if (storagePath) signedUrlCache.delete(storagePath);
}

export function getPublicConfig() {
  return PUBLIC_CONFIG;
}
