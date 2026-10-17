// PaymentDetailScreen.js - Optimized Professional Receipt
import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  Image,
} from "react-native";
import { COLORS, moderateScale } from "../../utils/Theme";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import PaymentReceiptPDF from "./PaymentReceipt";

const PaymentDetailScreen = ({ navigation, route }) => {
  const { payment, accountDetails, productdata, schemeType } = route.params;

  if (!payment) {
    navigation.goBack();
    return null;
  }

  const schemeData = productdata || accountDetails;

  const formatDateTimeWithTime = useCallback((dateTimeString) => {
    if (!dateTimeString) return "N/A";
    try {
      const dateString = dateTimeString.includes(" ")
        ? dateTimeString.replace(" ", "T").replace(/\.\d+$/, "")
        : dateTimeString;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  }, []);

  const customerInfo = useMemo(() => {
    const customerName =
      schemeData?.personalInfo?.pName || schemeData?.pname || "Customer";
    const mobile = schemeData?.personalInfo?.mobile || "N/A";
    return { customerName, mobile };
  }, [schemeData]);

  const schemeInfo = useMemo(() => {
    const schemeName =
      schemeData?.schemeSummary?.schemeName?.trim() || "Scheme Name";
    const groupCode = schemeData?.groupCode || schemeData?.groupcode || "N/A";
    const regNo = schemeData?.regNo || schemeData?.regno || "N/A";
    return { schemeName, groupCode, regNo };
  }, [schemeData]);

  const handleDownloadReceipt = async () => {


    try {
      await PaymentReceiptPDF.generatePDF({
        payment,
        schemeInfo,
        customerInfo,
        schemeData,
      });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      Alert.alert("Error", "Failed to create PDF");
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <CommonHeader
          title="Payment Receipt"
          showBack
          backIconName="arrow-back"
          backIconColor={COLORS.primary}
          backgroundColor={COLORS.white}
          textColor={COLORS.black}
          centerTitle
          rightComponent={
            <TouchableOpacity
              onPress={handleDownloadReceipt}
              style={styles.actionButton}
            >
              <MaterialIcons name="download" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          }
        />
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* A4 Paper Container */}
          <View style={styles.receiptContainer}>
            {/* Company Header */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.companyInfo}>
                  <Text style={styles.companyName}>BMG JEWELLERS PVT LTD</Text>
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.contactSection}>
              <Text style={styles.contactText}>
                📞 +91-95143 33601, +91-95143 33609
              </Text>
              <Text style={styles.contactText}>✉ Contact@bmgjewellers.in</Text>
              <Text style={styles.contactText}>
                📍 160, Melamasi St, Madurai-625001
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Receipt Title */}
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>

            {/* Scheme and Transaction Info */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Scheme Name</Text>
                  <Text style={styles.infoValue}>{schemeInfo.schemeName}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Transaction Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTimeWithTime(payment.updateTime)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Receipt To Section */}
            <View style={styles.receiptToSection}>
              <Text style={styles.sectionTitle}>RECEIPT TO:</Text>
              <View style={styles.customerBox}>
                <View style={styles.customerRow}>
                  <View style={styles.customerItem}>
                    <Text style={styles.customerLabel}>Name:</Text>
                    <Text style={styles.customerValue}>
                      {customerInfo.customerName}
                    </Text>
                  </View>
                  <View style={styles.customerItem}>
                    <Text style={styles.customerLabel}>Transaction No:</Text>
                    <Text style={styles.customerValue}>
                      {payment.receiptNo}
                    </Text>
                  </View>
                </View>
                <View style={styles.customerRow}>
                  <View style={styles.customerItem}>
                    <Text style={styles.customerLabel}>Mobile:</Text>
                    <Text style={styles.customerValue}>
                      {customerInfo.mobile}
                    </Text>
                  </View>
                  <View style={styles.customerItem}>
                    <Text style={styles.customerLabel}>Group Code:</Text>
                    <Text style={styles.customerValue}>
                      {schemeInfo.groupCode}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Payment Table */}
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 0.5 }]}>S.No</Text>
                <Text style={[styles.th, { flex: 1.8 }]}>
                  Group Code - Reg No
                </Text>
                <Text style={[styles.th, { flex: 1 }]}>Installment</Text>
                {payment.weight && parseFloat(payment.weight) > 0 && (
                  <Text style={[styles.th, { flex: 1 }]}>Weight (g)</Text>
                )}
                <Text style={[styles.th, { flex: 1.2 }]}>Amount (₹)</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.td, { flex: 0.5 }]}>1</Text>
                <Text style={[styles.td, { flex: 1.8 }]}>
                  {schemeInfo.groupCode}-{schemeInfo.regNo}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>
                  {payment.installment || "1"}
                </Text>
                {payment.weight && parseFloat(payment.weight) > 0 && (
                  <Text style={[styles.td, { flex: 1 }]}>
                    {parseFloat(payment.weight).toFixed(3)}
                  </Text>
                )}
                <Text style={[styles.td, { flex: 1.2 }]}>
                  ₹{parseFloat(payment.amount || 0).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount Paid:</Text>
              <Text style={styles.totalAmount}>
                ₹{parseFloat(payment.amount || 0).toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Thank you for being our valued customer
              </Text>
              <Text style={styles.footerSubText}>
                This is a computer generated receipt
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    padding: moderateScale(16),
    paddingBottom: moderateScale(32),
  },
  receiptContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(8),
    padding: moderateScale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: moderateScale(800), // A4 aspect ratio
  },

  // Header Section
  header: {
    marginBottom: moderateScale(16),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: moderateScale(60),
    height: moderateScale(60),
    marginRight: moderateScale(12),
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    color: "#4C0B0B",
    fontSize: moderateScale(18),
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  appName: {
    color: "#8B4513",
    fontSize: moderateScale(14),
    marginTop: moderateScale(4),
    fontWeight: "600",
  },

  // Contact Section
  contactSection: {
    backgroundColor: "#FFF9F0",
    padding: moderateScale(12),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(16),
  },
  contactText: {
    color: "#333",
    fontSize: moderateScale(11),
    lineHeight: moderateScale(18),
    marginBottom: moderateScale(2),
  },

  // Divider
  divider: {
    height: 2,
    backgroundColor: "#4C0B0B",
    marginVertical: moderateScale(16),
  },

  // Receipt Title
  receiptTitle: {
    fontSize: moderateScale(20),
    fontWeight: "bold",
    color: "#4C0B0B",
    textAlign: "center",
    marginBottom: moderateScale(20),
    letterSpacing: 1,
  },

  // Info Section
  infoSection: {
    backgroundColor: "#F8F9FA",
    padding: moderateScale(14),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(16),
    borderLeftWidth: 4,
    borderLeftColor: "#4C0B0B",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateScale(12),
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: moderateScale(11),
    color: "#666",
    marginBottom: moderateScale(4),
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: moderateScale(13),
    color: "#000",
    fontWeight: "bold",
  },

  // Receipt To Section
  receiptToSection: {
    marginBottom: moderateScale(16),
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: "bold",
    color: "#4C0B0B",
    marginBottom: moderateScale(10),
    textTransform: "uppercase",
  },
  customerBox: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: moderateScale(6),
    padding: moderateScale(12),
    backgroundColor: "#FAFAFA",
  },
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: moderateScale(10),
    gap: moderateScale(12),
  },
  customerItem: {
    flex: 1,
  },
  customerLabel: {
    fontSize: moderateScale(11),
    fontWeight: "600",
    color: "#555",
    marginBottom: moderateScale(4),
  },
  customerValue: {
    fontSize: moderateScale(12),
    color: "#000",
    fontWeight: "500",
  },

  // Table
  tableContainer: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: moderateScale(6),
    overflow: "hidden",
    marginBottom: moderateScale(16),
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#4C0B0B",
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(8),
  },
  th: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: moderateScale(11),
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(8),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  td: {
    textAlign: "center",
    color: "#333",
    fontSize: moderateScale(12),
    fontWeight: "500",
  },

  // Total Section
  totalSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#FFF9F0",
    padding: moderateScale(14),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(20),
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  totalLabel: {
    fontSize: moderateScale(14),
    fontWeight: "600",
    color: "#333",
    marginRight: moderateScale(12),
  },
  totalAmount: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#4C0B0B",
  },

  // Footer
  footer: {
    marginTop: moderateScale(30),
    paddingTop: moderateScale(16),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  footerText: {
    fontSize: moderateScale(12),
    color: "#555",
    fontWeight: "600",
    marginBottom: moderateScale(6),
  },
  footerSubText: {
    fontSize: moderateScale(10),
    color: "#999",
    fontStyle: "italic",
  },

  // Action Button
  actionButton: {
    padding: moderateScale(8),
    backgroundColor: "#F0F0F0",
    borderRadius: moderateScale(20),
  },
});

export default PaymentDetailScreen;
