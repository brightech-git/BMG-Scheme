import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../utils/AppTheme";
import CommonHeader from "../../components/CommonHeader/CommonHeader";

import DigiSilverScheme from "../../components/Schemes/DigiSilverScheme";
import AmountScheme from "../../components/Schemes/AmountScheme";
import FixedDepositScheme from "../../components/Schemes/FixedDepositScheme";
import { getTranTypes } from "../../services/PaytypeService";

const SchemeDetailsPage = ({
  schemeData,
  onSubmit,
  onBack,
  validationErrors = {},
  setValidationErrors,
  isSubmitting,
  API_BASE_URL_OLD,
  schemes,
  selectedSchemeId,
  schemeName,
  schemeOptions,
  isFetchingSchemeOptions,
  isFetchingSchemes,
}) => {
  const scrollViewRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState(null);
  const [isAgreed, setIsAgreed] = useState(false);

  const [tranTypes, setTranTypes] = useState([]);
  const [isLoadingTranTypes, setIsLoadingTranTypes] = useState(false);


  useEffect(() => {
    const fetchTranTypes = async () => {
      try {
        setIsLoadingTranTypes(true);
        const data = await getTranTypes();
        setTranTypes(data || []);
      } catch (error) {
        console.error("❌ TranType fetch error:", error);
        Alert.alert("Error", "Unable to load payment modes");
      } finally {
        setIsLoadingTranTypes(false);
      }
    };

    fetchTranTypes();
  }, []);


  // Use the props directly
  const numericSchemeId = selectedSchemeId ? Number(selectedSchemeId) : null;
  const effectiveSchemeName = schemeName || "Select a Scheme";

  // console.log("🔍 SchemeDetailsPage - Simplified:");
  // console.log("numericSchemeId:", numericSchemeId);
  // console.log("effectiveSchemeName:", effectiveSchemeName);

  const [formData, setFormData] = useState({
    selectedSchemeId: numericSchemeId,
    selectedGroupCodeObj: null,
    selectedCurrentRegNoObj: null,
    amount: "",
    accCode: "",
    modePay: "C",
    calculatedWeight: "",
    ...schemeData,
  });

  // Auto-select the single payment mode if only one option is available
  useEffect(() => {
    if (tranTypes.length === 1 && !formData.accCode) {
      const singleOption = tranTypes[0];
      updateFormData("accCode", singleOption.NAME);
      updateFormData("modePay", singleOption.CARDTYPE);
    }
  }, [tranTypes]);

  // Update formData when scheme changes
  useEffect(() => {
    if (numericSchemeId && numericSchemeId !== formData.selectedSchemeId) {
      console.log("🔄 Updating formData with scheme ID:", numericSchemeId);
      setFormData(prev => ({
        ...prev,
        selectedSchemeId: numericSchemeId,
        amount: "",
        accCode: "",
        selectedGroupCodeObj: null,
        selectedCurrentRegNoObj: null,
        calculatedWeight: "",
      }));
    }
  }, [numericSchemeId]);

  const MINIMUM_AMOUNT_MAP = {
    1: 1,    // Amount Scheme
    2: 100,  // Digi Silver
    3: 10000, // Fixed Deposit
  };

  const minAmount = MINIMUM_AMOUNT_MAP[numericSchemeId] || 0;

  // Keyboard handling
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setActiveInput(null);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = () => {
    const errors = {};

    if (!numericSchemeId || isNaN(numericSchemeId)) {
      errors.scheme = "Please select a valid scheme";
      Alert.alert("Error", "No scheme selected. Please go back and select a scheme.");
      return false;
    }

    if (!formData?.amount) {
      errors.amount = "Please enter a valid amount";
    } else if (Number(formData.amount) < minAmount) {
      errors.amount = `Minimum amount is ₹${minAmount}`;
    }

    if (!formData?.accCode) {
      errors.accCode = "Please select a payment mode";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!isAgreed) {
      Alert.alert(
        "Agreement Required",
        "Please agree to the Terms & Conditions and Privacy Policy."
      );
      return;
    }

    if (!numericSchemeId) {
      Alert.alert("Error", "No scheme selected. Please go back and select a scheme.");
      return;
    }

    if (validateStep()) {
      const dataToSubmit = {
        ...formData,
        selectedSchemeId: numericSchemeId
      };
      console.log("Submitting scheme data:", dataToSubmit);
      onSubmit(dataToSubmit);
    } else {
      Alert.alert(
        "Validation Error",
        "Please fill all required fields correctly."
      );
    }
  };

  const renderSchemeComponent = () => {
    if (!numericSchemeId || isNaN(numericSchemeId)) {
      return (
        <View style={styles.noSchemeContainer}>
          <Text style={styles.noSchemeText}>
            No scheme selected. Please go back and select a scheme.
          </Text>
          <TouchableOpacity
            style={styles.backButtonSmall}
            onPress={onBack}
          >
            <Text style={styles.backButtonTextSmall}>Go Back to Select Scheme</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const commonProps = {
      formData,
      updateFormData,
      validationErrors,
      setValidationErrors,
      isSubmitting,
      numericSchemeId,
      schemeName: effectiveSchemeName,
      schemeOptions,
      isFetchingSchemeOptions,
      API_BASE_URL_OLD,
    };

    switch (numericSchemeId) {
      case 1:
        return <AmountScheme {...commonProps} />;
      case 2:
        return <DigiSilverScheme {...commonProps} />;
      case 3:
        return <FixedDepositScheme {...commonProps} />;
      default:
        return (
          <View style={styles.noSchemeContainer}>
            <Text style={styles.noSchemeText}>
              Scheme ID {numericSchemeId} is not supported
            </Text>
          </View>
        );
    }
  };

  // Helper function to render payment mode based on number of options
  const renderPaymentMode = () => {
    if (isLoadingTranTypes) {
      return <ActivityIndicator color={COLORS.primary} />;
    }

    if (tranTypes.length === 0) {
      return (
        <Text style={styles.noPaymentText}>
          No payment modes available
        </Text>
      );
    }

    if (tranTypes.length === 1) {
      // Single option - show as static display
      const singleOption = tranTypes[0];
      return (
        <View style={styles.singlePaymentContainer}>
          <View style={styles.singlePaymentDisplay}>
            <Text style={styles.singlePaymentText}>
              {singleOption.NAME}
            </Text>
          </View>
          <Text style={styles.singlePaymentNote}>
            Only one payment mode is available
          </Text>
        </View>
      );
    }

    // Multiple options - show as selectable buttons
    return (
      <View style={styles.paymentModeContainer}>
        {tranTypes.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paymentOption,
              formData.accCode === item.NAME &&
              styles.paymentOptionSelected,
            ]}
            onPress={() => {
              updateFormData("accCode", item.NAME);
              updateFormData("modePay", item.CARDTYPE);
            }}
          >
            <Text
              style={[
                styles.paymentOptionText,
                formData.accCode === item.NAME &&
                styles.paymentOptionTextSelected,
              ]}
            >
              {item.NAME}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 80 })}
      style={styles.container}
    >
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: keyboardHeight + 50 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <CommonHeader title={"Scheme Details"} onBack={onBack} />

          <View style={styles.card}>
            {/* Read-only Scheme Display */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Selected Scheme</Text>
              <View style={[
                styles.staticValueContainer,
                !numericSchemeId && styles.errorStaticContainer
              ]}>
                <Text style={[
                  styles.staticValueText,
                  !numericSchemeId && styles.errorText
                ]}>
                  {effectiveSchemeName}
                </Text>
              </View>
              {!numericSchemeId && (
                <Text style={styles.errorText}>Please select a scheme</Text>
              )}
              {isFetchingSchemes && (
                <Text style={styles.loadingText}>Loading scheme details...</Text>
              )}
            </View>

            {/* Render Scheme UI */}
            {renderSchemeComponent()}

            {/* Payment Mode - Show only if scheme is selected */}
            {numericSchemeId && (
              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Payment Mode</Text>
                  <Text style={styles.asterisk}>*</Text>
                </View>

                {renderPaymentMode()}

                {validationErrors?.accCode && (
                  <Text style={styles.errorText}>{validationErrors.accCode}</Text>
                )}
              </View>
            )}

            {/* Agreement Checkbox */}
            {numericSchemeId && (
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsAgreed(!isAgreed)}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.checkbox, isAgreed && styles.checkboxChecked]}
                >
                  {isAgreed && <Text style={styles.checkboxTick}>✔</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the Terms & Conditions and Privacy Policy
                </Text>
              </TouchableOpacity>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (isSubmitting || !isAgreed || !numericSchemeId || Number(formData.amount) < minAmount) &&
                  styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  isSubmitting ||
                  !isAgreed ||
                  !numericSchemeId ||
                  Number(formData.amount) < minAmount
                }
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={COLORS.white} />
                    <Text style={styles.loadingText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.backButton,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={onBack}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding.lg,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.lg,
    marginBottom: SIZES.margin.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  inputContainer: {
    marginBottom: SIZES.margin.lg,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin.xs,
  },
  label: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginRight: SIZES.margin.xs,
  },
  asterisk: {
    ...FONTS.bodyMedium,
    color: COLORS.error,
  },
  staticValueContainer: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    justifyContent: "center",
    backgroundColor: COLORS.inputBackground,
  },
  errorStaticContainer: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  staticValueText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
    marginTop: SIZES.margin.xs,
  },
  loadingText: {
    ...FONTS.caption,
    color: COLORS.info,
    marginTop: SIZES.margin.xs,
    fontStyle: "italic",
  },
  noSchemeContainer: {
    padding: SIZES.padding.lg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
    borderRadius: SIZES.radius.md,
    marginBottom: SIZES.margin.lg,
    backgroundColor: COLORS.warningLight,
  },
  noSchemeText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SIZES.margin.md,
  },
  backButtonSmall: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding.lg,
    paddingVertical: SIZES.padding.sm,
    borderRadius: SIZES.radius.md,
  },
  backButtonTextSmall: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: '600',
  },
  // Payment Mode Styles
  singlePaymentContainer: {
    marginTop: SIZES.margin.xs,
  },
  singlePaymentDisplay: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.success,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    justifyContent: "center",
    backgroundColor: COLORS.successLight,
  },
  singlePaymentText: {
    ...FONTS.body,
    color: COLORS.successDark,
    fontWeight: '600',
  },
  singlePaymentNote: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.xs,
    fontStyle: 'italic',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: SIZES.margin.md,
  },
  paymentOption: {
    flex: 1,
    height: SIZES.input.height,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  paymentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  paymentOptionText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
  },
  paymentOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  noPaymentText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: SIZES.padding.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: SIZES.radius.md,
    backgroundColor: COLORS.background,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SIZES.margin.xl,
    gap: SIZES.margin.md,
  },
  button: {
    flex: 1,
    borderRadius: SIZES.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    height: SIZES.button.lg,
    ...SHADOWS.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
  },
  backButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  buttonText: {
    ...FONTS.button,
    color: COLORS.white,
  },
  backButtonText: {
    ...FONTS.button,
    color: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SIZES.margin.md,
    marginBottom: SIZES.margin.lg,
  },
  checkbox: {
    width: SIZES.icon.sm,
    height: SIZES.icon.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radius.xs,
    marginRight: SIZES.margin.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkboxTick: {
    color: COLORS.white,
    fontSize: SIZES.font.sm,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.textPrimary,
  },
});

export default SchemeDetailsPage;