import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// ─── Types (mirrors getTrip output) ──────────────────────────────────────────

type Activity = {
  id: string
  title: string
  locationName: string | null
  description: string | null
  coordinates: string | null
  category: string | null
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

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  hotel:     { label: 'Hébergement', color: '#6c63ff' },
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
    borderBottomColor: '#6c63ff',
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
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
    backgroundColor: '#f0effe',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#6c63ff',
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
    color: '#1a1a2e',
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
          const hotel      = day.activities.find((a) => a.category === 'hotel')
          const activities = day.activities.filter((a) => a.category === 'activité')
          const restaurants = day.activities.filter((a) => a.category === 'restaurant')
          const ordered    = [
            ...(hotel ? [hotel] : []),
            ...activities,
            ...restaurants,
            ...day.activities.filter(
              (a) => a.category !== 'hotel' && a.category !== 'activité' && a.category !== 'restaurant',
            ),
          ]

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

                return (
                  <View key={act.id}>
                    <View style={s.activityRow}>
                      <View style={[s.activityLeft, { backgroundColor: info.color }]} />
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
