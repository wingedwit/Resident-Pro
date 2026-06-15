# Resident Pro Regression Checklist

Run this checklist after extracting or changing a module.

## Core Workflow

- App loads without a `dependency missing` console error.
- Existing saved state loads after refresh.
- Topic and date changes update the live report.
- Type, presenter, senior resident, and moderator pickers remain single-select.
- Practical type clears and disables presenter selection.
- Changing presenter keeps presenter attendance synchronized.
- Resident group selection, select-all, clear, and done actions work.
- Undo and redo restore picker and attendance changes.

## Report And Feedback

- Live report initializes and updates values without flash animation.
- Copy G-Doc produces the expected plain-text and rich-text report.
- Copy success animation returns to its default icon.
- Toasts appear and dismiss after copy and reset actions.
- App reloads successfully while offline after one online visit.
