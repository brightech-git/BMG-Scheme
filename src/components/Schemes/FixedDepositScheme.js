import React, { useEffect, useRef } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { COLORS, SIZES, FONTS } from "../../utils/AppTheme";

const FixedDepositScheme = ({
  formData,
  updateFormData,
  validationErrors = {},
  setValidationErrors,
  isSubmitting,
  inputRefs,
  setActiveInput,
  minAmount = 100,
}) => {
  const amountRef = useRef(null);

  // Handle amount input
  const handleAmountChange = (text) => {
    const sanitizedText = text.replace(/[^0-9.]/g, "");

    const parts = sanitizedText.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length > 2)) {
      return;
    }

    updateFormData("amount", sanitizedText);
  };

  // Validate Fixed Deposit fields
  useEffect(() => {
    const errors = { ...validationErrors };

    if (!formData?.amount || formData.amount.trim() === "") {
      errors.amount = "Fixed deposit amount is required";
    } else if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) {
      errors.amount = "Enter a valid amount greater than 0";
    } else if (parseFloat(formData.amount) < minAmount) {
      errors.amount = `Minimum fixed deposit amount is ₹${minAmount.toLocaleString()}`;
    } else {
      delete errors.amount;
    }

    setValidationErrors(errors);
  }, [formData?.amount, minAmount]);

  // Assign ref to parent inputRefs if needed
  useEffect(() => {
    if (inputRefs?.current) {
      inputRefs.current.amount = amountRef.current;
    }
  }, [inputRefs]);

  return (
    <View style={styles.container}>
      {/* Amount Input */}
      <View style={styles.header}>
        <Text style={styles.label}>Fixed Deposit Amount</Text>
        <Text style={styles.asterisk}>*</Text>
      </View>

      <TextInput
        ref={amountRef}
        style={[styles.input, validationErrors?.amount && styles.inputError]}
        keyboardType="decimal-pad"
        value={formData?.amount || ""}
        editable={!isSubmitting}
        onChangeText={handleAmountChange}
        placeholder="Enter fixed deposit amount"
        placeholderTextColor={COLORS.inputPlaceholder}
        maxLength={12}
        onFocus={() => setActiveInput?.("amount")}
      />

      {/* Error Message */}
      {validationErrors?.amount && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{validationErrors.amount}</Text>
        </View>
      )}

      {/* Hint */}
      <Text style={styles.hintText}>
        Minimum fixed deposit amount is ₹{minAmount.toLocaleString()}
      </Text>

      {/* Amount Validation Warning */}
      {formData?.amount && parseFloat(formData.amount) < minAmount && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Amount below minimum requirement. Please enter at least ₹{minAmount.toLocaleString()} to proceed.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.margin.lg,
  },
  header: {
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
  input: {
    height: SIZES.input.height,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius.md,
    paddingHorizontal: SIZES.padding.md,
    ...FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBackground,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  errorContainer: {
    marginTop: SIZES.margin.xs,
    paddingVertical: SIZES.padding.sm,
    paddingHorizontal: SIZES.padding.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    backgroundColor: COLORS.errorLight + '20',
    borderRadius: SIZES.radius.sm,
  },
  errorText: {
    ...FONTS.caption,
    color: COLORS.error,
  },
  hintText: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    marginTop: SIZES.margin.xs,
    fontStyle: "italic",
  },
  warningContainer: {
    marginTop: SIZES.margin.md,
    padding: SIZES.padding.md,
    backgroundColor: COLORS.warningLight + '20',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
    borderRadius: SIZES.radius.sm,
  },
  warningText: {
    ...FONTS.bodySmall,
    color: COLORS.warning,
    textAlign: "center",
  },
});

export default FixedDepositScheme;