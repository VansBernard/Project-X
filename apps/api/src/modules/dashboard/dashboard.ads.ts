export interface DashboardAdItem {
  id: string;
  imageUrl: string;
  caption: string;
}

export interface DashboardAdsConfig {
  adsEnabled: boolean;
  ads: DashboardAdItem[];
}

function normalizeAdItem(item: unknown): DashboardAdItem | null {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return null;
  }

  const source = item as Record<string, unknown>;
  const id = typeof source.id === 'string' ? source.id : '';
  const imageUrl = typeof source.imageUrl === 'string' ? source.imageUrl.trim() : '';
  const caption = typeof source.caption === 'string' ? source.caption.trim() : '';

  if (!id || !imageUrl || !caption) {
    return null;
  }

  return { id, imageUrl, caption };
}

export function normalizeDashboardAdsConfig(value: unknown): DashboardAdsConfig {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  const adsEnabled = source.adsEnabled === true;
  const rawAds = Array.isArray(source.ads) ? source.ads : [];

  const ads = rawAds.flatMap((item) => {
    const normalized = normalizeAdItem(item);
    return normalized ? [normalized] : [];
  });

  return { adsEnabled, ads };
}

export function buildDashboardAdsValue(config: DashboardAdsConfig): Record<string, unknown> {
  return {
    adsEnabled: config.adsEnabled,
    ads: config.ads
      .map((ad) => ({ id: ad.id, imageUrl: ad.imageUrl, caption: ad.caption }))
      .filter((ad) => Boolean(ad.id && ad.imageUrl && ad.caption)),
  };
}
