import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
const OtpVerifyLib = Platform.OS === "android" ? require("react-native-otp-verify") : {};
const { getHash = () => Promise.resolve([]), useOtpVerify = () => ({}), removeListener = () => {} } = OtpVerifyLib;
import { API_BASE_URL } from "../../Config/API";
import { COLORS, SIZES, FONTS, moderateScale } from "../../utils/Theme";

const { width, height } = Dimensions.get("window");

const OtpModal = ({ visible, onClose, onVerified, showToast }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false);
  const [appHash, setAppHash] = useState([]);
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);
  const [autoOtpTimeout, setAutoOtpTimeout] = useState(null);

  // Text Speed API Configuration
  const SMS_CONFIG = {
    url: "https://sms.textspeed.in/vb/apikey.php",
    authKey: "2J8jg3HoFzNpJKhR",
    senderId: "BMGGOL",
    templateId: "1707175886625084866"
  };

  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { message, timeoutError, startListener, stopListener } = useOtpVerify({
    numberOfDigits: 6,
  });

  // ------------------- ANIMATIONS -------------------
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Pulse animation for auto-detect
  useEffect(() => {
    if (waitingForOtp) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [waitingForOtp]);

  // Shake animation for errors
  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ------------------- TIMER -------------------
  useEffect(() => {
    let timer;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((p) => p - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // ------------------- CLEANUP -------------------
  useEffect(() => {
    return () => {
      try {
        removeListener();
        stopListener && stopListener();
        setWaitingForOtp(false);
        setShowFullScreenLoader(false);
        if (autoOtpTimeout) {
          clearTimeout(autoOtpTimeout);
        }
      } catch (e) {
        console.error("Cleanup SMS listener error:", e);
      }
    };
  }, [visible]);

  // ------------------- INITIALIZE SMS LISTENER -------------------
  const initializeSmsListener = async () => {
    try {
      if (autoOtpTimeout) {
        clearTimeout(autoOtpTimeout);
      }

      // Get app hash for Android
      if (Platform.OS === "android") {
        const hashCodes = await getHash();
        setAppHash(hashCodes);
      }

      if (startListener) {
        startListener();
        setWaitingForOtp(true);
        setShowFullScreenLoader(true);

        const timeout = setTimeout(() => {
          setWaitingForOtp(false);
          setShowFullScreenLoader(false);
          showToast("You can enter OTP manually");
          stopListener && stopListener();
        }, 45000); // Increased to 45 seconds

        setAutoOtpTimeout(timeout);
      } else {
        setWaitingForOtp(false);
        setShowFullScreenLoader(false);
      }
    } catch (e) {
      console.error("❌ SMS listener init error:", e);
      setWaitingForOtp(false);
      setShowFullScreenLoader(false);
      showToast("You can enter OTP manually");
    }
  };

  // ------------------- DETECT OTP FROM MESSAGE -------------------
  useEffect(() => {
    if (message && waitingForOtp) {

      // Clean the message - remove special characters and extra spaces
      const cleanMessage = message.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');

      // Enhanced OTP patterns for BMG Jewellers format
      const patterns = [
        /Your OTP for login is (\d{6})/i,
        /OTP for login is (\d{6})/i,
        /OTP is (\d{6})/i,
        /verification code is (\d{6})/i,
        /code is (\d{6})/i,
        /BMG.*?(\d{6})/i,
        /JEWELLERS.*?(\d{6})/i,
        /(\d{6}).*OTP/i,
        /OTP.*?(\d{6})/i,
        /\b(\d{6})\b/,
      ];

      let detectedOtp = null;

      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match && match[1]) {
          detectedOtp = match[1];
          break;
        }
      }

      // Fallback: Extract any 6-digit number
      if (!detectedOtp) {
        const sixDigitMatch = cleanMessage.match(/\b\d{6}\b/);
        if (sixDigitMatch) {
          detectedOtp = sixDigitMatch[0];
        }
      }

      if (detectedOtp) {

        if (autoOtpTimeout) {
          clearTimeout(autoOtpTimeout);
        }

        setEnteredOtp(detectedOtp);
        setWaitingForOtp(false);
        setShowFullScreenLoader(false);
        setOtpMessage("OTP detected automatically ✓");

        // Stop listener immediately
        try {
          stopListener && stopListener();
          removeListener();
        } catch (e) {
        }

        // Auto-verify after a short delay
        setTimeout(() => {
          handleVerifyOtp(detectedOtp);
        }, 1000);

        return;
      }

    }
  }, [message, waitingForOtp]);

  // ------------------- TIMEOUT HANDLER -------------------
  useEffect(() => {
    if (timeoutError && waitingForOtp) {
      showToast("OTP detection timeout. Please enter manually.");
      setWaitingForOtp(false);
      setShowFullScreenLoader(false);
      if (autoOtpTimeout) {
        clearTimeout(autoOtpTimeout);
      }
    }
  }, [timeoutError, waitingForOtp]);

  // ------------------- SEND OTP USING TEXT SPEED -------------------
  const sendOtp = async () => {
    if (!phoneNumber || phoneNumber.length !== 10) {
      setOtpMessage("Enter valid 10-digit phone number");
      shakeAnimation();
      return;
    }

    setLoading(true);
    setOtpMessage("");

    try {
      // Generate OTP
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store phone and OTP
      await AsyncStorage.setItem("pendingPhone", phoneNumber);
      await AsyncStorage.setItem("otp", newOtp);

      // Get app hash for the message
      let hashString = "";
      if (Platform.OS === "android" && appHash.length > 0) {
        hashString = appHash[0];
      }

      // Updated SMS template with your format
      const smsMessage = `BMG JEWELLERS PRIVATE LIMITED: Your OTP for login is ${newOtp}. Please enter this code in the app to continue. This OTP is valid for 10 minutes. Do not share it with anyone. ${appHash}`;
      // Text Speed API parameters
      const params = {
        apikey: SMS_CONFIG.authKey,
        senderid: SMS_CONFIG.senderId,
        templateid: SMS_CONFIG.templateId,
        number: `91${phoneNumber}`,
        message: smsMessage
      };

      const formBody = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");


      const response = await fetch(SMS_CONFIG.url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      const result = await response.text();

      if (response.ok) {
        showToast("OTP sent successfully ✓");
        setShowOtpInput(true);
        setResendTimer(60); // 60 seconds timer

        // Initialize SMS listener for auto-detection
        if (Platform.OS === "android") {
          setTimeout(() => {
            initializeSmsListener();
          }, 1000);
        } else {
          setWaitingForOtp(false);
          setShowFullScreenLoader(false);
          showToast("Auto-detection available on Android");
        }
      } else {
        setOtpMessage("Failed to send OTP. Please try again.");
        shakeAnimation();
        showToast("Failed to send OTP");
      }
    } catch (err) {
      console.error("❌ OTP send error:", err);
      setOtpMessage("Network error. Please check your connection.");
      shakeAnimation();
      showToast("Network error while sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // ------------------- RESEND OTP -------------------
  const resendOtp = async () => {
    if (resendTimer > 0) return;

    setLoading(true);

    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await AsyncStorage.setItem("otp", newOtp);

      const storedPhone = await AsyncStorage.getItem("pendingPhone");
      if (!storedPhone) {
        showToast("No phone number found");
        return;
      }

      // Get app hash for the message


      // Updated SMS template for resend
      const smsMessage = `BMG JEWELLERS PRIVATE LIMITED: Your OTP for login is ${newOtp}. Please enter this code in the app to continue. This OTP is valid for 10 minutes. Do not share it with anyone. ${appHash}`;
      // Text Speed API parameters for resend
      const params = {
        apikey: SMS_CONFIG.authKey,
        senderid: SMS_CONFIG.senderId,
        templateid: SMS_CONFIG.templateId,
        number: `91${storedPhone}`,
        message: smsMessage
      };

      const formBody = Object.entries(params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

      const response = await fetch(SMS_CONFIG.url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      });

      const result = await response.text();

      if (response.ok) {
        showToast("OTP resent successfully ✓");
        setResendTimer(60);
        setEnteredOtp(""); // Clear previous OTP
        setOtpMessage("");

        // Re-initialize SMS listener for auto-detection
        if (Platform.OS === "android") {
          setTimeout(() => {
            initializeSmsListener();
          }, 1000);
        }
      } else {
        showToast("Failed to resend OTP");
      }
    } catch (error) {
      console.error("❌ Resend OTP error:", error);
      showToast("Error resending OTP");
    } finally {
      setLoading(false);
    }
  };

  // ------------------- VERIFY OTP -------------------
  const handleVerifyOtp = async (autoOtp) => {
    const otpVal = autoOtp || enteredOtp;
    if (otpVal.length !== 6) {
      setOtpMessage("Enter valid 6-digit OTP");
      shakeAnimation();
      return;
    }

    setLoading(true);
    setShowFullScreenLoader(true);
    setOtpMessage("Verifying OTP...");

    try {
      const storedPhone = await AsyncStorage.getItem("pendingPhone");
      const storedOtp = await AsyncStorage.getItem("otp");

      if (!storedPhone || !storedOtp) {
        showToast("No OTP found. Please request a new one.");
        setShowFullScreenLoader(false);
        return;
      }


      // Simple OTP verification
      if (otpVal === storedOtp) {
        showToast("OTP verified successfully ✓");
        await AsyncStorage.setItem("verifiedPhone", storedPhone);
        await AsyncStorage.removeItem("otp"); // Clear OTP after verification

        // Clean up listeners
        try {
          stopListener && stopListener();
          removeListener();
        } catch (e) {
        }

        if (autoOtpTimeout) {
          clearTimeout(autoOtpTimeout);
        }
        setShowFullScreenLoader(false);
        onVerified();
        onClose();
      } else {
        setOtpMessage("Invalid OTP. Please try again.");
        shakeAnimation();
        setShowFullScreenLoader(false);
      }
    } catch (err) {
      console.error("❌ Verification error:", err);
      setOtpMessage("Verification failed. Please try again.");
      shakeAnimation();
      setShowFullScreenLoader(false);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setPhoneNumber("");
    setEnteredOtp("");
    setOtpMessage("");
    setResendTimer(0);
    setShowOtpInput(false);
    setWaitingForOtp(false);
    setShowFullScreenLoader(false);

    // Clean up listeners
    try {
      stopListener && stopListener();
      removeListener();
    } catch (e) {
    }

    if (autoOtpTimeout) {
      clearTimeout(autoOtpTimeout);
    }
    onClose();
  };

  const handleManualOtpChange = (text) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setEnteredOtp(numericText);

    if (waitingForOtp && numericText.length > 0) {
      setWaitingForOtp(false);
      setShowFullScreenLoader(false);
      if (autoOtpTimeout) {
        clearTimeout(autoOtpTimeout);
      }

      // Clean up listeners when user starts manual entry
      try {
        stopListener && stopListener();
        removeListener();
      } catch (e) {
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.modalBackground, { opacity: fadeAnim }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  transform: [
                    { translateY: slideAnim },
                    { translateX: shakeAnim },
                  ],
                },
              ]}
            >
              {/* Header with gradient effect */}
              <View style={styles.header}>
                <View style={styles.headerGradient} />
                <Text style={styles.title}>
                  {showOtpInput ? "🔐 Verify OTP" : "📱 Phone Verification"}
                </Text>
                <Text style={styles.subtitle}>
                  {showOtpInput
                    ? "Enter the 6-digit code sent to your phone"
                    : "We'll send you a verification code"}
                </Text>
              </View>

              <View style={styles.content}>
                {!showOtpInput ? (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Phone Number</Text>
                      <View style={styles.phoneInputWrapper}>
                        <Text style={styles.countryCode}>+91</Text>
                        <TextInput
                          style={styles.phoneInput}
                          placeholder="Enter 10-digit number"
                          placeholderTextColor={COLORS.placeholder}
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={phoneNumber}
                          onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
                        />
                      </View>
                    </View>

                    {otpMessage !== "" && (
                      <View style={styles.messageContainer}>
                        <Text style={styles.errorText}>⚠️ {otpMessage}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        (!phoneNumber || phoneNumber.length !== 10) &&
                          styles.buttonDisabled,
                      ]}
                      onPress={sendOtp}
                      disabled={
                        loading || !phoneNumber || phoneNumber.length !== 10
                      }
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        OTP sent to{" "}
                        <Text style={styles.phoneHighlight}>
                          +91 {phoneNumber}
                        </Text>
                      </Text>
                      <Text style={styles.validityText}>
                        Valid for 10 minutes
                      </Text>
                      {Platform.OS === "android" && (
                        <Text style={styles.autoDetectNote}>
                          Auto-detection enabled ✓
                        </Text>
                      )}
                    </View>

                    {waitingForOtp && (
                      <Animated.View
                        style={[
                          styles.autoDetectBanner,
                          { transform: [{ scale: pulseAnim }] },
                        ]}
                      >
                        <View style={styles.autoDetectContent}>
                          <ActivityIndicator
                            size="small"
                            color={COLORS.primary}
                          />
                          <Text style={styles.autoDetectText}>
                            Auto-detecting OTP (45s)
                          </Text>
                        </View>
                      </Animated.View>
                    )}

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Enter OTP</Text>
                      <TextInput
                        style={[
                          styles.otpInput,
                          waitingForOtp && styles.otpInputDisabled,
                        ]}
                        placeholder="● ● ● ● ● ●"
                        placeholderTextColor={COLORS.placeholder}
                        keyboardType="numeric"
                        maxLength={6}
                        value={enteredOtp}
                        onChangeText={handleManualOtpChange}
                        editable={!waitingForOtp}
                      />
                    </View>

                    {otpMessage !== "" && (
                      <View
                        style={[
                          styles.messageContainer,
                          otpMessage.includes("detected") && styles.successBox,
                        ]}
                      >
                        <Text
                          style={
                            otpMessage.includes("detected")
                              ? styles.successText
                              : styles.errorText
                          }
                        >
                          {otpMessage.includes("detected") ? "✓ " : "⚠️ "}
                          {otpMessage}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,
                        enteredOtp.length !== 6 && styles.buttonDisabled,
                      ]}
                      onPress={() => handleVerifyOtp()}
                      disabled={loading || enteredOtp.length !== 6}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>

                    <View style={styles.actionsContainer}>
                      {resendTimer > 0 ? (
                        <View style={styles.timerContainer}>
                          <Text style={styles.timerText}>
                            Resend OTP in{" "}
                            <Text style={styles.timerNumber}>
                              {resendTimer}s
                            </Text>
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={resendOtp}
                          style={styles.linkButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.linkText}>🔄 Resend OTP</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={resetModal}
                        style={styles.linkButton}
                        activeOpacity={0.7}
                        disabled={loading}
                      >
                        <Text style={styles.linkText}>✏️ Change Number</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              {/* Full Screen Loader */}
              {showFullScreenLoader && (
                <View style={styles.fullScreenLoader}>
                  <View style={styles.loaderCard}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loaderTitle}>
                      {waitingForOtp
                        ? "Waiting for OTP..."
                        : "Verifying OTP..."}
                    </Text>
                    {waitingForOtp && (
                      <Text style={styles.loaderSubtext}>
                        Auto-detection active • 45 seconds
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Close button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={resetModal}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ------------------- STYLES -------------------
const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20),
    width: width * 0.9,
    maxWidth: 420,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  header: {
    paddingTop: moderateScale(32),
    paddingBottom: moderateScale(24),
    paddingHorizontal: moderateScale(24),
    backgroundColor: COLORS.surface,
    position: "relative",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.primary,
  },
  title: {
    ...FONTS.h4,
    color: COLORS.title,
    textAlign: "center",
    marginBottom: moderateScale(8),
  },
  subtitle: {
    ...FONTS.fontSm,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: moderateScale(20),
  },
  content: {
    padding: moderateScale(24),
  },
  inputContainer: {
    marginBottom: moderateScale(20),
  },
  inputLabel: {
    ...FONTS.body1,
    fontSize: moderateScale(13),
    color: COLORS.label,
    marginBottom: moderateScale(8),
    fontWeight: "600",
  },
  phoneInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.input,
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: COLORS.borderColor,
    overflow: "hidden",
  },
  countryCode: {
    ...FONTS.body1,
    fontSize: moderateScale(16),
    color: COLORS.text,
    paddingHorizontal: moderateScale(16),
    fontWeight: "600",
    backgroundColor: COLORS.surface,
    paddingVertical: moderateScale(16),
  },
  phoneInput: {
    ...FONTS.body1,
    flex: 1,
    fontSize: moderateScale(16),
    color: COLORS.text,
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(16),
  },
  otpInput: {
    ...FONTS.body1,
    fontSize: moderateScale(24),
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: moderateScale(8),
    backgroundColor: COLORS.input,
    borderRadius: moderateScale(12),
    borderWidth: 2,
    borderColor: COLORS.borderColor,
    paddingVertical: moderateScale(18),
    color: COLORS.text,
  },
  otpInputDisabled: {
    backgroundColor: COLORS.surface,
    opacity: 0.6,
  },
  infoBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: moderateScale(12),
    padding: moderateScale(16),
    marginBottom: moderateScale(20),
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    ...FONTS.font,
    color: COLORS.text,
    textAlign: "center",
  },
  phoneHighlight: {
    ...FONTS.body1,
    fontWeight: "700",
    color: COLORS.primary,
  },
  validityText: {
    ...FONTS.fontSm,
    color: COLORS.success,
    textAlign: "center",
    marginTop: moderateScale(4),
    fontWeight: "600",
  },
  autoDetectNote: {
    ...FONTS.fontSm,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: moderateScale(2),
    fontStyle: "italic",
  },
  autoDetectBanner: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    marginBottom: moderateScale(16),
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  autoDetectContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  autoDetectText: {
    ...FONTS.fontSm,
    color: COLORS.primary,
    marginLeft: moderateScale(8),
    fontWeight: "600",
  },
  messageContainer: {
    backgroundColor: COLORS.danger + "15",
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: moderateScale(16),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  successBox: {
    backgroundColor: COLORS.success + "15",
    borderLeftColor: COLORS.success,
  },
  errorText: {
    ...FONTS.fontSm,
    color: COLORS.danger,
    textAlign: "center",
    fontWeight: "500",
  },
  successText: {
    ...FONTS.fontSm,
    color: COLORS.success,
    textAlign: "center",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(16),
    alignItems: "center",
    justifyContent: "center",
    marginTop: moderateScale(8),
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  primaryButtonText: {
    ...FONTS.body1,
    fontSize: moderateScale(16),
    color: COLORS.white,
    fontWeight: "700",
  },
  actionsContainer: {
    marginTop: moderateScale(24),
    gap: moderateScale(12),
  },
  timerContainer: {
    alignItems: "center",
    padding: moderateScale(12),
  },
  timerText: {
    ...FONTS.fontSm,
    color: COLORS.textLight,
  },
  timerNumber: {
    ...FONTS.body1,
    fontWeight: "700",
    color: COLORS.primary,
  },
  linkButton: {
    padding: moderateScale(12),
    alignItems: "center",
  },
  linkText: {
    ...FONTS.font,
    color: COLORS.primary,
    fontWeight: "600",
  },
  fullScreenLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: moderateScale(20),
  },
  loaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: moderateScale(32),
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loaderTitle: {
    ...FONTS.h6,
    color: COLORS.title,
    marginTop: moderateScale(16),
    marginBottom: moderateScale(8),
  },
  loaderSubtext: {
    ...FONTS.fontSm,
    color: COLORS.textLight,
    textAlign: "center",
  },
  closeButton: {
    position: "absolute",
    top: moderateScale(16),
    right: moderateScale(16),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: moderateScale(18),
    color: COLORS.textLight,
    fontWeight: "600",
  },
});

export default OtpModal;