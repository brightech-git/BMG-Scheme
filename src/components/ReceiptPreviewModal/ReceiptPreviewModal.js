import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import PaymentReceiptPDF from "../../screens/PaymentHistory/PaymentReceipt";
import { COLORS, SIZES, FONTS, moderateScale } from "../../utils/AppTheme";
import CommonHeader from "../CommonHeader/CommonHeader";

const { width } = Dimensions.get("window");

const ReceiptPreviewModal = ({
  visible,
  onClose,
  payment,
  schemeInfo,
  customerInfo,
  schemeData,
}) => {
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [companyDataLoading, setCompanyDataLoading] = useState(true);

  useEffect(() => {
    if (visible && payment) {
      preparePreviewData();
    }
  }, [visible, payment]);

  const preparePreviewData = async () => {
    try {
      setLoading(true);
      setCompanyDataLoading(true);

      // Fetch fresh company data directly from API (no cache)
      const companyData = await PaymentReceiptPDF.getCompanyData();
      setCompanyData(companyData);
      setCompanyDataLoading(false);

      // Prepare data in the exact format expected by your PDF generator
      const responseData = {
        payment: {
          amount: payment.amount || "0",
          weight: payment.weight || "0.0",
          receiptNo: payment.receiptNo || "0",
          updateTime:
            payment.updateTime || payment.date || new Date().toISOString(),
          paymentMode: payment.chqBank || payment.paymentMode || "Cash",
          paymentSubMode: payment.chqBranch || payment.paymentSubMode || "",
          transactionId:
            payment.chq_CardNo ||
            payment.transactionId ||
            payment.receiptNo ||
            "N/A",
          installment: payment.installment || "1",
          chqBank: payment.chqBank || payment.paymentMode || "Cash",
          chqBranch: payment.chqBranch || payment.paymentSubMode || "",
          chq_CardNo:
            payment.chq_CardNo ||
            payment.transactionId ||
            payment.receiptNo ||
            "N/A",
        },
        customerInfo: customerInfo || {},
        schemeInfo: schemeInfo || {},
        schemeData: schemeData || {},
      };

      // Use the same extractDataFromResponse method as PDF generator
      const extractedData =
        PaymentReceiptPDF.extractDataFromResponse(responseData);
      setPreviewData(extractedData);
    } catch (error) {
      console.error("Error preparing preview data:", error);
      Alert.alert("Error", "Failed to load receipt data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setGeneratingPDF(true);

      // Prepare data for PDF generation
      const responseData = {
        payment,
        customerInfo,
        schemeInfo,
        schemeData,
      };

      // This will fetch fresh company data from API
      await PaymentReceiptPDF.generatePDF(responseData);

      onClose();
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download receipt");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Refresh company data manually if needed
  const refreshCompanyData = async () => {
    try {
      setCompanyDataLoading(true);
      const freshData = await PaymentReceiptPDF.getCompanyData();
      setCompanyData(freshData);
      Alert.alert("Success", "Company data refreshed from API");
    } catch (error) {
      console.error("Refresh error:", error);
      Alert.alert("Error", "Failed to refresh company data");
    } finally {
      setCompanyDataLoading(false);
    }
  };

  const val = (v) => (v && v !== "N/A" && String(v).trim() !== "" ? String(v).trim() : null);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const numberToWords = (num) => {
    // Use the PaymentReceiptPDF method directly
    return PaymentReceiptPDF.numberToWords(num);
  };

  // Add a refresh button in header or somewhere accessible
  const EnhancedHeader = () => (
    <View style={styles.enhancedHeader}>
      <CommonHeader title="Receipt Preview" />
      {companyDataLoading && (
        <View style={styles.companyDataLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.companyDataLoadingText}>
            Fetching company data...
          </Text>
        </View>
      )}
    </View>
  );

  if (!payment) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.container}>
          <EnhancedHeader />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading receipt data...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Enhanced Header with loading indicator */}
        <EnhancedHeader />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Generating preview...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >

            {/* Preview Container */}
            <View style={styles.previewContainer}>
              {/* Top Bar */}
              <View style={styles.topBar} />

              {/* Receipt Header */}
              <View style={styles.topHeader}>
                <Text style={styles.receiptTitle}>
                  Advance{"\n"}Receipt Voucher
                </Text>
                <View style={styles.logoPlaceholder}>
                  <Image
                    source={require("../../assets/icon.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Company and Customer Info Container */}
              <View style={styles.infoContainer}>
                {/* Left Section - Company Info */}
                <View style={styles.leftSection}>
                  <View style={styles.receiptInfo}>
                    {val(previewData.payment.receiptNo || payment.receiptNo) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Receipt Number : </Text>
                        <Text style={styles.infoValue}>{val(previewData.payment.receiptNo || payment.receiptNo)}</Text>
                      </Text>
                    )}
                    {formatDate(previewData.payment.updateTime || payment.updateTime) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Receipt Date : </Text>
                        <Text style={styles.infoValue}>{formatDate(previewData.payment.updateTime || payment.updateTime)}</Text>
                      </Text>
                    )}
                  </View>

                  <View style={styles.companySection}>
                    <Text style={styles.companyName}>{companyData.cname}</Text>
                    <View style={styles.companyDetails}>
                      <Text style={styles.companyDetail}>
                        {companyData.cAddress1}
                      </Text>
                      <Text style={styles.companyDetail}>
                        {companyData.cAddress2}
                      </Text>
                      {companyData.cAddress3 && (
                        <Text style={styles.companyDetail}>
                          {companyData.cAddress3}
                        </Text>
                      )}
                      {companyData.cAddress4 && (
                        <Text style={styles.companyDetail}>
                          {companyData.cAddress4}
                        </Text>
                      )}
                      {companyData.cPincode && (
                        <Text style={styles.companyDetail}>
                          PIN: {companyData.cPincode}
                        </Text>
                      )}
                      {companyData.cPhone && (
                        <Text style={styles.companyDetail}>
                          Phone: {companyData.cPhone}
                        </Text>
                      )}
                      {companyData.cEmail && (
                        <Text style={styles.companyDetail}>
                          Email: {companyData.cEmail}
                        </Text>
                      )}
                      {companyData.cFax && (
                        <Text style={styles.companyDetail}>
                          Fax: {companyData.cFax}
                        </Text>
                      )}
                      {companyData.gstNo ? (
                        <Text style={styles.companyDetail}>
                          GSTIN: {companyData.gstNo}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Right Section - Customer Info */}
                <View style={styles.rightSection}>
                  <View style={styles.customerAddress}>
                    {val(previewData.customerInfo.customerName || customerInfo?.customerName) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Name : </Text>
                        <Text style={styles.infoValue}>{val(previewData.customerInfo.customerName || customerInfo?.customerName)}</Text>
                      </Text>
                    )}
                    {val(previewData.customerInfo.mobile || customerInfo?.mobile) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Mobile : </Text>
                        <Text style={styles.infoValue}>{val(previewData.customerInfo.mobile || customerInfo?.mobile)}</Text>
                      </Text>
                    )}
                    {val(previewData.payment.transactionId || payment.transactionId || payment.receiptNo) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Transaction ID : </Text>
                        <Text style={styles.infoValue}>{val(previewData.payment.transactionId || payment.transactionId || payment.receiptNo)}</Text>
                      </Text>
                    )}
                    {val(previewData.payment.paymentMode || payment.chqBank || payment.paymentMode) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Payment Mode : </Text>
                        <Text style={styles.infoValue}>
                          {val(previewData.payment.paymentMode || payment.chqBank || payment.paymentMode)}
                          {val(previewData.payment.paymentSubMode) ? ` - ${val(previewData.payment.paymentSubMode)}` : ""}
                        </Text>
                      </Text>
                    )}
                    {val(previewData.customerInfo.address1 || customerInfo?.address1) && (
                      <Text style={styles.infoRow}>
                        <Text style={styles.label}>Address : </Text>
                        <Text style={styles.infoValue}>
                          {val(previewData.customerInfo.address1 || customerInfo?.address1)}
                          {val(previewData.customerInfo.address2) ? `, ${val(previewData.customerInfo.address2)}` : ""}
                        </Text>
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Payment Table */}
              <View style={styles.paymentTable}>
                <View style={styles.tableHeader}>
                  <View style={[styles.tableCol, { flex: 0.5 }]}>
                    <Text style={styles.tableHeaderText}>S.No</Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 1.5 }]}>
                    <Text style={styles.tableHeaderText}>Description</Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 0.8 }]}>
                    <Text style={styles.tableHeaderText}>HSN Code</Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 1 }]}>
                    <Text style={styles.tableHeaderText}>Amount</Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <View style={[styles.tableCol, { flex: 0.5 }]}>
                    <Text style={styles.tableCellText}>1</Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 1.5 }]}>
                    <Text style={styles.tableCellText}>
                      {previewData.schemeInfo.schemeName ||
                        schemeInfo?.schemeName ||
                        "Scheme"}
                    </Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 1 }]}>
                    <Text style={styles.tableCellText}>
                      {previewData.schemeInfo.hsnCode ||
                        schemeInfo?.hsnCode ||
                        ""}
                    </Text>
                  </View>
                  <View style={[styles.tableCol, { flex: 1 }]}>
                    <Text style={[styles.tableCellText, styles.amountCell]}>
                      ₹ {formatAmount(payment.amount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amount in Words */}
              <View style={styles.amountWords}>
                <Text style={styles.amountWordsLabel}>Amount in words:</Text>
                <Text style={styles.amountWordsText}>
                  {numberToWords(parseFloat(payment.amount || 0))}
                </Text>
              </View>

              {/* Total Bar */}
              <View style={styles.totalBar}>
                <Text style={styles.totalLabel}>Total Amount Paid</Text>
                <Text style={styles.totalAmount}>
                  ₹ {formatAmount(payment.amount)}
                </Text>
              </View>

              {/* Footer Note */}
              <View style={styles.footerNoteContainer}>
                <Text style={styles.footerNote}>
                  * This is a computer generated invoice and does not require a
                  physical signature *
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={generatingPDF}
              >
                <MaterialIcons name="close" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.downloadButton]}
                onPress={handleDownload}
                disabled={generatingPDF || companyDataLoading}
              >
                {generatingPDF ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="download"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.buttonText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  enhancedHeader: {
    position: "relative",
  },
  companyDataLoading: {
    position: "absolute",
    top: 0,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  companyDataLoadingText: {
    ...FONTS.caption,
    fontSize: moderateScale(10),
    color: COLORS.primary,
    marginLeft: 4,
  },
  dataSourceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    paddingHorizontal: SIZES.padding.md,
    paddingVertical: SIZES.padding.sm,
    marginHorizontal: SIZES.padding.lg,
    marginTop: SIZES.padding.sm,
    borderRadius: SIZES.radius.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  dataSourceText: {
    ...FONTS.caption,
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
  },
  dataSourceHighlight: {
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.primary,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.padding.sm,
    paddingVertical: SIZES.padding.xs,
    borderRadius: SIZES.radius.xs,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  refreshButtonText: {
    ...FONTS.caption,
    fontSize: moderateScale(10),
    color: COLORS.primary,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginTop: SIZES.padding.md,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.padding.xl,
  },
  previewContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.padding.lg,
    marginTop: SIZES.padding.md,
    padding: moderateScale(16),
    borderRadius: SIZES.radius.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBar: {
    height: moderateScale(6),
    backgroundColor: COLORS.primary,
    marginBottom: moderateScale(16),
    borderRadius: SIZES.radius.xs,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: moderateScale(20),
  },
  receiptTitle: {
    fontSize: moderateScale(24),
    fontWeight: FONTS.weight.bold,
    color: "#4a2c1f",
    lineHeight: moderateScale(28),
  },
  logoPlaceholder: {
    width: moderateScale(135),
    height: moderateScale(70),
    // backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius.sm,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: moderateScale(20),
  },
  leftSection: {
    flex: 1,
    marginRight: moderateScale(8),
  },
  rightSection: {
    flex: 1,
    marginLeft: moderateScale(8),
  },
  receiptInfo: {
    marginBottom: moderateScale(16),
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: moderateScale(6),
    flexWrap: "wrap",
  },
  label: {
    ...FONTS.bodySmall,
    fontSize: moderateScale(11),
    fontWeight: FONTS.weight.semiBold,
    color: COLORS.textPrimary,
    marginRight: moderateScale(4),
  },
  infoValue: {
    ...FONTS.bodySmall,
    fontSize: moderateScale(11),
    color: COLORS.textSecondary,
    flex: 1,
  },
  companySection: {
    marginTop: moderateScale(8),
  },
  companyName: {
    ...FONTS.bodyMedium,
    fontSize: moderateScale(12),
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: moderateScale(4),
  },
  companyDetails: {
    marginTop: moderateScale(2),
  },
  companyDetail: {
    ...FONTS.caption,
    fontSize: moderateScale(10),
    color: COLORS.textSecondary,
    marginBottom: moderateScale(2),
    lineHeight: moderateScale(14),
  },
  paymentTable: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: SIZES.radius.sm,
    marginBottom: moderateScale(16),
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.gray50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingVertical: moderateScale(8),
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: moderateScale(8),
  },
  tableCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: moderateScale(4),
  },
  tableHeaderText: {
    ...FONTS.caption,
    fontSize: moderateScale(10),
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
  },
  tableCellText: {
    ...FONTS.bodySmall,
    fontSize: moderateScale(10),
    color: COLORS.textPrimary,
    textAlign: "center",
    paddingHorizontal: moderateScale(2),
  },
  amountCell: {
    fontWeight: FONTS.weight.bold,
  },
  amountWords: {
    backgroundColor: COLORS.gray50,
    padding: moderateScale(12),
    borderRadius: SIZES.radius.sm,
    marginBottom: moderateScale(16),
  },
  amountWordsLabel: {
    ...FONTS.caption,
    fontSize: moderateScale(11),
    fontWeight: FONTS.weight.bold,
    color: COLORS.textPrimary,
    marginBottom: moderateScale(4),
  },
  amountWordsText: {
    ...FONTS.bodySmall,
    fontSize: moderateScale(11),
    color: COLORS.textPrimary,
    lineHeight: moderateScale(16),
  },
  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(12),
    borderRadius: SIZES.radius.sm,
    marginBottom: moderateScale(16),
  },
  totalLabel: {
    ...FONTS.bodyMedium,
    fontSize: moderateScale(13),
    fontWeight: FONTS.weight.bold,
    color: COLORS.white,
  },
  totalAmount: {
    ...FONTS.bodyMedium,
    fontSize: moderateScale(13),
    fontWeight: FONTS.weight.bold,
    color: COLORS.white,
  },
  footerNoteContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: moderateScale(12),
  },
  footerNote: {
    ...FONTS.caption,
    fontSize: moderateScale(10),
    color: COLORS.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: moderateScale(14),
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SIZES.padding.lg,
    paddingTop: SIZES.padding.lg,
    paddingBottom: SIZES.padding.xl,
    gap: SIZES.padding.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: moderateScale(14),
    borderRadius: SIZES.radius.md,
    gap: SIZES.padding.sm,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  downloadButton: {
    backgroundColor: COLORS.success,
  },
  buttonText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    fontWeight: FONTS.weight.semiBold,
  },
});

export default ReceiptPreviewModal;