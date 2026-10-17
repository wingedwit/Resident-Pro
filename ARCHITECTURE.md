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
7. `lib/modal-manager.js` -> `window.ResidentModalManager`
8. `lib/state-manager.js` -> `window.ResidentStateManager`
9. `lib/date-picker.js` -> `window.ResidentDatePicker`
10. `lib/picker-modal.js` -> `window.ResidentPickerModal`
11. `lib/resident-modal.js` -> `window.ResidentModal`
12. `lib/keyboard-shortcuts.js` -> `window.ResidentShortcuts`
13. `app.js` -> Bootstrap orchestration and UI event binding

Do not reorder these scripts unless dependency references are updated at the same time.

## Module Responsibilities

| Module | Owns | Must not own |
| --- | --- | --- |
| `lib/date-utils.js` | Local date conversion and display formatting | DOM updates |
| `lib/storage-utils.js` | Safe local-storage access and stored-state loading | App rendering |
| `lib/resident-logic.js` | Options, resident selection rules, report payloads | Modal behavior or feedback |
| `lib/app-config.js` | Storage contract, defaults, undo limit | DOM updates or persistence |
| `lib/ui-utils.js` | Toasts, clipboard fallback, copy-success feedback | Resident selection rules |
| `lib/report-ui.js` | Live-report DOM creation and updates | State mutation or report content rules |
| `lib/modal-manager.js` | Dialog focus trapping, animation transitions, scroll lock | Business rules or state storage |
| `lib/state-manager.js` | Store subscription, undo/redo history, debounce saving, invariants | Direct DOM manipulation |
| `lib/date-picker.js` | Google Calendar-inspired mini-calendar popover, month/year switcher, pill navigation | Attendance or report generation |
| `lib/picker-modal.js` | Single-select option modal rendering, filtering, and selection | Resident group attendance state |
| `lib/resident-modal.js` | Resident checklist DOM rendering, group selection, search | Single-choice picker options |
| `lib/keyboard-shortcuts.js` | Global shortcut routing (Alt+T, Ctrl+Alt+D, Esc, undo/redo) | Business logic execution |
| `app.js` | Top-level wiring between DOM elements, store, and controllers | Reusable low-level utilities |

## State Shape

The persisted state uses the `residentProData-v2` key and includes:

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
- Live-report card rendering: `lib/report-ui.js`
- Initial state, storage key, or undo limit: `lib/app-config.js`
- Date formatting: `lib/date-utils.js`
- Dialog accessibility and animations: `lib/modal-manager.js`
- State mutations, undo/redo, persistence rules: `lib/state-manager.js`
- Date picker or quick pills: `lib/date-picker.js`
- Option modals (Type, Presenter, etc.): `lib/picker-modal.js`
- Attendance checklist modal: `lib/resident-modal.js`
- Shortcuts and key bindings: `lib/keyboard-shortcuts.js`
- Top-level bootstrapping: `app.js`
- Visual styling: `styles.css`
