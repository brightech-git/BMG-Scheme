import React, { useCallback, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, Linking, BackHandler,
  ScrollView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/AppTheme";

const palette = COLORS.update;

export default function ForceUpdateScreen({ route }) {
  const { storeUrl, installedVersion, latestVersion } = route?.params || {};
  const [opening, setOpening] = useState(false);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []));

  const openStore = async () => {
    if (opening) return;
    setOpening(true);
    try {
      await Linking.openURL(storeUrl || "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme");
    } catch {
      Alert.alert("Unable to open Google Play", "Please check your connection and search for BMG Digi Silver in Google Play.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Text style={styles.brandName}>BMG</Text>
          <View style={styles.brandRule} />
          <Text style={styles.brandCaption}>DIGI SILVER</Text>
        </View>

        <View style={styles.hero}>
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.emblem}>
            <View style={styles.outerRing} />
            <View style={styles.innerRing} />
            <LinearGradient colors={[palette.goldLight, palette.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.medallion}>
              <Ionicons name="diamond-outline" size={48} color={palette.ink} />
            </LinearGradient>
            <View style={styles.sparkle}><Ionicons name="sparkles" size={22} color={palette.gold} /></View>
          </View>
          <Text style={styles.eyebrow}>A NEW CHAPTER</Text>
          <Text accessibilityRole="header" style={styles.title}>{"A finer experience\nawaits you."}</Text>
          <View style={styles.separator}><View style={styles.line} /><View style={styles.diamond} /><View style={styles.line} /></View>
          <Text style={styles.description}>Update BMG Digi Silver to the latest version to continue your journey with us.</Text>
        </View>

        <View style={styles.bottom}>
          {!!installedVersion && !!latestVersion && (
            <View style={styles.versions}>
              <View style={styles.versionColumn}>
                <Text style={styles.versionLabel}>INSTALLED</Text>
                <Text style={styles.versionValue}>v{installedVersion}</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color={palette.gold} />
              <View style={styles.versionColumn}>
                <Text style={styles.versionLabel}>LATEST RELEASE</Text>
                <Text style={[styles.versionValue, styles.latest]}>v{latestVersion}</Text>
              </View>
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel="Update BMG Digi Silver on Google Play" accessibilityState={{ disabled: opening, busy: opening }} disabled={opening} onPress={openStore} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, opening && styles.buttonBusy]}>
            <LinearGradient colors={[palette.dark, palette.ink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonFill}>
              {opening ? <ActivityIndicator color={palette.goldLight} /> : <Ionicons name="logo-google-playstore" size={20} color={palette.goldLight} />}
              <Text style={styles.buttonText}>{opening ? "Opening Google Play..." : "Update now"}</Text>
              {!opening && <Ionicons name="arrow-forward" size={20} color={palette.goldLight} />}
            </LinearGradient>
          </Pressable>
          <Text style={styles.required}>Please update to continue using the app.</Text>
          <View style={styles.footer}><View style={styles.footerLine} /><Text style={styles.footerText}>BMG JEWELLERS</Text><View style={styles.footerLine} /></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24, alignItems: "center" },
  brand: { alignItems: "center", marginBottom: 24 },
  brandName: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 32, color: palette.ink, letterSpacing: 7, paddingLeft: 7 },
  brandRule: { height: 1, width: 40, backgroundColor: palette.gold, marginVertical: 8 },
  brandCaption: { fontFamily: "Poppins-Medium", fontSize: 9, letterSpacing: 3, color: palette.muted },
  hero: { flexGrow: 1, justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 420, paddingVertical: 12 },
  emblem: { height: 164, width: 164, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  outerRing: { position: "absolute", height: 164, width: 164, borderRadius: 82, borderWidth: 1, borderColor: palette.border },
  innerRing: { position: "absolute", height: 142, width: 142, borderRadius: 71, borderWidth: 1, borderColor: palette.goldLight },
  medallion: { height: 112, width: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", right: 2, top: 10, backgroundColor: palette.background, padding: 6 },
  eyebrow: { fontFamily: "Poppins-Medium", fontSize: 10, letterSpacing: 3, color: palette.gold, textAlign: "center", marginBottom: 16 },
  title: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontSize: 36, lineHeight: 44, color: palette.ink, textAlign: "center" },
  separator: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  line: { height: 1, width: 36, backgroundColor: palette.border },
  diamond: { height: 6, width: 6, backgroundColor: palette.gold, transform: [{ rotate: "45deg" }] },
  description: { fontFamily: "Poppins-Regular", fontSize: 13, lineHeight: 23, color: palette.muted, textAlign: "center", maxWidth: 290 },
  bottom: { width: "100%", maxWidth: 420, paddingTop: 28 },
  versions: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.border, paddingVertical: 18, marginBottom: 24 },
  versionColumn: { alignItems: "center", flexShrink: 1, paddingHorizontal: 8 },
  versionLabel: { fontFamily: "Poppins-Medium", fontSize: 9, letterSpacing: 1.4, color: palette.muted, textAlign: "center", marginBottom: 5 },
  versionValue: { fontFamily: "Poppins-Medium", fontSize: 16, color: palette.muted },
  latest: { color: palette.ink },
  button: { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: palette.gold },
  buttonPressed: { opacity: 0.85 },
  buttonBusy: { opacity: 0.7 },
  buttonFill: { minHeight: 60, paddingVertical: 18, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  buttonText: { fontFamily: "Poppins-Medium", color: palette.background, fontSize: 15, flex: 1, textAlign: "center" },
  required: { fontFamily: "Poppins-Regular", fontSize: 11, lineHeight: 18, color: palette.muted, textAlign: "center", marginTop: 14 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 30 },
  footerLine: { height: 1, width: 24, backgroundColor: palette.border },
  footerText: { fontFamily: "Poppins-Medium", fontSize: 9, letterSpacing: 2, color: palette.gold },
});
