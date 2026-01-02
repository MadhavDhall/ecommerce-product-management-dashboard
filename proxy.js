import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;


  // If trying to access /dashboard without a valid token, redirect to /login
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/login") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // check if token is valid jwt token 
  // const verifyToken = jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  //   if (err) {
  //     return null;
  //   }
  //   return decoded;
  // });

  // if (pathname.startsWith("/dashboard/manageUsers") && !verifyToken.manageUsers) {
  //   // redirect to the previous url or /dashboard if no referrer
  //   const referer = request.headers.get("referer");
  //   return NextResponse.redirect(new URL(referer || "/dashboard", request.url));
  // }

  return NextResponse.next();
}

// Limit middleware to routed paths only (exclude static assets, favicon, etc.)
export const config = {
  matcher: [
    // Match everything except Next.js internals and common static assets
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|apple-touch-icon.png|icon.png).*)",
    // Also exclude requests ending with common file extensions
    // Note: Negative lookahead can't check end-of-string reliably in Next matchers,
    // so prefer listing known excludes above. Keep this single pattern for broad coverage.
  ],
};