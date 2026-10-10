// Identity colour presets (SPEC 10.3). General colours never change; only these values do.
// "neutral" is used for any destination without a preset. Contrast is checked in contrast.test.ts.
import type { TripTheme } from "../model/types";

export const THEMES: Record<string, TripTheme> = {
  neutral: {
    dark: "#1d3557",
    darker: "#14284a",
    accent: "#f2b84b",
    accentOnLight: "#8a5a00",
    regions: {},
  },
  brazil: {
    dark: "#114027",
    darker: "#0d3d24",
    accent: "#e0a815",
    accentOnLight: "#a8780a",
    regions: {},
  },
};

export const THEME_KEYS = Object.keys(THEMES);
