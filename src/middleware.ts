import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth();

  const url = request.nextUrl;

  if (!session && url.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && (url.pathname === "/login" || url.pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};
