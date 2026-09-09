export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/devos/:path*",
    "/admin/:path*",
    // Protege também o dashboard principal se necessário
    "/dashboard/:path*",
  ],
};
