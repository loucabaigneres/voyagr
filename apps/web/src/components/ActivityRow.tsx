import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { PinIcon } from './PinIcon'

const CATEGORY_META: Record<string, { emoji: string; label: string; color: string }> = {
  hotel:      { emoji: '🏨', label: 'Hébergement', color: 'rgba(255,77,77,.12)' },
  'activité': { emoji: '🗺️', label: 'Activité',    color: 'rgba(46,204,113,.12)' },
  restaurant: { emoji: '🍽️', label: 'Restaurant',  color: 'rgba(255,160,60,.14)' },
}

function categoryMeta(cat: string | null) {
  return CATEGORY_META[cat ?? ''] ?? { emoji: '📍', label: cat ?? '', color: 'rgba(0,0,0,.05)' }
}

function cleanDesc(desc: string): string {
  return desc.replace(/\*\*/g, '').replace(/\*/g, '').trim()
}

export interface RowActivity {
  id: string
  title: string
  locationName: string | null
  description: string | null
  coordinates: string | null
  category: string | null
  mainMediaUrl: string | null
  sourceUrl: string | null
}

interface ActivityRowProps {
  activity: RowActivity
  slot?: string
  onShowOnMap?: () => void
  /** Always-visible control under the row (e.g. "choose this hotel"). */
  action?: ReactNode
}

export function ActivityRow({ activity, slot, onShowOnMap, action }: ActivityRowProps) {
  const [open, setOpen] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const detailsId = useId()

  const meta = categoryMeta(activity.category)
  const desc = activity.description ? cleanDesc(activity.description) : null
  const subtitle =
    activity.locationName && activity.locationName !== activity.title ? activity.locationName : null
  const hasDetails = !!desc || !!activity.sourceUrl || !!onShowOnMap
  const showImage = !!activity.mainMediaUrl && !imageFailed

  return (
    <div
      className={`rounded-2xl border bg-white transition ${
        open ? 'border-[#FF4D4D]/50 shadow-sm' : 'border-[#eee] hover:border-[#ddd]'
      }`}
    >
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={hasDetails ? open : undefined}
        aria-controls={hasDetails ? detailsId : undefined}
        className={`flex w-full gap-3 p-3 text-left ${hasDetails ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl">
          {showImage ? (
            <img
              src={activity.mainMediaUrl!}
              alt=""
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-2xl"
              style={{ background: meta.color }}
              aria-hidden
            >
              {meta.emoji}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {slot && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF4D4D]">{slot}</span>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#555]"
              style={{ background: meta.color }}
            >
              {meta.label}
            </span>
          </div>

          <p className="mt-1 text-[15px] font-semibold leading-tight text-[#1a1a1a]">{activity.title}</p>

          {subtitle && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[#888]">
              <PinIcon className="h-3.5 w-3.5 shrink-0 text-[#FF4D4D]" />
              <span className="truncate">{subtitle}</span>
            </p>
          )}

          {desc && !open && <p className="mt-1 line-clamp-1 text-xs text-[#999]">{desc}</p>}
        </div>

        {hasDetails && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#eee] text-[#888]">
            <svg
              className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div id={detailsId} className="border-t border-[#f5f0ea] px-3 pb-3 pt-2.5">
          {desc && <p className="text-[13px] leading-relaxed text-[#555]">{desc}</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            {onShowOnMap && (
              <button
                type="button"
                onClick={onShowOnMap}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#ddd] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1a1a1a] transition hover:border-[#FF4D4D] hover:text-[#FF4D4D] active:scale-95"
              >
                <PinIcon className="h-3.5 w-3.5" />
                Voir sur la carte
              </button>
            )}
            {activity.sourceUrl && (
              <a
                href={activity.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-[#FF4D4D] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 active:scale-95"
              >
                Voir l'offre
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {action && <div className="px-3 pb-3">{action}</div>}
    </div>
  )
}
