// OG palette derived from shared tokens. Keeps OG and app in sync.
import { themeTokens, hslTokenToCss } from './tokens';

const dark = themeTokens.dark;

export const og = {
  colors: {
    backgroundDark: 'rgb(4,6,19)', // custom OG background image tone
    foregroundLight: 'rgb(246,247,249)',
    white: 'rgb(255,255,255)',
    mutedWhite64: 'rgba(255,255,255,0.64)',
    mutedWhite56: 'rgba(255,255,255,0.56)',
    whiteBorder10: 'rgba(255,255,255,0.10)',
    whiteBorder12: 'rgba(255,255,255,0.12)',
    blackBg08: 'rgba(0,0,0,0.08)',
    // Semantic from tokens (dark mode)
    success: hslTokenToCss(dark.success),
    danger: hslTokenToCss(dark.down),
    info: hslTokenToCss(dark.info),
    infoBg12: 'rgba(59,130,246,0.12)',
    neutralBg06: 'rgba(11,16,33,0.06)',
    neutralBorder12: 'rgba(11,16,33,0.12)',
    neutralFg: 'rgb(11,16,33)',
  },
} as const;
