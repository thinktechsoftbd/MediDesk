export { default } from "next-auth/middleware";
export const config = { matcher: ["/dashboard/:path*","/patients/:path*","/cases/:path*","/prescriptions/:path*","/payments/:path*","/greetings/:path*","/security/:path*","/accounting/:path*","/settings/:path*","/profile/:path*","/follow-ups/:path*","/sms/:path*"] };
