import { useState } from 'react'

function CoverPlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_25%_15%,rgba(255,77,77,.38),transparent_55%),linear-gradient(160deg,#2c2c2c,#161616)] text-white/25">
      <svg className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75 3.75 9v10.5L9 17.25m0-10.5 6 2.5m-6-2.5v10.5m6-8 5.25-2.25V15L15 17.25m0-10.5v10.5m0 0-6-2.5" />
      </svg>
    </div>
  )
}

/**
 * Shows the first cover photo that actually loads, falling through the list on
 * broken URLs, with the placeholder underneath until one fades in.
 */
export function TripCover({ urls }: { urls: string[] }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const [loaded, setLoaded] = useState<string | null>(null)

  const src = urls.find((url) => !failed.has(url))

  return (
    <>
      <CoverPlaceholder />
      {src && (
        <img
          key={src}
          src={src}
          alt=""
          onLoad={() => setLoaded(src)}
          onError={() => setFailed((prev) => new Set(prev).add(src))}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded === src ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  )
}
