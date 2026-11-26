// Two tabs, two accounts: sign-in and sign-out happen on the server (cookies), so another tab isn't told. This tab
// remembers the account it shows; when the browser's session belongs to somebody else, it reloads, so nothing of the
// previous account stays on screen (SHARED-DATABASE-PLAN §3 item 12, test 11).
// The database refuses the old account's data either way; this is about what is already on the screen.
const CHANNEL = "wcc-account";
let expected = false;

/** This tab is signing in or out itself: its own navigation follows, so it must not reload. */
export function expectAccountChange() {
  expected = true;
}

/** Tell the other tabs to check now (they also check by themselves). */
export function announceAccountChange() {
  try {
    const c = new BroadcastChannel(CHANNEL);
    c.postMessage("changed");
    c.close();
  } catch {}
}

/** Watch while a signed-in screen is shown. Returns the stop function. */
export function watchAccount(current: () => string | null, reload: () => void = () => window.location.reload()): () => void {
  const mine = current();
  expected = false;
  if (!mine) return () => {}; // not signed in: the session gate handles it
  const check = () => {
    if (expected || current() === mine) return;
    // An unsaved form must not keep the previous account's page open: hide it and skip its "Leave site?" question.
    document.documentElement.style.visibility = "hidden";
    window.addEventListener("beforeunload", (e) => e.stopImmediatePropagation(), { capture: true });
    reload();
  };
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = check;
  } catch {}
  const timer = setInterval(check, 5_000);
  window.addEventListener("focus", check);
  window.addEventListener("pageshow", check);
  document.addEventListener("visibilitychange", check);
  return () => {
    channel?.close();
    clearInterval(timer);
    window.removeEventListener("focus", check);
    window.removeEventListener("pageshow", check);
    document.removeEventListener("visibilitychange", check);
  };
}
