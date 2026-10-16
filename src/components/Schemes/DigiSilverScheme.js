import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import appTheme from "../../utils/MainTheme";

const { COLORS, SIZES, FONTS } = appTheme;

const DigiSilverScheme = ({
  formData,
  updateFormData,
  validationErrors = {},
  setValidationErrors,
  isSubmitting,
  API_BASE_URL_OLD,
  numericSchemeId,
  inputRefs,
  setActiveInput,
  minAmount = 0,
}) => {
  const [silverRate, setSilverRate] = useState(null);
  const [loadingSilverRate, setLoadingSilverRate] = useState(false);
  const [silverRateError, setSilverRateError] = useState(false);

  // Fetch Silver Rate
  const fetchSilverRate = useCallback(async () => {
    setLoadingSilverRate(true);
    setSilverRateError(false);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL_OLD}/account/todayrate`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const rate = data.SILVERRATE || data.GOLDRATE;

      if (!rate || isNaN(rate)) throw new Error("Invalid rate received");
      setSilverRate(rate);
    } catch (error) {
      console.error("Error fetching silver rate:", error);
      setSilverRate(null);
      setSilverRateError(true);

      if (error.name !== "AbortError") {
        Alert.alert(
          "Connection Error",
          "Failed to fetch current silver rate.",
          [
            { text: "Retry", onPress: fetchSilverRate },
            { text: "Cancel", style: "cancel" },
          ]
        );
      }
    } finally {
      setLoadingSilverRate(false);
    }
  }, [API_BASE_URL_OLD]);

  // Fetch rate on mount or scheme change
  useEffect(() => {
    if (numericSchemeId === 2 && silverRate === null && !loadingSilverRate) {
      fetchSilverRate();
    }
  }, [numericSchemeId, silverRate, loadingSilverRate, fetchSilverRate]);

  // Convert amount to silver weight
  const convertAmountToWeight = useCallback(
    (amountValue) => {
      if (
        silverRate &&
        amountValue &&
        !isNaN(amountValue) &&
        parseFloat(amountValue) > 0
      ) {
        const weight = (parseFloat(amountValue) / silverRate).toFixed(3);
        updateFormData("calculatedWeight", weight);
      } else {
        updateFormData("calculatedWeight", "");
      }
    },
    [silverRate, updateFormData]
  );

  // Handle amount input
  const handleAmountChange = (text) => {
    const sanitized = text.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length > 2)) return;

    updateFormData("amount", sanitized);
    convertAmountToWeight(sanitized);
  };

  useEffect(() => {
  const errors = { ...validationErrors };

  if (
    !formData?.amount ||
    isNaN(formData.amount) ||
    parseFloat(formData.amount) <= 0
  ) {
    errors.amount = `Enter a valid amount greater than ₹${minAmount}`;
  } 
  else if (parseFloat(formData.amount) < minAmount) {
    errors.amount = `Minimum amount is ₹${minAmount}`;
  } 
  else {
    delete errors.amount;
  }

  if (!silverRate && !loadingSilverRate) {
    errors.silverRate = "Silver rate unavailable. Retry fetching.";
  } else delete errors.silverRate;

  if (
    formData?.calculatedWeight &&
    parseFloat(formData.calculatedWeight) <= 0
  ) {
    errors.calculatedWeight = "Calculated weight is invalid.";
  } else delete errors.calculatedWeight;

  setValidationErrors(errors);
}, [
  formData?.amount,
  formData?.calculatedWeight,
  silverRate,
  loadingSilverRate,
  minAmount,
]);


  return (
    <>
      {/* Amount Input */}
      <View style={styles.inputContainer}>
        <View style={styles.labelContainer}>
          <Text style={styles.label}>Investment Amount</Text>
          <Text style={styles.asterisk}>*</Text>
        </View>
        <TextInput
          style={[styles.input, validationErrors?.amount && styles.inputError]}
          keyboardType="decimal-pad"
          value={formData?.amount || ""}
          editable={!isSubmitting}
          onChangeText={handleAmountChange}
          placeholder="Enter amount in ₹"
          placeholderTextColor={COLORS.textTertiary}
          maxLength={10}
          onFocus={() => setActiveInput?.("amount")}
          ref={(ref) =>
            inputRefs?.current && (inputRefs.current["amount"] = ref)
          }
        />
        {validationErrors?.amount && (
          <Text style={styles.errorText}>{validationErrors.amount}</Text>
        )}
      </View>

      {/* Silver Rate Display */}
      {/* <View style={styles.inputContainer}>
        <Text style={styles.label}>Current Silver Rate</Text>
        {loadingSilverRate ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching current rate...</Text>
          </View>
        ) : silverRateError ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSilverRate}
            disabled={isSubmitting}
          >
            <Text style={styles.retryText}>
              Failed to load rate. Tap to retry
            </Text>
          </TouchableOpacity>
        ) : silverRate ? (
          <View style={styles.rateDisplay}>
            <Text style={styles.rateText}>₹{silverRate} per gram</Text>
          </View>
        ) : (
          <View style={styles.rateDisplay}>
            <Text style={styles.ratePlaceholder}>Rate not available</Text>
          </View>
        )}
        {validationErrors?.silverRate && (
          <Text style={styles.errorText}>{validationErrors.silverRate}</Text>
        )}
      </View> */}

      {/* Calculated Weight */}
      {/* <View style={styles.inputContainer}>
        <Text style={styles.label}>Calculated Silver Weight</Text>
        <View
          style={[
            styles.weightDisplay,
            validationErrors?.calculatedWeight && styles.inputError,
          ]}
        >
          <Text
            style={[
              styles.weightText,
              !formData?.calculatedWeight && styles.weightPlaceholder,
            ]}
          >
            {formData?.calculatedWeight
              ? `${formData.calculatedWeight} grams`
              : "Weight will be calculated automatically"}
          </Text>
        </View>
        {validationErrors?.calculatedWeight && (
          <Text style={styles.errorText}>
            {validationErrors.calculatedWeight}
          </Text>
        )}
        {formData?.amount &&
          formData?.calculatedWeight &&
          parseFloat(formData.calculatedWeight) > 0 && (
            <Text style={styles.hintText}>
              You will purchase {formData.calculatedWeight} grams of silver
            </Text>
          )}
      </View> */}
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: { marginBottom: SIZES.lg },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.xs,
  },
  label: {
    fontFamily: FONTS.family.bodyBold,
    fontSize: SIZES.font.md,
    color: COLORS.textPrimary,
    marginRight: SIZES.xs,
  },
  asterisk: {
    fontSize: SIZES.font.md,
    color: COLORS.error,
    fontFamily: FONTS.family.bodyBold,
  },
  input: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.md,
    color: COLORS.textPrimary,
    backgroundColor: "transparent",
  },
  inputError: { borderColor: COLORS.error, borderWidth: 1.5 },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.sm,
  },
  loadingText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.sm,
    color: COLORS.textTertiary,
    marginLeft: SIZES.sm,
  },
  rateDisplay: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  rateText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.md,
    color: COLORS.textPrimary,
  },
  ratePlaceholder: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.md,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  weightDisplay: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  weightText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.md,
    color: COLORS.textPrimary,
  },
  weightPlaceholder: { color: COLORS.textTertiary, fontStyle: "italic" },
  retryButton: {
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.padding.md,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: SIZES.radius.md,
    alignItems: "center",
  },
  retryText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.sm,
    color: COLORS.error,
    textAlign: "center",
  },
  errorText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.sm,
    color: COLORS.error,
    marginTop: SIZES.xs,
  },
  hintText: {
    fontFamily: FONTS.family.body,
    fontSize: SIZES.font.xs,
    color: COLORS.textTertiary,
    marginTop: SIZES.xs,
    fontStyle: "italic",
  },
});

export default DigiSilverScheme;
