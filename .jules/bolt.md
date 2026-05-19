## 2024-05-19 - Removed per-star DOM access in AppStarCanvas
**Learning:** `document.documentElement.getAttribute('data-theme')` was being called inside the inner rendering loop of `AppStarCanvas`, executing N times per frame (where N is the number of stars, typically 70). Reading from the DOM repeatedly inside `requestAnimationFrame` is a performance anti-pattern.
**Action:** Moved the theme DOM read outside the loop, reading it once per frame. Also wrapped the component in `React.memo` to prevent unnecessary re-renders of the canvas element itself.
