import { describe, expect, it } from 'vitest';

import {
  detectPlatform,
  extractHashtags,
  matchLocation,
  parseOEmbedTitle,
  parseOgTags,
} from './extraction.js';

describe('detectPlatform', () => {
  it('recognizes tiktok.com URLs', () => {
    expect(detectPlatform('https://www.tiktok.com/@voyageur/video/123')).toBe('tiktok');
    expect(detectPlatform('https://tiktok.com/@voyageur/video/123')).toBe('tiktok');
  });

  it('recognizes instagram.com URLs', () => {
    expect(detectPlatform('https://www.instagram.com/reel/abc123/')).toBe('instagram');
  });

  it('falls back to other for unknown hosts', () => {
    expect(detectPlatform('https://example.com/video')).toBe('other');
  });

  it('falls back to other for malformed URLs', () => {
    expect(detectPlatform('not a url')).toBe('other');
    expect(detectPlatform('')).toBe('other');
  });
});

describe('extractHashtags', () => {
  it('extracts and lowercases hashtags', () => {
    expect(extractHashtags("Visite #Paris et #FRANCE aujourd'hui")).toEqual(['paris', 'france']);
  });

  it('deduplicates repeated hashtags', () => {
    expect(extractHashtags('#paris #Paris #PARIS')).toEqual(['paris']);
  });

  it('supports unicode letters in hashtags', () => {
    expect(extractHashtags('#été à #montréal')).toEqual(['été', 'montréal']);
  });

  it('returns an empty array when there are no hashtags', () => {
    expect(extractHashtags('un texte sans hashtag')).toEqual([]);
  });
});

describe('matchLocation', () => {
  const knownPlaces = ['Paris', 'Tour Eiffel', 'Lyon'];

  it('matches a known place case-insensitively', () => {
    expect(matchLocation('Un weekend à PARIS incroyable', knownPlaces)).toBe('Paris');
  });

  it('prefers the longest overlapping match', () => {
    expect(matchLocation('La tour eiffel vue de nuit, à Paris', knownPlaces)).toBe('Tour Eiffel');
  });

  it('returns an empty string when nothing matches', () => {
    expect(matchLocation('Un texte sans lieu connu', knownPlaces)).toBe('');
  });

  it('returns an empty string for an empty knownPlaces list', () => {
    expect(matchLocation('Paris', [])).toBe('');
  });
});

describe('parseOEmbedTitle', () => {
  it('extracts the title field', () => {
    expect(parseOEmbedTitle({ title: 'Mon voyage à Paris' })).toBe('Mon voyage à Paris');
  });

  it('returns null when title is missing', () => {
    expect(parseOEmbedTitle({})).toBeNull();
  });

  it('returns null when title is blank', () => {
    expect(parseOEmbedTitle({ title: '   ' })).toBeNull();
  });

  it('returns null for malformed payloads', () => {
    expect(parseOEmbedTitle(null)).toBeNull();
    expect(parseOEmbedTitle('not an object')).toBeNull();
    expect(parseOEmbedTitle({ title: 42 })).toBeNull();
  });
});

describe('parseOgTags', () => {
  it('extracts og:title and og:description', () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Voyage à Paris" />
        <meta property="og:description" content="Une vue magnifique" />
      </head></html>
    `;
    expect(parseOgTags(html)).toEqual({
      title: 'Voyage à Paris',
      description: 'Une vue magnifique',
    });
  });

  it('handles reversed attribute order', () => {
    const html = `<meta content="Titre inversé" property="og:title" />`;
    expect(parseOgTags(html)).toEqual({ title: 'Titre inversé', description: null });
  });

  it('decodes basic HTML entities', () => {
    const html = `<meta property="og:title" content="Paris &amp; Lyon" />`;
    expect(parseOgTags(html).title).toBe('Paris & Lyon');
  });

  it('returns nulls when tags are missing', () => {
    expect(parseOgTags('<html><head></head></html>')).toEqual({
      title: null,
      description: null,
    });
  });

  it('returns nulls for malformed/empty HTML', () => {
    expect(parseOgTags('')).toEqual({ title: null, description: null });
    expect(parseOgTags('<not even html')).toEqual({ title: null, description: null });
  });
});
