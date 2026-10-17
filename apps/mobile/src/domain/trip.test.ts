import { daySummary, splitTripDays } from './trip';

describe('splitTripDays', () => {
  it('separates liked places, alternative hotels and the sorted itinerary', () => {
    const days = [{ dayIndex: 2 }, { dayIndex: -1 }, { dayIndex: 0 }, { dayIndex: 1 }];
    const { likedPlaces, alternativeHotels, itinerary } = splitTripDays(days);

    expect(likedPlaces).toEqual({ dayIndex: 0 });
    expect(alternativeHotels).toEqual({ dayIndex: -1 });
    expect(itinerary.map((day) => day.dayIndex)).toEqual([1, 2]);
  });

  it('returns null sections when they are absent', () => {
    const { likedPlaces, alternativeHotels, itinerary } = splitTripDays([]);
    expect(likedPlaces).toBeNull();
    expect(alternativeHotels).toBeNull();
    expect(itinerary).toEqual([]);
  });
});

describe('daySummary', () => {
  it('counts activities and restaurants with French plurals', () => {
    const activities = [
      { category: 'activité' },
      { category: 'activité' },
      { category: 'restaurant' },
      { category: 'hotel' },
    ];
    expect(daySummary(activities)).toBe('2 activités · 1 restaurant');
  });

  it('is empty when there is nothing to count', () => {
    expect(daySummary([{ category: 'hotel' }])).toBe('');
  });
});
