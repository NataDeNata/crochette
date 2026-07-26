import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login"]);
const PUBLIC_ACCOUNT_PATHS = new Set(["/account/login", "/account/signup"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.has(pathname) && role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  if (pathname.startsWith("/account") && !PUBLIC_ACCOUNT_PATHS.has(pathname) && role !== "customer") {
    return NextResponse.redirect(new URL("/account/login", req.url));
  }
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
