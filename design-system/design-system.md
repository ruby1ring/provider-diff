# Noctua Design System

> v2.0 — Ollama-inspired refresh
> Scope: Web (responsive) + Desktop (Electron)
> Audience: AI engineers, developers, DevOps, technical evaluators

A re-optimized system for **Noctua**, the LLM provider compatibility tester. v2 moves from a
dark, high-saturation "tech utility" look to a clean, **light-first, near-monochrome**
aesthetic: calm ink on warm white, the owl's blue reserved as a single accent, and color
spent only where the data earns it.

---

## 1. Principles

1. **Light-first, ink on warm white.** White surfaces, hairline borders, generous air around
   chrome. A refined dark theme is kept as secondary (`data-theme="dark"`).
2. **One accent: owl blue.** Primary actions are **ink black** (like Ollama's buttons). Blue
   (`--accent`) is for links, focus rings, and selection — never decoration.
3. **Airy chrome, dense data.** Nav, cards and headers breathe; tables and JSON stay compact
   and tabular for real comparison work.
4. **Status earns its color.** Green / amber / red / gray appear only on results — accepted,
   warning, rejected, n/a.
5. **Restraint.** No gradient fills, no shadow abuse, no oversized marketing type. The content
   and the data lead.

---

## 2. Color

All colors are OKLch and semantic. Light is default; dark overrides under `[data-theme="dark"]`
(and follows the OS when no theme is set). See `tokens.css` for exact values.

### Foundation (light)
| Token | Role |
|-------|------|
| `--bg` | App canvas — faint warm gray |
| `--surface` | Cards, panels (white) |
| `--surface-2` | Inset wells, table headers |
| `--elevated` | Popovers, modals |
| `--fg` / `--fg-muted` / `--fg-subtle` | Three ink levels |
| `--border` / `--border-strong` / `--border-subtle` | Hairlines, inputs, inner separators |

### Ink (primary surfaces / buttons)
`--ink`, `--ink-hover`, `--ink-active`, `--on-ink` — the near-black used for primary buttons and
strong surfaces. In dark mode ink inverts to near-white.

### Accent (owl blue)
`--accent`, `--accent-hover`, `--accent-active`, `--accent-fg`, `--accent-subtle`, `--accent-ring`.
Budget: at most ~2 accent uses per screen. Never a large fill or gradient.

### Status
Each status ships `*`, `*-bg`, `*-text`, `*-subtle`:
`--status-success` (accepted), `--status-warning` (warning), `--status-danger` (rejected),
`--status-info` (running), `--status-neutral` (n/a). Tinted backgrounds for pills; solid for dots
and bars. Never use a status background as a block fill.

### Code syntax / diff
`--syntax-key|string|number|bool|null|punct|comment` for JSON, and `--diff-add|del|mod` (+ `-bg`)
for structural diffs. Missing/extra fields → red; type mismatch → amber.

---

## 3. Typography

| Use | Family |
|-----|--------|
| UI / display | **Hanken Grotesk** → system sans fallback |
| Code / data | **JetBrains Mono** → ui-monospace fallback |

Root size 15px. Scale: `--text-2xs` 11 · `--text-xs` 12 · `--text-sm` 13 · `--text-base` 14 ·
`--text-md` 15 · `--text-lg` 17 · `--text-xl` 21 · `--text-2xl` 27 · `--text-3xl` 36.
Weights 400/500/600/700/800. Numbers and data use `font-variant-numeric: tabular-nums`.
Tables/JSON stay at `--text-xs`; UI headings never exceed `--text-2xl` in tool views.

---

## 4. Spacing · Radius · Elevation

- **Spacing** — 4px grid: `--space-1`…`--space-20` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80).
- **Radius** — gentle, consistent: `--radius-sm` 6 · `--radius-md` 8 · `--radius-lg` 12 ·
  `--radius-xl` 16 · `--radius-2xl` 22 · `--radius-full`.
- **Shadow** — soft and low, used only for true elevation: `--shadow-xs/sm/md/lg`. Deeper on dark.

Layout tokens: `--sidebar-width` 248, `--topbar-height` 60, `--content-max-width` 1200.

---

## 5. Components

Defined in `styles.css`, built on the tokens above.

- **Buttons** — `.btn` + `.btn-primary` (ink), `.btn-accent` (blue), `.btn-secondary`,
  `.btn-ghost`, `.btn-danger`; sizes `.btn-xs/sm/(md)/lg`, `.btn-icon`; `.spinner` for loading.
- **Forms** — `.inp`, `.sel`, `.ta`, `.input-affix`; `.sw` (switch), `.cbx`/`.rdo`
  (checkbox/radio), `.seg` (segmented control). Focus = blue border + `--accent-ring`.
- **Tags / status** — `.tag` + `.tag-success|warning|danger|info|neutral|accent|outline`;
  `.badge-sm` variants for table badges.
- **Tabs** — `.tabs` (underline), `.endpoint-tabs` (segmented), `.fchip` (filter chips).
- **Cards** — `.card` (+ `.hoverable`, `.selected`), `.chan-card` (channel selector),
  `.stat-card`, `.rep-card`.
- **Code & diff** — `.code` / `.code-body` with `.tok-*` syntax classes; `.diff-cols`,
  `.diffrow`, `.sdiff` structural diff; `.severity` (critical / extension / compatible).
- **Indicators** — `.live-dot` (with `.run` pulse), `.prog` progress bar.
- **App shell** — `.app-header`, `.app-nav`, `.app-main`, `.page-head`, `.panel`, `.sec-head`,
  `.suite`, `.case-group`, the reports `.htable`, and `.toast`.

See `showcase.html` for a living gallery of every token and component in both themes.

---

## 6. Motion · Z-index

- Easing: `--ease-default`, `--ease-out`, `--ease-spring`. Durations `--dur-fast` 130ms /
  `--dur-normal` 200ms / `--dur-slow` 320ms. Respects `prefers-reduced-motion`.
- Layers: `--z-sticky` 10 · `--z-dropdown` 100 · `--z-popover` 200 · `--z-drawer` 300 ·
  `--z-modal` 400 · `--z-toast` 500.

---

## 7. Accessibility

- Text contrast ≥ 4.5:1 (AA); large text ≥ 3:1.
- Every interactive element has a visible focus state (`--accent-ring`).
- Semantic tables/forms; icon-only buttons carry `aria-label`; live regions use `aria-live`.

---

## 8. Files

```
design-system/
├── design-system.md   ← this spec
├── tokens.css         ← design tokens (the single source of truth for values)
├── styles.css         ← component + app-shell styles (built on tokens)
├── showcase.html      ← living styleguide / component gallery
└── assets/
    ├── noctua/        ← brand marks (owl)
    └── logos/         ← provider logos
```

**Consume from app pages** (e.g. `index.html`, `reports.html` at the project root):

```html
<link rel="stylesheet" href="design-system/tokens.css" />
<link rel="stylesheet" href="design-system/styles.css" />
<!-- brand mark -->
<img src="design-system/assets/noctua/icon-web.png" alt="Noctua" />
```

**Update flow:** change a value in `tokens.css` first, then reflect the rationale here. Token
**renames** are breaking — grep `styles.css` and app code for references before changing a name.

### Application state utilities (`styles.css` §3)

The production SPA (`index.html` + `main.js`) uses these documented state classes:

| Class | Purpose |
| --- | --- |
| `.is-hidden` | Toggle panel visibility from JS |
| `.is-active` / `.on` | Selected nav tab, endpoint tab, filter chip |
| `.toast.show` | Visible toast notification |
| `.sel` | Selected channel card |
| `.open` | Expanded history table row |

Theme preference is stored in `localStorage` under `noctua-ds-theme` (`light` / `dark`).
