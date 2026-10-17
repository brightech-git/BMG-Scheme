import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { showToast } from "../../utils/toast";
import theme from "../../utils/AppTheme";
import userService from "../../services/UserService";
import { saveUserData } from "../../utils/AsynchStorageHelper";

const OtpVerifyLib = Platform.OS === "android" ? require("react-native-otp-verify") : {};
const {
  useOtpVerify = () => ({ message: null }),
  removeListener = () => {},
} = OtpVerifyLib;

const { COLORS, SIZES, FONTS, SHADOWS } = theme;

export default function GoogleContactVerifyOTPScreen({ navigation, route }) {
  const { newContactNumber, userId } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef([]);
  const verifyCalledRef = useRef(false);

  const { message } = useOtpVerify({ numberOfDigits: 6 });

  // Auto-detect OTP from SMS
  useEffect(() => {
    if (!message) return;
    const digits = message.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) {
      setOtp(digits.split(""));
    }
  }, [message]);

  useEffect(() => {
    return () => { removeListener(); };
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleOtpChange = (val, idx) => {
    const updated = [...otp];
    updated[idx] = val;
    setOtp(updated);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    else if (!val && idx > 0) inputRefs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      showToast("Please enter the 6-digit OTP");
      return;
    }
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;
    setLoading(true);

    try {
      const res = await userService.verifyGoogleContactOtp({
        newContactNumber,
        otp: otpValue,
      });

      if (res.success && res.data) {
        await saveUserData({ ...res.data, id: res.data.id ?? userId });
        showToast("Mobile linked successfully!");
        navigation.replace("MpinScreen");
      } else {
        verifyCalledRef.current = false;
        showToast(res.error || "Invalid OTP. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      verifyCalledRef.current = false;
      showToast("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""]);
    setResendTimer(30);
    verifyCalledRef.current = false;
    showToast("OTP resent to " + newContactNumber);
    inputRefs.current[0]?.focus();
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="Verify Mobile" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Code sent to <Text style={styles.phone}>+91 {newContactNumber}</Text>
          </Text>

          <View style={styles.card}>
            <View style={styles.otpRow}>
              {otp.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={(r) => (inputRefs.current[idx] = r)}
                  style={styles.otpBox}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v.replace(/\D/g, "").slice(-1), idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={idx === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleVerify}
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
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.resendRow}>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>Resend OTP in {resendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>
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
  subtitle: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: SIZES.xl },
  phone: { ...FONTS.bodyMedium, color: COLORS.textPrimary },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.xl,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    gap: SIZES.lg,
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SIZES.sm,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: SIZES.radius.md,
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.inputBackground,
    fontSize: SIZES.font.xl,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  button: { borderRadius: SIZES.radius.md, overflow: "hidden", height: 50 },
  buttonGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  buttonText: { ...FONTS.button, color: COLORS.white },
  disabledButton: { opacity: 0.6 },
  resendRow: { alignItems: "center" },
  resendTimer: { ...FONTS.body, color: COLORS.textTertiary },
  resendLink: { ...FONTS.bodyMedium, color: COLORS.primary },
});
