import { redirect } from "next/navigation";

// Until the shell exists (F4) the root goes to the dev index.
export default function Home() {
  redirect("/dev");
}
