import { COLORS } from '../../marketing/utils/leadStats';

/** The five lead sources, in the order they appear in the filter bar, the cards and the sidebar. */
export const SOURCES = [
  { key: 'meta', label: 'Meta Ads', short: 'Meta', letter: 'M', color: COLORS.facebook },
  { key: 'whatsapp', label: 'WhatsApp', short: 'WhatsApp', letter: 'Wa', color: '#1fa855' },
  { key: 'google', label: 'Google Ads', short: 'Google', letter: 'G', color: COLORS.google },
  { key: 'googleclick', label: 'Google Click', short: 'Google Click', letter: 'Gc', color: COLORS.google },
  { key: 'website', label: 'Website', short: 'Website', letter: 'W', color: COLORS.website },
  { key: 'organic', label: 'Organic', short: 'Organic', letter: 'O', color: '#d63384' },
  { key: 'unknown', label: 'Unknown', short: 'Unknown', letter: '?', color: '#64748b' },
];

export const sourceByKey = (key) => SOURCES.find((source) => source.key === key) ?? null;
