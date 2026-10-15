import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TextDefault } from "../../components";
import appTheme from "../../utils/MainTheme";

import scheme1 from "../../assets/image/2.jpg";
import scheme2 from "../../assets/image/3.jpg";
import scheme3 from "../../assets/image/4.jpg";
import defaultImage from "../../assets/image/1.jpg"; // ← Add fallback image

const { COLORS, SIZES, FONTS, moderateScale, SHADOWS } = appTheme;

function GoldPlan({
  schemeId = 0,
  schemeName = "Unnamed Scheme",
  description = "",
  schemeImage,            // ✅ receive dynamic API image
  styles: customStyles,
}) {
  const navigation = useNavigation();

  // Map local fallback images (useful if no API image)
  const schemeImagesById = {
    1: scheme1,
    2: scheme3,
    3: scheme2,
  };

  // FINAL IMAGE LOGIC
  const finalImage = schemeImage        // 1️⃣ API URL
    ? { uri: schemeImage }
    : schemeImagesById[schemeId]        // 2️⃣ local fallback (if matching id)
      ? schemeImagesById[schemeId]
      : defaultImage;                   // 3️⃣ final fallback image



  const handleJoinScheme = () => {
    navigation.navigate("AddNewMember", {
      schemeId,
      schemeName,
    });
  };
const knowMoreScreens = {
  1: "BrightKnowMore",
  2: "SmartPayKnowMore",
  3: "LumpsumKnowMore",
};

const handleKnowMore = () => {
  const screenName = knowMoreScreens[schemeId] || "KnowMore";

  navigation.navigate(screenName, {
    schemeId,
    schemeName,
  });
};

  return (
    <View style={[styles.cardContainer, customStyles]}>
      <ImageBackground
        source={finalImage}                 // ✅ Correct image applied
        style={styles.imageBackground}

        resizeMode="contain"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.knowMoreButton]}
          onPress={handleKnowMore}
        >
          <TextDefault style={styles.knowMoreButtonText}>Know More</TextDefault>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={handleJoinScheme}
        >
          <TextDefault style={styles.joinButtonText}>Join Scheme</TextDefault>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    // borderRadius: SIZES.radius.lg,
    overflow: "hidden",
    width: "100%",
    alignSelf: "center",
    marginVertical: moderateScale(5),
    // backgroundColor: COLORS.surface,
    // ...SHADOWS.sm,
  },
  imageBackground: {
    width: "100%",
    height: moderateScale(200),
    justifyContent: "flex-end",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: SIZES.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  knowMoreButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginRight: moderateScale(8),
  },
  joinButton: {
    backgroundColor: COLORS.secondary,
    marginLeft: moderateScale(8),
  },
  knowMoreButtonText: {
    ...FONTS.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  joinButtonText: {
    ...FONTS.bodySmall,
    color: COLORS.textInverse,
    fontWeight: "600",
  },
});

export default GoldPlan;
