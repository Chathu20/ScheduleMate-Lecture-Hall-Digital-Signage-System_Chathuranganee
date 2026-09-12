// Most tokens below resolve to CSS custom properties (see index.css) so the
// whole app responds to the light/dark toggle without every page needing to
// know which theme is active. A handful of brand/accent colors (navy,
// status pill colors, modal header colors) are intentionally fixed across
// both themes — they're small, self-contained colored elements that already
// carry their own readable text, so they don't need a dark variant.
export const colors = {
  navy: '#1a2744',
  headerNavy: '#1a2233',
  sidebarBg: 'var(--color-page-bg)',
  surface: 'var(--color-surface)',
  surfaceMuted: 'var(--color-surface-muted)',
  border: 'var(--color-border)',
  tableHeaderBg: 'var(--color-table-header)',
  textDark: 'var(--color-text)',
  textSecondary: 'var(--color-text-secondary)',
  textMuted: 'var(--color-text-muted)',
  inputBg: 'var(--color-input-bg)',

  ongoingBg: '#c8d9ed', ongoingText: '#0f4f89',
  upcomingBg: '#ccebbd', upcomingText: '#26702e',
  cancelledBg: '#f6d2d2', cancelledText: '#8f2020',
  rescheduledBg: '#ffe7bd', rescheduledText: '#9a6800',

  pillOngoingBg: '#a9cbea', pillOngoingText: '#15528a',
  pillUpcomingBg: '#ccebbd', pillUpcomingText: '#26702e',
  pillCancelledBg: '#efb0aa', pillCancelledText: '#9d2b25',
  pillRescheduledBg: '#f8dca8', pillRescheduledText: '#9a6700',
  pillActiveBg: '#b5e6d2', pillActiveText: '#08784a',
  pillInactiveBg: '#efb0aa', pillInactiveText: '#9d2b25',
  pillOnlineBg: '#b5e6d2', pillOnlineText: '#08784a',
  pillOfflineBg: '#efb0aa', pillOfflineText: '#9d2b25',

  modalNavy: '#1e2a4a',
  modalRed: '#c0392b',
  modalAmber: '#b8860b',
  modalGreen: '#1e7145',
  modalPurple: '#5b4fd6',

  linkBlue: 'var(--color-link)',
  danger: 'var(--color-danger)',
  warnBg: '#fdeecb',
  warnText: '#8a6215',
  warnBorder: '#f2d99a',

  shadowSm: 'var(--color-shadow-sm)',
  shadowMd: 'var(--color-shadow-md)',
  modalBackdrop: 'var(--color-modal-backdrop)',
};

export const fonts = {
  base: "'Segoe UI', system-ui, Roboto, Arial, sans-serif",
};

export const primaryBtn = {
  backgroundColor: colors.navy, color: '#fff', border: 'none',
  padding: '10px 20px', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
  fontSize: 14,
};
export const outlineBtn = {
  backgroundColor: colors.surface, color: colors.textDark, border: `1px solid ${colors.border}`,
  padding: '10px 20px', borderRadius: 4, cursor: 'pointer', marginLeft: 8,
  fontSize: 14, fontWeight: 600,
};
export const dangerBtn = { ...primaryBtn, backgroundColor: colors.danger };
export const amberBtn = { ...primaryBtn, backgroundColor: colors.modalAmber };
export const greenBtn = { ...primaryBtn, backgroundColor: colors.modalGreen };

export const inputStyle = {
  display: 'block', width: '100%', padding: '9px 10px', marginTop: 4, marginBottom: 12,
  boxSizing: 'border-box' as const, border: `1px solid ${colors.border}`, borderRadius: 4, fontSize: 14,
  fontFamily: fonts.base, backgroundColor: colors.inputBg, color: colors.textDark,
};
export const labelStyle = {
  fontSize: 12, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' as const,
  display: 'block', marginBottom: 2,
};

export const pageTitleStyle = {
  margin: '0 0 20px', fontSize: 26, fontWeight: 700, color: colors.textDark,
};

export const cardStyle = {
  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8,
};

export const tableWrapStyle = {
  backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: 'hidden' as const,
};

export const thStyle = {
  textAlign: 'left' as const, padding: '10px 14px', fontSize: 13, fontWeight: 700,
  color: colors.textSecondary, backgroundColor: colors.tableHeaderBg, borderBottom: `1px solid ${colors.border}`,
  textTransform: 'uppercase' as const,
};

export const tdStyle = {
  textAlign: 'left' as const, padding: '10px 14px', fontSize: 14, color: colors.textDark,
  borderBottom: `1px solid ${colors.border}`,
};

export const filterBarStyle = {
  display: 'flex', gap: 12, alignItems: 'center', backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14, marginBottom: 16, flexWrap: 'wrap' as const,
};

export const selectStyle = {
  padding: '8px 10px', borderRadius: 4, border: `1px solid ${colors.border}`, fontSize: 14,
  fontFamily: fonts.base, backgroundColor: colors.inputBg, color: colors.textDark,
};

export const linkBtnStyle = {
  color: colors.linkBlue, background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, padding: 0, marginRight: 12, fontFamily: fonts.base,
  display: 'inline-flex' as const, alignItems: 'center' as const, gap: 4, verticalAlign: 'middle' as const,
};

export const dangerLinkBtnStyle = { ...linkBtnStyle, color: colors.danger };

export function noteBoxStyle(kind: 'warn' | 'danger' = 'warn') {
  const bg = kind === 'warn' ? colors.warnBg : '#fbe1de';
  const border = kind === 'warn' ? colors.warnBorder : '#eebab2';
  const text = kind === 'warn' ? colors.warnText : '#8f2020';
  return {
    backgroundColor: bg, border: `1px solid ${border}`, color: text,
    borderRadius: 8, padding: '12px 16px', fontSize: 13.5, lineHeight: 1.5, marginBottom: 16,
  };
}

interface PillStyle {
  bg: string;
  text: string;
}

const STATUS_PILLS: Record<string, PillStyle> = {
  ACTIVE: { bg: colors.pillOngoingBg, text: colors.pillOngoingText },
  ONGOING: { bg: colors.pillOngoingBg, text: colors.pillOngoingText },
  UPCOMING: { bg: colors.pillUpcomingBg, text: colors.pillUpcomingText },
  CANCELLED: { bg: colors.pillCancelledBg, text: colors.pillCancelledText },
  RESCHEDULED: { bg: colors.pillRescheduledBg, text: colors.pillRescheduledText },
  ONLINE: { bg: colors.pillOnlineBg, text: colors.pillOnlineText },
  OFFLINE: { bg: colors.pillOfflineBg, text: colors.pillOfflineText },
  INACTIVE: { bg: colors.pillInactiveBg, text: colors.pillInactiveText },
};

export function statusPillStyle(status: string) {
  const s = STATUS_PILLS[status] || { bg: '#e5e7eb', text: '#374151' };
  return {
    display: 'inline-block', minWidth: 88, textAlign: 'center' as const,
    padding: '4px 12px', borderRadius: 20, backgroundColor: s.bg, color: s.text,
    fontSize: 12, fontWeight: 700, boxSizing: 'border-box' as const,
  };
}
