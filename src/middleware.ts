import { withAuth } from "next-auth/middleware";

export default withAuth({});

export const config = {
  matcher: ["/courses/:path*", "/assignments/:path*", "/proofs/:path*"],
};


