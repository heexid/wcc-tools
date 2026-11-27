import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ds/Button";
import { Icon, type IconName } from "@/components/ds/Icon";
import { cn } from "@/components/ds/cn";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { LiquidBackground } from "@/components/login/LiquidBackground";
import { LandingMotion } from "./LandingMotion";
import { LandingNav } from "./LandingNav";
import { Videos } from "./Videos";
import { Chip, Container, GET_STARTED_HREF, Glow, IconTile, LOGIN_HREF, SECTION_LINKS, SectionIntro, Shot } from "./parts";

// CIR marketing landing page — Figma "bs internal tools" › Landing Page:
//   LP-D · Desktop 1440 (231:80481) · LP-T · Tablet 768 (231:83416) · LP-M · Mobile 390 (231:82968).
// Desktop-first like the app: base classes are the 1440 design, max-desktop: (< 1280) the tablet frame and
// max-tablet: (< 768) the phone frame. Product visuals are the Figma screenshots in public/assets/landing.
// Copy rules (marketing): no full stops, never "spreadsheet", partial payment instead of DP.

export function LandingPage() {
  return (
    <div className="lp relative flow-root overflow-x-clip bg-surface-default">
      {/* Hero background: the login page's animated liquid gradient + grain (Figma: "Hero background" image fill) */}
      <div aria-hidden className="absolute inset-x-0 top-0 isolate h-(--lp-hero-bg) overflow-hidden">
        <LiquidBackground />
      </div>
      <LandingMotion />
      <LandingNav />
      <main>
        <Hero />
        <TrustedBy />
        <WhyCir />
        <BookingForm />
        <Invoices />
        <Trust />
        <Videos />
        <FaqSection />
      </main>
      <FinalCtaAndFooter />
    </div>
  );
}

/* ── 01 · Hero + product look ──────────────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative pb-[calc(var(--spacing-48)+var(--spacing-4))] max-desktop:pb-48">
      <Container>
        {/* LP-D: headline at 128 / 250, copy block right (ends 48 in); LP-T / LP-M: stacked */}
        <div className="flex items-start justify-between px-48 pt-[calc(var(--spacing-64)*2+var(--spacing-48))] max-desktop:flex-col max-desktop:items-start max-desktop:px-0 max-desktop:pt-[calc(var(--spacing-48)+var(--spacing-6))] max-tablet:pt-[calc(var(--spacing-32)+var(--spacing-12))]">
          <h1 id="hero-title" data-hero className="text-marketing-display text-text-primary">
            Every booking
            <br />
            Every schedule
            <br />
            One place
          </h1>
          <div
            data-hero
            className="mt-[calc(var(--spacing-32)+var(--spacing-8)+var(--spacing-2))] flex w-[calc(var(--spacing-64)*6+var(--spacing-16))] flex-col items-start gap-24 max-desktop:mt-24 max-desktop:w-[calc(var(--spacing-64)*8+var(--spacing-48))] max-tablet:mt-16 max-tablet:w-full"
          >
            {/* Figma: Inter Regular 18/28 (no DS style that size) */}
            <p className="text-[length:calc(var(--spacing-16)+var(--spacing-2))] leading-[calc(var(--spacing-24)+var(--spacing-4))] text-text-primary">
              Bookings, packages, payments and invoices in one place, with totals that add up themselves
            </p>
            <ButtonLink href={GET_STARTED_HREF} size="lg" className="max-tablet:w-full">
              Start your first booking
            </ButtonLink>
            <p className="text-caption text-text-primary">Free setup by our team</p>
          </div>
        </div>

        {/* Product window · Bookings dashboard (LP-D 1280 × 802, LP-T 720 × 451) */}
        <div
          data-hero
          data-hero-window
          className="mt-[calc(var(--spacing-64)+var(--spacing-24)+var(--spacing-6))] overflow-hidden rounded-sheet border border-border-default bg-surface-default shadow-floating max-desktop:mt-48 max-tablet:hidden"
        >
          <Shot
            src="/assets/landing/dashboard@2x.png"
            alt="CIR Bookings dashboard: monthly bookings, outstanding balance, the November calendar and the next seven days"
            width={2560}
            height={1600}
            sizes="(min-width: 1440px) 1280px, calc(100vw - 48px)"
            className="w-full"
            eager
          />
        </div>

        {/* LP-M: Phone · M01 Bookings list (280 × 520, centred) */}
        <div data-hero data-hero-window className="mx-auto mt-[calc(var(--spacing-32)+var(--spacing-8))] hidden w-[calc(var(--spacing-64)*4+var(--spacing-24))] max-tablet:block">
          <div className="h-[calc(var(--spacing-64)*8+var(--spacing-8))] overflow-hidden rounded-[calc(var(--spacing-24))] border border-border-default bg-surface-default shadow-floating">
            <Shot
              src="/assets/landing/phone-m01@3x.png"
              alt="CIR Bookings list on a phone: bookings with their status and remaining balance"
              width={840}
              height={1560}
              sizes="280px"
              className="w-full"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 01b · Trusted by ──────────────────────────────────────────────────────────────────────────────────────────── */

// Figma: 4 placeholder organisations (layer names say "(placeholder)") until real customers are confirmed.
const ORGS = [
  { name: "Ayu Lestari", org: "Kirana Wedding" },
  { name: "Bima Prakoso", org: "Lumbung Events" },
  { name: "Citra Maharani", org: "Sekar Studio" },
  { name: "Dimas Aditya", org: "Arunika Planner" },
];

function TrustedBy() {
  return (
    <section aria-label="Trusted by" className="bg-surface-default">
      <div className="mx-auto flex max-w-(--spacing-layout-page-width) items-center gap-16 px-64 py-48 max-desktop:items-start max-desktop:px-24 max-tablet:flex-col max-tablet:gap-24 max-tablet:px-16">
        <p
          data-reveal
          className="w-[calc(var(--spacing-64)*4-var(--spacing-16))] shrink-0 pt-8 text-body-strong text-text-secondary max-desktop:w-[calc(var(--spacing-64)*3+var(--spacing-16))] max-tablet:w-full max-tablet:pt-0 max-tablet:text-body"
        >
          Trusted by wedding &amp; event organizers like you
        </p>
        <ul className="grid flex-1 grid-cols-4 gap-16 max-desktop:grid-cols-2 max-desktop:gap-y-24 max-tablet:w-full">
          {ORGS.map((o) => (
            <li key={o.org} data-reveal className="flex min-w-0 items-center gap-12">
              {/* DS Asset/Logo placeholder (40 × 40) */}
              <span aria-hidden className="size-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 rounded-control border border-dashed border-border-strong bg-surface-subtle" />
              <span className="flex min-w-0 flex-col">
                <span className="text-caption-strong text-text-primary">{o.name}</span>
                <span className="text-caption text-text-secondary">from {o.org}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 02 · Why CIR ──────────────────────────────────────────────────────────────────────────────────────────────── */

const WHY: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "wallet", title: "Totals that add themselves", body: "Package, items and quantities add up as you type" },
  { icon: "receipt", title: "Partial payments, recorded", body: "Record what the client has paid, and the booking stays Partially paid until the balance is settled" },
  { icon: "package", title: "Prices stay as agreed", body: "Change a package price and existing bookings keep the price they were booked at" },
  { icon: "calendar", title: "One calendar for the team", body: "Every booking, its crew and balance by month, week or day" },
  { icon: "files", title: "Nothing lost in chat", body: "Client, location, notes and terms live on the booking" },
  { icon: "download", title: "Invoices ready to send", body: "A branded A4 PDF with your payment instructions, in one click" },
];

function WhyCir() {
  return (
    <section id="why-cir" aria-labelledby="why-title" className="pt-(--lp-section-y)">
      <Container>
        <SectionIntro id="why-title" chip="Why CIR" icon="circle-help" title="Know where every rupiah is">
          CIR brings bookings, prices and invoices out of scattered chats and into one place
        </SectionIntro>

        {/* Stage: LP-D 1280 × 590 · LP-T 720 × 460 · LP-M 358 × 328, surface/accent + two glows (blur 180) */}
        <div data-reveal className="relative mt-64 h-[590px] overflow-hidden rounded-sheet bg-surface-accent max-desktop:h-[460px] max-tablet:h-[328px]">
          <Glow className="top-[260px] left-[-160px] h-[520px] w-[900px] opacity-60 blur-[90px] max-tablet:top-[140px] max-tablet:left-[-120px] max-tablet:h-[260px] max-tablet:w-[450px]" />
          <Glow tone="accent" className="top-[-200px] left-[760px] h-[420px] w-[700px] opacity-20 blur-[90px] max-desktop:right-[-400px] max-desktop:left-auto max-tablet:top-[-120px] max-tablet:right-[-110px] max-tablet:h-[210px] max-tablet:w-[350px]" />
          <div data-stage-screen className="absolute top-64 left-1/2 w-[1000px] -translate-x-1/2 overflow-hidden rounded-t-card shadow-floating max-desktop:top-[40px] max-desktop:w-[620px] max-tablet:hidden">
            <Shot
              src="/assets/landing/new-booking@2x.png"
              alt="New booking form with the live booking summary: Gold Package, three additional items and a total of Rp 12.500.000"
              width={2000}
              height={1120}
              sizes="(min-width: 1280px) 1000px, 620px"
              className="w-full"
            />
          </div>
          <div data-stage-screen className="absolute top-[28px] left-1/2 hidden w-[240px] -translate-x-1/2 overflow-hidden rounded-t-card shadow-floating max-tablet:block">
            <Shot src="/assets/landing/m05@3x.png" alt="New booking form on a phone" width={720} height={900} sizes="240px" className="w-full" />
          </div>
        </div>

        <ul className="mt-32 grid grid-cols-3 gap-24 max-desktop:grid-cols-2 max-tablet:grid-cols-1 max-tablet:gap-12">
          {WHY.map((c) => (
            <li
              key={c.title}
              data-reveal
              className="flex flex-col rounded-card border border-border-default bg-surface-default p-24 pb-32 max-tablet:flex-row max-tablet:gap-16 max-tablet:p-20"
            >
              <IconTile icon={c.icon} />
              <div className="mt-[calc(var(--spacing-32)+var(--spacing-4))] flex flex-col gap-12 max-tablet:mt-0 max-tablet:gap-tight">
                <h3 className="text-heading-panel text-text-primary max-tablet:text-heading-section">{c.title}</h3>
                <p className="text-body text-text-secondary">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/* ── 03 · Book it in one form ──────────────────────────────────────────────────────────────────────────────────── */

function BookingForm() {
  return (
    <section id="bookings" aria-labelledby="form-title" className="py-(--lp-section-y)">
      <Container className="flex items-center gap-64 max-desktop:flex-col max-desktop:items-stretch max-desktop:gap-[calc(var(--spacing-32)+var(--spacing-8))] max-tablet:gap-32">
        <div className="flex w-[calc(var(--spacing-64)*8-var(--spacing-12))] shrink-0 flex-col items-start gap-16 max-desktop:w-full">
          <div data-reveal>
            <Chip icon="calendar">Bookings</Chip>
          </div>
          <h2 id="form-title" data-reveal className="text-marketing-heading text-text-primary">
            Book it in one form,
            <br className="max-tablet:hidden" /> with the total always right
          </h2>
          <p data-reveal className="text-mobile-body text-text-secondary">
            Client, package, items, date and crew in one form, with the total updating as you type
          </p>
        </div>

        {/* Visual: LP-D 716 × 380 / LP-T 720 × 380 (absolute), LP-M stacked (summary, then items) */}
        <div className="relative h-[380px] flex-1 max-desktop:w-full max-desktop:flex-none max-desktop:max-w-[720px] max-tablet:flex max-tablet:h-auto max-tablet:flex-col max-tablet:gap-16">
          <div
            data-reveal
            data-float="summary"
            className="absolute top-[40px] left-[336px] z-1 w-[380px] rounded-card border border-border-default bg-surface-default p-[10px] shadow-floating max-desktop:left-[340px] max-tablet:static max-tablet:w-full max-tablet:p-8"
          >
            <Shot
              src="/assets/landing/summary@2x.png"
              alt="Booking summary: Gold Package Rp 10.000.000, three additional items Rp 2.500.000, total Rp 12.500.000"
              width={720}
              height={312}
              sizes="(min-width: 768px) 360px, calc(100vw - 50px)"
              className="w-full"
            />
          </div>
          <div data-reveal data-float="items" className="absolute top-[150px] left-0 w-[360px] max-tablet:static max-tablet:w-full">
            <Shot
              src="/assets/landing/items@2x.png"
              alt="Additional items: extra hour, printed album and guest photobooth, each with price, quantity and subtotal"
              width={720}
              height={334}
              sizes="(min-width: 768px) 360px, calc(100vw - 32px)"
              className="w-full"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ── 04 · Invoices ─────────────────────────────────────────────────────────────────────────────────────────────── */

function FeatureColumn({ chip, icon, title, body, children, className }: { chip: string; icon: IconName; title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-16", className)}>
      <div data-reveal>
        <Chip icon={icon}>{chip}</Chip>
      </div>
      <h2 data-reveal className="text-marketing-heading text-text-primary">
        {title}
      </h2>
      <p data-reveal className="text-mobile-body text-text-secondary">
        {body}
      </p>
      <div data-reveal className="mt-24 w-full">
        {children}
      </div>
    </div>
  );
}

function Invoices() {
  return (
    <section id="invoices" aria-label="Invoices and PDFs" className="pb-(--lp-section-y)">
      <Container className="grid grid-cols-2 max-desktop:grid-cols-1">
        <FeatureColumn
          chip="Invoices"
          icon="receipt"
          title="Invoices that stay true"
          body="Record each payment as an invoice that never changes, so edits never rewrite history"
          className="border-r border-border-default pr-48 max-desktop:border-r-0 max-desktop:border-b max-desktop:pr-0 max-desktop:pb-48 max-tablet:pb-[calc(var(--spacing-32)+var(--spacing-8))]"
        >
          <div className="flex h-[380px] justify-center overflow-hidden rounded-card border border-border-default bg-surface-subtle px-24 pt-24 max-tablet:h-[300px]">
            <Shot
              src="/assets/landing/invoices@2x.png"
              alt="Invoices (3): INV-2026-0219, INV-2026-0201 and INV-2026-0187, each with what was paid after it and a Download PDF button"
              width={1000}
              height={818}
              sizes="(min-width: 768px) 500px, 310px"
              className="w-[500px] max-tablet:w-[310px]"
            />
          </div>
        </FeatureColumn>
        <FeatureColumn
          chip="PDF"
          icon="download"
          title="Professional PDFs in one click"
          body="A4 invoices with your logo, business details, payment instructions and terms"
          className="pl-48 max-desktop:pt-48 max-desktop:pl-0 max-tablet:pt-[calc(var(--spacing-32)+var(--spacing-8))]"
        >
          <div className="relative flex h-[380px] justify-center overflow-hidden rounded-card bg-surface-accent pt-[40px] max-tablet:h-[320px] max-tablet:pt-32">
            <Glow className="top-[180px] left-0 h-[360px] w-[520px] opacity-70 blur-[80px] max-tablet:top-[150px] max-tablet:h-[300px] max-tablet:w-full" />
            <Shot
              src="/assets/landing/pdf@2x.png"
              alt="Invoice PDF INV-2026-0187: business header, client, items, this payment Rp 5.000.000 and the remaining balance"
              width={600}
              height={814}
              sizes="(min-width: 768px) 300px, 220px"
              className="relative w-[300px] rounded-control shadow-floating max-tablet:w-[220px]"
            />
          </div>
        </FeatureColumn>
      </Container>
    </section>
  );
}

/* ── 05 · Built to keep the numbers honest ─────────────────────────────────────────────────────────────────────── */

function TrustCard({ visual, title, body, className }: { visual: ReactNode; title: string; body: string; className?: string }) {
  return (
    <li data-reveal className={cn("flex flex-col items-center gap-12 rounded-card border border-border-default bg-surface-default px-24 py-32 text-center", className)}>
      <div className="flex min-h-[72px] flex-wrap items-center justify-center gap-8 max-tablet:min-h-0">{visual}</div>
      <h3 className="mt-4 text-heading-section text-text-primary">{title}</h3>
      <p className="text-body text-text-secondary">{body}</p>
    </li>
  );
}

function TokenChip({ icon, children }: { icon: IconName; children: string }) {
  return (
    <span className="inline-flex items-center gap-8 rounded-pill bg-surface-accent px-16 py-8 text-body-strong text-text-accent">
      <Icon name={icon} className="size-icon-md" />
      {children}
    </span>
  );
}

function AttentionChip({ tone, children }: { tone: "danger" | "warning"; children: string }) {
  return (
    <span className={cn("inline-flex items-center gap-tight rounded-pill px-12 py-6 text-caption-strong text-text-primary", tone === "danger" ? "bg-surface-danger" : "bg-surface-warning")}>
      <Icon name="triangle-alert" className={cn("size-icon-sm", tone === "danger" ? "text-status-danger" : "text-status-warning")} />
      {children}
    </span>
  );
}

function Member({ initials, role }: { initials: string; role: string }) {
  return (
    <span className="inline-flex items-center gap-8 rounded-pill border border-border-default bg-surface-default py-6 pr-12 pl-6">
      <span className="flex size-[calc(var(--spacing-24)+var(--spacing-4))] items-center justify-center rounded-full bg-brand-avatar text-micro text-text-inverse">{initials}</span>
      <span className="text-body-strong text-text-primary">{role}</span>
    </span>
  );
}

function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="bg-surface-subtle py-(--lp-section-y)">
      <Container>
        <div className="flex flex-col items-center text-center">
          <div data-reveal>
            <Chip icon="circle-check">Trust</Chip>
          </div>
          <h2 id="trust-title" data-reveal className="mt-16 text-marketing-heading text-balance">
            <span className="block text-text-primary">Built to keep the numbers honest</span>
            <span className="block text-text-secondary">So you can stop double-checking</span>
          </h2>
          <p data-reveal className="mt-16 text-mobile-body text-balance text-text-secondary">
            Exact amounts, permanent invoices and sessions that end at midnight WIB
          </p>
        </div>

        <ul className="mt-64 grid grid-cols-3 gap-24 max-desktop:grid-cols-2 max-tablet:grid-cols-1">
          <TrustCard visual={<TokenChip icon="circle-check">Rp 12.500.000</TokenChip>} title="Exact, down to the Rupiah" body="Whole Rupiah, calculated on the server with no rounding" />
          <TrustCard visual={<TokenChip icon="receipt">INV-2026-0187</TokenChip>} title="Invoices never change" body="Each invoice is a snapshot that later edits never change" />
          <TrustCard
            className="max-desktop:col-span-2 max-tablet:col-span-1"
            visual={
              <>
                <AttentionChip tone="danger">Balance due today</AttentionChip>
                <AttentionChip tone="warning">Balance before event</AttentionChip>
              </>
            }
            title="Needs attention, flagged for you"
            body="Balances due today and partially paid bookings this week, flagged on the dashboard"
          />
        </ul>

        <div className="mt-16 grid grid-cols-[760fr_496fr] gap-24 max-desktop:grid-cols-1">
          {/* Big tile · Know what is due (760 × 600; LP-M 358 × 470) */}
          <div data-reveal className="relative h-[600px] overflow-hidden rounded-card border border-border-default bg-surface-accent max-tablet:h-[470px]">
            <Glow className="top-[320px] left-[-120px] h-[400px] w-[700px] opacity-60 blur-[80px] max-tablet:w-[350px] max-tablet:h-[200px]" />
            <Glow tone="accent" className="top-[-160px] right-[-160px] h-[320px] w-[500px] opacity-15 blur-[80px] max-tablet:w-[250px] max-tablet:h-[160px]" />
            <div className="relative mx-auto flex max-w-[520px] flex-col items-center px-24 pt-48 text-center max-tablet:pt-32">
              <IconTile icon="calendar" className="size-[calc(var(--spacing-32)+var(--spacing-12))] shadow-card" />
              <h3 className="mt-16 text-heading-section text-text-primary">Know what is due at a glance</h3>
              <p className="mt-8 text-body text-text-secondary">The next seven days, each booking&apos;s status and what is still owed</p>
            </div>
            <div
              data-float="upcoming"
              className="absolute top-[240px] left-1/2 h-[400px] w-[360px] -translate-x-1/2 overflow-hidden rounded-card border border-border-default bg-surface-default p-20 shadow-floating max-tablet:top-[208px] max-tablet:h-[320px] max-tablet:w-[288px] max-tablet:p-16"
            >
              <Shot
                src="/assets/landing/upcoming@2x.png"
                alt="Upcoming: Graduation Aulia today, Rp 1.750.000 due; Family Session Hartono today, Draft; Wedding Sari and Dimas on Thursday, Rp 7.500.000 due"
                width={640}
                height={878}
                sizes="(min-width: 768px) 320px, 256px"
                className="w-full"
              />
            </div>
          </div>

          <ul className="flex flex-col gap-24 max-desktop:flex-row max-tablet:flex-col">
            <TrustCard
              className="flex-1 justify-center"
              visual={
                <span aria-hidden className="flex h-search-height w-[320px] max-w-full items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-pill border border-border-default bg-surface-default px-control text-ui-input text-text-secondary">
                  <Icon name="search" className="size-icon-sm" />
                  <span className="truncate">Search booking, client or phone</span>
                </span>
              }
              title="Find anything in seconds"
              body="Search by client, booking or phone, and filter by status, crew, package or date"
            />
            <TrustCard
              className="flex-1 justify-center"
              visual={
                <>
                  <Member initials="AD" role="Admin" />
                  <Member initials="CR" role="Crew" />
                </>
              }
              title="Built for your team"
              body="Admins edit, and crew see bookings and invoices read only"
            />
          </ul>
        </div>
      </Container>
    </section>
  );
}

/* ── 07 · FAQ ──────────────────────────────────────────────────────────────────────────────────────────────────── */

function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-surface-subtle py-(--lp-section-y)">
      <Container className="flex flex-col items-center gap-64">
        <div className="flex w-[360px] max-w-full flex-col items-center gap-16 text-center">
          <h2 id="faq-title" data-reveal className="text-marketing-heading text-text-primary">
            Questions, answered
          </h2>
        </div>
        <Faq />
      </Container>
    </section>
  );
}

/* ── 08 · Final CTA + Footer (animated grainy liquid background, like the hero) ──────────────────────────────────────────────────────── */

function FinalCtaAndFooter() {
  return (
    <div className="relative isolate overflow-hidden">
      {/* Same animated liquid gradient + grain as the hero (Figma: "Background · grainy gradient" glows + noise) */}
      <LiquidBackground />
      <Container className="relative z-1 pt-(--lp-section-y)">
        <FinalCta />
      </Container>
      <footer data-reveal="group" className="relative z-1 flex flex-col gap-64 pt-64">
        <nav aria-label="Footer" className="flex flex-col items-center gap-32">
          <FooterColumn title="Product" links={SECTION_LINKS.map((l) => [l.label, l.href])} />
          <FooterColumn title="Company" links={[["Log in", LOGIN_HREF]]} />
        </nav>
        {/* Figma "Bottom bar": page margin 32 · 24 · 16; stacked and centred on phones */}
        <div data-reveal-item className="flex items-center justify-between gap-12 px-32 pb-32 max-desktop:px-(--lp-gutter) max-desktop:pb-24 max-tablet:flex-col max-tablet:gap-8 max-tablet:pb-32 max-tablet:text-center">
          <p className="text-heading-panel text-text-primary max-tablet:text-mobile-heading-module">Clarity for every invoice</p>
          <p className="text-caption text-text-primary">© 2026 CIR · WCC &amp; ECC</p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div data-reveal-item className="flex flex-col items-center gap-12 text-center">
      <p className="text-body-strong text-text-primary">{title}</p>
      <ul className="flex flex-col items-center gap-12">
        {links.map(([label, href]) => (
          <li key={label}>
            {href.startsWith("#") ? (
              <a href={href} className="lp-link block text-body text-text-primary">
                {label}
              </a>
            ) : (
              <Link href={href} className="lp-link block text-body text-text-primary">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
