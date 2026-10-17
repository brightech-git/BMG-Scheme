import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OtpVerifyLib = Platform.OS === "android" ? require("react-native-otp-verify") : {};
const { getHash = () => Promise.resolve([]), useOtpVerify = () => ({}), removeListener = () => {} } = OtpVerifyLib;
import { showToast } from "../../utils/toast";
import theme from "../../utils/AppTheme"; // Changed from appTheme to theme
import styles from "./OtpStyles.js";
import userService from "../../services/UserService";
import { saveUserData } from "../../utils/AsynchStorageHelper";

const { COLORS, SIZES, FONTS } = theme;

function OtpPage({ navigation, route }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(20);
  const [autoCompleteOtp, setAutoCompleteOtp] = useState("");
  const [autoVerifyTimer, setAutoVerifyTimer] = useState(20);
  const [appHash, setAppHash] = useState([]);
  const [waitingForOtp, setWaitingForOtp] = useState(true);
  const [smsListenerReady, setSmsListenerReady] = useState(false);
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);

  const inputRefs = useRef([]);
  const phoneNumber = route.params?.phoneNumber || "";

  const { message, timeoutError, startListener, stopListener } = useOtpVerify({
    numberOfDigits: 6,
  });

  // -------------------- TIMER --------------------
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  // -------------------- DETECT OTP FROM MESSAGE --------------------
  const detectOtpFromMessage = (smsMessage) => {
    if (!smsMessage) return null;
    console.log("📩 Analyzing SMS for OTP:", smsMessage);

    const patterns = [
      /your\s+otp\s+(?:for\s+\w+\s+)?is\s*(\d{6})/i,
      /otp.*?is\s*[:\-]?\s*(\d{6})/i,
      /otp[:\s]+(\d{6})/i,
      /\b(\d{6})\b/,
    ];

    for (const pattern of patterns) {
      const match = smsMessage.match(pattern);
      if (match) {
        const detected = match[1] || match[0];
        console.log("✅ OTP Detected:", detected);
        return detected;
      }
    }

    console.log("❌ No OTP detected");
    return null;
  };

  // -------------------- HANDLE INCOMING SMS --------------------
  useEffect(() => {
    if (message && smsListenerReady) {
      console.log("📨 SMS message received:", message);
      const detectedOtp = detectOtpFromMessage(message);

      if (detectedOtp && detectedOtp.length === 6) {
        setAutoCompleteOtp(detectedOtp);
        setOtp(detectedOtp.split(""));
        setWaitingForOtp(false);
        setShowFullScreenLoader(false);
        showToast("OTP detected automatically!");

        setTimeout(() => {
          handleVerifyOtp();
        }, 800);
      }
    }
  }, [message, smsListenerReady]);

  // -------------------- WAITING LOADER (20 seconds) --------------------
  useEffect(() => {
    if (smsListenerReady && Platform.OS === "android") {
      setShowFullScreenLoader(true);

      const timer = setTimeout(() => {
        setWaitingForOtp(false);
        setShowFullScreenLoader(false);
        showToast("You can enter OTP manually");
      }, 20000);

      return () => clearTimeout(timer);
    }
  }, [smsListenerReady]);

  // -------------------- HANDLE TIMEOUT --------------------
  useEffect(() => {
    if (timeoutError) {
      showToast("OTP detection timeout. Please enter it manually.");
      setWaitingForOtp(false);
      setShowFullScreenLoader(false);
    }
  }, [timeoutError]);

  // -------------------- AUTO VERIFY TIMER (20 seconds) --------------------
  useEffect(() => {
    if (waitingForOtp && smsListenerReady && Platform.OS === "android") {
      setAutoVerifyTimer(20);
      const interval = setInterval(() => {
        setAutoVerifyTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setWaitingForOtp(false);
            setShowFullScreenLoader(false);
            showToast("You can enter OTP manually");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [waitingForOtp, smsListenerReady]);

  // -------------------- INITIALIZE LISTENER --------------------
  useEffect(() => {
    const initializeSMSListener = async () => {
      if (Platform.OS === "android") {
        try {
          console.log("🔄 Initializing SMS listener...");
          const hashCodes = await getHash();
          setAppHash(hashCodes);
          console.log("📲 App Hash:", hashCodes);

          if (startListener) {
            startListener();
            setSmsListenerReady(true);
            console.log("✅ SMS listener started successfully");
          }
        } catch (error) {
          console.error("❌ Error initializing SMS listener:", error);
          setWaitingForOtp(false);
          setSmsListenerReady(false);
          setShowFullScreenLoader(false);
        }
      } else {
        setWaitingForOtp(false);
        setSmsListenerReady(false);
        setShowFullScreenLoader(false);
      }
    };

    initializeSMSListener();

    return () => {
      try {
        removeListener();
        stopListener && stopListener();
        setSmsListenerReady(false);
        setShowFullScreenLoader(false);
      } catch (error) {
        console.error("Cleanup SMS listener error:", error);
      }
    };
  }, []);

  // -------------------- AUTO VERIFY WHEN ALL DIGITS ENTERED --------------------
  useEffect(() => {
    const otpValue = otp.join("");
    if (otpValue.length === 6 && !verifying && !waitingForOtp) {
      console.log("🔍 Auto-verifying:", otpValue);
      handleVerifyOtp();
    }
  }, [otp]);

  // -------------------- OTP HANDLERS --------------------
  const handleOtpChange = (val, idx) => {
    if (val && waitingForOtp) {
      setWaitingForOtp(false);
      setShowFullScreenLoader(false);
    }

    const updated = [...otp];
    updated[idx] = val;
    setOtp(updated);

    if (val && idx < otp.length - 1) {
      inputRefs.current[idx + 1]?.focus();
    } else if (!val && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const clearOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setAutoCompleteOtp("");
    inputRefs.current[0]?.focus();
  };

const handleVerifyOtp = async () => {
  const otpValue = otp.join("");
  if (otpValue.length !== 6) {
    showToast("Please enter 6-digit OTP");
    return;
  }

  console.log("✅ Verifying OTP:", otpValue);
  setVerifying(true);
  setShowFullScreenLoader(true);

  try {
    const tempUserData = await AsyncStorage.getItem("tempUserData");
    if (!tempUserData) {
      showToast("User data not found. Please try again.");
      setVerifying(false);
      setShowFullScreenLoader(false);
      return;
    }

    const { phone } = JSON.parse(tempUserData);
    const res = await userService.verifyOtp(phone, otpValue);

    if (res.success && res.data) {
      showToast("OTP verified successfully!");
      
      const userData = res.data;
      console.log("📋 User Data Received:", userData);
      
      // Check if user has a used_referral_code in the response
      if (userData.used_referral_code) {
        console.log("🎯 Found referral code to verify:", {
          userId: userData.id,
          referralCode: userData.used_referral_code
        });
        
        try {
          // Call the referral check API
          const referralCheckResponse = await userService.checkReferralCode(
            userData.id, 
            userData.used_referral_code
          );
          
          console.log("📨 Referral API Response:", referralCheckResponse);
          
          if (referralCheckResponse.success) {
            console.log("✅ Referral code verified successfully");
            showToast("Referral code applied successfully!");
            
            // Save user data (with or without referral response data)
            await saveUserData(userData);
          } else {
            console.warn("⚠️ Referral code verification failed:", referralCheckResponse.error);
            // Still save user data even if referral check fails
            await saveUserData(userData);
            showToast("Account created, but referral code could not be applied");
          }
        } catch (referralError) {
          console.error("❌ Referral API error:", referralError);
          // Still save user data even if referral API fails
          await saveUserData(userData);
          showToast("Account created!");
        }
      } else {
        // No referral code to verify, just save user data
        console.log("ℹ️ No referral code found in response");
        await saveUserData(userData);
      }
      
      console.log("User data saved successfully");
      await AsyncStorage.removeItem("tempUserData");

      stopListener && stopListener();
      setShowFullScreenLoader(false);

      navigation.navigate("MpinScreen", { step: 3 });
    } else {
      showToast(res.error || "OTP verification failed");
      clearOtp();
      setShowFullScreenLoader(false);
    }
  } catch (error) {
    console.error("❌ OTP verification error:", error);
    showToast("Verification failed. Please try again.");
    setShowFullScreenLoader(false);
  } finally {
    setVerifying(false);
  }
};

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    try {
      const tempUserData = await AsyncStorage.getItem("tempUserData");
      if (!tempUserData) {
        showToast("User data not found. Please register again.");
        return;
      }

      const { username, email, phone, password } = JSON.parse(tempUserData);
      const res = await userService.registerUser({
        username,
        email,
        contactNumber: phone,
        password,
      });

      if (res.success) {
        showToast("OTP resent successfully!");
        setResendTimer(20);
        clearOtp();

        if (Platform.OS === "android") {
          setWaitingForOtp(true);
          setShowFullScreenLoader(true);
          startListener && startListener();
        }
      } else {
        showToast(res.error || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      showToast("Failed to resend OTP. Try again.");
    }
  };

  const dismissKeyboard = () => Keyboard.dismiss();

  // -------------------- UI --------------------
  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.backgroundImage}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? SIZES.xxl : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logoImage}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit OTP sent to {"\n"}+91 {phoneNumber}
                </Text>
                {/* Manual OTP input */}
                {/* <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <LinearGradient
                      key={index}
                      colors={
                        digit
                          ? COLORS.gradient.primary
                          : [COLORS.inputBackground, COLORS.inputBackground]
                      }
                      style={styles.otpInputWrapper}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <TextInput
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        style={styles.otpInput}
                        keyboardType="numeric"
                        maxLength={1}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, index)}
                        textAlign="center"
                        selectionColor={COLORS.primary}
                        editable={!showFullScreenLoader}
                      />
                    </LinearGradient>
                  ))}
                </View> */}
                // In OtpPage.js:
                {/* Manual OTP input - Underline style */}
                <View style={styles.otpContainerUnderline}>
                  {otp.map((digit, index) => (
                    <View key={index} style={styles.otpDigitContainer}>
                      <TextInput
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        style={[
                          styles.otpInputUnderline,
                          digit && styles.otpInputFilled,
                          showFullScreenLoader && styles.disabledInput,
                        ]}
                        keyboardType="numeric"
                        maxLength={1}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, index)}
                        textAlign="center"
                        selectionColor={COLORS.primary}
                        editable={!showFullScreenLoader}
                      />
                      <View
                        style={[
                          styles.underline,
                          digit && styles.underlineActive,
                        ]}
                      />
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.clearOtpButton}
                  onPress={clearOtp}
                  disabled={showFullScreenLoader}
                >
                  <Text
                    style={[
                      styles.clearOtpText,
                      showFullScreenLoader && styles.disabledText,
                    ]}
                  >
                    Clear OTP
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    showFullScreenLoader && styles.disabledButton,
                  ]}
                  onPress={handleVerifyOtp}
                  disabled={showFullScreenLoader}
                >
                  <LinearGradient
                    colors={COLORS.gradient.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.primaryButtonText}>
                      {verifying ? "Verifying..." : "Verify OTP"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendContainer}
                  onPress={handleResendOtp}
                  disabled={resendTimer > 0 || showFullScreenLoader}
                >
                  <Text style={styles.resendText}>Didn't receive OTP? </Text>
                  <Text
                    style={[
                      styles.resendLink,
                      (resendTimer > 0 || showFullScreenLoader) &&
                        styles.resendDisabled,
                    ]}
                  >
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate("LoginPage")}
                  style={styles.linkContainer}
                  disabled={showFullScreenLoader}
                >
                  <Text
                    style={[
                      styles.linkText,
                      showFullScreenLoader && styles.disabledText,
                    ]}
                  >
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* FULL SCREEN LOADER */}
          {showFullScreenLoader && (
            <View style={styles.fullScreenLoader}>
              <View style={styles.loaderBackground} />
              <View style={styles.loaderContent}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {waitingForOtp && !verifying
                    ? "Waiting for OTP..."
                    : "Verifying OTP..."}
                </Text>
                <Text style={styles.loadingSubtext}>
                  {waitingForOtp && !verifying
                    ? "We're automatically detecting OTP from SMS..."
                    : "Please wait while we verify your OTP"}
                </Text>
                {waitingForOtp && !verifying && (
                  <Text style={styles.loadingTimer}>
                    Auto-detecting OTP… {autoVerifyTimer}s remaining
                  </Text>
                )}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

export default OtpPage;
