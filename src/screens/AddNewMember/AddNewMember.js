import { payWithRazorpay } from "../../services/RazorpayService";
import React, { useState, useEffect } from "react";
import { View, Alert, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import appTheme from "../../utils/Theme";
import MemberDetailsPage from "./MemberDetailsPage";
import SchemeDetailsPage from "./SchemeDetailsPage";
import { API_BASE_URL_OLD } from "../../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import smsService from "../../services/SMSService";
import { sendJoinSchemeNotification } from "../../services/CommonNotificationService";
import { getAppliedReferralStatus } from "../../services/ReferalService";
import { buildMemberCreateBody, createMember } from "../../services/MemberCreateService";

const { COLORS } = appTheme;

// Service function to fetch all schemes
const getAllSchemes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL_OLD}/member/scheme`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

const AddNewMember = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigation = useNavigation();
  const route = useRoute();

  // Extract both schemeId and schemeName from route params
  const { schemeId: routeSchemeId, schemeName: routeSchemeName } =
    route.params || {};

 

  // Use state for scheme data - parse immediately
  const [selectedScheme, setSelectedScheme] = useState({
    id: routeSchemeId ? Number(routeSchemeId) : null,
    name: routeSchemeName || null,
  });

  const [token, setToken] = useState(null);

  // Payment state

  // Synchronous guard against duplicate redirect handling (state is async).

  // Track payment completion and processing status
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Store transformed data from MemberDetailsPage
  const [transformedMemberData, setTransformedMemberData] = useState(null);

  const [schemeData, setSchemeData] = useState({
    selectedSchemeId: selectedScheme.id,
    selectedGroupCodeObj: null,
    selectedCurrentRegNoObj: null,
    amount: "",
    accCode: "",
    modePay: "C",
    calculatedWeight: "",
  });

  // Update schemeData when selectedScheme changes
  useEffect(() => {
    setSchemeData((prev) => ({
      ...prev,
      selectedSchemeId: selectedScheme.id,
    }));

    // Also fetch scheme options if we have an ID
    if (selectedScheme.id) {
      fetchSchemeOptions(selectedScheme.id);
    }
  }, [selectedScheme]);

  const [schemeOptions, setSchemeOptions] = useState([]);
  const [isFetchingSchemeOptions, setIsFetchingSchemeOptions] = useState(false);

  // New state for storing all schemes
  const [allSchemes, setAllSchemes] = useState([]);
  const [isFetchingSchemes, setIsFetchingSchemes] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Payment order details

  // Referral
  const [ReferralCode, setReferralCode] = useState(null);

  useEffect(() => {
    fetchReferralStatus();
  }, []);

  const fetchReferralStatus = async () => {
    const result = await getAppliedReferralStatus();
    const referralCode = result?.appliedReferralData?.referral_code;
    setReferralCode(referralCode);
  };

  // Fetch all schemes on component mount
  useEffect(() => {
    fetchAllSchemes();
  }, []);

  // Handle payment completion
  useEffect(() => {
    if (paymentCompleted) {
      resetFormFields();
      navigation.navigate("MainLanding");
    }
  }, [paymentCompleted]);

  // Fetch all available schemes
  const fetchAllSchemes = async () => {
    setIsFetchingSchemes(true);
    try {
      const schemes = await getAllSchemes();
      setAllSchemes(schemes);

      // If we have a route schemeId but no name, try to find the name
      if (selectedScheme.id && !selectedScheme.name) {
        const foundScheme = schemes.find(
          (s) => s.SchemeId === selectedScheme.id
        );
        if (foundScheme) {
          setSelectedScheme((prev) => ({
            ...prev,
            name: foundScheme.schemeName || routeSchemeName,
          }));
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch schemes. Please try again.");
    } finally {
      setIsFetchingSchemes(false);
    }
  };

  // Get scheme name with proper fallbacks
  const getSchemeName = (id) => {
    if (!id) return selectedScheme.name || "No Scheme Selected";
    const numericId = Number(id);

    // First check selectedScheme state
    if (selectedScheme.id === numericId && selectedScheme.name) {
      return selectedScheme.name;
    }

    // Then check allSchemes
    const scheme = allSchemes.find((s) => s.SchemeId === numericId);
    if (scheme) {
      return scheme.schemeName || "Unknown Scheme";
    }

    // Finally fallback to route scheme name
    return selectedScheme.name || routeSchemeName || "Unknown Scheme";
  };

  // Fetch GROUPCODE and REGNO for selected scheme
  const fetchSchemeOptions = async (schemeId) => {
    if (!schemeId) return;

    setIsFetchingSchemeOptions(true);
    try {
      const response = await fetch(
        `${API_BASE_URL_OLD}/member/schemeid?schemeId=${schemeId}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // Normalize data — never invent a registration number client-side
      const normalizedData = data.map((item) => ({
        groupCode: item.GROUPCODE,
        regNo: item.CURRENTREGNO || item.REGNO || "",
        amount: item.AMOUNT || "",
      }));

      setSchemeOptions(normalizedData);

      // Preselect first option
      if (normalizedData.length > 0) {
        setSchemeData((prev) => ({
          ...prev,
          selectedGroupCodeObj: normalizedData[0].groupCode,
          selectedCurrentRegNoObj: normalizedData[0].regNo,
          amount: normalizedData[0].amount?.toString() || "",
        }));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch scheme details. Please try again.");
    } finally {
      setIsFetchingSchemeOptions(false);
    }
  };

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem("authToken");

      if (savedToken) setToken(savedToken);
    })();
  }, []);

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigation.navigate("MainLanding");
    }
  };

  // Function to handle scheme selection from MemberDetailsPage
  const handleSchemeSelection = (schemeId, schemeName) => {

    // Update selectedScheme state
    const numericId = Number(schemeId);
    setSelectedScheme({
      id: numericId,
      name: schemeName || getSchemeName(numericId),
    });

    // Update schemeData
    setSchemeData((prev) => ({
      ...prev,
      selectedSchemeId: numericId,
    }));

    // Fetch options for the new scheme
    fetchSchemeOptions(numericId);
  };

  const handleNextStep = (memberFormData = {}) => {

    // Store the transformed data directly as-is
    // The MemberDetailsPage already sends transformed data with correct field names
    setTransformedMemberData(memberFormData);

    // Check if scheme was selected in MemberDetailsPage
    if (memberFormData.selectedSchemeId) {
      const numericId = Number(memberFormData.selectedSchemeId);
      setSelectedScheme({
        id: numericId,
        name: memberFormData.selectedSchemeName || getSchemeName(numericId),
      });
    }

    // Move to next step
    setCurrentStep(2);
  };

  // Create payment order
const submitMemberData = async (
  numericSchemeId,
  schemeFormData,
  groupCode,
  regNo,
  paymentResponse = null,
  cashPayment = false
) => {
  try {
    const memberData = transformedMemberData;

    // Build + submit via the shared service (also used by payment recovery,
    // so a crash after payment completes with the exact same payload).
    const requestBody = buildMemberCreateBody({
      memberData,
      numericSchemeId,
      groupCode,
      regNo,
      schemeFormData,
      referralCode: ReferralCode || "",
      paymentResponse,
      cashPayment,
    });

    const responseData = await createMember(requestBody);

    // Send SMS notification
    try {
      await smsService.sendWelcomeSMS(
        memberData.mobile,
        memberData.pName,
        getSchemeName(numericSchemeId),
        schemeFormData.amount,
        new Date().toISOString().slice(0, 10),
        "BMG JEWELLERS PVT LTD"
      );
    } catch (smsError) {
    }

    // Send join scheme notification
    try {
      await sendJoinSchemeNotification(
        numericSchemeId,
        parseFloat(schemeFormData.amount),
        getSchemeName(numericSchemeId)
      );
    } catch (notifErr) {
    }

    return true;
  } catch (error) {
    throw error;
  }
};

  const handleSubmit = async (schemeFormData) => {
    if (isSubmitting || isProcessingPayment) return;

    const numericSchemeId = selectedScheme.id;
    if (!numericSchemeId || isNaN(numericSchemeId)) {
      Alert.alert("Error", "Please select a valid scheme.");
      return;
    }
    if (!schemeFormData.amount || parseFloat(schemeFormData.amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount.");
      return;
    }
    if (!schemeFormData.accCode) {
      Alert.alert("Error", "Please select a payment mode.");
      return;
    }

    // For cash payments, proceed directly without payment flow
    if (schemeFormData.modePay === "C" && schemeFormData.accCode !== "ONLINE") {
      await processCashPayment(schemeFormData, numericSchemeId);
      return;
    }

    // For online payments, start payment flow
    await processOnlinePayment(schemeFormData, numericSchemeId);
  };

const processCashPayment = async (schemeFormData, numericSchemeId) => {
  setIsSubmitting(true);
  
  try {
    // Member data intentionally not logged — contains Aadhaar/PII

    if (!transformedMemberData) {
      Alert.alert("Error", "Member data is missing. Please go back and fill member details.");
      setIsSubmitting(false);
      return;
    }

    // 1. Fetch scheme details
    const response = await fetch(
      `${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch scheme details: HTTP ${response.status}`);
    }
    
    const apiData = await response.json();
    
    if (!apiData || apiData.length === 0) {
      throw new Error("No scheme data available for the selected scheme.");
    }

    // 2. Select appropriate scheme record
    let selectedRecord;
    const targetAmount = parseFloat(schemeFormData.amount);

    if (targetAmount > 0) {
      // Try exact match
      selectedRecord = apiData.find(
        (item) => parseFloat(item.AMOUNT || 0) === targetAmount
      );
      
      // If no exact match, find the closest amount
      if (!selectedRecord) {
        selectedRecord = apiData.find(
          (item) => parseFloat(item.AMOUNT || 0) > 0
        );
      }
    }

    // Fallback to first record
    if (!selectedRecord) {
      selectedRecord = apiData[0];
    }


    const groupCode = selectedRecord.GROUPCODE;
    const regNo = selectedRecord.CURRENTREGNO || selectedRecord.REGNO;

    if (!groupCode || !regNo) {
      throw new Error("No scheme data available for the selected scheme.");
    }


    // 3. Submit member data
    const success = await submitMemberData(
      numericSchemeId,
      schemeFormData,
      groupCode,
      regNo,
      null, // No online payment response
      true  // Cash payment flag
    );

    if (!success) {
      throw new Error("Member data submission failed.");
    }

    
    Alert.alert(
      "Success",
      `Member "${transformedMemberData.pName}" has been successfully added to "${getSchemeName(numericSchemeId)}" scheme!`,
      [
        {
          text: "OK",
          onPress: () => {
            resetFormFields();
            navigation.navigate("MainLanding");
          },
        },
      ]
    );

  } catch (error) {
    
    let errorMessage = "Failed to create member. Please try again.";
    
    // Provide more specific error messages
    if (error.message.includes("mobile")) {
      errorMessage = "Mobile number validation failed. Please check the number.";
    } else if (error.message.includes("Aadhaar")) {
      errorMessage = "Aadhaar number validation failed. Please check the number.";
    } else if (error.message.includes("HTTP")) {
      errorMessage = "Network error. Please check your connection.";
    } else if (error.message.includes("scheme data")) {
      errorMessage = "Selected scheme is not available. Please try another scheme.";
    } else if (error.message.includes("already exists")) {
      errorMessage = "Member with these details already exists.";
    } else if (error.message.includes("Member name")) {
      errorMessage = "Member name is required.";
    } else if (error.message.includes("Date of Birth")) {
      errorMessage = "Date of Birth is required.";
    }
    
    Alert.alert(
      "Submission Error",
      errorMessage,
      [
        {
          text: "Retry",
          onPress: () => {
            // Optional: Retry logic
            setIsSubmitting(false);
          }
        },
        {
          text: "Cancel",
          onPress: () => setIsSubmitting(false),
          style: "cancel"
        }
      ]
    );
  } finally {
    setIsSubmitting(false);
  }
};

  const processOnlinePayment = async (schemeFormData, numericSchemeId) => {
    setIsProcessingPayment(true);
    try {
      const response = await fetch(
        `${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const apiData = await response.json();

      if (!apiData || apiData.length === 0)
        throw new Error("No scheme data returned from API.");

      let selectedRecord;

      // Try to match by amount first
      if (schemeFormData.amount) {
        selectedRecord = apiData.find(
          (item) =>
            parseFloat(item.AMOUNT || 0) === parseFloat(schemeFormData.amount)
        );
      }

      // If no matching amount found, just pick the first record (for schemes like DIGI_SILVER or FIXED_DEPOSIT)
      if (!selectedRecord) {
        selectedRecord = apiData[0];
      }

      const groupCode = selectedRecord.GROUPCODE;
      const regNo = selectedRecord.CURRENTREGNO || selectedRecord.REGNO;

      if (!groupCode || !regNo) {
        throw new Error("No registration number available for this scheme. Please try again.");
      }


      const defaultName = transformedMemberData ? `${transformedMemberData.pName} ${transformedMemberData.sName}`.trim() : "Customer";
      const defaultContact = transformedMemberData?.mobile || "";
      const amount = schemeFormData.amount;

      const nmData = buildMemberCreateBody({
        memberData: transformedMemberData, numericSchemeId, groupCode, regNo,
        schemeFormData: { ...schemeFormData, modePay: "O" }, referralCode: ReferralCode || "",
      });
      const result = await payWithRazorpay({
        token, newJoin: true,
        body: { REGNO: regNo, GROUPCODE: groupCode, AMOUNT: Number(amount),
          NMDATA: nmData, SCHEMEDETAILS: nmData.schemeCollectInsert },
        orderDetails: { amount: Number(amount), payType: "ONLINE",
          customer: { name: defaultName, contact: defaultContact, regNo, groupCode },
          schemeInfo: { schemeId: numericSchemeId, schemeName: getSchemeName(numericSchemeId) } },
      });
      if (!result.creditPending) resetFormFields();
      navigation.navigate("PaymentSuccess", {
        ...result, status: "SUCCESS", isCashPayment: false, isInstallmentPayment: false,
        paymentType: "join",
      });
    } catch (error) {
      Alert.alert(
        error.cancelled ? "Payment Cancelled" : "Payment Error",
        error.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetFormFields = () => {
    // Clear transformed member data
    setTransformedMemberData(null);

    // Reset to original route scheme if available
    setSelectedScheme({
      id: routeSchemeId ? Number(routeSchemeId) : null,
      name: routeSchemeName || null,
    });

    setSchemeData({
      selectedSchemeId: routeSchemeId ? Number(routeSchemeId) : null,
      selectedGroupCodeObj: null,
      selectedCurrentRegNoObj: null,
      amount: "",
      accCode: "",
      modePay: "C",
      calculatedWeight: "",
    });

    setValidationErrors({});
    setSchemeOptions([]);
    setShowWebView(false);
    setPaymentUrl("");
    paymentProcessedRef.current = false;
    setPaymentCompleted(false);
    setProcessingPayment(false);
  };

  // Loading component for payment processing
  const renderProcessingPayment = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#d4af37" />
      <Text style={styles.processingText}>Processing your payment...</Text>
      <Text style={styles.processingSubText}>
        Please wait while we confirm your payment
      </Text>
    </View>
  );

  const renderStep = () => {
    if (paymentCompleted) {
      return null;
    }

    if (processingPayment) {
      return renderProcessingPayment();
    }

    switch (currentStep) {
      case 1:
        return (
          <MemberDetailsPage
            onNext={handleNextStep}
            onBack={handleBack}
            onSchemeSelect={handleSchemeSelection}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            initialSchemeId={selectedScheme.id}
            initialSchemeName={selectedScheme.name}
            allSchemes={allSchemes}
            isFetchingSchemes={isFetchingSchemes}
          />
        );
      case 2:
        return (
          <SchemeDetailsPage
            schemeData={schemeData}
            onSubmit={handleSubmit}
            onBack={handleBack}
            validationErrors={validationErrors}
            setValidationErrors={setValidationErrors}
            isSubmitting={isSubmitting || isProcessingPayment}
            API_BASE_URL_OLD={API_BASE_URL_OLD}
            schemes={allSchemes}
            selectedSchemeId={selectedScheme.id}
            schemeName={selectedScheme.name || getSchemeName(selectedScheme.id)}
            schemeOptions={schemeOptions}
            isFetchingSchemeOptions={isFetchingSchemeOptions}
            isFetchingSchemes={isFetchingSchemes}
          />
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderStep()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 20,
  },
  processingText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    color: COLORS.primary,
    textAlign: "center",
  },
  processingSubText: {
    fontSize: 14,
    marginTop: 10,
    color: COLORS.text,
    textAlign: "center",
    opacity: 0.7,
  },
});

export default AddNewMember;
