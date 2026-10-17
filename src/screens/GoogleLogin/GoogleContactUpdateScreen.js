import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { showToast } from "../../utils/toast";
import theme from "../../utils/AppTheme";
import userService from "../../services/UserService";

const getHash = Platform.OS === "android"
  ? require("react-native-otp-verify").getHash
  : () => Promise.resolve([]);

const { COLORS, SIZES, FONTS, SHADOWS } = theme;

export default function GoogleContactUpdateScreen({ navigation, route }) {
  const { userId } = route.params;
  const [mobile, setMobile] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [hashKey, setHashKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (Platform.OS === "android") {
      getHash()
        .then((hash) => { if (hash?.[0]) setHashKey(hash[0]); })
        .catch(() => {});
    }
  }, []);

  const handleSendOtp = async () => {
    if (!mobile.trim() || mobile.trim().length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await userService.requestGoogleContactUpdate({
        userId,
        newContactNumber: mobile.trim(),
        usedReferralCode: referralCode.trim() || undefined,
        hashKey: hashKey || undefined,
      });

      if (res.success) {
        showToast("OTP sent to " + mobile.trim());
        navigation.navigate("GoogleContactVerifyOTP", {
          newContactNumber: mobile.trim(),
          userId,
        });
      } else {
        showToast(res.error || "Failed to send OTP");
      }
    } catch {
      showToast("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="Add Mobile Number" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Link Your Mobile</Text>
          <Text style={styles.subtitle}>
            Your account needs a mobile number to complete setup.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>
              Mobile Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={(v) => { setMobile(v.replace(/\D/g, "")); setError(""); }}
            />
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.label}>
              Referral Code <Text style={styles.optional}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter referral code"
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleSendOtp}
              disabled={loading}
            >
              <LinearGradient
                colors={COLORS.gradient.brand}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SIZES.padding.xl, paddingTop: SIZES.xxl },
  title: { ...FONTS.h2, color: COLORS.textPrimary, marginBottom: SIZES.xs },
  subtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xl,
    lineHeight: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SIZES.sm,
  },
  label: { ...FONTS.bodyMedium, color: COLORS.textPrimary },
  required: { color: COLORS.error },
  optional: { color: COLORS.textTertiary, fontWeight: "400" },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: SIZES.radius.md,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: SIZES.padding.md,
    paddingVertical: SIZES.padding.md,
    fontSize: SIZES.font.md,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: SIZES.font.sm, marginBottom: SIZES.xs },
  button: { borderRadius: SIZES.radius.md, overflow: "hidden", height: 50, marginTop: SIZES.sm },
  buttonGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  buttonText: { ...FONTS.button, color: COLORS.white },
  disabledButton: { opacity: 0.6 },
});
