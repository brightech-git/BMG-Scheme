// screens/AadhaarVerificationScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import theme from "../../utils/AppTheme";
import { validateAadhaar } from "../../screens/AddNewMember/Validations";
import { digiLockerService } from "../../services/DigiLockerService";
import CommonHeader from "../CommonHeader/CommonHeader";

const { COLORS, SIZES, FONTS, SHADOWS } = theme;

const AadhaarVerificationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const {
    aadhaarNumber: initialAadhaar = "",
    userId,
    onVerificationComplete,
  } = route.params || {};

  const [aadhaarNumber, setAadhaarNumber] = useState(initialAadhaar);
  const [formattedAadhaar, setFormattedAadhaar] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [verificationData, setVerificationData] = useState(null);

  // Auto-initiate verification if Aadhaar is passed
  useEffect(() => {
    if (initialAadhaar && initialAadhaar.length === 12) {
      handleVerifyAadhaar(initialAadhaar);
    }
  }, [initialAadhaar]);

  // Format Aadhaar input
  const formatAadhaarInput = (value) => {
    const digits = value.replace(/\D/g, "");
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setAadhaarNumber(digits);
    setFormattedAadhaar(formatted);
    setError("");
  };

  // Handle Aadhaar verification - Optimized for immediate URL opening
  const handleVerifyAadhaar = async (aadhaarToVerify = null) => {
    if (isLoading) return; // prevent duplicate requests

    const aadhaarNum = aadhaarToVerify || aadhaarNumber.replace(/\s/g, "");

    if (!aadhaarNum || aadhaarNum.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number");
      return;
    }

    const validationError = validateAadhaar(aadhaarNum);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {

      // Start API call
      const result = await digiLockerService.verifyAadhaar(userId, aadhaarNum);


      if (result.success && result.verificationUrl) {
        setVerificationData(result);

        // Navigate IMMEDIATELY to WebView - don't wait for anything else
        navigation.navigate("DigiLockerWebViewScreen", {
          verificationUrl: result.verificationUrl,
          verificationId: result.verificationId,
          aadhaarNumber: aadhaarNum,
          userId,
          sourceScreen: "profile", // Add this
          onVerificationComplete: (verifiedData) => {

            if (onVerificationComplete) {
              // Ensure we have the Aadhaar number in the response
              const completeData = {
                ...verifiedData,
                verificationId: result.verificationId,
                aadhaarVerificationId: result.verificationId,
                idProofNo: aadhaarNum, // Always include the original Aadhaar number
                success:
                  verifiedData.success || verifiedData.aadhaarVerified || false,
                message:
                  verifiedData.message || "Aadhaar verification completed",
              };

              onVerificationComplete(completeData);
            }

            // IMPORTANT: Don't do navigation.goBack() here
            // The WebView will handle navigation back to profile
          },
        });
      } else {
        const errorMsg =
          result.message || result.error || "Failed to start verification";
        setError(errorMsg);
        Alert.alert("Verification Failed", errorMsg);
      }
    } catch (error) {
      console.error("Verification error:", error);
      const errorMsg = error.message || "Network error. Please try again.";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Verification",
      "Are you sure you want to cancel Aadhaar verification?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            if (onVerificationComplete) {
              onVerificationComplete({
                idProofNo: aadhaarNumber,
                aadhaarVerified: false,
                success: false,
                message: "Verification cancelled by user",
              });
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getMaskedAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length !== 12) return aadhaar;
    return `XXXX XXXX ${aadhaar.substring(8)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        title="Aadhaar Verification"
        subtitle="Verify your identity securely through DigiLocker"
        showBackButton={true}
        onBackPress={handleCancel}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>🔒</Text>
          </View>
          <Text style={styles.headerTitle}>Secure Aadhaar Verification</Text>
          <Text style={styles.headerSubtitle}>
            Verify your Aadhaar through DigiLocker, Government of India's secure
            digital document wallet
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Enter Aadhaar Number</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={formattedAadhaar}
            onChangeText={formatAadhaarInput}
            placeholder="XXXX XXXX XXXX"
            keyboardType="number-pad"
            maxLength={14}
            editable={!isLoading}
            autoFocus={!initialAadhaar}
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hintText}>Enter 12-digit Aadhaar number</Text>
          )}

          <TouchableOpacity
            style={[styles.verifyButton, isLoading && styles.buttonDisabled]}
            onPress={() => handleVerifyAadhaar()}
            disabled={isLoading || aadhaarNumber.length !== 12}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.verifyButtonText}>Verify via DigiLocker</Text>
            )}
          </TouchableOpacity>
        </View>

        {verificationData && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Verification Started</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verification ID:</Text>
              <Text style={styles.infoValue}>
                {verificationData.verificationId}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Aadhaar Number:</Text>
              <Text style={styles.infoValue}>
                {getMaskedAadhaar(aadhaarNumber)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>✅ Opening DigiLocker...</Text>
            </View>
          </View>
        )}

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How it works:</Text>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Enter Aadhaar Number</Text>
              <Text style={styles.stepDescription}>
                Enter your 12-digit Aadhaar number
              </Text>
            </View>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Click Verify via DigiLocker</Text>
              <Text style={styles.stepDescription}>
                DigiLocker will open immediately
              </Text>
            </View>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Login & Authorize</Text>
              <Text style={styles.stepDescription}>
                Login with your DigiLocker credentials and authorize Aadhaar
                sharing
              </Text>
            </View>
          </View>

          <View style={styles.instructionStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Complete & Return</Text>
              <Text style={styles.stepDescription}>
                Complete verification and return to app automatically
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Your Data is Secure</Text>
            <Text style={styles.securityText}>
              Your Aadhaar data is processed securely through DigiLocker
              (Government of India) and is not stored on our servers. We only
              receive verification status.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.padding.lg,
    paddingBottom: SIZES.padding.xl,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: SIZES.margin.xl,
    paddingHorizontal: SIZES.padding.md,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.margin.lg,
  },
  headerIconText: {
    fontSize: 40,
  },
  headerTitle: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SIZES.margin.sm,
  },
  headerSubtitle: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: COLORS.gray50,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.xl,
    marginBottom: SIZES.margin.xl,
  },
  inputLabel: {
    ...FONTS.h6,
    color: COLORS.textPrimary,
    marginBottom: SIZES.margin.md,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.md,
    fontSize: SIZES.font.lg,
    textAlign: "center",
    letterSpacing: 1,
    backgroundColor: COLORS.white,
    marginBottom: SIZES.margin.md,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + "10",
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: SIZES.margin.md,
  },
  hintText: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginBottom: SIZES.margin.lg,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.padding.lg,
    borderRadius: SIZES.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SIZES.margin.md,
    ...SHADOWS.sm,
  },
  verifyButtonText: {
    ...FONTS.button,
    color: COLORS.white,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    marginBottom: SIZES.margin.xl,
    width: "100%",
    ...SHADOWS.xs,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  infoTitle: {
    ...FONTS.h6,
    color: COLORS.textPrimary,
    marginBottom: SIZES.margin.md,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin.sm,
  },
  infoLabel: {
    ...FONTS.bodyMedium,
    color: COLORS.textSecondary,
    width: 120,
  },
  infoValue: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: "500",
  },
  instructionsContainer: {
    backgroundColor: COLORS.infoLight + "10",
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.lg,
    marginBottom: SIZES.margin.xl,
  },
  instructionsTitle: {
    ...FONTS.h6,
    color: COLORS.info,
    marginBottom: SIZES.margin.lg,
    fontWeight: "600",
  },
  instructionStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SIZES.margin.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SIZES.margin.md,
    marginTop: 2,
  },
  stepNumberText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: "600",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    fontWeight: "500",
    marginBottom: 2,
  },
  stepDescription: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.successLight + "10",
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  securityIcon: {
    marginRight: SIZES.margin.md,
    marginTop: 2,
    fontSize: 24,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    ...FONTS.bodyMedium,
    color: COLORS.success,
    fontWeight: "600",
    marginBottom: SIZES.margin.xs,
  },
  securityText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});

export default AadhaarVerificationScreen;
