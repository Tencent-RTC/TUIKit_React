/**
 * Tiny module-level flag that lets a component announce "I'm about to
 * call `logout()` on purpose" so the global login-status watcher can
 * distinguish user-initiated logout from an SDK-driven kick-offline.
 *
 * Why not sessionStorage / localStorage: the signal only needs to
 * survive across React components inside the same tab lifetime; a
 * plain module-level flag is enough and avoids leaving stale keys
 * behind when the tab closes.
 *
 * Consumer contract:
 *   - Before calling `logout()`, invoke `markLogoutIntent()`.
 *   - The `useGlobalEventDialogs` hook calls `consumeLogoutIntent()`
 *     on every `loginStatus: success → idle/error` transition; if
 *     the flag is set, it clears it and suppresses the "kicked
 *     offline" alert. Otherwise it treats the transition as an SDK
 *     kick and shows the dialog.
 *
 * The flag is single-shot: `consume*` reads AND clears in one
 * operation so a later real kick cannot silently borrow the same
 * intent.
 *
 * Safety net: `markLogoutIntent` schedules an auto-clear after a
 * generous delay (5 s). In the happy path the hook consumes the
 * flag inside the loginStatus change useEffect that fires after
 * the async logout() resolves and triggers a store update +
 * re-render, so the auto-clear runs after the flag is already
 * cleared and is a no-op. In the unlikely path where `logout()`
 * throws before status updates or the observing hook is not
 * mounted at that moment, the auto-clear still wipes the flag so
 * the *next* real kick-offline event cannot silently borrow this
 * stale intent. A longer timeout (instead of the previous 0 ms)
 * is chosen because `TUILogin.logout()` is async and the entire
 * "logout → status update → React re-render → useEffect flush"
 * sequence needs time to complete before the flag is cleared.
 */
let logoutIntent = false;

/** Signal an imminent user-initiated logout. */
export function markLogoutIntent(): void {
  logoutIntent = true;
  // Fallback auto-clear — see module docstring. Use a generous delay
  // (5 seconds) so the flag survives across the async logout() call
  // and the subsequent React re-render + useEffect flush cycle.
  // Previously `setTimeout(0)` caused a race: the macrotask auto-clear
  // fired before the async `TUILogin.logout()` resolved and triggered
  // the status change, so `consumeLogoutIntent()` always returned false
  // and the "kicked offline" dialog showed on every manual logout.
  // Guarded on `typeof setTimeout` so this module remains importable in
  // hypothetical non-browser test environments without side effects.
  if (typeof setTimeout === 'function') {
    setTimeout(() => {
      logoutIntent = false;
    }, 5000);
  }
}

/** Read + clear the flag. Returns `true` if a user logout was pending. */
export function consumeLogoutIntent(): boolean {
  if (logoutIntent) {
    logoutIntent = false;
    return true;
  }
  return false;
}
