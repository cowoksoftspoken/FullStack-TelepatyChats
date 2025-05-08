import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  if (request.nextUrl.pathname.startsWith("/_next/static")) {
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  }

  return response;
}

export const config = {
  matcher: ["/", "/((?!_next/image|favicon.ico).*)"],
};
