import type { Location } from '@tanstack/react-router';

interface SeoConfig {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  type?: 'website' | 'article';
}

const DEFAULT_SEO: SeoConfig = {
  title: 'Footcard - Futbol İstatistikleri ve Canlı Skorlar',
  description: 'Futbol maç sonuçlari, canli skorlar, takim ve oyuncu istatistikleri. Dunyanin en iyi futbol veri platformu.',
  ogImage: '/og-image.png',
  type: 'website',
};

export function generateSeo(config: Partial<SeoConfig>, location?: Location): SeoConfig {
  return {
    ...DEFAULT_SEO,
    ...config,
  };
}

export function generateMetaTags(seo: SeoConfig) {
  return {
    title: seo.title,
    description: seo.description,
    'og:title': seo.title,
    'og:description': seo.description,
    'og:type': seo.type || 'website',
    'og:image': seo.ogImage || DEFAULT_SEO.ogImage,
    'twitter:card': 'summary_large_image',
    'twitter:title': seo.title,
    'twitter:description': seo.description,
    'twitter:image': seo.ogImage || DEFAULT_SEO.ogImage,
  };
}

export function generateStructuredData(type: 'SportsTeam' | 'SportsEvent' | 'Person', data: any) {
  if (type === 'SportsTeam') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: data.name,
      image: data.image_path,
      foundingDate: data.founded,
      country: {
        '@type': 'Country',
        name: data.country?.name,
      },
    };
  }

  if (type === 'SportsEvent') {
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: data.name,
      startDate: data.starting_at,
      homeTeam: {
        '@type': 'SportsTeam',
        name: data.participants?.[0]?.name,
      },
      awayTeam: {
        '@type': 'SportsTeam',
        name: data.participants?.[1]?.name,
      },
    };
  }

  if (type === 'Person') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: data.display_name,
      birthDate: data.date_of_birth,
      height: data.height ? `${data.height} cm` : undefined,
      weight: data.weight ? `${data.weight} kg` : undefined,
      image: data.image_path,
    };
  }

  return null;
}
