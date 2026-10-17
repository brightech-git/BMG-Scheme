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
import { COLORS, SIZES, FONTS, moderateScale } from "../../utils/Theme";

const { width, height } = Dimensions.get("window");

const OtpModal = ({ visible, onClose, onVerified, showToast }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmPhoneNumber, setConfirmPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

      // Load existing phone number if available
      loadExistingPhone();
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

  // Load existing phone number
  const loadExistingPhone = async () => {
    try {
      const existingPhone = await AsyncStorage.getItem("userPhoneNumber");
      if (existingPhone) {
        setPhoneNumber(existingPhone);
        setConfirmPhoneNumber(existingPhone);
      }
    } catch (error) {
      console.error("Error loading existing phone:", error);
    }
  };

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

  // ------------------- VALIDATE AND SAVE PHONE NUMBER -------------------
  const handleVerifyPhone = async () => {
    // Basic validation
    if (!phoneNumber || phoneNumber.length !== 10) {
      setMessage("Please enter a valid 10-digit phone number");
      shakeAnimation();
      return;
    }

    if (!confirmPhoneNumber || confirmPhoneNumber.length !== 10) {
      setMessage("Please confirm your 10-digit phone number");
      shakeAnimation();
      return;
    }

    if (phoneNumber !== confirmPhoneNumber) {
      setMessage("Phone numbers do not match");
      shakeAnimation();
      return;
    }

    // Validate it's a valid Indian mobile number
    const firstDigit = phoneNumber.charAt(0);
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
      setMessage("Please enter a valid Indian mobile number");
      shakeAnimation();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem("userPhoneNumber", phoneNumber);

      showToast("Phone number verified successfully ✓");

      // Call onVerified to maintain compatibility with your existing flow
      onVerified();
      resetModal();
    } catch (error) {
      console.error("❌ Error saving phone number:", error);
      setMessage("Failed to verify phone number. Please try again.");
      shakeAnimation();
      showToast("Error verifying phone number");
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setPhoneNumber("");
    setConfirmPhoneNumber("");
    setMessage("");
    onClose();
  };

  // Handle phone number input - only numbers
  const handlePhoneNumberChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setPhoneNumber(numericText);
    setMessage(""); // Clear message when user starts typing
  };

  // Handle confirm phone number input - only numbers
  const handleConfirmPhoneNumberChange = (text) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setConfirmPhoneNumber(numericText);
    setMessage(""); // Clear message when user starts typing
  };

  // Check if both fields are valid and ready for submission
  const isFormValid = () => {
    return phoneNumber.length === 10 && 
           confirmPhoneNumber.length === 10 && 
           phoneNumber === confirmPhoneNumber;
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
                <Text style={styles.title}>📱 Verify Phone Number</Text>
                <Text style={styles.subtitle}>
                  Enter and confirm your phone number to continue
                </Text>
              </View>

              <View style={styles.content}>
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
                      onChangeText={handlePhoneNumberChange}
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Phone Number</Text>
                  <View style={styles.phoneInputWrapper}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Re-enter 10-digit number"
                      placeholderTextColor={COLORS.placeholder}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={confirmPhoneNumber}
                      onChangeText={handleConfirmPhoneNumberChange}
                    />
                  </View>
                </View>

                {message !== "" && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.errorText}>⚠️ {message}</Text>
                  </View>
                )}

                <View style={styles.validationInfo}>
                  <Text style={styles.validationText}>
                    • Must be 10 digits long{'\n'}
                    • Must be a valid Indian mobile number{'\n'}
                    • Both entries must match exactly
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    !isFormValid() && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyPhone}
                  disabled={loading || !isFormValid()}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify Phone Number</Text>
                  )}
                </TouchableOpacity>
              </View>

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
  messageContainer: {
    backgroundColor: COLORS.danger + "15",
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    marginBottom: moderateScale(16),
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    ...FONTS.fontSm,
    color: COLORS.danger,
    textAlign: "center",
    fontWeight: "500",
  },
  validationInfo: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: moderateScale(10),
    padding: moderateScale(16),
    marginBottom: moderateScale(20),
  },
  validationText: {
    ...FONTS.fontXs,
    color: COLORS.text,
    lineHeight: moderateScale(18),
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