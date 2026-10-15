import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { resetMpinWithOldApi } from "../../../services/MpinService"; // Import the new service
import theme from "../../../utils/AppTheme";
import CommonHeader from "../../../components/CommonHeader/CommonHeader";

const { COLORS, SIZES, FONTS, SHADOWS } = theme;

// Common patterns for validation
const commonPatterns = [
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "1234",
  "4321",
];

export default function ResetMpinScreen() {
  const navigation = useNavigation();

  // States - Added oldMpin state
  const [oldMpin, setOldMpin] = useState("");
  const [newMpin, setNewMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showOldMpin, setShowOldMpin] = useState(false);
  const [showNewMpin, setShowNewMpin] = useState(false);
  const [showConfirmMpin, setShowConfirmMpin] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(20))[0];
  const shakeAnim = useState(new Animated.Value(0))[0];

  // Refs for focus management - Added oldMpinRef
  const oldMpinRef = useRef();
  const newMpinRef = useRef();
  const confirmMpinRef = useRef();

  // Start animations on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Validate MPIN format (4 digits)
  const validateMpinFormat = (mpin) => {
    const mpinRegex = /^\d{4}$/;
    return mpinRegex.test(mpin);
  };

  // Handle reset MPIN
  // Handle reset MPIN
  const handleResetMpin = async () => {
    // Clear previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // Validation - Added oldMpin validation
    if (!oldMpin || !newMpin || !confirmMpin) {
      setErrorMessage("Please fill in all fields");
      triggerShake();
      return;
    }

    if (!validateMpinFormat(oldMpin)) {
      setErrorMessage("Old MPIN must be 4 digits");
      triggerShake();
      return;
    }

    if (!validateMpinFormat(newMpin)) {
      setErrorMessage("New MPIN must be 4 digits");
      triggerShake();
      return;
    }

    if (newMpin !== confirmMpin) {
      setErrorMessage("New MPIN and confirmation do not match");
      triggerShake();
      return;
    }

    // Check if old and new MPIN are the same
    if (oldMpin === newMpin) {
      setErrorMessage("New MPIN must be different from old MPIN");
      triggerShake();
      return;
    }

    if (commonPatterns.includes(newMpin)) {
      setErrorMessage("Please choose a stronger MPIN");
      triggerShake();
      return;
    }

    setIsLoading(true);

    try {
      // Call the reset MPIN API with old MPIN
      const response = await resetMpinWithOldApi(oldMpin, newMpin);


      // Check if response indicates success
      if (
        typeof response === "string" &&
        (response.includes("successfully") || response.includes("reset"))
      ) {
        setSuccessMessage("MPIN reset successfully!");

        // Clear form
        setOldMpin("");
        setNewMpin("");
        setConfirmMpin("");

        // Navigate back after delay
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else if (response && response.message) {
        // Handle if response is an object with message property
        if (
          typeof response.message === "string" &&
          (response.message.includes("successfully") ||
            response.message.includes("reset"))
        ) {
          setSuccessMessage("MPIN reset successfully!");

          // Clear form
          setOldMpin("");
          setNewMpin("");
          setConfirmMpin("");

          // Navigate back after delay
          setTimeout(() => {
            navigation.goBack();
          }, 2000);
        } else {
          setErrorMessage(
            response.message || "Failed to reset MPIN. Please try again."
          );
          triggerShake();
        }
      } else {
        // Handle any other successful response
        setSuccessMessage("MPIN reset successfully!");

        // Clear form
        setOldMpin("");
        setNewMpin("");
        setConfirmMpin("");

        // Navigate back after delay
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    } catch (error) {
      console.error("Reset MPIN Error:", error);

      if (error.message === "SESSION_EXPIRED") {
        setErrorMessage("Session expired. Please log in again.");
        triggerShake();
        setTimeout(() => navigation.replace("LoginPage"), 1500);
        return;
      }

      // More specific error messages
      if (error.message) {
        if (
          error.message.includes("Old MPIN is incorrect") ||
          error.message.includes("cannot be same")
        ) {
          setErrorMessage(
            "Old MPIN is incorrect or new MPIN cannot be same as old MPIN"
          );
        } else if (error.message.includes("Failed to reset MPIN")) {
          setErrorMessage("Failed to reset MPIN. Please try again.");
        } else if (
          error.message.includes("network") ||
          error.message.includes("Network")
        ) {
          setErrorMessage("Network error. Please check your connection.");
        } else if (error.message.includes("MPIN")) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("An unexpected error occurred. Please try again.");
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigation.goBack();
  };

  // Render input field with icon and visibility toggle
  const renderMpinInput = (
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    showText,
    toggleShow,
    ref,
    returnKeyType,
    onSubmitEditing
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Icon
          name="lock"
          size={SIZES.icon.md}
          color={COLORS.primary}
          style={styles.inputIcon}
        />
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textTertiary}
          secureTextEntry={!showText}
          keyboardType="number-pad"
          maxLength={4}
          autoComplete="off"
          autoCorrect={false}
          editable={!isLoading}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          selectionColor={COLORS.primary}
        />
        <TouchableOpacity
          onPress={toggleShow}
          style={styles.visibilityToggle}
          disabled={isLoading}
        >
          <Icon
            name={showText ? "visibility-off" : "visibility"}
            size={SIZES.icon.md}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Check if all fields are valid
  const isFormValid = () => {
    return (
      validateMpinFormat(oldMpin) &&
      validateMpinFormat(newMpin) &&
      newMpin === confirmMpin &&
      oldMpin !== newMpin &&
      !commonPatterns.includes(newMpin)
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          {/* Header */}
          <CommonHeader title="Reset MPIN" />

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Old MPIN */}
            {renderMpinInput(
              "Old MPIN",
              oldMpin,
              setOldMpin,
              "Enter 4 digit old MPIN",
              !showOldMpin,
              showOldMpin,
              () => setShowOldMpin(!showOldMpin),
              oldMpinRef,
              "next",
              () => newMpinRef.current?.focus()
            )}

            {/* New MPIN */}
            {renderMpinInput(
              "New MPIN",
              newMpin,
              setNewMpin,
              "Enter 4 digit new MPIN",
              !showNewMpin,
              showNewMpin,
              () => setShowNewMpin(!showNewMpin),
              newMpinRef,
              "next",
              () => confirmMpinRef.current?.focus()
            )}

            {/* Confirm MPIN */}
            {renderMpinInput(
              "Confirm New MPIN",
              confirmMpin,
              setConfirmMpin,
              "Re-enter new MPIN",
              !showConfirmMpin,
              showConfirmMpin,
              () => setShowConfirmMpin(!showConfirmMpin),
              confirmMpinRef,
              "done",
              handleResetMpin
            )}

            {/* MPIN Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>MPIN Requirements:</Text>
              <View style={styles.requirementItem}>
                <Icon
                  name={
                    validateMpinFormat(oldMpin)
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={SIZES.icon.sm}
                  color={
                    validateMpinFormat(oldMpin)
                      ? COLORS.success
                      : COLORS.textTertiary
                  }
                />
                <Text style={styles.requirementText}>
                  Old MPIN must be 4 digits
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Icon
                  name={
                    validateMpinFormat(newMpin)
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={SIZES.icon.sm}
                  color={
                    validateMpinFormat(newMpin)
                      ? COLORS.success
                      : COLORS.textTertiary
                  }
                />
                <Text style={styles.requirementText}>
                  New MPIN must be 4 digits
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Icon
                  name={
                    newMpin === confirmMpin && newMpin.length === 4
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={SIZES.icon.sm}
                  color={
                    newMpin === confirmMpin && newMpin.length === 4
                      ? COLORS.success
                      : COLORS.textTertiary
                  }
                />
                <Text style={styles.requirementText}>
                  Both new MPINs must match
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Icon
                  name={
                    oldMpin !== newMpin && newMpin.length === 4
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={SIZES.icon.sm}
                  color={
                    oldMpin !== newMpin && newMpin.length === 4
                      ? COLORS.success
                      : COLORS.textTertiary
                  }
                />
                <Text style={styles.requirementText}>
                  New MPIN must be different from old MPIN
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Icon
                  name={
                    !commonPatterns.includes(newMpin) && newMpin.length === 4
                      ? "check-circle"
                      : "radio-button-unchecked"
                  }
                  size={SIZES.icon.sm}
                  color={
                    !commonPatterns.includes(newMpin) && newMpin.length === 4
                      ? COLORS.success
                      : COLORS.textTertiary
                  }
                />
                <Text style={styles.requirementText}>
                  Avoid common patterns (e.g., 1234, 0000)
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Icon
                  name="error-outline"
                  size={SIZES.icon.md}
                  color={COLORS.error}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Success Message */}
            {successMessage ? (
              <View style={styles.successContainer}>
                <Icon
                  name="check-circle"
                  size={SIZES.icon.md}
                  color={COLORS.success}
                />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.resetButton,
                  (!isFormValid() || isLoading) && styles.buttonDisabled,
                ]}
                onPress={handleResetMpin}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={COLORS.gradient.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resetButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Icon
                        name="lock-reset"
                        size={SIZES.icon.md}
                        color={COLORS.white}
                      />
                      <Text style={styles.resetButtonText}>Reset MPIN</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleCancel}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Icon
                name="security"
                size={SIZES.icon.sm}
                color={COLORS.primary}
              />
              <Text style={styles.securityText}>
                Your MPIN is encrypted and securely stored. Never share it with
                anyone.
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SIZES.padding.xl,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: SIZES.padding.lg,
    marginTop: SIZES.margin.xl,
  },
  inputContainer: {
    marginBottom: SIZES.margin.lg,
  },
  inputLabel: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.margin.sm,
    marginLeft: SIZES.margin.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.xs,
  },
  inputIcon: {
    marginLeft: SIZES.margin.md,
  },
  input: {
    flex: 1,
    paddingVertical: SIZES.padding.md,
    paddingHorizontal: SIZES.padding.md,
    ...FONTS.body,
    color: COLORS.textPrimary,
    fontSize: SIZES.font.xl,
    textAlign: "center",
    minHeight: SIZES.input.height,
  },
  visibilityToggle: {
    padding: SIZES.padding.sm,
    marginRight: SIZES.margin.sm,
  },
  requirementsContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.md,
    marginTop: SIZES.margin.sm,
    marginBottom: SIZES.margin.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  requirementsTitle: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.margin.sm,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin.xs,
  },
  requirementText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginLeft: SIZES.margin.sm,
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.errorLight + "20",
    borderRadius: SIZES.radius.sm,
    padding: SIZES.padding.md,
    marginBottom: SIZES.margin.lg,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  errorText: {
    ...FONTS.bodySmall,
    color: COLORS.error,
    marginLeft: SIZES.margin.sm,
    flex: 1,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight + "20",
    borderRadius: SIZES.radius.sm,
    padding: SIZES.padding.md,
    marginBottom: SIZES.margin.lg,
    borderWidth: 1,
    borderColor: COLORS.successLight,
  },
  successText: {
    ...FONTS.bodySmall,
    color: COLORS.success,
    marginLeft: SIZES.margin.sm,
    flex: 1,
  },
  buttonContainer: {
    marginTop: SIZES.margin.md,
  },
  resetButton: {
    borderRadius: SIZES.radius.md,
    overflow: "hidden",
    marginBottom: SIZES.margin.md,
    ...SHADOWS.sm,
  },
  resetButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SIZES.padding.lg,
    paddingHorizontal: SIZES.padding.xl,
  },
  resetButtonText: {
    ...FONTS.button,
    color: COLORS.white,
    marginLeft: SIZES.margin.sm,
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.padding.lg,
    paddingHorizontal: SIZES.padding.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SIZES.margin.xl,
    padding: SIZES.padding.md,
    backgroundColor: COLORS.primaryOpacity10,
    borderRadius: SIZES.radius.md,
    borderWidth: 1,
    borderColor: COLORS.primaryOpacity20,
  },
  securityText: {
    ...FONTS.caption,
    color: COLORS.primaryDark,
    marginLeft: SIZES.margin.sm,
    flex: 1,
    textAlign: "center",
  },
});
