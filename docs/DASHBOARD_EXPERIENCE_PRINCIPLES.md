# Dashboard experience principles

These principles govern the signed-in Astro Chaganti experience. They are the
acceptance criteria for dashboard changes, not optional visual preferences.

## 1. Begin with the person's intent

The dashboard is organized around the questions a person is trying to answer:

- What is active for me today?
- What does my birth chart say?
- When should I act?
- How do two profiles relate?
- How do I manage the people whose charts I use?

Astrological terminology can remain precise, but the interface must make the
next useful action understandable without prior knowledge of the product.

## 2. Make the primary actions unmistakable

Four actions must be easy to find without hunting:

1. Explore the active person's natal chart.
2. Explore the current context with AI.
3. Add another profile.
4. Edit the active profile.

Destructive and infrequent actions, including deleting a profile and signing
out, remain available but visually secondary.

## 3. Use one navigation model

There is one canonical registry of dashboard destinations and one information
architecture. Desktop renders that registry as a persistent, vertically
scrollable left menu because it provides useful orientation and room for future
tools. Mobile renders the same registry in a focused drawer. The interface does
not introduce a competing horizontal tool strip or a second destination list.

Every visible destination must open the correct functional panel. A label that
looks interactive but leads nowhere is a release blocker.

## 4. Give AI a first-class, contextual role

“Explore with AI” is a primary product capability, not a settings utility. It
must be prominent in the workspace and carry the active profile and active
section into the AI experience. It remains distinct from “Ask Dr Chaganti,”
which represents a human consultation.

AI availability must never block deterministic chart, transit, Panchangam,
Muhurtam, or profile-management functions.

AI uses one adaptive workspace: a centered, generously sized dialog on wide
screens and a full-screen focused experience on small screens. It must not feel
like a narrow desktop sidebar squeezed onto a phone.

## 5. Keep profile management in context

The active profile identity belongs beside the tools that operate on it. The
name identifies the subject; it does not open a duplicate read-only profile
pane. Natal owns birth details and charts, while an explicit Edit profile action
opens editing directly. Adding a profile is a prominent global action because
it changes the working set. Profile deletion requires deliberate confirmation
and receives no primary visual emphasis.

## 6. Reveal detail progressively

The dashboard first explains the active context and recommended next actions.
Dense birth data, charts, specialist analysis, and destructive controls appear
when requested. Space is earned by current usefulness, not by the amount of
data available.

## 7. Give every tool the same page grammar

Each destination uses the same structural rhythm:

1. Context: what this tool answers for the active profile.
2. Controls: the minimum inputs needed for the next calculation.
3. Result: the most important answer before supporting detail.
4. Explanation: how to read or act on the result.

Natal Chart owns birth details, Panchangam-at-birth, and D1/D9 chart context.
Muhurtam shares the public calculator interaction model and adds signed-in
profile validation rather than becoming a separate product. Tarabalam,
Transits, and Career use the same headers, cards, spacing, and state treatment.

## 8. Preserve parity across screen sizes

Mobile is not a reduced product. It provides the same destinations and primary
actions through touch-friendly controls, drawers, and a single-column content
flow. Horizontal clipping, off-screen tabs, hover-only meaning, and hidden core
features are release blockers.

## 9. Align to a quiet, consistent system

- Major layout edges share a common baseline.
- Controls use consistent heights, radii, icon sizing, and label treatment.
- Spacing follows an 8-pixel rhythm, with smaller 4-pixel increments only for
  tightly related text.
- Active, primary, secondary, and destructive states are visually distinct.
- The content column stays readable rather than stretching to fill every
  available pixel.

The visual system should feel calm, assured, and suitable for repeated use—not
like a collection of separate calculators.

## 10. Name controls for what they do

“Settings” is used only when real settings exist. An account overflow that
contains several account actions is labelled as an account menu and stays
quiet. When Sign out is the only action, it is shown directly as a quiet text
action on wide screens and as a clearly labelled icon on very small screens.
Navigation labels use plain language alongside accurate astrological terms.

## 11. Accessibility and trust are part of polish

Controls have semantic names, visible keyboard focus, sufficient contrast, and
appropriate focus management. Loading, empty, unavailable, and error states
explain what happened and preserve a useful next step. Computed values remain
traceable to the existing engines; interface polish must not disguise mock or
invented data as a calculation.

## Release checklist

A dashboard pass is ready for review only when:

- Add profile, Edit profile, Explore natal chart, and Explore with AI are
  discoverable from the initial Today view.
- Every public navigation destination opens the intended panel.
- The persistent desktop tool menu and mobile tool drawer are generated from the
  same registry.
- Profile identity does not open a redundant detail pane; Edit profile opens
  editing directly.
- AI receives the active profile and section context.
- AI opens as a centered desktop dialog and full-screen mobile workspace.
- Natal, Transits, Muhurtam, Tarabalam, and Career follow the shared page
  grammar.
- Desktop, tablet, and mobile layouts have no horizontal overflow or clipped
  primary controls.
- Keyboard focus, accessible names, loading states, and empty states remain
  usable.
- Type checking, linting, focused tests, and the full test suite pass.
- The deployed staging URL is visually and functionally rechecked.

The complete persona, checklist, wishlist, and iteration protocol live in
[`docs/EXPERIENCE_ACCEPTANCE.md`](EXPERIENCE_ACCEPTANCE.md).
