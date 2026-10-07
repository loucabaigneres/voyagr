import { categoryMeta, cleanDescription, parseWktPoint, placePhotos } from './place';

describe('categoryMeta', () => {
  it('returns the meta of a known category', () => {
    expect(categoryMeta('restaurant').label).toBe('Restaurant');
    expect(categoryMeta('activité').another).toBe('une autre activité');
  });

  it('falls back to a neutral meta for unknown or missing categories', () => {
    expect(categoryMeta('musée').label).toBe('musée');
    expect(categoryMeta(null).label).toBe('Lieu');
    expect(categoryMeta(undefined).another).toBe('un autre lieu');
  });
});

describe('cleanDescription', () => {
  it('removes markdown emphasis and trims', () => {
    expect(cleanDescription('  **Super** *spot*  ')).toBe('Super spot');
  });

  it('handles empty values', () => {
    expect(cleanDescription(null)).toBe('');
  });
});

describe('parseWktPoint', () => {
  it('parses a POINT(lng lat) string', () => {
    expect(parseWktPoint('POINT(2.3522 48.8566)')).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
    });
  });

  it('parses negative coordinates and loose spacing', () => {
    expect(parseWktPoint('point ( -9.1393  38.7223 )')).toEqual({
      latitude: 38.7223,
      longitude: -9.1393,
    });
  });

  it('returns null for missing or malformed values', () => {
    expect(parseWktPoint(null)).toBeNull();
    expect(parseWktPoint('LINESTRING(0 0, 1 1)')).toBeNull();
  });
});

describe('placePhotos', () => {
  it('puts the main photo first and removes duplicates and empty values', () => {
    expect(placePhotos({ mainMediaUrl: 'a.jpg', carousselUrls: ['b.jpg', 'a.jpg', ''] })).toEqual([
      'a.jpg',
      'b.jpg',
    ]);
  });

  it('handles a place without photos', () => {
    expect(placePhotos({ mainMediaUrl: null, carousselUrls: null })).toEqual([]);
  });
});
