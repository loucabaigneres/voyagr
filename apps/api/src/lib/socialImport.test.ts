import { describe, expect, it } from 'vitest';
import { detectPlatform, extractHashtags, extractOpenGraphDescription } from './socialImport.js';

describe('detectPlatform', () => {
  it('reconnaît les différents domaines TikTok', () => {
    expect(detectPlatform('https://www.tiktok.com/@voyageur/video/123')).toBe('tiktok');
    expect(detectPlatform('https://vm.tiktok.com/ZMabcdef/')).toBe('tiktok');
    expect(detectPlatform('https://vt.tiktok.com/ZSabcdef/')).toBe('tiktok');
  });

  it('reconnaît les différents domaines Instagram', () => {
    expect(detectPlatform('https://www.instagram.com/reel/Cabc123/')).toBe('instagram');
    expect(detectPlatform('https://instagram.com/p/Cabc123/')).toBe('instagram');
  });

  it('renvoie "other" pour les plateformes non supportées', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe('other');
    expect(detectPlatform('https://tiktok.com.evil.example.com/video/1')).toBe('other');
  });

  it('renvoie "other" pour une URL invalide', () => {
    expect(detectPlatform('pas une url')).toBe('other');
  });
});

describe('extractHashtags', () => {
  it('extrait les hashtags sans le dièse', () => {
    expect(extractHashtags('Superbe spot #paris #france')).toEqual(['paris', 'france']);
  });

  it('normalise la casse et dédoublonne', () => {
    expect(extractHashtags('#Paris #paris #PARIS')).toEqual(['paris']);
  });

  it('gère les accents et les chiffres', () => {
    expect(extractHashtags('#été #top10 #voyage_2026')).toEqual(['été', 'top10', 'voyage_2026']);
  });

  it('renvoie un tableau vide sans hashtag', () => {
    expect(extractHashtags('')).toEqual([]);
    expect(extractHashtags('Une légende sans tag')).toEqual([]);
  });
});

describe('extractOpenGraphDescription', () => {
  it('lit la balise og:description', () => {
    const html = `<meta property="og:description" content="Balade à Paris #paris" />`;
    expect(extractOpenGraphDescription(html)).toBe('Balade à Paris #paris');
  });

  it("accepte l'ordre inverse des attributs", () => {
    const html = `<meta content="Coucher de soleil #bali" property="og:description">`;
    expect(extractOpenGraphDescription(html)).toBe('Coucher de soleil #bali');
  });

  it('décode les entités HTML', () => {
    const html = `<meta property="og:description" content="Caf&#233; &amp; croissant #paris">`;
    expect(extractOpenGraphDescription(html)).toBe('Café & croissant #paris');
  });

  it('renvoie null quand la balise est absente', () => {
    expect(extractOpenGraphDescription('<html><body>rien</body></html>')).toBeNull();
  });
});
