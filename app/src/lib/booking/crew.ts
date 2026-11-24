// Crew picker options, shared by the booking form and both crew filters. The signed-in person comes first as
// "Name (You)"; chips, avatars and schedules keep the plain name.
import type { Crew } from "@/lib/data/types";

/** Pickable crew: active ones, plus any already selected. `label` is for option rows only. */
export function crewOptions(crew: Crew[], selected: string[], myId: string | null): (Crew & { label: string })[] {
  const isMe = (c: Crew) => !!myId && c.userId === myId;
  const rows = crew.filter((c) => c.isActive || selected.includes(c.id)).map((c) => ({ ...c, label: isMe(c) ? `${c.name} (You)` : c.name }));
  return [...rows.filter(isMe), ...rows.filter((c) => !isMe(c))];
}
