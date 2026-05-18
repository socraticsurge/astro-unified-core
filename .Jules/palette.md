## 2026-05-18 - ARIA labels for dynamic item icon buttons
**Learning:** Icon-only actions within lists (like Edit/Delete on profile cards) need dynamic ARIA labels and `title` attributes that incorporate the item's name (e.g., `Edit ${profile.name}`). Otherwise, screen reader users hear multiple generic 'Edit' buttons without context, and sighted users lack tooltip context.
**Action:** Always provide specific, contextual `aria-label` and `title` attributes for icon-only buttons inside lists or data grids, and hide the icons themselves with `aria-hidden="true"`.
