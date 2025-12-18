import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const userAgent = request.headers.get("user-agent") || "";

  const blockedAgents = [
    "Instagram",
    "FBAN", // Facebook App
    "FBAV", // Facebook App
    "Line", // LINE App
    "Twitter", // Twitter in-app browser
    "TikTok", // TikTok in-app browser
    "Snapchat", // Snapchat in-app browser
  ];

  const isBlocked = blockedAgents.some((agent) => userAgent.includes(agent));
  if (isBlocked) {
    const redirectURL = new URL("/unsupported-browser", request.url);
    return NextResponse.redirect(redirectURL);
  }

  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (request.nextUrl.pathname.startsWith("/_next/static")) {
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!_next|favicon.ico|unsupported-browser).*)"],
};
