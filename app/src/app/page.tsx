import { redirect } from "next/navigation";

// Dev / test builds: the dev index (prototype gallery). Hosted builds have no /dev (compiled out), so the root is
// the app itself — the proxy sends a signed-out visitor on to /login (P10 review note).
export default function Home() {
  redirect(process.env.NEXT_PUBLIC_DEV_TOOLS === "1" ? "/dev" : "/bookings");
}
