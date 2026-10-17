// components/Header/Styles.js
import { StyleSheet } from "react-native";
import theme from "../../utils/AppTheme";

const { COLORS, SIZES, FONTS, moderateScale, verticalScale } = theme;

export default StyleSheet.create({
  headerContainer: {
    paddingHorizontal: SIZES.padding.lg,
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(35),
    borderBottomLeftRadius: SIZES.radius.xl,
    borderBottomRightRadius: SIZES.radius.xl,
    ...theme.SHADOWS.lg,
    minHeight: verticalScale(185),
  },

  topHeaderSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: verticalScale(5),
  },

  faqIconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: SIZES.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.whiteOpacity20,
    borderWidth: 1,
    borderColor: COLORS.whiteOpacity50,
  },

  menuIconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: SIZES.radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.whiteOpacity20,
    borderWidth: 1,
    borderColor: COLORS.whiteOpacity50,
  },

  notificationBadge: {
    position: "absolute",
    right: -5,
    top: -5,
    backgroundColor: "red",
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  mainHeaderSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  logoContainer: {
    ...theme.SHADOWS.md,
  },

  headerLogo: {
    width: moderateScale(170),
    height: moderateScale(65),
  },

  /* Rate updated line */
  rateCardContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: verticalScale(8),
  },

  rateTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.padding.sm,
  },

  rateLabel: {
    color: COLORS.textWhite,
  },

  /* Floating cards */
  rateCardsOverlayContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "absolute",
    bottom:verticalScale(5),
    left: SIZES.padding.lg,
    right: SIZES.padding.lg,
    gap: SIZES.padding.md,
  },

  rateCardOverlay: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius.lg,
    padding: verticalScale(8),
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...theme.SHADOWS.lg,
    minHeight: verticalScale(60),
  },

  rateCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.padding.md,
    justifyContent: "center",
   
  },

  animatedCoinContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    alignItems: "center",
    justifyContent: "center",
  },

  rateCoinIcon: {
    width: moderateScale(50),
    height: moderateScale(50),
  },

  rateTextRightAligned: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
    
  },

  rateLabelRight: {
    ...FONTS.bodyMedium,
    color: COLORS.textSecondary,
    fontSize: SIZES.font.sm,
  },

  rateValueRight: {
    fontSize: SIZES.font.xl,
    color: COLORS.textPrimary,
    marginVertical: 2,
  },

  rateUnitRight: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    fontSize: SIZES.font.xs,
  },

  rateIconContainer: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    //  top: verticalScale(20),

  },

  shopTitle: {
    color: COLORS.primaryDark,
    fontSize:SIZES.font.xxl,
      // top: verticalScale(20),
    
  },
});
