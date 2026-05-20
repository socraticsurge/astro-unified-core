#!/usr/bin/env bash
# Block raw Tailwind palette classes (bg-emerald-900, text-amber-300, etc.) in
# the app source. The project uses a theme-token CSS layer (--color-success,
# --color-danger, --color-accent, --color-ink-1/2/3/4, etc.) that adapts to the
# Umbra/Vellum themes — raw palette utilities don't.
#
# The recent Tarabalam `taraColor()` regression (hardcoded
# `bg-emerald-900/40 text-emerald-300`) wasn't theme-aware and only surfaced
# when the user toggled themes. This guard prevents that class of bug.
#
# Exit non-zero on any match; CI workflow fails fast. Run locally via
# `npm run check:palette`.

set -euo pipefail

# Tailwind colour palette names. Numeric weight suffix (e.g. -300, -900/40)
# is what we want to flag — these are raw palette utilities. Bare colour
# names like `bg-red` without a weight aren't valid Tailwind, so the regex
# is anchored to `-<weight>`.
PALETTE='red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone'
# Utility prefixes that take a colour. `accent` excluded — that's our own
# token name (`--color-accent`), which we want; the Tailwind `accent-*`
# utility for form controls is so rarely used we accept false negatives.
PREFIX='bg|text|border|ring|from|to|via|outline|placeholder|caret|fill|stroke|divide|decoration|shadow'

PATTERN="\\b(${PREFIX})-(${PALETTE})-[0-9]"

# Search only product source. lib/tarabalam.ts is the file where the recent
# bug lived; including it explicitly.
ROOTS=(
  "components"
  "app"
  "lib"
)

HITS=$(grep -rnE "${PATTERN}" --include='*.tsx' --include='*.ts' \
  "${ROOTS[@]}" 2>/dev/null \
  | grep -v -E '\.(test|spec)\.tsx?$' \
  || true)

if [ -n "${HITS}" ]; then
  echo "❌ Raw Tailwind palette classes found. Use theme tokens (var(--color-*))"
  echo "   instead. The recent Tarabalam regression was exactly this pattern."
  echo
  echo "${HITS}"
  echo
  echo "Allowed: bg-[var(--color-success-faint)] text-[var(--color-danger)] etc."
  echo "Run 'rg --files-with-matches \"${PATTERN}\"' to find all offenders."
  exit 1
fi

echo "✓ No raw Tailwind palette classes in components/, app/, or lib/."
