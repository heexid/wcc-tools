"use client";

import { useState } from "react";
import { Button } from "@/components/ds/Button";
import { Checkbox } from "@/components/ds/Checkbox";
import { InputField } from "@/components/ds/InputField";
import { SearchField } from "@/components/ds/SearchField";
import { SegmentedControl } from "@/components/ds/SegmentedControl";
import { Tabs } from "@/components/ds/Tabs";
import { TextArea } from "@/components/ds/TextArea";
import { Toast } from "@/components/ds/Feedback";
import { ModalPanel, ShellPopover } from "@/components/ds/Surfaces";
import { usePresence } from "@/components/ds/usePresence";

// Interactive F1 primitives for tests/e2e/F01.spec.ts and manual feel-checks of the overlay motion.
export default function InteractionsPage() {
  const [tab, setTab] = useState<"calendar" | "table">("calendar");
  const [seg, setSeg] = useState<"dp" | "full">("dp");
  const [checked, setChecked] = useState(false);
  const [modal, setModal] = useState(false);
  const [pop, setPop] = useState(false);
  const [toast, setToast] = useState(false);
  const m = usePresence(modal);
  const p = usePresence(pop);
  const t = usePresence(toast);
  return (
    <main className="flex flex-col items-start gap-group p-section">
      <h1 className="text-heading-page">F1 · interactions</h1>
      <Tabs label="View" value={tab} onChange={setTab} items={[{ value: "calendar", label: "Calendar" }, { value: "table", label: "Table" }]} />
      <output data-testid="tab">{tab}</output>
      <SegmentedControl label="Invoice type" value={seg} onChange={setSeg} options={[{ value: "dp", label: "DP" }, { value: "full", label: "Full price" }]} className="w-[calc(var(--spacing-64)*4+var(--spacing-4))]" />
      <output data-testid="seg">{seg}</output>
      <label className="flex items-center gap-compact text-body">
        <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} /> Raka Pratama
      </label>
      <InputField label="Password" type="password" defaultValue="secret12" className="w-[calc(var(--spacing-64)*5)]" />
      <SearchField placeholder="Search bookings" className="w-[calc(var(--spacing-64)*6)]" />
      <div className="w-[calc(var(--spacing-64)*5)]" data-testid="terms">
        <TextArea label="Terms & Conditions" maxLength={20} helper="Printed on every invoice" />
      </div>
      <div className="w-[calc(var(--spacing-64)*5)]" data-testid="desc">
        <TextArea label="Description" maxLength={20} pasteOverflow="cut" />
      </div>
      <div className="flex gap-compact">
        <Button onClick={() => setModal(true)}>Open modal</Button>
        <Button variant="secondary" onClick={() => setPop((v) => !v)}>Toggle popover</Button>
        <Button variant="ghost" onClick={() => setToast((v) => !v)}>Toggle toast</Button>
        <Button loading>Saving</Button>
      </div>
      {p.mounted && (
        <ShellPopover presence={p.presence} title="Crew" onClose={() => setPop(false)} className="w-[calc(var(--spacing-64)*6)]">
          <p className="text-body">Popover content</p>
        </ShellPopover>
      )}
      {t.mounted && (
        <Toast presence={t.presence} className="fixed bottom-group left-section">
          Booking saved
        </Toast>
      )}
      {m.mounted && (
        <div className="fixed inset-0 flex items-center justify-center">
          <ModalPanel presence={m.presence} title="Cancel this booking?" onClose={() => setModal(false)} footer={<Button variant="secondary" onClick={() => setModal(false)}>Keep booking</Button>} className="w-[calc(var(--spacing-64)*8)]">
            <p className="text-body">Body</p>
          </ModalPanel>
        </div>
      )}
    </main>
  );
}
