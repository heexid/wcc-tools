import Link from "next/link";

export const metadata = { title: "Dev · prototype" };

const links = [
  { href: "/dev/tokens", label: "Tokens", note: "Every CIR variable, text style, effect and paint (F0)" },
  { href: "/dev/overlay?frame=bookings-01&route=/dev/tokens", label: "Overlay", note: "Figma PNG over a route — G4 gate" },
  { href: "/dev/reset", label: "Reset data", note: "Clear the mock data layer" },
];

export default function DevIndex() {
  return (
    <main className="flex flex-col gap-group p-section">
      <h1 className="text-heading-page">Prototype · dev</h1>
      <ul className="flex flex-col gap-compact">
        {links.map((l) => (
          <li key={l.href} className="flex gap-compact text-body">
            <Link href={l.href} className="text-text-accent underline">{l.label}</Link>
            <span className="text-text-secondary">{l.note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
