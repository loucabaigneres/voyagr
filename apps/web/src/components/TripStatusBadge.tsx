import type { ReactNode } from 'react'

interface StatusStyle {
  label: string
  icon: ReactNode
  /** Classes on light surfaces. */
  light: string
  /** Classes over the hero photo: near-opaque so it reads on any image. */
  onImage: string
}

const iconProps = {
  className: 'h-3.5 w-3.5 shrink-0',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.5,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
} as const

const STATUS: Record<string, StatusStyle> = {
  draft: {
    label: 'Brouillon',
    icon: (
      <svg {...iconProps}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15 5 4 4M4 20l1-4L16 5l4 4L9 19l-5 1Z" />
      </svg>
    ),
    light: 'border-[#e5ded6] bg-[#F2EDE8] text-[#555]',
    onImage: 'border-white/60 bg-white/90 text-[#1a1a1a]',
  },
  finalized: {
    label: 'Finalisé',
    icon: (
      <svg {...iconProps} strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
      </svg>
    ),
    // A darker green than the page's #27ae60: white on that one is only 2.9:1.
    light: 'border-[rgba(46,204,113,.35)] bg-[rgba(46,204,113,.14)] text-[#1a7f46]',
    onImage: 'border-[#1a7f46] bg-[#1a7f46] text-white',
  },
  archived: {
    label: 'Archivé',
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path strokeLinecap="round" d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
      </svg>
    ),
    light: 'border-[#ddd] bg-[#eee] text-[#666]',
    onImage: 'border-white/20 bg-[#1a1a1a]/85 text-white',
  },
}

interface TripStatusBadgeProps {
  status: string | null
  variant?: 'light' | 'onImage'
}

export function TripStatusBadge({ status, variant = 'light' }: TripStatusBadgeProps) {
  const style = STATUS[status ?? 'draft'] ?? STATUS.draft
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${
        variant === 'onImage' ? `${style.onImage} shadow-md backdrop-blur-md` : style.light
      }`}
    >
      {style.icon}
      {style.label}
    </span>
  )
}
