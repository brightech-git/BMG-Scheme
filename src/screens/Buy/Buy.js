import { payWithRazorpay } from "../../services/RazorpayService";
// screens/BuyPage.js
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL, API_BASE_URL_OLD } from "../../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SIZES, FONTS, SHADOWS } from "../../utils/AppTheme";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { insertSchemeCollection } from "../../services/InstallmentUpdateService";
import { getAllSchemes } from "../../services/SchemeNameService";

// -----------------------------
// API Functions
// -----------------------------
// -----------------------------
// BuyPage component
// -----------------------------
const BuyPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { productData, commamt } = route.params || {};

  const [minAmount, setMinAmount] = useState(commamt ?? 100);

  useEffect(() => {
    getAllSchemes()
      .then((schemes) => {
        const schemeId = Number(productData?.schemeSummary?.schemeId);
        const match = schemes.find((s) => s.SchemeId === schemeId);
        setMinAmount(match?.COMMAMT ?? 100);
      })
      .catch(() => {});
  }, []);

  // ---------- memoized product info ----------
  const productInfo = useMemo(
    () => ({
      weightLedger: productData?.schemeSummary?.weightLedger || "N",
      FixedIns: productData?.schemeSummary?.FixedIns || "N",
      defaultAmount: productData?.amount || "",
      defaultName:
        productData?.personalInfo?.pName ||
        productData?.personalInfo?.pname ||
        productData?.accountDetails?.personalInfo?.pName ||
        "Customer",
      defaultContact: productData?.personalInfo?.mobile || "9876543210",
      defaultGroupCode: productData?.groupCode || "",
      defaultRegNo: productData?.regNo || "",
      schemeId: productData?.schemeSummary?.schemeId || "",
    }),
    [productData]
  );

  // ---------- state ----------
  const [token, setToken] = useState(null);
  const [amount, setAmount] = useState(
    productInfo.weightLedger === "Y" || productInfo.FixedIns === "Y"
      ? productInfo.defaultAmount?.toString()
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [payType, setPayType] = useState("CASH");
  const [inputFocused, setInputFocused] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [fetchingPaymentType, setFetchingPaymentType] = useState(true);
  const [payTypeResponse, setPayTypeResponse] = useState(null);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  // refs
  const isMountedRef = useRef(true);
  const retryPaymentRef = useRef(() => {}); // will be set to a safe retry fn
  const handleBuyRef = useRef(null); // to hold current handleBuy function

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------- derived ----------
  const payTypeObj = useMemo(() => {
    if (!payTypeResponse) return null;
    return payTypeResponse.find((item) => item.NAME === payType) || null;
  }, [payType, payTypeResponse]);

  const getPaymentTypeStyle = (type) => {
    switch (type) {
      case "CASH":
        return {
          icon: "💵",
          gradient: COLORS.gradient.primary,
          bgColor: COLORS.primaryLight,
          borderColor: COLORS.primary,
          textColor: COLORS.white,
        };
      case "ONLINE":
        return {
          icon: "💳",
          gradient: COLORS.gradient.primary,
          bgColor: COLORS.primaryLight,
          borderColor: COLORS.primary,
          textColor: COLORS.white,
        };
      case "UPI":
        return {
          icon: "📱",
          gradient: COLORS.gradient.warm,
          bgColor: COLORS.primaryOpacity10,
          borderColor: COLORS.primary,
          textColor: COLORS.primary,
        };
      default:
        return {
          icon: "💰",
          gradient: COLORS.gradient.primary,
          bgColor: COLORS.primaryOpacity10,
          borderColor: COLORS.primary,
          textColor: COLORS.primary,
        };
    }
  };

  const currentPaymentStyle = getPaymentTypeStyle(payType);

  // ---------- validation ----------
  const validateAmount = useCallback((value) => {
    if (!value || value.trim() === "") {
      setAmountError("Amount is required");
      return false;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setAmountError("Please enter a valid amount greater than 0");
      return false;
    }
    if (numValue < minAmount) {
      setAmountError(`Minimum amount is ₹${minAmount}`);
      return false;
    }
    if (numValue > 10000000) {
      setAmountError("Amount cannot exceed ₹1,00,00,000");
      return false;
    }
    setAmountError("");
    return true;
  }, [minAmount]);

  const handleAmountChange = useCallback(
    (value) => {
      const sanitized = value.replace(/[^0-9.]/g, "");
      const parts = sanitized.split(".");
      if (parts.length > 2) return;
      if (parts[1] && parts[1].length > 2) return;
      setAmount(sanitized);
      if (sanitized) validateAmount(sanitized);
      else setAmountError("");
    },
    [validateAmount]
  );

  // ---------- token loader ----------
  useEffect(() => {
    const getToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem("authToken");
        if (!isMountedRef.current) return;
        if (savedToken) {
          setToken(savedToken);
        } else {
          Alert.alert("Authentication Required", "Please login", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        Alert.alert("Error", "Failed to authenticate. Please try again.");
      }
    };
    getToken();
  }, [navigation]);

  // ---------- fetch payment types ----------
  useEffect(() => {
    let active = true;
    const fetchPaymentType = async () => {
      try {
        const url = `${API_BASE_URL_OLD}/account/getTranType`;
        const res = await fetch(url);
        const json = await res.json();

        if (!Array.isArray(json) || json.length === 0) {
          throw new Error("Invalid payment types data");
        }

        if (!active) return;

        setPayTypeResponse(json);
        setPayType(json[0].NAME);
      } catch (error) {
      } finally {
        if (active) setFetchingPaymentType(false);
      }
    };
    fetchPaymentType();
    return () => {
      active = false;
    };
  }, []);

  // Move this function inside the BuyPage component
  // -----------------------------
  // Build scheme collection payload
  // -----------------------------
  const buildSchemeData = useCallback(() => {
    const schemeInfo = productData?.schemeSummary || {};
    const installment =
      parseInt(schemeInfo?.schemaSummaryTransBalance?.insPaid?.toString() || "0") + 1 || 1;

    return {
      schemeId: Number(schemeInfo.schemeId),
      groupCode: productInfo.defaultGroupCode,
      regNo: Number(productInfo.defaultRegNo),
      amount: String(amount || productInfo.defaultAmount),
      installment,
    };
  }, [
    amount,
    productData,
    productInfo.defaultGroupCode,
    productInfo.defaultRegNo,
    productInfo.defaultAmount,
  ]);

  // -----------------------------
  // Insert cash payment immediately
  // -----------------------------
  const insertCashPayment = useCallback(async () => {
    try {
      const schemeData = buildSchemeData();
      const insertResult = await insertSchemeCollection(schemeData);
      navigation.navigate("PaymentSuccess", {
        status: "SUCCESS",
        orderDetails: {
          amount: parseFloat(amount || productInfo.defaultAmount),
          customer: {
            name: productInfo.defaultName,
            contact: productInfo.defaultContact,
            regNo: productInfo.defaultRegNo,
            groupCode: productInfo.defaultGroupCode,
          },
          payType: payType,
          schemeInfo: productData?.schemeSummary || {},
        },
        schemeData,
        paymentStatus: {
          orderStatus: "PAID",
          message: "Cash payment processed successfully",
        },
        productData,
        isCashPayment: true,
        isInstallmentPayment: true,
        paymentType: "installment",
      });
    } catch (error) {
      // Navigate to PaymentFailure for cash payment errors too
      navigation.navigate("PaymentFailure", {
        orderDetails: {
          amount: parseFloat(amount || productInfo.defaultAmount),
          customer: {
            name: productInfo.defaultName,
            contact: productInfo.defaultContact,
            regNo: productInfo.defaultRegNo,
            groupCode: productInfo.defaultGroupCode,
          },
          payType: payType,
        },
        productData,
        paymentStatus: {
          message: error.message || "Cash payment processing failed",
        },
        isCashPayment: true,
      });
    }
  }, [buildSchemeData, navigation, amount, productInfo, payType, productData]);

  // -----------------------------
  // Handle Buy (main)
  // -----------------------------
  const handleBuy = useCallback(async () => {
    if (loading) return; // guard against double taps / duplicate submissions

    if (
      productInfo.weightLedger === "N" &&
      productInfo.FixedIns === "N" &&
      !validateAmount(amount)
    ) {
      Alert.alert(
        "Invalid Amount",
        amountError || "Please enter a valid amount."
      );
      return;
    }

    setLoading(true);

    try {
      if (payType === "CASH") {
        await insertCashPayment();
        return;
      }

      // ONLINE/UPI flow
      if (!token) {
        Alert.alert("Authentication Required", "Please login to continue", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      const schemeData = buildSchemeData();
      if (!productInfo.defaultRegNo || !productInfo.defaultGroupCode) {
        throw new Error("Missing scheme account details.");
      }
      const paymentAmount = Number(amount || productInfo.defaultAmount);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new Error("Invalid payment amount.");
      const result = await payWithRazorpay({
        token, newJoin: false,
        body: { REGNO: productInfo.defaultRegNo, GROUPCODE: productInfo.defaultGroupCode,
          AMOUNT: paymentAmount, SCHEMEDETAILS: { ...schemeData, amount: String(paymentAmount) } },
        orderDetails: { amount: paymentAmount, payType: "ONLINE",
          customer: { name: productInfo.defaultName, contact: productInfo.defaultContact,
            regNo: productInfo.defaultRegNo, groupCode: productInfo.defaultGroupCode },
          schemeInfo: productData?.schemeSummary || {} },
        productData,
      });
      navigation.navigate("PaymentSuccess", {
        ...result, status: "SUCCESS", schemeData, productData,
        isCashPayment: false, isInstallmentPayment: true, paymentType: "installment",
      });
    } catch (error) {
      if (error.cancelled) {
        Alert.alert("Payment Cancelled", "Checkout was closed. Check payment history if money was deducted.");
        return;
      }
      Alert.alert(
        "Payment Error",
        error.message || "Unable to process payment. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Retry",
            onPress: () => {
              try {
                (handleBuyRef.current || (() => {}))();
              } catch (e) {
              }
            },
          },
        ]
      );
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [
    amount,
    amountError,
    insertCashPayment,
    loading,
    navigation,
    payType,
    payTypeResponse,
    productData,
    productInfo,
    token,
    validateAmount,
    buildSchemeData,
  ]);

  // keep a stable ref to handleBuy so that Alert retry can call it safely
  useEffect(() => {
    handleBuyRef.current = handleBuy;
    retryPaymentRef.current = () => {
      try {
        handleBuyRef.current && handleBuyRef.current();
      } catch (e) {
      }
    };
  }, [handleBuy]);

  // ---------- helpers for UI ----------
  const formatCurrency = (value) => {
    if (!value) return "0.00";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "0.00";
    return numValue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    if (payType === "CASH") return "Confirm Payment";
    return "Proceed to Pay";
  };

  const isButtonDisabled = () => {
    if (loading) return true;
    if (fetchingPaymentType) return true;
    if (productInfo.weightLedger === "N" && productInfo.FixedIns === "N") {
      if (!amount) return true;
      if (!!amountError) return true;
      if (parseFloat(amount) < minAmount) return true;
    }
    return false;
  };

  // ---------- styles ----------
  const styles = StyleSheet.create({
    background: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      padding: SIZES.padding.lg,
      paddingBottom: SIZES.padding.xxl,
    },
    mainCard: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.lg,
      padding: SIZES.padding.lg,
      marginBottom: SIZES.margin.lg,
      ...SHADOWS.sm,
      borderWidth: 1,
      borderColor: COLORS.borderLight,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: SIZES.margin.md,
      paddingBottom: SIZES.padding.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderLight,
    },
    sectionIcon: { fontSize: SIZES.icon.md, marginRight: SIZES.margin.sm },
    sectionTitle: { ...FONTS.h5, color: COLORS.textPrimary },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: SIZES.padding.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.backgroundSecondary,
    },
    infoLabel: { ...FONTS.bodySmall, color: COLORS.textSecondary, flex: 1 },
    infoValue: {
      ...FONTS.bodyMedium,
      color: COLORS.textPrimary,
      flex: 1.2,
      textAlign: "right",
    },
    paymentDropdownContainer: { marginTop: SIZES.margin.md },
    dropdownLabel: {
      ...FONTS.bodyMedium,
      color: COLORS.textSecondary,
      marginBottom: SIZES.margin.xs,
    },
    dropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: currentPaymentStyle.bgColor,
      borderRadius: SIZES.radius.md,
      paddingHorizontal: SIZES.padding.md,
      borderWidth: 1.5,
      borderColor: currentPaymentStyle.borderColor,
      height: SIZES.input.height,
    },
    dropdownButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    dropdownIcon: { fontSize: SIZES.icon.md, marginRight: SIZES.margin.sm },
    dropdownText: {
      ...FONTS.bodyMedium,
      color: currentPaymentStyle.textColor,
      fontSize: SIZES.font.md,
    },
    dropdownArrow: {
      fontSize: SIZES.font.md,
      color: currentPaymentStyle.textColor,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: COLORS.overlay,
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.lg,
      padding: SIZES.padding.lg,
      width: "85%",
      maxHeight: "70%",
      ...SHADOWS.lg,
    },
    modalHeader: {
      ...FONTS.h5,
      color: COLORS.textPrimary,
      marginBottom: SIZES.margin.md,
      textAlign: "center",
    },
    paymentOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: SIZES.padding.md,
      borderRadius: SIZES.radius.md,
      marginBottom: SIZES.margin.sm,
      borderWidth: 1.5,
      height: SIZES.button.lg,
    },
    paymentOptionIcon: {
      fontSize: SIZES.icon.lg,
      marginRight: SIZES.margin.md,
    },
    paymentOptionText: { ...FONTS.bodyMedium },
    amountSection: {
      backgroundColor: COLORS.white,
      borderRadius: SIZES.radius.lg,
      padding: SIZES.padding.lg,
      marginBottom: SIZES.margin.lg,
      ...SHADOWS.sm,
      borderWidth: 1,
      borderColor: COLORS.borderLight,
    },
    inputContainer: { marginTop: SIZES.margin.sm },
    inputLabel: {
      ...FONTS.bodyMedium,
      color: COLORS.textPrimary,
      marginBottom: SIZES.margin.xs,
    },
    inputWrapper: {
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
    },
    currencySymbol: {
      position: "absolute",
      left: SIZES.padding.md,
      top: "40%",
      transform: [{ translateY: -12 }],
      fontSize: SIZES.font.xxl,
      color: COLORS.textPrimary,
      zIndex: 1,
    },
    input: {
      backgroundColor: COLORS.inputBackground,
      borderRadius: SIZES.radius.md,
      paddingLeft: SIZES.padding.xxl + 4,
      ...FONTS.h4,
      color: COLORS.textPrimary,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      height: SIZES.input.height + 2,
      marginBottom: 4,
      includeFontPadding: false,
      textAlignVertical: "center",
      width: "100%",
    },
    inputFocused: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.white,
    },
    inputError: { borderColor: COLORS.error },
    errorText: {
      color: COLORS.error,
      ...FONTS.caption,
      marginTop: SIZES.margin.xs,
      marginLeft: SIZES.margin.xs,
    },
    fixedAmountDisplay: {
      backgroundColor: COLORS.warningLight,
      borderRadius: SIZES.radius.md,
      padding: SIZES.padding.md,
      borderWidth: 1.5,
      borderColor: COLORS.warning,
      height: SIZES.input.lg,
      justifyContent: "center",
    },
    amountValue: {
      ...FONTS.h3,
      color: COLORS.textPrimary,
      textAlign: "center",
    },
    buttonContainer: { marginTop: SIZES.margin.lg },
    buttonGradient: {
      borderRadius: SIZES.radius.lg,
      alignItems: "center",
      justifyContent: "center",
      height: SIZES.button.lg,
      ...SHADOWS.md,
    },
    buttonText: { ...FONTS.button, color: COLORS.white },
    disabledButton: { opacity: 0.6 },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      ...FONTS.bodyMedium,
      color: COLORS.white,
      marginLeft: SIZES.margin.sm,
    },
    securityBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: SIZES.margin.md,
      padding: SIZES.padding.sm,
      backgroundColor: COLORS.successLight,
      borderRadius: SIZES.radius.md,
      borderWidth: 1,
      borderColor: COLORS.success,
    },
    securityText: {
      ...FONTS.caption,
      color: COLORS.success,
      marginLeft: SIZES.margin.xs,
    },
  });

  // ---------- render ----------
  return (
    <View style={styles.background}>
      <CommonHeader title="Payment Details" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Customer Information Card */}
          <View style={styles.mainCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>👤</Text>
              <Text style={styles.sectionTitle}>Customer Details</Text>
            </View>

            <View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{productInfo.defaultName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reg No.</Text>
                <Text style={styles.infoValue}>{productInfo.defaultRegNo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Group</Text>
                <Text style={styles.infoValue}>
                  {productInfo.defaultGroupCode}
                </Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Contact</Text>
                <Text style={styles.infoValue}>
                  {productInfo.defaultContact}
                </Text>
              </View>
            </View>

            {/* Payment Type Dropdown */}
            <View style={styles.paymentDropdownContainer}>
              <Text style={styles.dropdownLabel}>Payment Method</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowPaymentDropdown(true)}
                disabled={fetchingPaymentType || loading}
                activeOpacity={0.7}
              >
                <View style={styles.dropdownButtonContent}>
                  <Text style={styles.dropdownIcon}>
                    {currentPaymentStyle.icon}
                  </Text>
                  <Text style={styles.dropdownText}>
                    {fetchingPaymentType ? "Loading..." : payType}
                  </Text>
                </View>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount Section */}
          <View style={styles.amountSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💰</Text>
              <Text style={styles.sectionTitle}>
                {productInfo.weightLedger === "N" &&
                productInfo.FixedIns === "N"
                  ? "Enter Amount"
                  : "Payment Amount"}
              </Text>
            </View>

            {productInfo.weightLedger === "N" &&
            productInfo.FixedIns === "N" ? (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount *</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor={COLORS.inputPlaceholder}
                    value={amount}
                    onChangeText={handleAmountChange}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => {
                      setInputFocused(false);
                      if (amount) validateAmount(amount);
                    }}
                    keyboardType="decimal-pad"
                    style={[
                      styles.input,
                      inputFocused && styles.inputFocused,
                      amountError && styles.inputError,
                    ]}
                    maxLength={10}
                    editable={!loading}
                    returnKeyType="done"
                  />
                </View>
                {amountError ? (
                  <Text style={styles.errorText}>{amountError}</Text>
                ) : (
                  <Text
                    style={[styles.errorText, { color: COLORS.textTertiary }]}
                  >
                    Enter amount between ₹{minAmount} - ₹1,00,00,000
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.fixedAmountDisplay}>
                <Text style={styles.amountValue}>
                  ₹ {formatCurrency(productInfo.defaultAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Proceed Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleBuy}
              disabled={isButtonDisabled()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={currentPaymentStyle.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.buttonGradient,
                  isButtonDisabled() && styles.disabledButton,
                ]}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text style={styles.loadingText}>Processing...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{getButtonText()}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Security Badge */}
          {payType !== "CASH" && !fetchingPaymentType && (
            <View style={styles.securityBadge}>
              <Text style={{ fontSize: SIZES.icon.sm }}>🔒</Text>
              <Text style={styles.securityText}>
                Secure & Encrypted Payment Gateway
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Payment Type Selection Modal */}
      <Modal
        visible={showPaymentDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Payment Method</Text>
            {payTypeResponse &&
              payTypeResponse.map((item) => {
                const style = getPaymentTypeStyle(item.NAME);
                const isSelected = payType === item.NAME;
                return (
                  <TouchableOpacity
                    key={item.NAME}
                    style={[
                      styles.paymentOption,
                      {
                        backgroundColor: isSelected
                          ? style.bgColor
                          : COLORS.backgroundSecondary,
                        borderColor: isSelected
                          ? style.borderColor
                          : COLORS.border,
                      },
                    ]}
                    onPress={() => {
                      setPayType(item.NAME);
                      setShowPaymentDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.paymentOptionIcon}>{style.icon}</Text>
                    <Text
                      style={[
                        styles.paymentOptionText,
                        {
                          color: isSelected
                            ? style.textColor
                            : COLORS.textPrimary,
                        },
                      ]}
                    >
                      {item.NAME}
                    </Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default BuyPage;
