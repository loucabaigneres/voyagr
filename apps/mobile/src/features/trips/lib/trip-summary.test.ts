import { tripDisplayTitle, tripStatusMeta } from './trip-summary';

describe('tripStatusMeta', () => {
  it('translates each status', () => {
    expect(tripStatusMeta('draft').label).toBe('Brouillon');
    expect(tripStatusMeta('finalized')).toEqual({ label: 'Finalisé', tone: 'success' });
    expect(tripStatusMeta('archived').label).toBe('Archivé');
  });

  it('treats an unknown status as a draft', () => {
    expect(tripStatusMeta('something-new')).toEqual(tripStatusMeta('draft'));
    expect(tripStatusMeta(null)).toEqual(tripStatusMeta('draft'));
  });
});

describe('tripDisplayTitle', () => {
  it('prefers the trip title', () => {
    expect(tripDisplayTitle({ title: ' Week-end à Rome ', destination: 'Rome' })).toBe(
      'Week-end à Rome',
    );
  });

  it('falls back on the destination, then on a neutral label', () => {
    expect(tripDisplayTitle({ title: '  ', destination: 'Lisbonne' })).toBe('Voyage à Lisbonne');
    expect(tripDisplayTitle({})).toBe('Voyage sans destination');
  });
});
