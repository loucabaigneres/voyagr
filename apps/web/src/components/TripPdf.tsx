import { Document, Image, Link, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { env } from '../env'

// ─── Types (mirrors getTrip output) ──────────────────────────────────────────

type Activity = {
  id: string
  title: string
  locationName: string | null
  description: string | null
  coordinates: string | null
  category: string | null
  orderIndex: number
  mainMediaUrl: string | null
  sourceUrl: string | null
}

type Day = {
  id: string
  dayIndex: number
  targetDate: string | null
  activities: Activity[]
}

type Trip = {
  title: string | null
  destination: string | null
  startDate: string | null
  durationDays: number | null
}

export type TripPdfProps = {
  trip: Trip
  days: Day[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCoords(wkt: string | null): string | null {
  if (!wkt) return null
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i)
  if (!m) return null
  return `${parseFloat(m[2]).toFixed(5)}, ${parseFloat(m[1]).toFixed(5)}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function cleanDesc(desc: string): string {
  return desc.replace(/\*\*/g, '').replace(/\*/g, '').trim()
}

/**
 * Most catalog image hosts send no `Access-Control-Allow-Origin`, so the PDF
 * renderer cannot read them directly — it fetches them from the browser. The API
 * relays them instead.
 */
function proxiedImage(url: string): string {
  return `${env.VITE_API_URL}/image-proxy?url=${encodeURIComponent(url)}`
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  hotel:     { label: 'Hébergement', color: '#FF4D4D' },
  'activité': { label: 'Activité',    color: '#2ecc71' },
  restaurant:{ label: 'Restaurant',  color: '#f39c12' },
}

function categoryInfo(cat: string | null) {
  return CATEGORY_LABELS[cat ?? ''] ?? { label: cat ?? 'Lieu', color: '#888888' }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },

  // Header
  header: {
    marginBottom: 28,
    borderBottomWidth: 2,
    borderBottomColor: '#FF4D4D',
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },

  // Day block
  dayBlock: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EDE8',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#FF4D4D',
    marginRight: 8,
  },
  dayDate: {
    fontSize: 10,
    color: '#888888',
  },

  // Activity row
  activityRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 8,
  },
  activityLeft: {
    width: 4,
    borderRadius: 2,
    marginRight: 10,
    marginTop: 2,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 10,
    objectFit: 'cover',
  },
  /** Keeps the text column aligned when a place has no picture. */
  thumbnailFallback: {
    width: 56,
    height: 56,
    borderRadius: 4,
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  locationName: {
    fontSize: 9,
    color: '#888888',
    marginBottom: 2,
  },
  coords: {
    fontSize: 8,
    color: '#aaaaaa',
    marginBottom: 3,
  },
  description: {
    fontSize: 9,
    color: '#555555',
    lineHeight: 1.5,
  },
  link: {
    fontSize: 8,
    color: '#FF4D4D',
    marginTop: 3,
    textDecoration: 'underline',
  },

  // Divider between activities
  divider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#eeeeee',
    marginBottom: 10,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color: '#bbbbbb',
  },
})

// ─── PDF Document ─────────────────────────────────────────────────────────────

export function TripPdfDocument({ trip, days }: TripPdfProps) {
  const itineraryDays = days.filter((d) => d.dayIndex > 0)

  return (
    <Document title={trip.title ?? 'Itinéraire'} author="Voyagr">
      <Page size="A4" style={s.page}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>{trip.title ?? 'Mon voyage'}</Text>
          {trip.destination && (
            <Text style={s.subtitle}>Destination : {trip.destination}</Text>
          )}
          {trip.startDate && (
            <Text style={s.subtitle}>
              {formatDate(trip.startDate)}
              {trip.durationDays ? ` · ${trip.durationDays} jour${trip.durationDays > 1 ? 's' : ''}` : ''}
            </Text>
          )}
        </View>

        {/* Days */}
        {itineraryDays.map((day) => {
          // Same order as the app: the planner lays each day out as a route.
          const ordered = [...day.activities].sort((a, b) => a.orderIndex - b.orderIndex)

          return (
            <View key={day.id} style={s.dayBlock} wrap={false}>
              {/* Day header */}
              <View style={s.dayHeader}>
                <Text style={s.dayLabel}>Jour {day.dayIndex}</Text>
                {day.targetDate && (
                  <Text style={s.dayDate}>{formatDate(day.targetDate)}</Text>
                )}
              </View>

              {/* Activities */}
              {ordered.map((act, idx) => {
                const info   = categoryInfo(act.category)
                const coords = parseCoords(act.coordinates)
                const desc   = act.description ? cleanDesc(act.description) : null
                // Activities carry generic stock pictures that add weight without
                // helping; only places you actually go to get a thumbnail.
                const showThumbnail = act.category !== 'activité'

                return (
                  <View key={act.id}>
                    <View style={s.activityRow}>
                      <View style={[s.activityLeft, { backgroundColor: info.color }]} />

                      {showThumbnail &&
                        (act.mainMediaUrl ? (
                          <Image style={s.thumbnail} src={proxiedImage(act.mainMediaUrl)} />
                        ) : (
                          <View
                            style={[s.thumbnailFallback, { backgroundColor: `${info.color}22` }]}
                          />
                        ))}

                      <View style={s.activityContent}>
                        <View style={s.activityHeader}>
                          <Text style={s.activityTitle}>{act.title}</Text>
                          <Text style={[s.categoryBadge, { backgroundColor: info.color }]}>
                            {info.label.toUpperCase()}
                          </Text>
                        </View>
                        {act.locationName && act.locationName !== act.title && (
                          <Text style={s.locationName}>{act.locationName}</Text>
                        )}
                        {coords && (
                          <Text style={s.coords}>GPS : {coords}</Text>
                        )}
                        {desc && (
                          <Text style={s.description}>{desc}</Text>
                        )}
                        {act.sourceUrl && (
                          <Link style={s.link} src={act.sourceUrl}>
                            Voir l'offre en ligne
                          </Link>
                        )}
                      </View>
                    </View>
                    {idx < ordered.length - 1 && <View style={s.divider} />}
                  </View>
                )
              })}
            </View>
          )
        })}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Généré par Voyagr</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
