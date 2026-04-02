# Accessibility Audit Report
**Date:** 2026-03-15 22:58:43  
**Environment:** Preview  
**URL:** https://courtcraft5759.builtwithrocket.new  
**Standard:** WCAG 2.1 Level AA  

---

## Audit Results

- **Violations:** 1 (5 nodes)
- **Passes:** 21
- **Incomplete (needs manual review):** 1

---

## Violations Found

### 1. Color Contrast — `color-contrast` (WCAG 2.1 SC 1.4.3 — Level AA)
**Impact:** Serious  
**File:** `src/components/Footer.tsx`

All failing elements share a dark navy background (`#0a1628`). Required contrast ratio: **4.5:1** (small text).

| Element | Line | Foreground | Contrast | Required |
|---------|------|-----------|----------|----------|
| `<p>` tagline | 23–25 | `#6c737e` (white/40%) | 3.79:1 | 4.5:1 ❌ |
| `<a>` Privacy link | 62 | `#545c69` (white/30%) | 2.68:1 | 4.5:1 ❌ |
| `<a>` Terms link | 64 | `#545c69` (white/30%) | 2.68:1 | 4.5:1 ❌ |
| `<a>` Disclaimer link | 66 | `#545c69` (white/30%) | 2.68:1 | 4.5:1 ❌ |
| `<p>` copyright | 68–70 | `#47505e` (white/25%) | 2.22:1 | 4.5:1 ❌ |

**Root cause:** Tailwind `text-white text-opacity-{25|30|40}` classes produce insufficient contrast against the `#0a1628` navy background.

**Fix applied:** Increased all three opacity levels to `text-opacity-60` (~`#8b9099` on `#0a1628` ≈ 5.2:1 contrast), which passes WCAG AA.

---

## Incomplete (Manual Review Needed)

### 1. Color Contrast on Dynamic/Interactive Elements
The axe engine flagged one incomplete check on interactive elements that change state (hover/focus). Manually verify that hover states (e.g., `hover:text-gold-400`) also maintain 4.5:1 contrast. Gold `#d4a017` on `#0a1628` ≈ 7.1:1 — **passes**.

---

## Passing Checks (21)

The following WCAG criteria passed automatically:
- `aria-allowed-attr` — ARIA attributes used correctly
- `aria-hidden-body` — body not aria-hidden
- `aria-required-children` / `aria-required-parent` — ARIA role hierarchy correct
- `bypass` — skip navigation mechanism present
- `document-title` — page has a descriptive title
- `duplicate-id-active` / `duplicate-id-aria` — no duplicate IDs
- `frame-title` — iframes titled
- `html-has-lang` — `<html lang>` set
- `html-lang-valid` — lang attribute is valid
- `image-alt` — images have alt text
- `input-image-alt` — input images have alt text
- `landmark-one-main` — single main landmark
- `meta-refresh` — no auto-refresh
- `meta-viewport` — viewport not locked
- `nested-interactive` — no nested interactive elements
- `presentation-role-conflict` — no role conflicts
- `region` — content in landmark regions
- `scope-attr-valid` — table scope attributes valid
- `scrollable-region-focusable` — scrollable regions focusable
- `select-name` — selects have accessible names
- `svg-img-alt` — SVG images have alt text

---

## Summary of Changes Made

| File | Change |
|------|--------|
| `src/components/Footer.tsx` line 23 | `text-opacity-40` → `text-opacity-60` |
| `src/components/Footer.tsx` line 68 | `text-opacity-25` → `text-opacity-60` |
| `src/components/Footer.tsx` line 68 (nav links container) | `text-opacity-30` → `text-opacity-60` |
