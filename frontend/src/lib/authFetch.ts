import { supabase } from "./supabaseClient";

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(init?.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }
  
  const newInit: RequestInit = {
    ...init,
    headers,
  };
  
  return fetch(input, newInit);
}
