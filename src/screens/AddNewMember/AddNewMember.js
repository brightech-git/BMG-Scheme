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

const getAllSchemes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL_OLD}/member/scheme`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw error;
  }
};

const AddNewMember = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigation = useNavigation();
  const route = useRoute();

  const { schemeId: routeSchemeId, schemeName: routeSchemeName } = route.params || {};

  const [selectedScheme, setSelectedScheme] = useState({
    id: routeSchemeId ? Number(routeSchemeId) : null,
    name: routeSchemeName || null,
  });

  const [token, setToken] = useState(null);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
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

  const [schemeOptions, setSchemeOptions] = useState([]);
  const [isFetchingSchemeOptions, setIsFetchingSchemeOptions] = useState(false);
  const [allSchemes, setAllSchemes] = useState([]);
  const [isFetchingSchemes, setIsFetchingSchemes] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [ReferralCode, setReferralCode] = useState(null);

  useEffect(() => { fetchReferralStatus(); }, []);

  const fetchReferralStatus = async () => {
    const result = await getAppliedReferralStatus();
    setReferralCode(result?.appliedReferralData?.referral_code);
  };

  useEffect(() => { fetchAllSchemes(); }, []);

  useEffect(() => {
    if (paymentCompleted) {
      resetFormFields();
      navigation.navigate("MainLanding");
    }
  }, [paymentCompleted]);

  useEffect(() => {
    setSchemeData((prev) => ({ ...prev, selectedSchemeId: selectedScheme.id }));
    if (selectedScheme.id) fetchSchemeOptions(selectedScheme.id);
  }, [selectedScheme]);

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem("authToken");
      if (savedToken) setToken(savedToken);
    })();
  }, []);

  const fetchAllSchemes = async () => {
    setIsFetchingSchemes(true);
    try {
      const schemes = await getAllSchemes();
      setAllSchemes(schemes);
      if (selectedScheme.id && !selectedScheme.name) {
        const foundScheme = schemes.find((s) => s.SchemeId === selectedScheme.id);
        if (foundScheme) {
          setSelectedScheme((prev) => ({ ...prev, name: foundScheme.schemeName || routeSchemeName }));
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch schemes. Please try again.");
    } finally {
      setIsFetchingSchemes(false);
    }
  };

  const getSchemeName = (id) => {
    if (!id) return selectedScheme.name || "No Scheme Selected";
    const numericId = Number(id);
    if (selectedScheme.id === numericId && selectedScheme.name) return selectedScheme.name;
    const scheme = allSchemes.find((s) => s.SchemeId === numericId);
    if (scheme) return scheme.schemeName || "Unknown Scheme";
    return selectedScheme.name || routeSchemeName || "Unknown Scheme";
  };

  const fetchSchemeOptions = async (schemeId) => {
    if (!schemeId) return;
    setIsFetchingSchemeOptions(true);
    try {
      const response = await fetch(`${API_BASE_URL_OLD}/member/schemeid?schemeId=${schemeId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const normalizedData = data.map((item) => ({
        groupCode: item.GROUPCODE,
        regNo: item.CURRENTREGNO || item.REGNO || "",
        amount: item.AMOUNT || "",
      }));
      setSchemeOptions(normalizedData);
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

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigation.navigate("MainLanding");
    }
  };

  const handleSchemeSelection = (schemeId, schemeName) => {
    const numericId = Number(schemeId);
    setSelectedScheme({ id: numericId, name: schemeName || getSchemeName(numericId) });
    setSchemeData((prev) => ({ ...prev, selectedSchemeId: numericId }));
    fetchSchemeOptions(numericId);
  };

  const handleNextStep = (memberFormData = {}) => {
    setTransformedMemberData(memberFormData);
    if (memberFormData.selectedSchemeId) {
      const numericId = Number(memberFormData.selectedSchemeId);
      setSelectedScheme({ id: numericId, name: memberFormData.selectedSchemeName || getSchemeName(numericId) });
    }
    setCurrentStep(2);
  };

  const resetFormFields = () => {
    setTransformedMemberData(null);
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
    setPaymentCompleted(false);
    setProcessingPayment(false);
  };

  const submitMemberData = async (numericSchemeId, schemeFormData, groupCode, regNo, paymentResponse = null, cashPayment = false) => {
    const memberData = transformedMemberData;
    const requestBody = buildMemberCreateBody({
      memberData, numericSchemeId, groupCode, regNo,
      schemeFormData, referralCode: ReferralCode || "",
      paymentResponse, cashPayment,
    });
    const responseData = await createMember(requestBody);

    try {
      await smsService.sendWelcomeSMS(
        memberData.mobile, memberData.pName,
        getSchemeName(numericSchemeId), schemeFormData.amount,
        new Date().toISOString().slice(0, 10), "BMG JEWELLERS PVT LTD"
      );
    } catch (smsError) {}

    try {
      await sendJoinSchemeNotification(numericSchemeId, parseFloat(schemeFormData.amount), getSchemeName(numericSchemeId));
    } catch (notifErr) {}

    return true;
  };

  const handleSubmit = async (schemeFormData) => {
    if (isSubmitting || isProcessingPayment) return;
    const numericSchemeId = selectedScheme.id;
    if (!numericSchemeId || isNaN(numericSchemeId)) { Alert.alert("Error", "Please select a valid scheme."); return; }
    if (!schemeFormData.amount || parseFloat(schemeFormData.amount) <= 0) { Alert.alert("Error", "Please enter a valid amount."); return; }
    if (!schemeFormData.accCode) { Alert.alert("Error", "Please select a payment mode."); return; }

    if (schemeFormData.modePay === "C" && schemeFormData.accCode !== "ONLINE") {
      await processCashPayment(schemeFormData, numericSchemeId);
      return;
    }
    await processOnlinePayment(schemeFormData, numericSchemeId);
  };

  const processCashPayment = async (schemeFormData, numericSchemeId) => {
    setIsSubmitting(true);
    try {
      if (!transformedMemberData) {
        Alert.alert("Error", "Member data is missing. Please go back and fill member details.");
        return;
      }
      const response = await fetch(`${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`);
      if (!response.ok) throw new Error(`Failed to fetch scheme details: HTTP ${response.status}`);
      const apiData = await response.json();
      if (!apiData || apiData.length === 0) throw new Error("No scheme data available for the selected scheme.");

      let selectedRecord;
      const targetAmount = parseFloat(schemeFormData.amount);
      if (targetAmount > 0) {
        selectedRecord = apiData.find((item) => parseFloat(item.AMOUNT || 0) === targetAmount);
        if (!selectedRecord) selectedRecord = apiData.find((item) => parseFloat(item.AMOUNT || 0) > 0);
      }
      if (!selectedRecord) selectedRecord = apiData[0];

      const groupCode = selectedRecord.GROUPCODE;
      const regNo = selectedRecord.CURRENTREGNO || selectedRecord.REGNO;
      if (!groupCode || !regNo) throw new Error("No scheme data available for the selected scheme.");

      await submitMemberData(numericSchemeId, schemeFormData, groupCode, regNo, null, true);

      Alert.alert(
        "Success",
        `Member "${transformedMemberData.pName}" has been successfully added to "${getSchemeName(numericSchemeId)}" scheme!`,
        [{ text: "OK", onPress: () => { resetFormFields(); navigation.navigate("MainLanding"); } }]
      );
    } catch (error) {
      let errorMessage = "Failed to create member. Please try again.";
      if (error.message.includes("mobile")) errorMessage = "Mobile number validation failed.";
      else if (error.message.includes("Aadhaar")) errorMessage = "Aadhaar number validation failed.";
      else if (error.message.includes("HTTP")) errorMessage = "Network error. Please check your connection.";
      else if (error.message.includes("scheme data")) errorMessage = "Selected scheme is not available.";
      else if (error.message.includes("already exists")) errorMessage = "Member with these details already exists.";
      else if (error.message.includes("Member name")) errorMessage = "Member name is required.";
      else if (error.message.includes("Date of Birth")) errorMessage = "Date of Birth is required.";
      Alert.alert("Submission Error", errorMessage, [
        { text: "Retry", onPress: () => setIsSubmitting(false) },
        { text: "Cancel", onPress: () => setIsSubmitting(false), style: "cancel" },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processOnlinePayment = async (schemeFormData, numericSchemeId) => {
    setIsProcessingPayment(true);
    try {
      const response = await fetch(`${API_BASE_URL_OLD}/member/schemeid?schemeId=${numericSchemeId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const apiData = await response.json();
      if (!apiData || apiData.length === 0) throw new Error("No scheme data returned from API.");

      let selectedRecord;
      if (schemeFormData.amount) {
        selectedRecord = apiData.find((item) => parseFloat(item.AMOUNT || 0) === parseFloat(schemeFormData.amount));
      }
      if (!selectedRecord) selectedRecord = apiData[0];

      const groupCode = selectedRecord.GROUPCODE;
      const regNo = selectedRecord.CURRENTREGNO || selectedRecord.REGNO;
      if (!groupCode || !regNo) throw new Error("No registration number available for this scheme. Please try again.");

      const defaultName = transformedMemberData ? `${transformedMemberData.pName} ${transformedMemberData.sName}`.trim() : "Customer";
      const defaultContact = transformedMemberData?.mobile || "";
      const amount = schemeFormData.amount;

      const nmData = buildMemberCreateBody({
        memberData: transformedMemberData, numericSchemeId, groupCode, regNo,
        schemeFormData: { ...schemeFormData, modePay: "O" }, referralCode: ReferralCode || "",
      });

      const result = await payWithRazorpay({
        token, newJoin: true,
        body: { REGNO: regNo, GROUPCODE: groupCode, AMOUNT: Number(amount), NMDATA: nmData, SCHEMEDETAILS: nmData.schemeCollectInsert },
        orderDetails: {
          amount: Number(amount), payType: "ONLINE",
          customer: { name: defaultName, contact: defaultContact, regNo, groupCode },
          schemeInfo: { schemeId: numericSchemeId, schemeName: getSchemeName(numericSchemeId) },
        },
      });

      if (!result.creditPending) resetFormFields();
      navigation.navigate("PaymentSuccess", {
        ...result, status: "SUCCESS", isCashPayment: false, isInstallmentPayment: false, paymentType: "join",
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

  const renderProcessingPayment = () => (
    <View style={styles.processingContainer}>
      <ActivityIndicator size="large" color="#d4af37" />
      <Text style={styles.processingText}>Processing your payment...</Text>
      <Text style={styles.processingSubText}>Please wait while we confirm your payment</Text>
    </View>
  );

  const renderStep = () => {
    if (paymentCompleted) return null;
    if (processingPayment) return renderProcessingPayment();

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
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.8)", justifyContent: "center", alignItems: "center" },
  processingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background, padding: 20 },
  processingText: { fontSize: 18, fontWeight: "bold", marginTop: 20, color: COLORS.primary, textAlign: "center" },
  processingSubText: { fontSize: 14, marginTop: 10, color: COLORS.text, textAlign: "center", opacity: 0.7 },
});

export default AddNewMember;
