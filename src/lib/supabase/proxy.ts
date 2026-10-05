import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

const APP_PREFIXES = ["/dashboard", "/journal", "/plan", "/rules", "/analytics", "/playbook", "/review", "/settings"];

export async function updateSession(request: NextRequest) {
  const isApp = APP_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  const isDemo = request.cookies.get("plumb-demo")?.value === "1";

  if (!isSupabaseConfigured) {
    // Without a Supabase project the app runs on demo data only.
    if (isApp && !isDemo) {
      const res = NextResponse.redirect(new URL(request.nextUrl.pathname, request.url));
      res.cookies.set("plumb-demo", "1", { path: "/", sameSite: "lax" });
      return res;
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Refreshes the session token. Do not run code between createServerClient and this call.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (isApp && !user && !isDemo) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
