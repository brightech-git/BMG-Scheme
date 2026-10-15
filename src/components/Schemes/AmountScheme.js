import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Animated,
} from "react-native";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../utils/AppTheme";
import CustomPicker from "../../screens/AddNewMember/CustomPicker";

const AmountScheme = ({
  formData,
  updateFormData,
  validationErrors = {},
  setValidationErrors,
  isSubmitting,
  API_BASE_URL_OLD,
  numericSchemeId,
}) => {
  const [amounts, setAmounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animation effects
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch amounts when scheme changes
  useEffect(() => {
    const fetchAmounts = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`
        );


        if (!response.ok) {
          throw new Error(`Failed to fetch amounts. Status: ${response.status}`);
        }

        const data = await response.json();

        const formattedAmounts = data.map((item) => ({
          value: item.AMOUNT.toString(),
          groupCode: item.GROUPCODE,
          currentRegNo: item.CURRENTREGNO,
        }));

        setAmounts(formattedAmounts);
      } catch (error) {
        console.error("Error fetching amounts:", error);
        setAmounts([]);
        Alert.alert(
          "Connection Error",
          "Unable to fetch scheme amounts. Please check your connection and try again.",
          [{ text: "OK", style: "default" }]
        );
      } finally {
        setLoading(false);
      }
    };

    if (numericSchemeId) {
      fetchAmounts();
    }
  }, [numericSchemeId, API_BASE_URL_OLD]);

  const handleAmountSelection = (itemValue) => {
    const selectedAmount = amounts.find((amt) => amt.value === itemValue);

    updateFormData('amount', itemValue);
    if (selectedAmount) {
      updateFormData('selectedGroupCodeObj', selectedAmount.groupCode);
      updateFormData('selectedCurrentRegNoObj', selectedAmount.currentRegNo);
    }
  };

  // Validate Amount Scheme specific fields
  useEffect(() => {
    const errors = { ...validationErrors };

    if (!formData?.amount) {
      errors.amount = "Please select an amount";
    } else {
      delete errors.amount;
    }

    setValidationErrors(errors);
  }, [formData?.amount]);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`
      );
      if (response.ok) {
        const data = await response.json();
        const formattedAmounts = data.map((item) => ({
          value: item.AMOUNT.toString(),
          groupCode: item.GROUPCODE,
          currentRegNo: item.CURRENTREGNO,
        }));
        setAmounts(formattedAmounts);
      } else {
        throw new Error("Failed to fetch amounts");
      }
    } catch (error) {
      console.error("Error re-fetching amounts:", error);
      Alert.alert(
        "Retry Failed", 
        "Unable to load amounts. Please check your connection.", 
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim,
        }
      ]}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.label}>
          Investment Amount
        </Text>
        <Text style={styles.asterisk}>*</Text>
      </View>

      <Text style={styles.subLabel}>
        Select your preferred investment amount from available options
      </Text>

      {/* Content Section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="small" 
            color={COLORS.primary} 
            style={styles.loader} 
          />
          <Text style={styles.loadingText}>
            Loading available amounts...
          </Text>
        </View>
      ) : amounts.length > 0 ? (
        <View style={styles.pickerContainer}>
          <CustomPicker
            selectedValue={formData?.amount || ''}
            onValueChange={handleAmountSelection}
            items={[
              ...amounts.map((amt) => ({
                label: `₹${Number(amt.value).toLocaleString()} • ${amt.groupCode}`,
                value: amt.value
              }))
            ]}
            placeholder="Choose amount"
            enabled={!isSubmitting}
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>💸</Text>
          <Text style={styles.noDataTitle}>
            No Amounts Available
          </Text>
          <Text style={styles.noDataText}>
            Currently no investment amounts are available for this scheme.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.retryText}>
                Try Again
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Error Message */}
      {validationErrors?.amount && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {validationErrors.amount}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.margin.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.margin.xs,
  },
  label: {
    ...FONTS.h6,
    color: COLORS.textPrimary,
    marginRight: SIZES.margin.xs,
  },
  asterisk: {
    ...FONTS.h6,
    color: COLORS.error,
  },
  subLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.md,
  },
  pickerContainer: {
    marginBottom: SIZES.margin.md,
  },
  selectedAmountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.margin.sm,
    paddingVertical: SIZES.padding.xs,
    paddingHorizontal: SIZES.padding.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.success,
    backgroundColor: COLORS.successLight + '20',
    borderRadius: SIZES.radius.sm,
  },
  amountInfoText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    flex: 1,
  },
  amountHighlight: {
    color: COLORS.primary,
    ...FONTS.bodyMedium,
  },
  successIndicator: {
    width: SIZES.icon.sm,
    height: SIZES.icon.sm,
    borderRadius: SIZES.radius.full,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.margin.xs,
  },
  successIndicatorText: {
    ...FONTS.caption,
    color: COLORS.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  loader: {
    marginRight: SIZES.margin.sm,
  },
  loadingText: {
    ...FONTS.bodySmall,
    color: COLORS.textTertiary,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.padding.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  noDataIcon: {
    fontSize: SIZES.icon.xxl,
    marginBottom: SIZES.margin.sm,
  },
  noDataTitle: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.margin.xs,
  },
  noDataText: {
    ...FONTS.bodySmall,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: SIZES.margin.lg,
    paddingHorizontal: SIZES.padding.md,
  },
  retryButton: {
    paddingVertical: SIZES.padding.sm,
    paddingHorizontal: SIZES.padding.lg,
    borderRadius: SIZES.radius.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.transparent,
  },
  retryText: {
    ...FONTS.bodyMedium,
    color: COLORS.primary,
  },
  errorContainer: {
    marginTop: SIZES.margin.sm,
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
});

export default AmountScheme;