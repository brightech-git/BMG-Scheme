import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { userService } from "../../services/UserRegisterService";
import {
  validateMobile,
  validateEmail,
  validatePincode,
  validateName,
  validateDOB,
  validateAddressField,
  validateAadhaar,
} from "../../screens/AddNewMember/Validations";
import { digiLockerService } from "../../services/DigiLockerService";
import {
  saveUserData,
  getAuthToken,
  getUserData,
  updateUserData,
  updateUserProfile,
} from "../../utils/AsynchStorageHelper";

export const useUserProfile = () => {
  const navigation = useNavigation();
  const [state, setState] = useState({
    userData: null,
    showForm: false,
    isFetchingPincode: false,
    isLoading: false,
    userId: null,
    showOTPModal: false,
    verifyingOTP: false,
    phoneToVerify: "",
    isFetchingData: false,
    fieldValidity: {},
    isFormDirty: false,
    verificationInProgress: false,
    showTermsModal: false,
    showConsentModal: false,
    pendingAadhaarVerification: false,
  });

  const [formData, setFormData] = useState(userService.getInitialFormState());
  const [errors, setErrors] = useState({});
  const formClosingRef = useRef(false);

  // Helper to update state
  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Helper function to parse Aadhaar address response
  const parseAadhaarAddress = (addressString, splitAddressData) => {
    try {
      if (splitAddressData) {
        return {
          address1: splitAddressData.house || "",
          address2: `${splitAddressData.street || ""} ${
            splitAddressData.landmark || ""
          }`.trim(),
          city: splitAddressData.vtc || splitAddressData.city || "",
          state: splitAddressData.state || "",
          pincode: splitAddressData.pincode || "",
          country: splitAddressData.country || "India",
        };
      }

      if (!addressString) return null;

      const parts = addressString
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part);

      if (parts.length >= 7) {
        const address1 = parts[0] || "";
        const address2 = parts[1] || "";
        const city = parts[2] || "";
        const state = parts[5] || "";
        const pincode = parts[6] || "";
        const country = parts[7] || "India";

        return { address1, address2, city, state, pincode, country };
      }

      return null;
    } catch (error) {
      console.error("Error parsing address:", error);
      return null;
    }
  };

  const mergeUserDataToStorage = async (newData) => {
    try {
      await updateUserData(newData);
    } catch (e) {
      console.error("❌ Failed to merge user data:", e);
    }
  };

  // ===== DATA FETCHING =====
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUserData = await getUserData();

      if (storedUserData) {
        updateState({
          userId: storedUserData.id,
          userData: storedUserData,
        });

        if (storedUserData.id) {
          await fetchUserData(storedUserData.id);
        }
      }
    } catch (error) {
      console.error("Failed to load user data", error);
    }
  };

  const fetchUserData = async (userId) => {
    if (!userId) return;
    updateState({ isFetchingData: true });

    try {

      const result = await userService.fetchUserData(userId);

      if (result) {
        // IMPORTANT: Merge with existing token from local storage
        const existingData = await getUserData();
        const existingToken = existingData?.token;

        const mergedData = {
          ...result,
          token: existingToken || result.token, // Preserve existing token
        };

        await updateUserData(mergedData);

        updateState({ userData: mergedData });
        setFormData(userService.getInitialFormState(mergedData));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);

      // Fall back to local data
      const localData = await getUserData();
      if (localData) {
        console.error("⚠️ Using local data due to fetch error");
        updateState({ userData: localData });
        setFormData(userService.getInitialFormState(localData));
      } else {
        Alert.alert("Error", "Failed to fetch user data. Please try again.");
      }
    } finally {
      updateState({ isFetchingData: false });
    }
  };

  // ===== FORM FIELD UPDATES =====
  const updateField = (field, value) => {
    if (!state.isFormDirty) updateState({ isFormDirty: true });

    // Handle aadhaarVerified — KYC requires BOTH Aadhaar verification AND explicit terms acceptance.
    // Terms are never auto-accepted on the user's behalf.
    if (field === "aadhaarVerified") {
      const newValue = value;
      const updatedFormData = {
        ...formData,
        [field]: newValue,
        kycVerified: Boolean(newValue && formData.termsAccepted),
      };
      setFormData(updatedFormData);
      setErrors((prev) => ({ ...prev, [field]: "" }));
      updateState((prev) => ({
        fieldValidity: {
          ...prev.fieldValidity,
          [field]: true,
          kycVerified: Boolean(newValue && prev.fieldValidity.termsAccepted),
        },
      }));
      return;
    }

    // Handle termsAccepted with KYC logic
    if (field === "termsAccepted") {
      const newValue = value;
      const updatedFormData = {
        ...formData,
        [field]: newValue,
        kycVerified: formData.aadhaarVerified && newValue ? true : false,
      };
      setFormData(updatedFormData);
      setErrors((prev) => ({ ...prev, [field]: "" }));
      updateState((prev) => ({
        fieldValidity: {
          ...prev.fieldValidity,
          [field]: true,
          kycVerified: prev.fieldValidity.aadhaarVerified && newValue,
        },
      }));
      return;
    }

    // Handle Aadhaar number input
    if (field === "idProofNo") {
      const processedValue = value.replace(/[^0-9]/g, "").slice(0, 12);
      const previousAadhaar = formData.idProofNo || "";
      const newAadhaar = processedValue;
      const isSameAadhaar =
        previousAadhaar &&
        newAadhaar &&
        previousAadhaar.substring(8) === newAadhaar.substring(8);

      if (formData.aadhaarVerified && field === "idProofNo" && !isSameAadhaar) {
        const updatedFormData = {
          ...formData,
          [field]: processedValue,
          aadhaarVerified: false,
          maskedAadhaar: "",
          aadhaarVerificationId: "",
          aadhaarVerifiedAt: "",
          aadhaarStatus: "pending",
          // Reset kycVerified when Aadhaar number changes
          kycVerified: false,
        };
        setFormData(updatedFormData);
      } else {
        setFormData((prev) => ({ ...prev, [field]: processedValue }));
      }

      if (processedValue && processedValue.length === 12) {
        const aadhaarError = validateAadhaar(processedValue);
        if (aadhaarError) {
          setErrors((prev) => ({ ...prev, [field]: aadhaarError }));
          updateState((prev) => ({
            fieldValidity: { ...prev.fieldValidity, [field]: false },
          }));
        } else {
          setErrors((prev) => ({ ...prev, [field]: "" }));
          updateState((prev) => ({
            fieldValidity: { ...prev.fieldValidity, [field]: true },
          }));
        }
      } else {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
      return;
    }

    // Apply field-specific formatting for other fields
    let processedValue = value;

    if (field === "pincode") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 6);

      // Update form data FIRST with a callback to ensure we have the updated value
      setFormData((prev) => {
        const updatedFormData = { ...prev, [field]: processedValue };

        // If we have a complete 6-digit pincode, fetch city/state
        if (processedValue.length === 6) {
          // Use setTimeout to ensure state update is complete before fetching
          setTimeout(() => {
            fetchCityStateFromPincode(processedValue);
          }, 0);
        }

        return updatedFormData;
      });

      // Don't return here - let the rest of the function handle validation and errors
    } else if (field === "contactNumber") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
      if (formData.phoneVerified && field === "contactNumber") {
        setFormData((prev) => ({
          ...prev,
          phoneVerified: false,
          [field]: processedValue
        }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: processedValue }));
      }
    } else {
      // For other fields, update normally
      setFormData((prev) => ({ ...prev, [field]: processedValue }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Real-time validation (skip for pincode since we handle it differently)
    if (field !== "pincode" && (
      (typeof processedValue === "string" && processedValue.trim()) ||
      [
        "email",
        "username",
        "address1",
        "address2",
        "city",
        "state",
        "dateOfBirth",
        "contactNumber",
      ].includes(field)
    )) {
      let isValid = false;
      let errorMsg = "";

      switch (field) {
        case "email":
          errorMsg = validateEmail(processedValue);
          isValid = !errorMsg;
          break;
        case "username":
          errorMsg = validateName(processedValue);
          isValid = !errorMsg;
          break;
        case "dateOfBirth":
          errorMsg = validateDOB(processedValue);
          isValid = !errorMsg;
          break;
        case "address1":
          errorMsg = validateAddressField(processedValue, "Address Line 1");
          isValid = !errorMsg;
          break;
        case "address2":
          errorMsg = validateAddressField(processedValue, "Address Line 2");
          isValid = !errorMsg;
          break;
        case "city":
          errorMsg = validateAddressField(processedValue, "City");
          isValid = !errorMsg;
          break;
        case "state":
          errorMsg = validateAddressField(processedValue, "State");
          isValid = !errorMsg;
          break;
        case "contactNumber":
          errorMsg = validateMobile(processedValue);
          isValid = !errorMsg;
          break;
        default:
          isValid = true;
      }

      updateState((prev) => ({
        fieldValidity: { ...prev.fieldValidity, [field]: isValid },
      }));

      if (!isValid && errorMsg) {
        setErrors((prev) => ({ ...prev, [field]: errorMsg }));
      }
    }
  };

  // ===== AADHAAR VERIFICATION =====
  const handleVerifyAadhaar = async () => {
    const aadhaarNumber = formData.idProofNo;
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      Alert.alert("Error", "Please enter a valid 12-digit Aadhaar number");
      return;
    }

    const aadhaarError = validateAadhaar(aadhaarNumber);
    if (aadhaarError) {
      Alert.alert("Invalid Aadhaar", aadhaarError);
      return;
    }

    // Prevent duplicate verification of an already-verified Aadhaar
    if (formData.aadhaarVerified) {
      Alert.alert(
        "Already Verified",
        "This Aadhaar number is already verified. Change the Aadhaar number to verify a different one."
      );
      return;
    }

    // Prevent starting a second verification while one is in flight
    if (state.verificationInProgress || state.pendingAadhaarVerification) {
      return;
    }

    updateState({ pendingAadhaarVerification: true, showConsentModal: true });
  };

  const handleConsentAccept = async () => {
    updateState({ showConsentModal: false, verificationInProgress: true });

    try {
      const aadhaarNumber = formData.idProofNo;

      const result = await digiLockerService.verifyAadhaar(
        state.userId,
        aadhaarNumber
      );

      if (!result.success) {
        Alert.alert("Error", result.message || "Failed to start verification");
        updateState({
          verificationInProgress: false,
          pendingAadhaarVerification: false,
        });
        return;
      }

      navigation.navigate("DigiLockerWebViewScreen", {
        verificationUrl: result.verificationUrl,
        verificationId: result.verificationId,
        aadhaarNumber: aadhaarNumber,
        originalAadhaarNumber: aadhaarNumber,
        onVerificationComplete: handleVerificationComplete,
      });

      updateState({ pendingAadhaarVerification: false });
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert("Error", "Failed to start verification. Please try again.");
      updateState({
        verificationInProgress: false,
        pendingAadhaarVerification: false,
      });
    }
  };

  const handleConsentClose = () => {
    updateState({ showConsentModal: false, pendingAadhaarVerification: false });
  };

  const fetchCityStateFromPincode = async (pincode) => {
    if (pincode.length !== 6) return;
    updateState({ isFetchingPincode: true });

    try {
      // Using the postal pincode API as shown in your example
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
        // Get the first post office entry
        const postOffice = data[0].PostOffice[0];
        const district = postOffice.District || "";
        const state = postOffice.State || "";
        const country = postOffice.Country || "India";


        // Update form data with the fetched city and state
        setFormData((prev) => ({
          ...prev,
          city: district,
          state: state,
          country: country,
        }));

        // Clear any existing errors
        setErrors((prev) => ({
          ...prev,
          city: "",
          state: "",
          pincode: "",
        }));

        updateState((prev) => ({
          fieldValidity: {
            ...prev.fieldValidity,
            city: district ? true : false,
            state: state ? true : false,
            pincode: true,
          },
        }));

        return {
          success: true,
          city: district,
          state: state,
          country: country,
          postOfficeCount: data[0].PostOffice.length,
        };
      } else {
        // Handle no records found
        const errorMessage = data[0]?.Message || "Invalid PIN code. No records found.";
        setErrors((prev) => ({
          ...prev,
          pincode: errorMessage,
        }));

        // Clear city and state fields
        setFormData((prev) => ({
          ...prev,
          city: "",
          state: "",
          country: "India",
        }));

        return {
          success: false,
          message: errorMessage,
        };
      }
    } catch (error) {
      console.error("Pincode fetch error:", error);

      let errorMessage = "Network error. Please try again.";
      if (error.message.includes("Failed to fetch")) {
        errorMessage = "Unable to connect to service. Check your internet connection.";
      }

      setErrors((prev) => ({
        ...prev,
        pincode: errorMessage,
      }));

      return {
        success: false,
        message: errorMessage,
        error: error.message,
      };
    } finally {
      updateState({ isFetchingPincode: false });
    }
  };

  // ===== UPDATED VERIFICATION COMPLETE HANDLER =====
  const handleVerificationComplete = async (result) => {

    if (result.success && result.aadhaarVerified) {
      try {
        const aadhaarData = result.userDetails || {};
        const documentData = result.documentData || {};
        const actualAadhaarNumber = formData.idProofNo;

        // Derive masked Aadhaar from the actual number (never a hardcoded fallback)
        const last4 =
          actualAadhaarNumber && actualAadhaarNumber.length === 12
            ? actualAadhaarNumber.slice(-4)
            : (result.idProofNo || "").slice(-4);
        const properMaskedAadhaar = last4 ? `XXXX-XXXX-${last4}` : "";

        // Parse address from Aadhaar response
        const addressData = parseAadhaarAddress(
          aadhaarData.address,
          documentData.split_address
        );

        // Format date of birth to "YYYY-MM-DD"
        const formatDateOfBirth = (dob) => {
          if (!dob) return "";
          const parts = dob.split("-");
          if (parts.length === 3) {
            // Convert from "DD-MM-YYYY" to "YYYY-MM-DD"
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
          return dob;
        };

        // Prepare updated data — terms acceptance stays whatever the user chose;
        // kycVerified is only true when BOTH Aadhaar verified AND terms explicitly accepted.
        const initialUpdate = {
          idProofNo: actualAadhaarNumber,
          aadhaarVerified: true,
          maskedAadhaar: properMaskedAadhaar,
          aadhaarVerificationId:
            result.aadhaarVerificationId || result.verificationId,
          aadhaarVerifiedAt:
            result.aadhaarVerifiedAt || new Date().toISOString(),
          aadhaarStatus: result.aadhaarStatus || "VERIFIED",
          username: aadhaarData.name || formData.username,
          dateOfBirth:
            formatDateOfBirth(aadhaarData.dob) || formData.dateOfBirth,
          gender: (
            aadhaarData.gender ||
            documentData.gender ||
            formData.gender
          )?.toLowerCase(),
          address1:
            addressData?.address1 || aadhaarData.address || formData.address1,
          address2: addressData?.address2 || formData.address2,
          country: addressData?.country || formData.country || "India",
          termsAccepted: formData.termsAccepted,
          kycVerified: Boolean(formData.termsAccepted),
        };

        // If we have pincode from Aadhaar, fetch city and state
        const pincodeFromAadhaar = addressData?.pincode || 
                                    documentData.split_address?.pincode;

        let cityStateFromPincode = { city: "", state: "" };

        if (pincodeFromAadhaar && pincodeFromAadhaar.length === 6) {
          try {
            // Use the pincode API to get city (district) and state
            const pincodeResult = await fetchCityStateFromPincode(pincodeFromAadhaar);

            if (pincodeResult.success) {
              cityStateFromPincode = {
                city: pincodeResult.city || addressData?.city || formData.city,
                state: pincodeResult.state || addressData?.state || formData.state,
                pincode: pincodeFromAadhaar
              };
            } else {
              // Fallback to whatever we have
              cityStateFromPincode = {
                city: addressData?.city || formData.city,
                state: addressData?.state || formData.state,
                pincode: pincodeFromAadhaar
              };
            }
          } catch (pincodeError) {
            console.error("Failed to fetch pincode details:", pincodeError);
            cityStateFromPincode = {
              city: addressData?.city || formData.city,
              state: addressData?.state || formData.state,
              pincode: pincodeFromAadhaar
            };
          }
        } else {
          // No valid pincode from Aadhaar
          cityStateFromPincode = {
            city: addressData?.city || formData.city,
            state: addressData?.state || formData.state,
            pincode: formData.pincode
          };
        }

        // Complete updated form data
        const updatedFormData = {
          ...initialUpdate,
          city: cityStateFromPincode.city,
          state: cityStateFromPincode.state,
          pincode: cityStateFromPincode.pincode || formData.pincode,
        };

        setFormData(updatedFormData);

        // Update validation state
        const fieldValidityUpdates = {
          idProofNo: true,
          address1: updatedFormData.address1 ? true : false,
          city: updatedFormData.city ? true : false,
          state: updatedFormData.state ? true : false,
          pincode: updatedFormData.pincode ? true : false,
        };

        updateState((prev) => ({
          fieldValidity: {
            ...prev.fieldValidity,
            ...fieldValidityUpdates,
          },
        }));

        // Clear errors
        const clearedErrors = {};
        Object.keys(fieldValidityUpdates).forEach(key => {
          if (fieldValidityUpdates[key]) {
            clearedErrors[key] = "";
          }
        });
        setErrors((prev) => ({
          ...prev,
          ...clearedErrors,
        }));

        // First, update local storage with all the data
        await updateUserData(updatedFormData);

        // Then send to server
        try {
          const serverApiData = {
            idProofNo: actualAadhaarNumber,
            maskedAadhaar: properMaskedAadhaar,
            aadhaarVerified: true,
            termsAccepted: Boolean(formData.termsAccepted),
            kycVerified: Boolean(formData.termsAccepted),
            aadhaarVerificationId: result.aadhaarVerificationId || "",
            aadhaarVerifiedAt: result.aadhaarVerifiedAt || "",
            aadhaarStatus: result.aadhaarStatus || "VERIFIED",
            // Only send user details if they were updated from Aadhaar
            ...(aadhaarData.name && { username: aadhaarData.name }),
            ...(aadhaarData.dob && { dateOfBirth: formatDateOfBirth(aadhaarData.dob) }),
            ...(aadhaarData.gender && { gender: aadhaarData.gender.toLowerCase() }),
            ...(addressData?.address1 && { address1: addressData.address1 }),
            ...(addressData?.address2 && { address2: addressData.address2 }),
            city: updatedFormData.city,
            state: updatedFormData.state,
            pincode: updatedFormData.pincode,
            country: updatedFormData.country,
          };

          const serverResult = await userService.updateUserData(state.userId, serverApiData);

          // If server update was successful, wait a moment and then refresh
          if (serverResult.status === "success") {

            // Wait a moment for server to process
            setTimeout(async () => {
              try {
                await fetchUserData(state.userId);
              } catch (fetchError) {
              }
            }, 1000);
          }
        } catch (serverError) {
          console.error("⚠️ Server update failed, but local data saved:", serverError);
        }

        Alert.alert(
          "✅ Aadhaar Verified Successfully",
          `Your Aadhaar has been verified and your profile updated.\n\nCity: ${updatedFormData.city}\nState: ${updatedFormData.state}\nPincode: ${updatedFormData.pincode}` +
            (formData.termsAccepted
              ? "\n\n✅ KYC complete."
              : "\n\n⚠️ Please accept the Terms & Conditions to complete your KYC."),
          [{ text: "OK" }]
        );

        if (state.showForm) {
          closeFormAndReset();
        }
      } catch (error) {
        console.error("API update error:", error);
        Alert.alert(
          "⚠️ Network Error",
          "Your Aadhaar has been verified locally.",
          [{ text: "OK" }]
        );
      }
    } else {
      // ... rest of the failure handling remains the same
      Alert.alert(
        "Verification Failed",
        result.message || "Aadhaar verification could not be completed.",
        [{ text: "OK" }]
      );

      const updatedFormData = {
        ...formData,
        aadhaarVerified: false,
        aadhaarStatus: result.aadhaarStatus || "FAILED",
        kycVerified: false,
      };

      setFormData(updatedFormData);
      updateState((prev) => ({
        fieldValidity: {
          ...prev.fieldValidity,
          idProofNo: false,
          kycVerified: false,
        },
      }));
      setErrors((prev) => ({
        ...prev,
        idProofNo: "Verification failed. Please try again.",
      }));
    }

    updateState({
      verificationInProgress: false,
      pendingAadhaarVerification: false,
    });
  };

  // ===== OTP VERIFICATION =====
  const verifyOTP = async (otp) => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    updateState({ verifyingOTP: true });

    try {
      const result = await userService.verifyOTP(state.userId, otp);

      if (result) {
        await mergeUserDataToStorage(result);
      }

      updateState({ showOTPModal: false, verifyingOTP: false });
      await fetchUserData(state.userId);
      closeFormAndReset();

      Alert.alert("✅ Success", "Phone number verified successfully!");

      const token = await getAuthToken();
    } catch (error) {
      Alert.alert(
        "Verification Failed",
        error.message || "Invalid OTP. Please try again."
      );
      updateState({ verifyingOTP: false });
    }
  };

  // ===== FORM VALIDATION =====
  const validateForm = () => {
    const validators = {
      validateEmail,
      validateName,
      validateMobile,
      validateDOB,
      validateAddressField,
      validatePincode,
      validateAadhaar,
    };

    const validation = userService.validateFormData(formData, validators);

    setErrors(validation.errors);
    updateState({ fieldValidity: validation.fieldValidity });

    if (!validation.isValid) {
      const errorMessage = Object.entries(validation.errors)
        .filter(([_, e]) => e)
        .map(([f, e]) => {
          const names = {
            email: "Email Address",
            username: "Username",
            gender: "Gender",
            contactNumber: "Phone Number",
            dateOfBirth: "Date of Birth",
            address1: "Address Line 1",
            address2: "Address Line 2",
            city: "City",
            state: "State",
            pincode: "PIN Code",
            termsAccepted: "Terms & Conditions",
            idProofNo: "Aadhaar Number",
          };
          return `• ${names[f] || f}: ${e}`;
        })
        .join("\n\n");

      Alert.alert(
        "Validation Error ⚠️",
        `Please fix the following errors:\n\n${errorMessage}`
      );
      return false;
    }

    return true;
  };

  // ===== FORM MANAGEMENT =====
  const closeFormAndReset = () => {
    if (formClosingRef.current) return;
    formClosingRef.current = true;

    updateState({ showForm: false, isFormDirty: false, isLoading: false });

    if (state.userData) {
      setFormData(userService.getInitialFormState(state.userData));
    }

    setErrors({});
    updateState({ fieldValidity: {} });

    setTimeout(() => {
      formClosingRef.current = false;
    }, 500);
  };

  const handleSubmit = async () => {

    // Terms & Conditions must always be explicitly accepted by the user
    if (!formData.termsAccepted) {
      Alert.alert(
        "Terms Required",
        "You must accept the Terms and Conditions before updating your profile.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View Terms",
            onPress: () => updateState({ showTermsModal: true }),
          },
        ]
      );
      return;
    }

    if (!validateForm()) {
      return;
    }

    // KYC is complete only when Aadhaar is verified AND terms were explicitly accepted
    const updatedFormData = {
      ...formData,
      kycVerified: Boolean(formData.aadhaarVerified && formData.termsAccepted),
    };

    setFormData(updatedFormData);
    updateState({ isLoading: true });

    try {
      // Prepare data with correct types matching your Java model
      const apiData = {
        email: updatedFormData.email || "",
        username: updatedFormData.username || "",
        contactNumber: updatedFormData.contactNumber || "",
        gender: updatedFormData.gender || "male",
        dateOfBirth: updatedFormData.dateOfBirth || "",
        address1: updatedFormData.address1 || "",
        address2: updatedFormData.address2 || "",
        city: updatedFormData.city || "",
        state: updatedFormData.state || "",
        pincode: updatedFormData.pincode || "",
        country: updatedFormData.country || "India",
        termsAccepted: Boolean(updatedFormData.termsAccepted),
        idProofNo: updatedFormData.idProofNo || "",
        maskedAadhaar: updatedFormData.maskedAadhaar || "",
        aadhaarVerified: Boolean(updatedFormData.aadhaarVerified),
        kycVerified: Boolean(updatedFormData.aadhaarVerified && updatedFormData.termsAccepted),
        aadhaarVerificationId: updatedFormData.aadhaarVerificationId || "",
        aadhaarVerifiedAt: updatedFormData.aadhaarVerifiedAt || "",
        aadhaarStatus: updatedFormData.aadhaarStatus || "pending",
      };


      const tokenBefore = await getAuthToken();

      // Call the API with properly typed data
      const result = await userService.updateUserData(state.userId, apiData);

      if (result.otpSent === true) {
        updateState({
          phoneToVerify: updatedFormData.contactNumber,
          showOTPModal: true,
          isLoading: false,
        });
      } else {
        // Update local storage with what we sent
        await updateUserData(apiData);

        const tokenAfter = await getAuthToken();

        // Try to fetch updated data from server
        try {
          await fetchUserData(state.userId);
        } catch (fetchError) {
        }

        closeFormAndReset();
        Alert.alert("Success ✅", "Profile updated successfully!");
      }
    } catch (error) {
      console.error("❌ Submit Error:", error);
      Alert.alert("Error", error.message || "Failed to save data. Please try again.");
      updateState({ isLoading: false });
    }
  };

  const resetForm = () => {
    closeFormAndReset();
    updateState({ showOTPModal: false });
  };

  const handleEdit = () => {
    updateState({ showForm: true });
  };

  return {
    // State
    ...state,
    formData,
    errors,

    // Functions
    updateField,
    handleVerifyAadhaar,
    handleConsentAccept,
    handleConsentClose,
    verifyOTP,
    handleSubmit,
    resetForm,
    handleEdit,
    fetchUserData,
    updateState,
  };
};