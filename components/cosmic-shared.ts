// Shared constants between CosmicLanding and CosmicAnimations.
// Extracted so the animation bundle (CosmicAnimations, loaded lazily) can
// import them without pulling in the panel code, and vice-versa.

export const ZODIAC = [
  { symbol: '♈', name: 'Aries',       key: 'aries'       as const },
  { symbol: '♉', name: 'Taurus',      key: 'taurus'      as const },
  { symbol: '♊', name: 'Gemini',      key: 'gemini'      as const },
  { symbol: '♋', name: 'Cancer',      key: 'cancer'      as const },
  { symbol: '♌', name: 'Leo',         key: 'leo'         as const },
  { symbol: '♍', name: 'Virgo',       key: 'virgo'       as const },
  { symbol: '♎', name: 'Libra',       key: 'libra'       as const },
  { symbol: '♏', name: 'Scorpio',     key: 'scorpio'     as const },
  { symbol: '♐', name: 'Sagittarius', key: 'sagittarius' as const },
  { symbol: '♑', name: 'Capricorn',   key: 'capricorn'   as const },
  { symbol: '♒', name: 'Aquarius',    key: 'aquarius'    as const },
  { symbol: '♓', name: 'Pisces',      key: 'pisces'      as const },
]

export type SignKey = (typeof ZODIAC)[number]['key']

export const DARK_PALETTE = {
  bg:             'radial-gradient(ellipse 100% 80% at 50% -5%, #0e0730 0%, #060318 55%, #020110 100%)',
  blobTL:         'radial-gradient(circle, rgba(70,40,180,0.22) 0%, transparent 70%)',
  blobBR:         'radial-gradient(circle, rgba(100,40,200,0.15) 0%, transparent 70%)',
  tickRing:       'rgba(251,191,36,0.15)',
  majorTick:      'rgba(251,191,36,0.6)',
  minorTick:      'rgba(180,160,255,0.22)',
  outerRing:      'rgba(180,160,255,0.32)',
  wedgeOutEven:   'rgba(255,255,255,0.025)',
  wedgeOutOdd:    'rgba(140,100,255,0.05)',
  wedgeOutStroke: 'rgba(180,160,255,0.22)',
  wedgeInEven:    'rgba(10,5,28,0.78)',
  wedgeInOdd:     'rgba(18,9,40,0.78)',
  wedgeInStroke:  'rgba(180,160,255,0.15)',
  zodiacText:     'rgba(255,255,255,0.4)',
  ring1:          'rgba(180,160,255,0.35)',
  ring2:          'rgba(251,191,36,0.22)',
  ring3:          'rgba(180,160,255,0.12)',
  rimGlow0:       'rgba(100,60,200,0)',
  rimGlow1:       'rgba(100,60,200,0.18)',
  mwA:            'rgba(80,60,140,0)',
  mwB:            'rgba(80,60,140,0.05)',
  mwC:            'rgba(100,80,160,0.08)',
  starWarm:       'rgba(255,230,180,',
  starCool:       'rgba(210,225,255,',
  meteor:         'rgba(255,255,255,',
  accent:         '251,191,36',
  googleIcon:     '#1a0800',
}

export const LIGHT_PALETTE = {
  bg:             '#F2ECDF',
  blobTL:         'radial-gradient(circle, rgba(142,42,31,0.07) 0%, transparent 70%)',
  blobBR:         'radial-gradient(circle, rgba(142,42,31,0.05) 0%, transparent 70%)',
  tickRing:       'rgba(142,42,31,0.15)',
  majorTick:      'rgba(142,42,31,0.5)',
  minorTick:      'rgba(180,100,80,0.3)',
  outerRing:      'rgba(180,100,80,0.35)',
  wedgeOutEven:   'rgba(31,26,23,0.02)',
  wedgeOutOdd:    'rgba(142,42,31,0.04)',
  wedgeOutStroke: 'rgba(180,100,80,0.25)',
  wedgeInEven:    'rgba(242,236,223,0.85)',
  wedgeInOdd:     'rgba(240,232,218,0.85)',
  wedgeInStroke:  'rgba(180,100,80,0.15)',
  zodiacText:     'rgba(31,26,23,0.45)',
  ring1:          'rgba(180,100,80,0.3)',
  ring2:          'rgba(142,42,31,0.2)',
  ring3:          'rgba(180,100,80,0.12)',
  rimGlow0:       'rgba(142,42,31,0)',
  rimGlow1:       'rgba(142,42,31,0.12)',
  mwA:            'rgba(180,100,80,0)',
  mwB:            'rgba(180,100,80,0.02)',
  mwC:            'rgba(180,100,80,0.03)',
  starWarm:       'rgba(142,42,31,',
  starCool:       'rgba(100,60,40,',
  meteor:         'rgba(31,26,23,',
  accent:         '142,42,31',
  googleIcon:     '#F2ECDF',
}

export type Palette = typeof DARK_PALETTE
