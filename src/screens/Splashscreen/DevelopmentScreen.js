import React from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../../utils/AppTheme";

const palette = COLORS.update;
const serif = Platform.OS === "ios" ? "Georgia" : "serif";

export default function DevelopmentScreen({ message }) {
  const announcement = typeof message === "string" && message.trim()
    ? message.trim()
    : "We are taking a little time to refine your BMG Digi Silver experience. Please visit us again soon.";

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
              <Ionicons name="hourglass-outline" size={44} color={palette.ink} />
            </LinearGradient>
            <View style={styles.sparkle}><Ionicons name="sparkles" size={22} color={palette.gold} /></View>
          </View>
          <Text style={styles.eyebrow}>CRAFTED WITH CARE</Text>
          <Text accessibilityRole="header" style={styles.title}>{"Something finer\nis taking shape."}</Text>
          <View style={styles.separator}><View style={styles.line} /><View style={styles.diamond} /><View style={styles.line} /></View>
          <Text style={styles.description}>{announcement}</Text>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>TEMPORARILY UNAVAILABLE</Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.note}>
            <Ionicons name="heart-outline" size={20} color={palette.gold} />
            <Text style={styles.noteText}>Thank you for your patience. We look forward to welcoming you back.</Text>
          </View>
          <View style={styles.footer}><View style={styles.line} /><Text style={styles.footerText}>BMG JEWELLERS</Text><View style={styles.line} /></View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  content: { flexGrow: 1, alignItems: "center", paddingHorizontal: 28, paddingTop: 28, paddingBottom: 24 },
  brand: { alignItems: "center", marginBottom: 24 },
  brandName: { fontFamily: serif, fontSize: 32, letterSpacing: 7, paddingLeft: 7, color: palette.ink },
  brandRule: { height: 1, width: 40, backgroundColor: palette.gold, marginVertical: 8 },
  brandCaption: { fontFamily: FONTS.family.medium, fontSize: 9, letterSpacing: 3, color: palette.muted },
  hero: { flexGrow: 1, justifyContent: "center", alignItems: "center", maxWidth: 420, width: "100%", paddingVertical: 24 },
  emblem: { height: 164, width: 164, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  outerRing: { position: "absolute", height: 164, width: 164, borderRadius: 82, borderWidth: 1, borderColor: palette.border },
  innerRing: { position: "absolute", height: 142, width: 142, borderRadius: 71, borderWidth: 1, borderColor: palette.goldLight },
  medallion: { height: 112, width: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  sparkle: { position: "absolute", right: 2, top: 10, backgroundColor: palette.background, padding: 6 },
  eyebrow: { fontFamily: FONTS.family.medium, fontSize: 10, letterSpacing: 3, color: palette.gold, textAlign: "center", marginBottom: 16 },
  title: { fontFamily: serif, fontSize: 36, lineHeight: 44, textAlign: "center", color: palette.ink },
  separator: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 22 },
  line: { height: 1, width: 32, backgroundColor: palette.border },
  diamond: { height: 6, width: 6, backgroundColor: palette.gold, transform: [{ rotate: "45deg" }] },
  description: { fontFamily: FONTS.family.regular, fontSize: 13, lineHeight: 23, textAlign: "center", color: palette.muted, maxWidth: 310 },
  badge: { flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "center", gap: 8, borderWidth: 1, borderColor: palette.border, borderRadius: 24, backgroundColor: palette.surface, paddingHorizontal: 16, paddingVertical: 10, marginTop: 28 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.gold },
  badgeText: { fontFamily: FONTS.family.medium, fontSize: 9, letterSpacing: 1.2, color: palette.ink, flexShrink: 1, textAlign: "center" },
  bottom: { width: "100%", maxWidth: 420, paddingTop: 24 },
  note: { borderTopWidth: 1, borderColor: palette.border, paddingTop: 24, alignItems: "center", gap: 12 },
  noteText: { fontFamily: FONTS.family.regular, fontSize: 12, lineHeight: 21, textAlign: "center", color: palette.muted, maxWidth: 280 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 30 },
  footerText: { fontFamily: FONTS.family.medium, fontSize: 9, letterSpacing: 2, color: palette.gold },
});
