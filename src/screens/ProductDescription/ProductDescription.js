import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ImageBackground,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { BottomTab } from "../../components";
import PaymentReceiptPDF from "../PaymentHistory/PaymentReceipt";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import {
  COLORS,
  SIZES,
  FONTS,
  moderateScale,
  SHADOWS,
} from "../../utils/AppTheme";
import ReceiptPreviewModal from '../../components/ReceiptPreviewModal/ReceiptPreviewModal'
import { API_BASE_URL_OLD } from "../../Config/API";
const SchemePassbook = ({ navigation, route }) => {
  const { productData } = route.params;

  const [refreshing, setRefreshing] = useState(false);
  const [currentRates, setCurrentRates] = useState({
    SILVERRATE: 0,
    GOLDRATE: 0,
  });
  const [ratesLoading, setRatesLoading] = useState(true);

  const [previewVisible, setPreviewVisible] = useState(false);
const [selectedPayment, setSelectedPayment] = useState(null);

// Add preview function
// Update the handlePreviewReceipt function to log data
const handlePreviewReceipt = useCallback((payment) => {
  setSelectedPayment(payment);
  setPreviewVisible(true);
}, [customerInfo, schemeInfo, productData]);

// Close preview function
const closePreview = useCallback(() => {
  setPreviewVisible(false);
  setSelectedPayment(null);
}, []);

  // Fetch current silver and gold rates
  const fetchCurrentRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      const response = await fetch(
        `${API_BASE_URL_OLD}/account/todayrate`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ratesData = await response.json();
      setCurrentRates(ratesData);
    } catch (error) {
      console.error("Error fetching current rates:", error);
      Alert.alert("Error", "Failed to fetch current silver rates");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRates();
  }, [fetchCurrentRates]);

  // Determine scheme type using backend flags (no hardcoded scheme names)
  const schemeType = useMemo(() => {
    const schemeData = productData?.schemeSummary || {};

    // backend may use different casing for keys -> fallbacks included
    const weightLedgerFlag =
      schemeData.WeightLedger || schemeData.weightLedger || "N";
    const fixedInsFlag = schemeData.FixedIns || schemeData.fixedIns || "N";
    const installmentFixed =
      schemeData.Instalment || schemeData.instalment || 0;

    const isWeightLedger = weightLedgerFlag === "Y";
    const isFixedIns = fixedInsFlag === "Y";
    const isInstallmentFixed = parseInt(installmentFixed) === 1;

    // Rules:
    // WeightLedger = N, FixedIns = Y            → AMOUNT_SCHEME
    // WeightLedger = N, FixedIns = N, Installment != 1 → DIGI_SILVER
    // WeightLedger = N, FixedIns = N, Installment = 1  → FIXED_DEPOSIT

    if (!isWeightLedger && isFixedIns) return "AMOUNT_SCHEME"; // N + Y
    if (!isWeightLedger && !isFixedIns && !isInstallmentFixed)
      return "DIGI_SILVER"; // N + N + N
    if (!isWeightLedger && !isFixedIns && isInstallmentFixed)
      return "FIXED_DEPOSIT"; // N + N + Y

    return "OTHER";
  }, [productData]);

  // Date formatting
  const formatDate = useCallback((dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  }, []);

  // Customer and Scheme Info
  const customerInfo = useMemo(() => {
    const customerName =
      productData?.personalInfo?.pName || productData?.pname || "Customer";
    const mobile = productData?.personalInfo?.mobile || "N/A";
    return { customerName, mobile };
  }, [productData]);

  const schemeInfo = useMemo(() => {
    const schemeName =
      productData?.schemeSummary?.schemeName?.trim() || "Scheme Name";
    const groupCode = productData?.groupCode || productData?.groupcode || "N/A";
    const regNo = productData?.regNo || productData?.regno || "N/A";
    return { schemeName, groupCode, regNo };
  }, [productData]);

  // Handle download receipt
  const handleDownloadReceipt = useCallback(
    async (payment) => {

      //   payment,
      //   schemeInfo,
      //   customerInfo,
      //   schemeData: productData,
      // });

      try {
        await PaymentReceiptPDF.generatePDF({
          payment,
          schemeInfo,
          customerInfo,
          schemeData: productData,
        });
      } catch (error) {
        console.error("PDF Generation Error:", error);
        Alert.alert("Error", "Failed to create PDF");
      }
    },
    [schemeInfo, customerInfo, productData]
  );

  // Calculate scheme statistics
  const schemeStats = useMemo(() => {
    const totalPaid = parseFloat(
      productData?.schemeSummary?.schemaSummaryTransBalance?.amtrecd || 0
    );
    const silverSaved = parseFloat(
      productData?.schemeSummary?.totalWeight || 0
    );
    const bonusPercent = parseFloat(productData?.bonusPercent || 0);

    const installmentsPaid = parseInt(
      productData?.schemeSummary?.schemaSummaryTransBalance?.insPaid || 0
    );
    const totalInstallments = parseInt(
      productData?.schemeSummary?.instalment || 0
    );
    const progressPercentage =
      totalInstallments > 0 ? (installmentsPaid / totalInstallments) * 100 : 0;

    // Calculate current silver value and average rate
    const currentSilverValue = silverSaved * (currentRates.SILVERRATE || 0);
    const averageRate = silverSaved > 0 ? totalPaid / silverSaved : 0;

    return {
      totalPaid,
      silverSaved,
      bonusPercent,
      installmentsPaid,
      totalInstallments,
      progressPercentage: Math.min(progressPercentage, 100),
      currentSilverValue,
      averageRate,
    };
  }, [productData, currentRates]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCurrentRates(),
        new Promise((r) => setTimeout(r, 700)),
      ]);

      await PaymentReceiptPDF.refreshCompanyData();
    } catch (error) {
      Alert.alert("Error", "Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchCurrentRates]);

  const handlePaymentPress = useCallback(() => {
    navigation.navigate("PaymentHistory", {
      accountDetails: productData,
      schemeName: productData?.schemeSummary?.schemeName,
      productdata: productData,
      schemeType: schemeType,
    });
  }, [navigation, productData, schemeType]);

  // Render payment history card
const renderPaymentHistory = useCallback(
  ({ item }) => {
    return (
      <TouchableOpacity style={styles.transactionRow} activeOpacity={0.7}>
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionDate}>
            {formatDate(item.updateTime)}
          </Text>
        </View>
        <View style={styles.transactionMiddle}>
          <Text style={styles.transactionAmount}>
            ₹{parseFloat(item.amount || 0).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.transactionRight}>
          <Text style={styles.transactionStatus}>
            {item.weight > 0
              ? `${parseFloat(item.weight).toFixed(3)}g`
              : "Paid"}
          </Text>
        </View>
        {/* Changed from download to eye icon */}
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => handlePreviewReceipt(item)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="remove-red-eye" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  },
  [formatDate, handlePreviewReceipt]
);

  // Main Scheme Card Component
  const MainSchemeCard = () => {
    const hasLeftData = schemeStats?.totalPaid || schemeStats?.silverSaved;
    const hasRightData =
      schemeStats?.averageRate ||
      schemeStats?.installmentsPaid ||
      productData?.bonusAmount;
    const hasDates = productData?.joinDate || productData?.maturityDate;

    return (
      <View style={styles.floatingCard}>
        {/* Header */}
        {(productData?.schemeSummary?.schemeName ||
          productData?.pname ||
          productData?.groupcode ||
          productData?.regNo) && (
          <View style={styles.cardHeader}>
            <View style={styles.headerIconContainer}>
              <MaterialIcons
                name="account-balance"
                size={26}
                color={COLORS.white}
              />
              {productData?.schemeSummary?.schemeName ? (
                <Text style={styles.schemeName}>
                  {productData?.schemeSummary?.schemeName}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerTextContainer}>
              {productData?.pname ? (
                <Text style={styles.pname}>{productData?.pname}</Text>
              ) : null}
              {productData?.groupcode && productData?.regNo ? (
                <Text style={styles.groupCode}>
                  {productData?.groupcode} - {productData?.regNo}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Top Row */}
        {(schemeStats?.totalPaid ||
          schemeStats?.averageRate ||
          productData?.bonusAmount) && (
          <View style={styles.topRow}>
            {/* Left Section */}
            {hasLeftData ? (
              <View style={styles.leftSection}>
                {schemeStats?.totalPaid ? (
                  <View style={[styles.dataRow, { alignItems: "flex-start" }]}>
                    <Text style={styles.dataLabel}>Total Amount Paid</Text>
                    <Text style={styles.dataValue}>
                      ₹{schemeStats.totalPaid.toLocaleString("en-IN")}
                    </Text>
                  </View>
                ) : null}

                {/* <View style={[styles.dataRow, { alignItems: "flex-start" }]}>
                  <Text style={styles.dataLabel}>Benefit Amount</Text>
                  <Text style={styles.dataValue}>
                    ₹
                    {Math.ceil(
                      Number(productData?.bonusAmount || 0)
                    ).toLocaleString("en-IN")}
                  </Text>
                </View> */}
              </View>
            ) : null}

            {/* Right Section */}
            {hasRightData ? (
              <View style={styles.rightSection}>
                {schemeType === "DIGI_SILVER" ? (
                  <View style={[styles.dataRow, { alignItems: "flex-end" }]}>
                    <Text style={styles.dataLabel}>Installments Paid</Text>
                    <Text style={styles.dataValue}>
                      {schemeStats.installmentsPaid}
                    </Text>
                  </View>
                ) : schemeStats?.installmentsPaid ? (
                  <View style={[styles.dataRow, { alignItems: "flex-end" }]}>
                    <Text style={styles.dataLabel}>Installments Paid</Text>
                    <Text style={styles.dataValue}>
                      {schemeStats.installmentsPaid}/
                      {schemeStats.totalInstallments}
                    </Text>
                  </View>
                ) : null}

                {/* {productData?.bonusAmount ? (
                  <View style={[styles.dataRow, { alignItems: "flex-end" }]}>
                    <Text style={styles.dataLabel}>Eligible Amount</Text>
                    <Text style={styles.dataValue}>
                      ₹
                      {Math.ceil(
                        Number(schemeStats?.totalPaid || 0) +
                          Number(productData?.bonusAmount || 0)
                      ).toLocaleString("en-IN")}
                    </Text>
                  </View>
                ) : null} */}
              </View>
            ) : null}
          </View>
        )}

        {/* Dates */}
        {hasDates && (
          <View style={styles.bottomRow}>
            {productData?.joinDate ? (
              <View style={[styles.dateRow, { alignItems: "flex-start" }]}>
                <Text style={styles.dateLabel}>Date Of Join</Text>
                <Text style={styles.dateValue}>
                  {formatDate(productData.joinDate)}
                </Text>
              </View>
            ) : null}

            {productData?.maturityDate ? (
              <View style={[styles.dateRow, { alignItems: "flex-end" }]}>
                <Text style={styles.dateLabel}>Date Of Maturity</Text>
                <Text style={styles.dateValue}>
                  {formatDate(productData.maturityDate)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  // Payment History Section Component
  const PaymentHistorySection = () => {
    const paymentHistory = productData?.paymentHistoryList || [];
    const recentPayments = paymentHistory.slice(0, 11);

    return (
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Transaction History</Text>
          {paymentHistory.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handlePaymentPress}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tableHeader}>
          <View style={styles.tableColumn}>
            <Text style={styles.tableHeaderText}>Date</Text>
          </View>
          <View style={styles.tableColumn}>
            <Text style={styles.tableHeaderText}>Amount</Text>
          </View>
          <View style={styles.tableColumn}>
            <Text style={styles.tableHeaderText}>
              {schemeType === "DIGI_SILVER" ? "Status" : "Status"}
            </Text>
          </View>
          <View style={styles.tableColumnAction}>
            <Text style={styles.tableHeaderText}>Action</Text>
          </View>
        </View>

        {paymentHistory.length > 0 ? (
          <View
            style={[
              styles.transactionsContainer,
              recentPayments.length > 6 && { maxHeight: moderateScale(260) },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {recentPayments.map((item, index) => (
                <View key={item.receiptNo || `${item.installment}-${index}`}>
                  {renderPaymentHistory({ item })}
                  {index < recentPayments.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="inbox" size={40} color={COLORS.border} />
            </View>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your payment history will appear here
            </Text>
          </View>
        )}
      </View>
    );
  };

return (
  <ImageBackground
    source={require("../../assets/image.png")}
    style={styles.mainBackground}
    imageStyle={styles.backgroundImageStyle}
  >
    <View style={styles.container}>
      <CommonHeader title="Scheme Passbook" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.scrollViewContent}
      >
        <MainSchemeCard />
        <PaymentHistorySection />
      </ScrollView>

      {/* Add Receipt Preview Modal */}
      <ReceiptPreviewModal
        visible={previewVisible}
        onClose={closePreview}
        payment={selectedPayment}
        schemeInfo={schemeInfo}
        customerInfo={customerInfo}
        schemeData={productData}
      />

      <BottomTab />
    </View>
  </ImageBackground>
);

};

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainBackground: { flex: 1 },
  backgroundImageStyle: { opacity: 0.7 },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: SIZES.padding.md,
  },
  previewButton: {  // Changed from downloadButton
    flex: 0.6,
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.padding.xs,
  },

  // Floating Card Styles
  floatingCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding.lg,
    marginTop: SIZES.padding.md,
    padding: SIZES.padding.lg,
    borderRadius: SIZES.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.lg,
    marginBottom: SIZES.padding.md,
  },

  // Card Header
  cardHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.padding.sm,
    paddingHorizontal: SIZES.padding.md,
    borderTopLeftRadius: SIZES.radius.lg,
    borderTopRightRadius: SIZES.radius.lg,
    marginHorizontal: -SIZES.padding.lg,
    marginTop: -SIZES.padding.lg,
    marginBottom: SIZES.padding.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SIZES.padding.sm,
  },
  headerIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SIZES.padding.sm,
  },
  headerTextContainer: {
    alignItems: "flex-end",
    flex: 1,
  },
  schemeName: {
    ...FONTS.h5,
    color: COLORS.white,
    fontWeight: FONTS.weight.bold,
  },
  pname: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    textAlign: "right",
  },
  groupCode: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontWeight: FONTS.weight.semiBold,
    textAlign: "right",
  },

  // Top Row Layout
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SIZES.padding.lg,
  },
  leftSection: {
    flex: 1,
    marginRight: SIZES.padding.sm,
    alignItems: "flex-start",
  },
  rightSection: {
    flex: 1,
    marginLeft: SIZES.padding.sm,
    alignItems: "flex-end",
  },

  // Data Rows
  dataRow: {
    marginBottom: SIZES.padding.md,
    width: "100%",
  },
  dataLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding.xs,
  },
  dataValue: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weight.bold,
  },

  // Bottom Row (Dates)
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateRow: { flex: 1 },
  dateLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding.xs,
  },
  dateValue: {
    ...FONTS.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weight.semiBold,
  },

  // History Section
  historySection: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.lg,
    padding: SIZES.padding.lg,
    marginHorizontal: SIZES.padding.lg,
    ...SHADOWS.md,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.padding.md,
  },
  historyTitle: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding.md,
    paddingVertical: SIZES.padding.xs,
    borderRadius: SIZES.radius.full,
    gap: SIZES.padding.xs,
  },
  viewAllText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontWeight: FONTS.weight.semiBold,
  },

  // Table Styles
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.gray50,
    padding: SIZES.padding.md,
    borderRadius: SIZES.radius.sm,
    marginBottom: SIZES.padding.sm,
  },
  tableColumn: {
    flex: 1,
    alignItems: "center",
  },
  tableColumnAction: {
    flex: 0.6,
    alignItems: "center",
  },
  tableHeaderText: {
    ...FONTS.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weight.bold,
  },

  // Transactions Container
  transactionsContainer: {
    borderRadius: SIZES.radius.sm,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  // Transaction Row
  transactionRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    padding: SIZES.padding.md,
    alignItems: "center",
  },
  transactionLeft: {
    flex: 1,
    alignItems: "center",
  },
  transactionMiddle: {
    flex: 1,
    alignItems: "center",
  },
  transactionRight: {
    flex: 1,
    alignItems: "center",
  },
  downloadButton: {
    flex: 0.6,
    alignItems: "center",
    justifyContent: "center",
    padding: SIZES.padding.xs,
  },

  // Transaction Text
  transactionDate: {
    ...FONTS.bodySmall,
    color: COLORS.textPrimary,
  },
  transactionAmount: {
    ...FONTS.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weight.semiBold,
  },
  transactionStatus: {
    ...FONTS.bodySmall,
    color: COLORS.success,
    fontWeight: FONTS.weight.semiBold,
  },

  // Dividers
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: SIZES.padding.xl,
  },
  emptyIconContainer: {
    width: SIZES.icon.xxxl,
    height: SIZES.icon.xxxl,
    borderRadius: SIZES.icon.xxxl / 2,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.padding.md,
  },
  emptyStateText: {
    ...FONTS.bodyMedium,
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding.xs,
  },
  emptyStateSubtext: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
});

export default SchemePassbook;
