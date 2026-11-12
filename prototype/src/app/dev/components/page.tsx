"use client";

import type { ReactNode } from "react";
import variants from "../../../../public/__figma__/specs/F01-variants.json";
import { Button, WarningButton } from "@/components/ds/Button";
import { InputField, SelectField } from "@/components/ds/InputField";
import { TextArea } from "@/components/ds/TextArea";
import { SearchField } from "@/components/ds/SearchField";
import { Checkbox } from "@/components/ds/Checkbox";
import { Tab, Tabs } from "@/components/ds/Tabs";
import { SegmentedControl } from "@/components/ds/SegmentedControl";
import { PageButton, PageNav, Pagination } from "@/components/ds/Pagination";
import { InvoiceTypeTag, PaymentStatusBadge, TrendBadge, type BookingStatus, type InvoiceType } from "@/components/ds/Badges";
import { Alert, Avatar, Toast } from "@/components/ds/Feedback";
import { MenuItem, MetricCard, ModalPanel, ShellPopover } from "@/components/ds/Surfaces";
import { TableFooter, TableToolbar } from "@/components/ds/Table";
import type { ForceState } from "@/components/ds/cn";

// Every Figma variant exported in F1 (public/__figma__/specs/F01-variants.json), rendered with the
// Figma sample content. tests/visual/F01.spec.ts screenshots each [data-figma] child and diffs it
// against public/__figma__/<file>.png. Shown next to the Figma image for eyeballing.

type V = (typeof variants)[number];
const p = (v: V, k: string) => (v.props as Record<string, string>)[k];
const force = (s?: string): ForceState | undefined =>
  s === "Hover" ? "hover" : s === "Pressed" ? "pressed" : s === "Focus" ? "focus" : undefined;
const noop = () => {};
const terms =
  "Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.";

function render(v: V): ReactNode {
  switch (v.set) {
    case "Button": {
      const variant = p(v, "Variant").toLowerCase() as "primary" | "secondary" | "ghost";
      const state = p(v, "State");
      const c = p(v, "Content");
      return (
        <Button
          variant={variant}
          forceState={force(state)}
          disabled={state === "Disabled"}
          loading={state === "Loading"}
          icon={c !== "Label" ? "plus" : undefined}
          iconOnly={c === "Icon only"}
          aria-label="Button"
        >
          Button
        </Button>
      );
    }
    case "Warning button":
      return (
        <WarningButton forceState={force(p(v, "State"))} disabled={p(v, "State") === "Disabled"}>
          Cancel booking
        </WarningButton>
      );
    case "Input field": {
      const type = p(v, "Type");
      const state = p(v, "State");
      const common = {
        label: "Label",
        required: true,
        forceFocus: state === "Focus",
        forceHover: state === "Hover",
        disabled: state === "Disabled",
        error: state === "Error" ? "Helper text" : undefined,
        className: "w-[calc(var(--spacing-64)*4+var(--spacing-48))]",
      };
      const filled = state === "Filled" || state === "Focus";
      if (type === "Select" || type === "Date")
        return <SelectField {...common} kind={type === "Date" ? "date" : "select"} value={filled ? "Value" : undefined} placeholder="Value" />;
      return <InputField {...common} type={type === "Password" ? "password" : "text"} placeholder="Value" defaultValue={filled ? "Value" : undefined} defaultRevealed={state === "Focus"} />;
    }
    case "Text area": {
      const state = p(v, "State");
      return (
        <TextArea
          label="Terms & Conditions"
          helper="Printed on every invoice for this booking"
          maxLength={255}
          placeholder="Write terms shown on the invoice…"
          defaultValue={state === "Default" || state === "Hover" ? "" : terms}
          error={state === "Error" ? "Max 255 characters" : undefined}
          forceFocus={state === "Focus"}
          forceHover={state === "Hover"}
          disabled={state === "Disabled"}
          className="w-[calc(var(--spacing-64)*5)]"
        />
      );
    }
    case "Search field": {
      const state = p(v, "State");
      return (
        <SearchField
          placeholder="Search Invoice Number or Client Name"
          defaultValue={state === "Default" || state === "Hover" ? "" : "INV-17"}
          forceFocus={state === "Focus"}
          forceHover={state === "Hover"}
          className="w-[calc(var(--spacing-64)*6+var(--spacing-48))]"
        />
      );
    }
    case "Checkbox": {
      const s = p(v, "State");
      return <Checkbox aria-label="Select" checked={s === "Checked"} indeterminate={s === "Indeterminate"} disabled={s === "Disabled"} readOnly />;
    }
    case "Tab": {
      const s = p(v, "State");
      return (
        <Tab active={s === "Active"} forceState={s === "Hover" ? "hover" : undefined}>
          Tab
        </Tab>
      );
    }
    case "Segmented control":
      return (
        <SegmentedControl
          label="Option"
          value={p(v, "Selected") === "First" ? "a" : "b"}
          onChange={noop}
          options={[
            { value: "a", label: "Option A" },
            { value: "b", label: "Option B" },
          ]}
          className="w-[calc(var(--spacing-64)*4+var(--spacing-4))]"
        />
      );
    case "Pagination item": {
      const s = p(v, "State");
      if (p(v, "Type") === "Page") return <PageButton active={s === "Active"}>1</PageButton>;
      return <PageNav disabled={s === "Disabled"}>{s === "Disabled" ? "Previous" : "Next"}</PageNav>;
    }
    case "Payment status badge": {
      const map: Record<string, BookingStatus> = { Draft: "draft", "Partially paid": "partially_paid", Paid: "paid", Canceled: "canceled" };
      return <PaymentStatusBadge status={map[p(v, "Status")]} info={false} />;
    }
    case "Invoice type tag":
      return <InvoiceTypeTag type={p(v, "Type").toLowerCase() as InvoiceType} />;
    case "Trend badge":
      return <TrendBadge value="4.6%" direction={p(v, "Direction") === "Up" ? "up" : "down"} tone={p(v, "Tone") === "Positive" ? "positive" : "negative"} />;
    case "Avatar":
      return <Avatar initials="BS" size={Number(p(v, "Size")) as 24 | 32 | 38} />;
    case "Alert":
      return (
        <Alert tone={p(v, "Tone").toLowerCase() as "danger"} title="Title" className="w-[calc(var(--spacing-64)*5+var(--spacing-32)+var(--spacing-8))]">
          Supporting message that explains what to do next.
        </Alert>
      );
    case "Toast":
      return <Toast tone={({ Success: "success", Info: "info", Error: "danger" } as const)[p(v, "Tone") as "Success" | "Info" | "Error"]}>Welcome back, bs.moment</Toast>;
    case "Metric card":
      return (
        <MetricCard
          label="Total Open Invoices"
          info="Total Open Invoices"
          icon="chart-analytics"
          value="Rp 133.540"
          trend={{ value: "4.6%", direction: "up", tone: "negative" }}
          period="last month"
          className="w-[calc(var(--spacing-64)*5+var(--spacing-6)/2)]"
        />
      );
    case "Modal":
      return (
        <ModalPanel
          title="Account Setting"
          footer={
            <>
              <Button variant="secondary">Cancel</Button>
              <Button>Save</Button>
            </>
          }
          className="w-[calc(var(--spacing-64)*10)]"
        >
          <h3 className="text-heading-section text-text-primary">Section title</h3>
          <InputField label="Label" required placeholder="Value" />
        </ModalPanel>
      );
    case "Shell/Popover":
      return (
        <ShellPopover title={p(v, "Header") === "True" ? "Title" : undefined} className="w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))]">
          <div className="flex h-[calc(var(--spacing-64)*2-var(--spacing-8))] w-full items-center justify-center rounded-6 border border-dashed border-accent-primary bg-accent-primary/6 text-caption text-text-accent">
            Swap content
          </div>
        </ShellPopover>
      );
    case "Menu item":
      return (
        <MenuItem
          icon="settings"
          tone={p(v, "Tone") === "Danger" ? "danger" : "default"}
          forceState={p(v, "State") === "Hover" ? "hover" : undefined}
          className="w-[calc(var(--spacing-64)*2+var(--spacing-24)+var(--spacing-6)/2)]"
        >
          Account Setting
        </MenuItem>
      );
    case "Table/Toolbar":
      return (
        <TableToolbar
          className="w-[calc(var(--spacing-64)*16-var(--spacing-24))]"
          start={<Tabs label="Status" value="all" onChange={noop} items={[{ value: "all", label: "All" }, { value: "open", label: "Open" }, { value: "paid", label: "Paid" }]} />}
          end={
            <>
              <Button variant="secondary" icon="trash" className="[&>svg]:text-status-danger">
                Delete
              </Button>
              <Button variant="secondary" icon="check">
                Paid
              </Button>
            </>
          }
        />
      );
    case "Table/Footer":
      return <TableFooter className="w-[calc(var(--spacing-64)*16-var(--spacing-24))]" summary="Showing 1-10 of 1085 invoices" pagination={<Pagination page={1} pages={109} onPage={noop} />} />;
    default:
      return null; // Table/Header, Table/Row: invoice-module sample content — covered by Booking table (F9)
  }
}

export default function ComponentsPage() {
  const sets = [...new Set(variants.map((v) => v.set))];
  return (
    <main data-transparent-page className="flex flex-col gap-section p-section">
      <h1 className="text-heading-page">CIR components · F1</h1>
      {sets.map((set) => (
        <section key={set} className="flex flex-col gap-base">
          <h2 className="text-heading-section">{set}</h2>
          <div className="flex flex-col items-start gap-group">
            {variants
              .filter((v) => v.set === set)
              .map((v) => {
                const node = render(v);
                if (!node) return null;
                return (
                  <figure key={v.file} className="flex flex-col gap-compact">
                    <figcaption className="text-micro text-text-secondary">{v.variant}</figcaption>
                    <div data-figma={v.file} className="flex w-fit">
                      {node}
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/__figma__/${v.file}.png`} alt="" className="block w-fit opacity-40" />
                  </figure>
                );
              })}
          </div>
        </section>
      ))}
    </main>
  );
}
