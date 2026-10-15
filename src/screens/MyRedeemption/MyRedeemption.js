// SchemeListPage.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPhoneDetails } from "../../services/SchemeDetailsService";
import { getRemainingDaysData } from "../../services/Remainingdays";
import { sendRedemption } from "../../services/RedemptionService";
import theme from "../../utils/AppTheme";
import CommonHeader from "../../components/CommonHeader/CommonHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Helper function to determine button font size based on text length
const getButtonFontSize = (text = "How to Redeem") => {
  const textLength = text.length;

  if (SCREEN_WIDTH < 350) {
    if (textLength > 12) return 9;
    if (textLength > 10) return 10;
    return 11;
  } else if (SCREEN_WIDTH < 400) {
    if (textLength > 12) return 10;
    if (textLength > 10) return 11;
    return 12;
  } else {
    if (textLength > 12) return 11;
    if (textLength > 10) return 12;
    return 13;
  }
};

const SchemeListPage = ({ route, navigation }) => {
  const routePhoneNumber = route?.params?.phoneNumber || null;

  const [phoneNumber, setPhoneNumber] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [schemeApiData, setSchemeApiData] = useState({});
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [redemptionMessage, setRedemptionMessage] = useState(null);
  const [redemptionSubmitted, setRedemptionSubmitted] = useState(false);
  const [redemptionStatusData, setRedemptionStatusData] = useState([]);
  const [loadingRedemptionStatus, setLoadingRedemptionStatus] = useState(false);

  // Helper function to extract date part from ISO string
  const extractDatePart = (isoString) => {
    if (!isoString) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(isoString)) {
      return isoString;
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        return match[1];
      }
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatToIsoDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "";
    const cleaned = dateTimeStr.replace(".0", "").replace(" ", "T");
    return cleaned;
  };

  // Memoized formatCurrency function
  const formatCurrency = useCallback((amount) => {
    try {
      const num = Number(amount);
      if (isNaN(num)) return "₹0";

      return `₹${num.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    } catch {
      return "₹0";
    }
  }, []);

  // Load phone number
  const loadPhoneNumber = useCallback(async () => {
    try {
      if (routePhoneNumber) {
        setPhoneNumber(routePhoneNumber);
        await AsyncStorage.setItem("PHONE_NUMBER", routePhoneNumber);
      } else {
        const storedPhone = await AsyncStorage.getItem("userPhoneNumber");
        if (storedPhone) {
          setPhoneNumber(storedPhone);
        } else {
          setError("No phone number found. Please login again.");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Phone load error:", err);
      setError("Failed to load phone number");
      setLoading(false);
    }
  }, [routePhoneNumber]);

  // Fetch API data for schemes
  const fetchApiDataForSchemes = useCallback(async (schemesData) => {
    const apiDataMap = {};

    const promises = schemesData.map(async (scheme) => {
      const schemeId = scheme.schemeSummary?.schemeId;
      const extractedDate = extractDatePart(scheme.joinDate);

      if (schemeId && extractedDate) {
        try {
          const apiData = await getRemainingDaysData(schemeId, extractedDate);
          apiDataMap[`${schemeId}_${scheme.joinDate}`] = apiData;
        } catch (apiError) {
          console.warn(
            `Failed to fetch API data for scheme ${schemeId}:`,
            apiError,
          );
          apiDataMap[`${schemeId}_${scheme.joinDate}`] = null;
        }
      } else {
        console.warn(`Missing schemeId or joinDate for scheme:`, scheme);
      }
    });

    await Promise.allSettled(promises);
    return apiDataMap;
  }, []);

  // Fetch redemption status from API
  const fetchRedemptionStatus = useCallback(async (phone) => {
    if (!phone) return [];

    try {
      setLoadingRedemptionStatus(true);
      const response = await fetch(
        `https://scheme.bmgjewellers.com/api/v1/redemption/mobile/${phone}`,
      );
      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        console.warn("No redemption status data found:", data.message);
        return [];
      }
    } catch (error) {
      console.error("Error fetching redemption status:", error);
      return [];
    } finally {
      setLoadingRedemptionStatus(false);
    }
  }, []);

  // Check if scheme is already submitted via API
  const isSchemeSubmitted = useCallback(
    (scheme) => {
      if (!scheme || !redemptionStatusData.length) return false;

      const regNo = scheme.regNo || 1;
      const groupCode = scheme.groupCode || "";
      const schemeId = scheme.schemeSummary?.schemeId || "";

      // Find matching redemption record
      const submittedRecord = redemptionStatusData.find((record) => {
        return (
          record.regNo === regNo &&
          record.groupCode === groupCode &&
          record.schemeId === schemeId.toString()
        );
      });

      return !!submittedRecord;
    },
    [redemptionStatusData],
  );

  // Get submission details if scheme is submitted
  const getSubmissionDetails = useCallback(
    (scheme) => {
      if (!scheme || !redemptionStatusData.length) return null;

      const regNo = scheme.regNo || 1;
      const groupCode = scheme.groupCode || "";
      const schemeId = scheme.schemeSummary?.schemeId || "";

      return redemptionStatusData.find((record) => {
        return (
          record.regNo === regNo &&
          record.groupCode === groupCode &&
          record.schemeId === schemeId.toString()
        );
      });
    },
    [redemptionStatusData],
  );

  // Fetch schemes
  const fetchSchemes = useCallback(
    async (phone) => {
      try {
        setLoading(true);
        setError(null);

        // Fetch schemes and redemption status in parallel
        const [schemesData, redemptionData] = await Promise.all([
          getPhoneDetails(phone),
          fetchRedemptionStatus(phone),
        ]);

        if (schemesData?.length > 0) {
          setSchemes(schemesData);
          const apiData = await fetchApiDataForSchemes(schemesData);
          setSchemeApiData(apiData);
        } else {
          setSchemes([]);
          setError("No schemes found for this phone number");
        }

        // Set redemption status data
        setRedemptionStatusData(redemptionData || []);
      } catch (err) {
        console.error("Error fetching schemes:", err);
        setError("Failed to load schemes. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchApiDataForSchemes, fetchRedemptionStatus],
  );

  // Handle redeem button press
  const handleRedeemPress = useCallback(
    (scheme, remainingBonusDays, displayAmount) => {
      // Check if already submitted via API
      if (isSchemeSubmitted(scheme)) {
        Alert.alert(
          "Already Submitted",
          "Redemption request for this scheme has already been submitted. Our team will contact you soon.",
          [{ text: "OK" }],
        );
        return;
      }

      setSelectedScheme({
        scheme,
        remainingBonusDays,
        displayAmount,
      });
      setModalVisible(true);
      setRedemptionMessage(null);
      setRedemptionSubmitted(false);
    },
    [isSchemeSubmitted],
  );

  // Handle redemption submission
  const handleRedemptionSubmit = useCallback(async () => {
    if (!selectedScheme?.scheme) return;

    // Check if scheme is ready for redemption
    const schemeCloseDays = selectedScheme.scheme.remainingDays ?? 0;
    if (schemeCloseDays > 0) {
      Alert.alert(
        "Not Eligible",
        "This scheme is not yet ready for redemption. Please wait for the maturity date.",
        [{ text: "OK" }],
      );
      return;
    }

    // Check if already submitted via API
    if (isSchemeSubmitted(selectedScheme.scheme)) {
      Alert.alert(
        "Already Submitted",
        "Redemption request for this scheme has already been submitted. Our team will contact you soon.",
        [{ text: "OK" }],
      );
      setModalVisible(false);
      return;
    }

    // Ask for confirmation
    Alert.alert(
      "Confirm Redemption",
      `Are you sure you want to redeem ${
        selectedScheme.scheme.schemeSummary?.schemeName || "this scheme"
      } for ${formatCurrency(selectedScheme.displayAmount)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setRedeeming(true);
              setRedemptionMessage(null);
              setRedemptionSubmitted(false);

              // Prepare redemption data from scheme
              const scheme = selectedScheme.scheme;
              const personalInfo = scheme.personalInfo || {};
              const schemeSummary = scheme.schemeSummary || {};
              const transBalance =
                schemeSummary.schemaSummaryTransBalance || {};

              // Get the latest payment from payment history
              const latestPayment =
                scheme.paymentHistoryList &&
                scheme.paymentHistoryList.length > 0
                  ? scheme.paymentHistoryList[
                      scheme.paymentHistoryList.length - 1
                    ]
                  : {};

              // Calculate maturity date (joinDate + totalDays)
              let maturityDate = "";
              try {
                const joinDate = new Date(scheme.joinDate);
                const totalDays = scheme.totalDays || 0;
                joinDate.setDate(joinDate.getDate() + totalDays);
                const year = joinDate.getFullYear();
                const month = String(joinDate.getMonth() + 1).padStart(2, "0");
                const day = String(joinDate.getDate()).padStart(2, "0");
                maturityDate = `${year}-${month}-${day}`;
              } catch (e) {
                console.error("Error calculating maturity date:", e);
                maturityDate = scheme.maturityDate
                  ? extractDatePart(scheme.maturityDate)
                  : "";
              }

              // Extract just the date part from joinDate
              const joinDateFormatted = extractDatePart(scheme.joinDate) || "";

              const redemptionPayload = {
                regNo: scheme.regNo || 1,
                groupCode: scheme.groupCode || "BDS",
                pName: scheme.pName || personalInfo.pName || "Customer",

                maturityDate: maturityDate,
                joinDate: joinDateFormatted,

                personalId: personalInfo.personalId || "",
                doorNo: personalInfo.doorNo || "",
                address1: personalInfo.address1 || "",
                address2: personalInfo.address2 || "",
                area: personalInfo.area || "",
                city: personalInfo.city || "",
                state: personalInfo.state || "",
                country: personalInfo.country || "India",
                pinCode: personalInfo.pinCode || "",
                mobile: personalInfo.mobile || phoneNumber || "",
                mobile2: personalInfo.mobile2 || "",
                costId: personalInfo.costId || "BP",

                schemeId: schemeSummary.schemeId || "",
                schemeName: schemeSummary.schemeName || "",
                schemeSName: schemeSummary.schemeSName || "",
                instalment: schemeSummary.instalment || "11",

                // Convert string amounts to numbers
                amount: parseFloat(scheme.amount) || 0,
                amtrecd: parseFloat(transBalance.amtrecd) || 0,
                bonusAmount: parseFloat(scheme.bonusAmount) || 0,
                totalAmount: parseFloat(scheme.totalAmount) || 0,
                totalAmountWithBonus:
                  parseFloat(scheme.totalAmountWithBonus) || 0,
                bonusPercent: parseFloat(scheme.bonusPercent) || 0,

                insPaid: parseInt(transBalance.insPaid) || 0,
                fixedIns: schemeSummary.fixedIns || "N",
                weightLedger: schemeSummary.weightLedger || "N",
                totalWeight: parseFloat(schemeSummary.totalWeight) || 0,
                lastWeight: parseFloat(schemeSummary.lastWeight) || 0,

                // Use latest payment details
                receiptNo: latestPayment.receiptNo || "",
                paymentAmount: parseFloat(latestPayment.amount) || 0,
                installment: parseInt(latestPayment.installment) || 0,

                updateTime:
                  formatToIsoDateTime(latestPayment.updateTime) ||
                  new Date().toISOString().slice(0, 19),

                weight: parseFloat(latestPayment.weight) || 0,
                chqBankCode: latestPayment.chqBankCode || "",
                chq_CardNo: latestPayment.chq_CardNo || "",
                chqBranch: latestPayment.chqBranch || "",
                chqBank: latestPayment.chqBank || "",
                chqRtnReason: latestPayment.chqRtnReason || "",

                lastPaidDate: scheme.lastPaidDate
                  ? extractDatePart(scheme.lastPaidDate)
                  : "",

                fromDays: scheme.fromDays || 0,
                toDays: scheme.toDays || 0,
                totalDays: scheme.totalDays || 0,
                remainingDays: scheme.remainingDays || 0,
              };


              // Call redemption service
              const result = await sendRedemption(redemptionPayload);

              // Check if redemption was successful
              if (result.success) {
                setRedemptionMessage({
                  type: "success",
                  text:
                    result.message ||
                    "Redemption request submitted successfully!",
                });
                setRedemptionSubmitted(true);

                // Refresh schemes and redemption status after successful redemption
                setTimeout(() => {
                  if (phoneNumber) {
                    fetchSchemes(phoneNumber);
                  }
                }, 2000);
              } else {
                setRedemptionMessage({
                  type: "error",
                  text:
                    result.message || "Failed to submit redemption request.",
                });
              }
            } catch (err) {
              console.error("Redemption error:", err);
              setRedemptionMessage({
                type: "error",
                text:
                  err.message ||
                  "Failed to submit redemption request. Please try again.",
              });
            } finally {
              setRedeeming(false);
            }
          },
        },
      ],
    );
  }, [
    selectedScheme,
    phoneNumber,
    formatCurrency,
    fetchSchemes,
    isSchemeSubmitted,
  ]);

  // Effects
  useEffect(() => {
    loadPhoneNumber();
  }, [loadPhoneNumber]);

  useEffect(() => {
    if (phoneNumber) {
      fetchSchemes(phoneNumber);
    }
  }, [phoneNumber, fetchSchemes]);

  // Refresh
  const onRefresh = useCallback(() => {
    if (phoneNumber) {
      setRefreshing(true);
      fetchSchemes(phoneNumber);
    }
  }, [phoneNumber, fetchSchemes]);

  // Render scheme item
  const renderSchemeItem = useCallback(
    ({ item }) => {
      const schemeCloseDays = item.remainingDays ?? 0;
      const schemeName = item.schemeSummary?.schemeName || "N/A";

      // Check if scheme is already submitted via API
      const alreadySubmitted = isSchemeSubmitted(item);
      const submissionDetails = getSubmissionDetails(item);

      // Create key matching what we stored in fetchApiDataForSchemes
      const schemeId = item.schemeSummary?.schemeId;
      const joinDate = item.joinDate;
      const apiDataKey = `${schemeId}_${joinDate}`;
      const apiData = schemeApiData[apiDataKey] || {};

      // Get bonus days EXACTLY from API
      const bonusUnlockDays =
        apiData.remainingDays !== undefined ? apiData.remainingDays : null;

      // Calculate display values - USE API DATA DIRECTLY
      const remainingBonusDays =
        bonusUnlockDays !== null ? bonusUnlockDays : schemeCloseDays;
      const baseAmount = item.totalAmount || 0;
      const bonusAmount = item.totalAmountWithBonus || 0;

      // Determine which amount to display
      let displayAmount = baseAmount;
      if (bonusUnlockDays !== null) {
        displayAmount = bonusUnlockDays > 0 ? baseAmount : bonusAmount;
      } else {
        displayAmount = schemeCloseDays > 0 ? baseAmount : bonusAmount;
      }

      const canRedeem = schemeCloseDays <= 0 && !alreadySubmitted;

      // Status color for scheme close days
      let statusColor = theme.COLORS.warning;
      if (schemeCloseDays === 0) {
        statusColor = theme.COLORS.success;
      } else if (schemeCloseDays < 0) {
        statusColor = theme.COLORS.error;
      }

      // Amount display logic
      const showGiftIcon = bonusUnlockDays !== null && bonusUnlockDays > 0;
      const isBonusUnlocked = bonusUnlockDays !== null && bonusUnlockDays <= 0;

      const amountTextColor = isBonusUnlocked
        ? theme.COLORS.success
        : theme.COLORS.textSecondary;

      // Get button text properties
      const buttonText = alreadySubmitted ? "Submitted ✓" : "How to Redeem";
      const buttonFontSize = getButtonFontSize(buttonText);

      // Format submission date if available
      let submissionDateText = "";
      if (submissionDetails && submissionDetails.updateTime) {
        try {
          const date = new Date(submissionDetails.updateTime);
          if (!isNaN(date.getTime())) {
            submissionDateText = date.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          }
        } catch (e) {
          console.error("Error parsing submission date:", e);
        }
      }

      return (
        <View style={styles.tableRow}>
          {/* Scheme Name */}
          <View style={styles.schemeNameContainer}>
            <Text style={styles.schemeName} numberOfLines={2}>
              {schemeName}
            </Text>
            {alreadySubmitted && (
              <View style={styles.submittedInfoContainer}>
                <Text style={styles.submittedBadge}>Request Submitted</Text>
                {submissionDateText ? (
                  <Text style={styles.submissionDate}>
                    On: {submissionDateText}
                  </Text>
                ) : null}
                {submissionDetails?.status !== undefined && (
                  <Text
                    style={[
                      styles.statusText,
                      submissionDetails.status
                        ? styles.statusApproved
                        : styles.statusPending,
                    ]}
                  >
                    {submissionDetails.status ? "Approved" : "Pending"}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Remaining Days */}
          <View style={styles.daysContainer}>
            <Text style={[styles.daysText, { color: statusColor }]}>
              {schemeCloseDays}
            </Text>
          </View>

          {/* Amount Section */}
          <View style={styles.amountSection}>
            <View style={styles.amountMainRow}>
              <Text style={[styles.amountText, { color: amountTextColor }]}>
                {formatCurrency(displayAmount)}
              </Text>
            </View>
            {showGiftIcon && <Text style={styles.giftIcon}>🎁</Text>}
            {showGiftIcon && (
              <Text style={styles.unlockText}>
                Unlock in {bonusUnlockDays} days
              </Text>
            )}

            {isBonusUnlocked && (
              <Text style={styles.bonusUnlockedText}>Bonus Unlocked!</Text>
            )}
          </View>

          {/* Redeem Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              disabled={!canRedeem}
              style={[
                styles.redeemButton,
                alreadySubmitted && styles.redeemButtonSubmitted,
                !canRedeem && !alreadySubmitted && styles.redeemButtonDisabled,
              ]}
              onPress={() => {
                if (alreadySubmitted) {
                  Alert.alert(
                    "Already Submitted",
                    "Redemption request for this scheme has already been submitted. Our team will contact you soon.",
                    [{ text: "OK" }],
                  );
                } else {
                  handleRedeemPress(item, remainingBonusDays, displayAmount);
                }
              }}
            >
              <Text
                style={[
                  styles.redeemButtonText,
                  alreadySubmitted && styles.redeemButtonTextSubmitted,
                  !canRedeem &&
                    !alreadySubmitted &&
                    styles.redeemButtonTextDisabled,
                  { fontSize: buttonFontSize },
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [
      formatCurrency,
      schemeApiData,
      handleRedeemPress,
      isSchemeSubmitted,
      getSubmissionDetails,
    ],
  );

  // Render table header
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.headerCell, styles.schemeHeader]}>
        <Text style={styles.headerText}>Scheme</Text>
      </View>
      <View style={[styles.headerCell, styles.daysHeader]}>
        <Text style={styles.headerText}>Days</Text>
      </View>
      <View style={[styles.headerCell, styles.amountHeader]}>
        <Text style={styles.headerText}>Amount</Text>
      </View>
      <View style={[styles.headerCell, styles.actionHeader]}>
        <Text style={styles.headerText}>Action</Text>
      </View>
    </View>
  );

  // Render header
  const renderHeader = useCallback(() => {
    return (
      <View style={styles.headerContainer}>
        <CommonHeader
          title="My Redemption"
          rightComponent={
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("GoldPlanScreen")}
                style={styles.plansButton}
              >
                <Text style={styles.plansButtonText}>Join Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    );
  }, [navigation]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>{"No Schemes Found"}</Text>
        <Text style={styles.emptyMessage}>
          {error ||
            "You don't have any schemes registered with this phone number."}
        </Text>
        {phoneNumber && (
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => fetchSchemes(phoneNumber)}
          >
            <Text style={styles.emptyButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [error, phoneNumber, fetchSchemes]);

  // Fixed key extractor
  const keyExtractor = useCallback((item, index) => {
    const schemeId = item.schemeSummary?.schemeId || `scheme_${index}`;
    const regNo = item.regNo || `reg_${index}`;
    const joinDate = item.joinDate || `date_${index}`;
    return `${schemeId}_${regNo}_${joinDate}_${index}`;
  }, []);

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          backgroundColor={theme.COLORS.primary}
          barStyle="light-content"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.COLORS.primary} />
          <Text style={styles.loadingText}>Loading schemes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor={theme.COLORS.primary}
        barStyle="light-content"
      />

      <FlatList
        data={schemes}
        renderItem={renderSchemeItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {schemes.length > 0 && renderTableHeader()}
          </>
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.COLORS.primary]}
            tintColor={theme.COLORS.primary}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
      />

      {/* Redemption Terms Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          if (!redeeming) {
            setModalVisible(false);
            setRedemptionSubmitted(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Redemption Terms & Conditions
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (!redeeming) {
                    setModalVisible(false);
                    setRedemptionSubmitted(false);
                  }
                }}
                disabled={redeeming}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.schemeInfoContainer}>
                <Text style={styles.schemeInfoLabel}>Scheme:</Text>
                <Text style={styles.schemeInfoValue}>
                  {selectedScheme?.scheme?.schemeSummary?.schemeName || "N/A"}
                </Text>
              </View>

              <View style={styles.schemeInfoContainer}>
                <Text style={styles.schemeInfoLabel}>
                  Remaining Bonus Days:
                </Text>
                <Text style={styles.schemeInfoValue}>
                  {selectedScheme?.remainingBonusDays || 0} days
                </Text>
              </View>

              <View style={styles.schemeInfoContainer}>
                <Text style={styles.schemeInfoLabel}>Amount to Redeem:</Text>
                <Text style={[styles.schemeInfoValue, styles.amountValue]}>
                  {selectedScheme
                    ? formatCurrency(selectedScheme.displayAmount)
                    : "₹0"}
                </Text>
              </View>

              {/* Already Submitted Warning */}
              {selectedScheme?.scheme &&
                isSchemeSubmitted(selectedScheme.scheme) && (
                  <View style={styles.alreadySubmittedWarning}>
                    <Text style={styles.alreadySubmittedWarningText}>
                      ⚠️ Redemption request already submitted. Our team will
                      contact you soon.
                    </Text>
                    {(() => {
                      const submissionDetails = getSubmissionDetails(
                        selectedScheme.scheme,
                      );
                      if (submissionDetails) {
                        return (
                          <View style={styles.submissionDetails}>
                            <Text style={styles.submissionDetailText}>
                              Submitted on:{" "}
                              {submissionDetails.updateTime
                                ? new Date(
                                    submissionDetails.updateTime,
                                  ).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </Text>
                            <Text style={styles.submissionDetailText}>
                              Status:{" "}
                              {submissionDetails.status !== undefined
                                ? submissionDetails.status
                                  ? "Approved"
                                  : "Pending"
                                : "Processing"}
                            </Text>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                )}

              <View style={styles.termsSection}>
                <Text style={styles.termsTitle}>Please read carefully:</Text>
                <Text style={styles.redeemNoteText}>
                  🔓 How to Redeem Your Benefits{"\n\n"}✅ Redemption is allowed
                  after scheme completion / eligibility{"\n"}
                  🏬 Visit any authorized showroom / branch{"\n"}
                  📱 Carry your registered mobile number / App ID{"\n"}
                  🧾 Benefits can be redeemed only against jewellery purchase
                  {"\n"}
                  ⚖️ Final value depends on prevailing gold / silver rate on
                  redemption date{"\n"}
                  🔖 Valid ID proof may be required{"\n"}⏳ Redemption must be
                  done within the validity period{"\n"}
                  🚫 Benefits are non-transferable and cannot be encashed{"\n"}
                  📜 Subject to scheme Terms & Conditions
                </Text>
              </View>

              {/* Redemption Status Message */}
              {redemptionMessage && (
                <View
                  style={[
                    styles.messageContainer,
                    styles[`${redemptionMessage.type}Message`],
                  ]}
                >
                  <Text style={styles.messageText}>
                    {redemptionMessage.text}
                  </Text>
                </View>
              )}

              {/* Redemption Button - Different states */}
              {(() => {
                const scheme = selectedScheme?.scheme;
                const alreadySubmitted = scheme
                  ? isSchemeSubmitted(scheme)
                  : false;

                if (alreadySubmitted) {
                  return (
                    <View style={styles.alreadySubmittedContainer}>
                      <View style={styles.successIconContainer}>
                        <Text style={styles.successIcon}>✓</Text>
                      </View>
                      <Text style={styles.alreadySubmittedTitle}>
                        Submitted
                      </Text>
                      <Text style={styles.alreadySubmittedMessage}>
                        Your redemption request has already been submitted. Our
                        team will contact you within 24-48 hours.
                      </Text>

                      <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => {
                          setModalVisible(false);
                          setRedemptionSubmitted(false);
                        }}
                      >
                        <Text style={styles.doneButtonText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  );
                } else if (!redemptionSubmitted) {
                  return (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.redemptionButton,
                          redeeming && styles.redemptionButtonDisabled,
                        ]}
                        onPress={handleRedemptionSubmit}
                        disabled={redeeming}
                      >
                        {redeeming ? (
                          <ActivityIndicator
                            color={theme.COLORS.white}
                            size="small"
                          />
                        ) : (
                          <Text style={styles.redemptionButtonText}>
                            Submit Redemption Request
                          </Text>
                        )}
                      </TouchableOpacity>

                      <Text style={styles.redemptionNote}>
                        By clicking above, you agree to all terms and
                        conditions.
                      </Text>
                    </>
                  );
                } else {
                  return (
                    <>
                      <View style={styles.submittedContainer}>
                        <View style={styles.successIconContainer}>
                          <Text style={styles.successIcon}>✓</Text>
                        </View>
                        <Text style={styles.submittedTitle}>
                          Redemption Submitted!
                        </Text>
                        <Text style={styles.submittedMessage}>
                          Your redemption request has been submitted
                          successfully. Our team will process it within 24-48
                          hours.
                        </Text>

                        <TouchableOpacity
                          style={styles.viewDetailsButton}
                          onPress={() => {
                            Alert.alert(
                              "Redemption Details",
                              `Your request for ${
                                selectedScheme?.scheme?.schemeSummary
                                  ?.schemeName || "the scheme"
                              } has been recorded. Reference ID will be shared via SMS.`,
                            );
                          }}
                        >
                          <Text style={styles.viewDetailsButtonText}>
                            View Details
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => {
                          setModalVisible(false);
                          setRedemptionSubmitted(false);
                        }}
                      >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    </>
                  );
                }
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.SIZES.md,
    fontSize: theme.SIZES.font.md,
    color: theme.COLORS.textSecondary,
  },
  listContainer: {
    flexGrow: 1,
    paddingBottom: theme.SIZES.xl,
  },
  headerContainer: {
    paddingTop: theme.SIZES.md,
  },

  // Table Header
  tableHeader: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.gray200,
    paddingVertical: theme.SIZES.md,
    paddingHorizontal: theme.SIZES.sm,
    marginHorizontal: theme.SIZES.xs,
    marginTop: theme.SIZES.lg,
    marginBottom: theme.SIZES.sm,
    borderRadius: theme.SIZES.radius.md,
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
  },
  schemeHeader: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: theme.SIZES.sm,
  },
  daysHeader: {
    flex: 0.8,
  },
  amountHeader: {
    flex: 1.2,
  },
  actionHeader: {
    flex: 1,
  },
  headerText: {
    fontSize: theme.SIZES.font.sm,
    fontWeight: "bold",
    color: theme.COLORS.textPrimary,
  },

  // Table Row
  tableRow: {
    flexDirection: "row",
    backgroundColor: theme.COLORS.white,
    marginHorizontal: theme.SIZES.xs,
    marginBottom: theme.SIZES.xs,
    paddingVertical: theme.SIZES.md,
    paddingHorizontal: theme.SIZES.xs,
    borderRadius: theme.SIZES.radius.md,
    borderWidth: 1,
    borderColor: theme.COLORS.borderLight,
    minHeight: 80,
    alignItems: "center",
  },

  // Scheme Column
  schemeNameContainer: {
    flex: 1,
    paddingLeft: theme.SIZES.xs,
    justifyContent: "center",
  },
  schemeName: {
    fontSize: theme.SIZES.font.sm,
    fontWeight: "500",
    color: theme.COLORS.textPrimary,
    lineHeight: 18,
  },
  submittedInfoContainer: {
    marginTop: 2,
  },
  submittedBadge: {
    fontSize: 9,
    color: theme.COLORS.success,
    fontWeight: "500",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  submissionDate: {
    fontSize: 8,
    color: theme.COLORS.textSecondary,
    fontStyle: "italic",
    marginTop: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "600",
    marginTop: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusApproved: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  statusPending: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },

  // Days Column
  daysContainer: {
    flex: 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  daysText: {
    fontSize: theme.SIZES.font.md,
    fontWeight: "600",
  },

  // Amount Column
  amountSection: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
  },
  amountMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  amountText: {
    fontSize: theme.SIZES.font.sm,
    fontWeight: "600",
  },
  giftIcon: {
    fontSize: theme.SIZES.font.sm,
    marginLeft: 4,
  },
  unlockText: {
    fontSize: 9,
    color: theme.COLORS.warning,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
  bonusUnlockedText: {
    fontSize: 9,
    color: theme.COLORS.success,
    fontWeight: "600",
    marginTop: 2,
  },

  // Action Column
  actionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  redeemButton: {
    backgroundColor: theme.COLORS.primary,
    borderRadius: theme.SIZES.radius.sm,
    width: SCREEN_WIDTH < 350 ? 80 : 85,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  redeemButtonSubmitted: {
    backgroundColor: theme.COLORS.success,
  },
  redeemButtonDisabled: {
    backgroundColor: theme.COLORS.gray300,
  },
  redeemButtonText: {
    color: theme.COLORS.white,
    fontWeight: "600",
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
    paddingVertical: 0,
    lineHeight: 14,
  },
  redeemButtonTextSubmitted: {
    color: theme.COLORS.white,
  },
  redeemButtonTextDisabled: {
    color: theme.COLORS.gray600,
  },

  // Plans Button
  plansButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FF5724",
    borderWidth: 1,
    borderColor: "transparent",
    width: 80,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  plansButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: theme.SIZES.font.sm,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.SIZES.xl,
    paddingTop: theme.SIZES.xxl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.SIZES.lg,
  },
  emptyIconText: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: theme.SIZES.font.lg,
    color: theme.COLORS.textPrimary,
    marginBottom: theme.SIZES.sm,
    fontWeight: "bold",
  },
  emptyMessage: {
    fontSize: theme.SIZES.font.md,
    color: theme.COLORS.textSecondary,
    textAlign: "center",
    marginBottom: theme.SIZES.xl,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: theme.COLORS.primary,
    paddingHorizontal: theme.SIZES.xl,
    paddingVertical: theme.SIZES.md,
    borderRadius: theme.SIZES.radius.md,
  },
  emptyButtonText: {
    fontSize: theme.SIZES.font.md,
    color: theme.COLORS.white,
    fontWeight: "600",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: theme.COLORS.white,
    borderRadius: 20,
    maxHeight: "80%",
    width: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.borderLight,
  },
  modalTitle: {
    fontSize: theme.SIZES.font.lg,
    fontWeight: "bold",
    color: theme.COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 28,
    color: theme.COLORS.textSecondary,
    lineHeight: 28,
  },
  modalContent: {
    padding: theme.SIZES.lg,
  },
  schemeInfoContainer: {
    flexDirection: "row",
    marginBottom: theme.SIZES.md,
    alignItems: "center",
  },
  schemeInfoLabel: {
    fontSize: theme.SIZES.font.md,
    fontWeight: "600",
    color: theme.COLORS.textPrimary,
    marginRight: theme.SIZES.sm,
  },
  schemeInfoValue: {
    fontSize: theme.SIZES.font.md,
    color: theme.COLORS.textSecondary,
    flex: 1,
  },
  amountValue: {
    fontSize: theme.SIZES.font.lg,
    fontWeight: "bold",
    color: theme.COLORS.primary,
  },

  // Already Submitted Warning
  alreadySubmittedWarning: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
    borderWidth: 1,
    borderRadius: theme.SIZES.radius.sm,
    padding: theme.SIZES.md,
    marginBottom: theme.SIZES.lg,
  },
  alreadySubmittedWarningText: {
    color: "#856404",
    fontSize: theme.SIZES.font.sm,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: theme.SIZES.sm,
  },
  submissionDetails: {
    marginTop: theme.SIZES.sm,
    paddingTop: theme.SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: "#ffeaa7",
  },
  submissionDetailText: {
    fontSize: theme.SIZES.font.xs,
    color: "#856404",
    marginBottom: 2,
  },

  termsSection: {
    marginTop: theme.SIZES.lg,
  },
  termsTitle: {
    fontSize: theme.SIZES.font.md,
    fontWeight: "bold",
    color: theme.COLORS.textPrimary,
    marginBottom: theme.SIZES.md,
  },
  redeemNoteText: {
    fontSize: theme.SIZES.font.sm,
    color: theme.COLORS.textSecondary,
    lineHeight: 22,
  },

  // Redemption Button Styles
  redemptionButton: {
    backgroundColor: theme.COLORS.success,
    borderRadius: theme.SIZES.radius.md,
    paddingVertical: theme.SIZES.md,
    paddingHorizontal: theme.SIZES.lg,
    alignItems: "center",
    marginTop: theme.SIZES.lg,
    marginBottom: theme.SIZES.sm,
  },
  redemptionButtonDisabled: {
    backgroundColor: theme.COLORS.gray400,
  },
  redemptionButtonText: {
    color: theme.COLORS.white,
    fontSize: theme.SIZES.font.md,
    fontWeight: "bold",
  },
  redemptionNote: {
    fontSize: theme.SIZES.font.xs,
    color: theme.COLORS.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: theme.SIZES.md,
  },

  // Already Submitted Container in Modal
  alreadySubmittedContainer: {
    alignItems: "center",
    marginTop: theme.SIZES.lg,
    marginBottom: theme.SIZES.md,
    padding: theme.SIZES.md,
    backgroundColor: theme.COLORS.backgroundSecondary,
    borderRadius: theme.SIZES.radius.md,
  },
  alreadySubmittedTitle: {
    fontSize: theme.SIZES.font.lg,
    fontWeight: "bold",
    color: theme.COLORS.success,
    marginBottom: theme.SIZES.sm,
    textAlign: "center",
  },
  alreadySubmittedMessage: {
    fontSize: theme.SIZES.font.sm,
    color: theme.COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.SIZES.md,
  },

  // Message Container
  messageContainer: {
    padding: theme.SIZES.md,
    borderRadius: theme.SIZES.radius.sm,
    marginTop: theme.SIZES.lg,
  },
  successMessage: {
    backgroundColor: "#d4edda",
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  messageText: {
    fontSize: theme.SIZES.font.sm,
    textAlign: "center",
  },

  // Submitted State Styles
  submittedContainer: {
    alignItems: "center",
    marginTop: theme.SIZES.lg,
    marginBottom: theme.SIZES.md,
    padding: theme.SIZES.md,
    backgroundColor: theme.COLORS.backgroundSecondary,
    borderRadius: theme.SIZES.radius.md,
  },
  successIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: theme.SIZES.md,
  },
  successIcon: {
    fontSize: 30,
    color: theme.COLORS.white,
    fontWeight: "bold",
  },
  submittedTitle: {
    fontSize: theme.SIZES.font.lg,
    fontWeight: "bold",
    color: theme.COLORS.success,
    marginBottom: theme.SIZES.sm,
    textAlign: "center",
  },
  submittedMessage: {
    fontSize: theme.SIZES.font.sm,
    color: theme.COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: theme.SIZES.md,
  },
  viewDetailsButton: {
    backgroundColor: theme.COLORS.primary,
    paddingVertical: theme.SIZES.sm,
    paddingHorizontal: theme.SIZES.lg,
    borderRadius: theme.SIZES.radius.sm,
    marginBottom: theme.SIZES.md,
  },
  viewDetailsButtonText: {
    color: theme.COLORS.white,
    fontSize: theme.SIZES.font.sm,
    fontWeight: "600",
  },
  doneButton: {
    backgroundColor: theme.COLORS.gray300,
    paddingVertical: theme.SIZES.md,
    paddingHorizontal: theme.SIZES.lg,
    borderRadius: theme.SIZES.radius.md,
    alignItems: "center",
    marginTop: theme.SIZES.sm,
    marginBottom: 10,
  },
  doneButtonText: {
    color: theme.COLORS.textPrimary,
    fontSize: theme.SIZES.font.md,
    fontWeight: "bold",
  },
});

export default SchemeListPage;
