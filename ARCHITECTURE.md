# Resident Pro Architecture

Resident Pro is a static web app. It uses ordered `defer` scripts and explicit APIs
attached to `window`, allowing it to run without a bundler or development server.

## Script Loading Order

`index.html` loads scripts in dependency order:

1. `lib/date-utils.js` -> `window.ResidentDateUtils`
2. `lib/storage-utils.js` -> `window.ResidentStorageUtils`
3. `lib/resident-logic.js` -> `window.ResidentLogic`
4. `lib/app-config.js` -> `window.ResidentConfig`
5. `lib/ui-utils.js` -> `window.ResidentUIUtils`
6. `lib/report-ui.js` -> `window.ResidentReportUI`
7. `app.js` -> DOM wiring and application orchestration

Do not reorder these scripts unless `app.js` dependencies are updated at the same time.

## Module Responsibilities

| Module | Owns | Must not own |
| --- | --- | --- |
| `lib/date-utils.js` | Local date conversion and display formatting | DOM updates |
| `lib/storage-utils.js` | Safe local-storage access and stored-state loading | App rendering |
| `lib/resident-logic.js` | Options, resident selection rules, report payloads | Modal behavior or feedback |
| `lib/app-config.js` | Storage contract, defaults, undo limit | DOM updates or persistence |
| `lib/ui-utils.js` | Toasts, clipboard fallback, copy-success feedback | Resident selection rules |
| `lib/report-ui.js` | Live-report DOM creation and updates | State mutation or report content rules |
| `app.js` | State orchestration, rendering, modals, pickers, event binding | Reusable low-level utilities |

## State Shape

The persisted state uses the `residentProData` key and includes:

- `date`, `topic`, `type`
- `presenter`, `seniorResident`, `moderator`
- `residentsPresent`

## Critical Invariants

- Changing presenter keeps presenter attendance synchronized.
- Practical sessions clear/disable presenter selection.
- Picker modals remain single-select; resident attendance remains multi-select.
- G-Doc report text and HTML remain stable unless explicitly changed.
- Undo/redo and refresh persistence remain behaviorally identical.
- Utility modules expose a small named API through one `window.Resident*` object.

## Where To Make Changes

- Resident groups, selection rules, or report content: `lib/resident-logic.js`
- Clipboard, toast, or success animation: `lib/ui-utils.js`
- Live-report card rendering or update animation: `lib/report-ui.js`
- Initial state, storage key, or undo limit: `lib/app-config.js`
- Date formatting: `lib/date-utils.js`
- Modal behavior, rendering, or event wiring: `app.js`
- Visual styling: `styles.css`

## Safe Extraction Process

1. Extract one complete responsibility from `app.js`.
2. Expose a small API from a new `lib/*.js` module.
3. Load the module before `app.js`.
4. Replace the old implementation in `app.js`.
5. Verify picker, report, persistence, and undo/redo behavior before continuing.
