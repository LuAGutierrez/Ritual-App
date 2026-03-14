---
name: frontend-couples-debugging
description: Debug and fix issues in frontend projects using native HTML, CSS, TailwindCSS, vanilla JS/TypeScript, and Supabase. Enforces root-cause analysis, issue classification, responsive-first (320px–1024px+), and clean code. Use when fixing bugs, layout issues, async/Supabase errors, or when working on the couples games responsive site.
---

# Frontend Couples — Debugging & Responsive

Stack: **Native HTML, CSS, TailwindCSS, Vanilla JavaScript/TypeScript, Supabase.**  
Scope: responsive site with games for couples. Tone: **senior-level, strict on clean code and scalability.**

---

## 1. Root cause before fix

- **Never** apply a fix without identifying and stating the **root cause**.
- Reproduce or reason from stack trace / DOM / network; then fix.
- If the cause is unclear, narrow it (log, breakpoint, isolate component) until it is clear.

---

## 2. Issue classification

Classify every issue into **one** (or note multiple) of:

| Type | Meaning | Typical checks |
|------|--------|----------------|
| **Logic error** | Wrong condition, off-by-one, wrong state update | Branching, initial state, event order |
| **Async error** | Race, unhandled promise, missing await | async/await, `.then`/`.catch`, order of operations |
| **Supabase issue** | Client, RLS, env, auth, or query | Env vars, auth state, null/undefined from API |
| **DOM rendering issue** | Element missing/wrong, listener on wrong node, timing | DOM existence, lifecycle, event delegation |
| **Responsive/layout issue** | Breakpoints, overflow, touch targets | Viewport widths, flex/grid, min-width/max-width |
| **Tailwind conflict** | Specificity, order, missing class, custom CSS override | Class order, `@layer`, arbitrary values |

State the classification in the response (e.g. "**Classification:** Async error + Supabase issue").

---

## 3. Responsive-first development

- **Target widths:** 320px, 375px, 768px, 1024px+ (must work at all).
- Design and implement for the **smallest** width first, then enhance with `sm:`, `md:`, `lg:` as needed.
- After any layout change, mentally or explicitly validate at 320px and 375px (no horizontal scroll, readable text, usable buttons).

---

## 4. Layout rules — no hacks

**Forbidden unless explicitly justified (e.g. fixed aspect-ratio for a known asset):**

- `overflow-x: hidden` to “fix” horizontal scroll (fix the cause: overflowing element or bad width).
- Fixed widths (e.g. `w-[600px]`) without a clear reason.
- Fixed heights that cut off or overflow content.

**Required:**

- No horizontal scroll at any target viewport.
- Buttons/tap targets: minimum ~44px height/width (thumb-friendly).
- Text: allow wrapping; avoid long unbreakable strings; use `min-w-0` on flex/grid children that contain text.
- Flex/Grid: use `min-w-0` / `min-h-0` where shrinking is needed; avoid `flex-shrink-0` without justification.

---

## 5. Supabase debugging checklist

When the issue involves Supabase:

1. **Environment:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or equivalent) present and correct for the environment.
2. **Async:** All Supabase calls in `async` functions with `await`; no unhandled promises (use try/catch or `.catch()`).
3. **Null/undefined:** Handle `data`/`error` and empty arrays; guard before `.map`/property access.
4. **Auth:** Check `getSession()` / `onAuthStateChange` before relying on user; handle signed-out and loading.
5. **Errors:** Log or handle `error` from every Supabase response; avoid silent failures.

---

## 6. Output format for every fix

Provide:

1. **Root cause:** One or two sentences describing why the bug happens.
2. **Classification:** One or more of the six types above.
3. **Corrected code:** Minimal, clean change (no unrelated edits).
4. **Why it works:** Short explanation linking the fix to the root cause.
5. **Responsive validation:** “Checked at 320 / 375 / 768 / 1024” and any caveat (e.g. “no change on layout”).
6. **Edge cases:** Null, empty list, offline, auth expired, very long text, etc., if relevant.

---

## 7. Code quality

- Prefer clarity and consistency with the rest of the project over cleverness.
- One clear responsibility per function; names that reflect intent.
- No speculative code or “future-proof” layers; only what the fix and the product need.
- Align with project conventions (e.g. one JS per page, no logic in HTML, existing Tailwind usage).
