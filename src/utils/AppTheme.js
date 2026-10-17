// theme.js
import { Dimensions, PixelRatio } from "react-native";

const { width, height } = Dimensions.get("window");

// ============================================
// 📏 RESPONSIVE SCALING SYSTEM
// ============================================
const guidelineBaseWidth = 375; // iPhone 11 Pro base
const guidelineBaseHeight = 812;

// Scale based on device width
const scale = (size) => (width / guidelineBaseWidth) * size;

// Scale based on device height
const verticalScale = (size) => (height / guidelineBaseHeight) * size;

// Moderate scale with configurable factor (prevents extreme scaling)
const moderateScale = (size, factor = 0.25) => {
  return size + (scale(size) - size) * factor;
};

// Font scale with pixel ratio consideration
const fontScale = (size) => {
  const scaled = moderateScale(size, 0.2);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

// ============================================
// 🎨 COLOR PALETTE
// ============================================
export const COLORS = {
  update: {
    background: "#FBF7F0",
    ink: "#30261D",
    muted: "#7C7062",
    gold: "#AC8345",
    goldLight: "#E8D5AC",
    border: "#E8DECD",
    surface: "#F3EBDD",
    dark: "#30271F",
  },
  // ===== PRIMARY BRAND COLORS =====
  primary: "#FF5724", // Client's Primary Color (Orange-Red)
  primaryLight: "#FF7A4D", // Light orange
  primaryDark: "#E64310", // Darker orange
  primaryLighter: "#FFA285", // Even lighter orange

  secondary: "#FFD700", // Gold (Digi Gold theme)
  secondaryLight: "#FFE44D", // Light gold
  secondaryDark: "#CCA900", // Dark gold

  accent: "#FFA500", // Orange accent
  accentLight: "#FFB733", // Light orange accent
  accentDark: "#CC8400", // Dark orange accent

  // ===== NEUTRAL COLORS =====
  white: "#FFFFFF",
  black: "#000000",
  background: "#FFFFFF",
  backgroundSecondary: "#F8F9FA",
  backgroundTertiary: "#F5F5F5",
  surface: "#F9F9F9",
  card: "#FFFFFF",
  overlay: "rgba(0, 0, 0, 0.5)",

  // ===== TEXT COLORS =====
  textPrimary: "rgba(7, 13, 63, 1)", // Main text color (dark blue/near black)
  textSecondary: "#757575", // Secondary text (gray)
  textTertiary: "#9E9E9E", // Tertiary text (lighter gray)
  textDisabled: "#BDBDBD", // Disabled text (light gray)
  textInverse: "#FFFFFF", // Text on dark backgrounds
  textWhite: "#FFFFFF", // Pure white text

  // ===== GRAY SCALE =====
  gray50: "#FAFAFA",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  gray600: "#757575",
  gray700: "#616161",
  gray800: "#424242",
  gray900: "#212121",

  // ===== BORDER & DIVIDER =====
  border: "#E0E0E0",
  borderLight: "#F5F5F5",
  borderMedium: "#DDDDDD",
  borderDark: "#BDBDBD",
  divider: "#E0E0E0",

  // ===== INPUT COLORS =====
  inputBackground: "#F0F0F0",
  inputBorder: "#E0E0E0",
  inputPlaceholder: "rgba(0, 0, 0, 0.4)",
  inputFocused: "#FF5724", // Primary color for focus

  // ===== STATUS COLORS =====
  success: "#4CAF50",
  successLight: "#81C784",
  error: "#F44336",
  errorLight: "#EF5350",
  warning: "#FF9800",
  warningLight: "#FFB74D",
  info: "#2196F3",
  infoLight: "#64B5F6",
  disabled: "#F2F2F2",

  // ===== GOLD RELATED COLORS =====
  goldPrimary: "#FFD700",
  goldSecondary: "#FFA500",
  goldBronze: "#CD7F32",
  goldYellow: "#FFD700",
  goldOrange: "#FFA500",

  // ===== TRANSPARENT COLORS =====
  transparent: "transparent",
  blackOpacity10: "rgba(0, 0, 0, 0.1)",
  blackOpacity20: "rgba(0, 0, 0, 0.2)",
  blackOpacity30: "rgba(0, 0, 0, 0.3)",
  blackOpacity50: "rgba(0, 0, 0, 0.5)",
  whiteOpacity10: "rgba(255, 255, 255, 0.1)",
  whiteOpacity20: "rgba(255, 255, 255, 0.2)",
  whiteOpacity50: "rgba(255, 255, 255, 0.5)",
  primaryOpacity10: "rgba(255, 87, 36, 0.1)",
  primaryOpacity20: "rgba(255, 87, 36, 0.2)",
  primaryOpacity30: "rgba(255, 87, 36, 0.3)",

  // ===== SHADOW & EFFECTS =====
  shadow: "rgba(0, 0, 0, 0.08)",
  shadowMedium: "rgba(0, 0, 0, 0.15)",
  shadowStrong: "rgba(0, 0, 0, 0.25)",

  // ===== GRADIENT COLORS =====
  gradient: {
    primary: ["#FF5724", "#FF7A4D"], // Primary gradient
    primaryDark: ["#E64310", "#FF5724"], // Dark to primary
    secondary: ["#FFD700", "#FFE44D"], // Secondary gradient
    brand: ["#FF5724", "#FFD700"], // Primary to Gold
    brandReverse: ["#FFD700", "#FF5724"], // Gold to Primary
    warm: ["#FF5724", "#FFA500"], // Orange variations
    gold: ["#FFD700", "#FFA500"], // Gold gradient
    surface: ["#F9F9F9", "#FFFFFF"], // Neutral surface
    success: ["#4CAF50", "#66BB6A"], // Green gradient
    vibrant: ["#FF7A4D", "#FFD700"], // Light orange to gold
    info: ["#2196F3", "#64B5F6"], // Blue gradient
    warning: ["#FF9800", "#FFB74D"], // Orange gradient
    error: ["#F44336", "#EF5350"], // Red gradient
    disabled: ["#E0E0E0", "#F5F5F5"], // Gray gradient
  },
};

// ============================================
// 📐 SIZING SYSTEM
// ============================================
export const SIZES = {
  // ===== BASE SIZE =====
  base: 16,

  // ===== SPACING SCALE =====
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(16),
  lg: moderateScale(24),
  xl: moderateScale(32),
  xxl: moderateScale(48),
  xxxl: moderateScale(64),

  // ===== PADDING & MARGIN =====
  padding: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
    xxl: moderateScale(24),
    xxxl: moderateScale(32),
  },

  margin: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(20),
    xxl: moderateScale(24),
    xxxl: moderateScale(32),
  },

  // ===== BORDER RADIUS =====
  radius: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(12),
    lg: moderateScale(16),
    xl: moderateScale(24),
    xxl: moderateScale(32),
    full: 9999,
  },

  // ===== FONT SIZES =====
  font: {
    xxs: fontScale(8),
    xs: fontScale(10),
    sm: fontScale(12),
    md: fontScale(14),
    lg: fontScale(16),
    xl: fontScale(18),
    xxl: fontScale(20),
    xxxl: fontScale(24),
  },

  // ===== HEADING SIZES =====
  heading: {
    h1: fontScale(32),
    h2: fontScale(28),
    h3: fontScale(24),
    h4: fontScale(20),
    h5: fontScale(18),
    h6: fontScale(16),
  },

  // ===== ICON SIZES =====
  icon: {
    xs: moderateScale(12),
    sm: moderateScale(16),
    md: moderateScale(20),
    lg: moderateScale(24),
    xl: moderateScale(28),
    xxl: moderateScale(32),
    xxxl: moderateScale(48),
  },

  // ===== DIMENSIONS =====
  screen: {
    width,
    height,
    isSmallDevice: width < 375,
    isMediumDevice: width >= 375 && width < 414,
    isLargeDevice: width >= 414,
  },

  // ===== COMPONENT SIZES =====
  button: {
    sm: moderateScale(36),
    md: moderateScale(44),
    lg: moderateScale(52),
    xl: moderateScale(60),
  },

  input: {
    sm: moderateScale(36),
    md: moderateScale(44),
    lg: moderateScale(52),
    height: moderateScale(48),
  },

  card: {
    padding: moderateScale(16),
  },
};

// ============================================
// 🔤 TYPOGRAPHY SYSTEM
// ============================================
export const FONTS = {
  // ===== FONT FAMILIES =====
  family: {
    regular: "Poppins-Regular",
    medium: "Poppins-Medium",
    semiBold: "Poppins-SemiBold",
    bold: "Poppins-Bold",
    light: "Poppins-Light",
    extraBold: "Poppins-ExtraBold",
    thin: "Poppins-Thin",

    // Aliases
    heading: "Poppins-Bold",
    body: "Poppins-Regular",
    bodyBold: "Poppins-Bold",
  },

  // ===== FONT WEIGHTS =====
  weight: {
    thin: "100",
    light: "300",
    regular: "400",
    medium: "500",
    semiBold: "600",
    bold: "700",
    extraBold: "800",
  },

  // ===== HEADING STYLES =====
  h1: {
    fontFamily: "Poppins-Bold",
    fontSize: SIZES.heading.h1,
    lineHeight: SIZES.heading.h1 * 1.2,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  h2: {
    fontFamily: "Poppins-Bold",
    fontSize: SIZES.heading.h2,
    lineHeight: SIZES.heading.h2 * 1.3,
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  h3: {
    fontFamily: "Poppins-SemiBold",
    fontSize: SIZES.heading.h3,
    lineHeight: SIZES.heading.h3 * 1.3,
    color: COLORS.textPrimary,
  },
  h4: {
    fontFamily: "Poppins-SemiBold",
    fontSize: SIZES.heading.h4,
    lineHeight: SIZES.heading.h4 * 1.4,
    color: COLORS.textPrimary,
  },
  h5: {
    fontFamily: "Poppins-Medium",
    fontSize: SIZES.heading.h5,
    lineHeight: SIZES.heading.h5 * 1.4,
    color: COLORS.textPrimary,
  },
  h6: {
    fontFamily: "Poppins-Regular",
    fontSize: SIZES.heading.h6,
    lineHeight: SIZES.heading.h6 * 1.5,
    color: COLORS.textPrimary,
  },

  // ===== BODY TEXT STYLES =====
  bodyLarge: {
    fontFamily: "Poppins-Regular",
    fontSize: SIZES.font.lg,
    lineHeight: SIZES.font.lg * 1.5,
    color: COLORS.textPrimary,
  },
  body: {
    fontFamily: "Poppins-Regular",
    fontSize: SIZES.font.md,
    lineHeight: SIZES.font.md * 1.5,
    color: COLORS.textPrimary,
  },
  bodyMedium: {
    fontFamily: "Poppins-Medium",
    fontSize: SIZES.font.md,
    lineHeight: SIZES.font.md * 1.5,
    color: COLORS.textPrimary,
  },
  bodySmall: {
    fontFamily: "Poppins-Regular",
    fontSize: SIZES.font.sm,
    lineHeight: SIZES.font.sm * 1.5,
    color: COLORS.textSecondary,
  },

  // ===== LABEL & CAPTION =====
  label: {
    fontFamily: "Poppins-SemiBold",
    fontSize: SIZES.font.sm,
    lineHeight: SIZES.font.sm * 1.5,
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  caption: {
    fontFamily: "Poppins-Regular",
    fontSize: SIZES.font.xs,
    lineHeight: SIZES.font.xs * 1.5,
    color: COLORS.textSecondary,
  },

  // ===== BUTTON TEXT =====
  button: {
    fontFamily: "Poppins-SemiBold",
    fontSize: SIZES.font.md,
    lineHeight: SIZES.font.md * 1.5,
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
};

// ============================================
// 🎭 SHADOWS
// ============================================
export const SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
};

// ============================================
// 📱 DEVICE BREAKPOINTS
// ============================================
export const BREAKPOINTS = {
  small: width < 375,
  medium: width >= 375 && width < 768,
  large: width >= 768,
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 768,
  isLargeDevice: width >= 768,
};

// ============================================
// 🎨 COMMON STYLES
// ============================================
export const COMMON_STYLES = {
  // Button Styles
  button: {
    primary: {
      backgroundColor: COLORS.primary,
      borderRadius: SIZES.radius.md,
      paddingVertical: SIZES.padding.md,
      paddingHorizontal: SIZES.padding.xl,
      ...SHADOWS.sm,
    },
    secondary: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.md,
      paddingVertical: SIZES.padding.md,
      paddingHorizontal: SIZES.padding.xl,
      borderWidth: 1,
      borderColor: COLORS.primary,
    },
    outline: {
      backgroundColor: COLORS.transparent,
      borderRadius: SIZES.radius.md,
      paddingVertical: SIZES.padding.md,
      paddingHorizontal: SIZES.padding.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    gold: {
      backgroundColor: COLORS.secondary,
      borderRadius: SIZES.radius.md,
      paddingVertical: SIZES.padding.md,
      paddingHorizontal: SIZES.padding.xl,
      ...SHADOWS.sm,
    },
  },

  // Input Styles
  input: {
    default: {
      borderWidth: 1,
      borderColor: COLORS.inputBorder,
      borderRadius: SIZES.radius.sm,
      paddingHorizontal: SIZES.padding.md,
      paddingVertical: SIZES.padding.sm,
      fontSize: SIZES.font.md,
      fontFamily: FONTS.family.regular,
      color: COLORS.textPrimary,
      backgroundColor: COLORS.inputBackground,
    },
    focused: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.white,
    },
    error: {
      borderColor: COLORS.error,
    },
  },

  // Card Styles
  card: {
    default: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.md,
      padding: SIZES.padding.lg,
      ...SHADOWS.sm,
    },
    elevated: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.md,
      padding: SIZES.padding.lg,
      ...SHADOWS.md,
    },
  },
};

// ============================================
// 🎯 EXPORT DEFAULT THEME
// ============================================
const theme = {
  COLORS,
  SIZES,
  FONTS,
  SHADOWS,
  BREAKPOINTS,
  COMMON_STYLES,
  // Utility functions
  scale,
  verticalScale,
  moderateScale,
  fontScale,
};

export default theme;

// Export individual utilities
export { scale, verticalScale, moderateScale, fontScale };
