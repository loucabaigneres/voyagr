import { formatHashtags, platformLabel, shortUrl } from './inspiration';

describe('platformLabel', () => {
  it('names known platforms and falls back to "Lien"', () => {
    expect(platformLabel('tiktok')).toBe('TikTok');
    expect(platformLabel('instagram')).toBe('Instagram');
    expect(platformLabel('other')).toBe('Lien');
    expect(platformLabel(null)).toBe('Lien');
  });
});

describe('formatHashtags', () => {
  it('prefixes, trims and drops empties and duplicates', () => {
    expect(formatHashtags([' plage', '#Plage', '', '##rome', '  '])).toEqual(['#plage', '#rome']);
  });
});

describe('shortUrl', () => {
  it('drops the protocol and "www."', () => {
    expect(shortUrl('https://www.tiktok.com/@lea/video/1')).toBe('tiktok.com/@lea/video/1');
  });
});
