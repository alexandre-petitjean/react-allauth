# Playground: styling + JSON syntax highlighting

**Date:** 2026-06-15
**Status:** Approved

## Goal

Polish the two-pane playground and syntax-highlight the JSON responses in the
inspector, so the demo reads like a small devtools surface.

## Scope

- Add `prism-react-renderer`; a `JsonBlock` component renders responses with a
  dark theme.
- A `playground/styles.css` (classes) replaces the scattered inline styles,
  imported once in `main.tsx`.
- Left pane: clean, light interface — tidy forms (inputs with border/focus,
  buttons), readable errors.
- Right pane: dark, devtools-like inspector — state with a status badge; the call
  log as cards with colored method + status badges and highlighted JSON.
- Style only. No logic changes, no library changes.

## Components

- `playground/components/JsonBlock.tsx` — `{ value: unknown }` → pretty-prints and
  highlights via `<Highlight language="json" theme={themes.vsDark}>`.
- `Inspector.tsx` — uses `JsonBlock`; derives badge classes:
  - method: `method method--{get|post|put|patch|delete}`
  - status: `status--ok` (<300), `status--warn` (<500), `status--error` (>=500)
- `App.tsx` / `AuthDemo.tsx` / `CredentialsForm.tsx` — inline styles replaced by
  classes from `styles.css`.

## Styling

`playground/styles.css`: layout grid (`.layout`, `.pane-left`, `.pane-right`),
forms (`.form`, `.field`, inputs, `.button`, `.form-errors`), inspector
(`.inspector`, `.state`, `.badge`, `.call`, `.method`, `.status`, `.json-block`).
Light left pane, dark right pane; method/status badge colors as above.

## Testing

No unit tests (consistent with the playground). Validation: typecheck/lint/build
pass and a browser screenshot shows the styled two panes with highlighted JSON.
