// services/UserService.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../Config/API";
import { getAuthToken } from "../utils/AsynchStorageHelper"; // Import the function

export const userService = {
  // ===== USER DATA FETCHING =====
async fetchUserData(userId) {
  if (!userId) throw new Error("User ID is required");

  try {

    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json"
        // REMOVED: Authorization header since it's not needed
      }
    });


    const responseText = await response.text();

    if (!response.ok) {
      console.error("❌ Fetch error response:", responseText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
},
  // ===== USER DATA UPDATING =====
  async updateUserData(userId, formData) {
    if (!userId) throw new Error("User ID is required");

    try {
      // Get token before making request
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/${userId}/update`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update user data");
      }

      // IMPORTANT: Ensure the response doesn't contain null token
      if (result.token === null || result.token === undefined) {
        // Remove token from result to prevent overwriting
        delete result.token;
      }

      // If OTP is sent, return early
      if (result.otpSent === true) {
        return { otpSent: true };
      }

      // If update is successful, return the updated data
      return result;
    } catch (error) {
      console.error("❌ Error updating user data:", error);
      throw error;
    }
  },

  // ===== OTP VERIFICATION =====
  async verifyOTP(userId, otp) {
    if (!userId) throw new Error("User ID is required");

    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_BASE_URL}/${userId}/verify-otp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ otp }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "OTP verification failed");
      }

      return result;
    } catch (error) {
      console.error("OTP Verification Error:", error);
      throw error;
    }
  },

  // ===== PINCODE LOOKUP =====
  async fetchPincodeDetails(pincode) {
    if (!pincode || pincode.length !== 6) {
      throw new Error("Valid 6-digit PIN code is required");
    }

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`
      );
      const data = await response.json();

      if (data[0]?.Status === "Success" && data[0]?.PostOffice?.length) {
        const po = data[0].PostOffice[0];
        return {
          city: po.District || "",
          state: po.State || "",
          country: po.Country || "India",
          success: true,
        };
      } else {
        throw new Error("Invalid PIN code. No records found.");
      }
    } catch (error) {
      console.error("Pincode fetch error:", error);
      throw error;
    }
  },

  // ===== LOCAL STORAGE OPERATIONS =====
  async getUserId() {
    try {
      return await AsyncStorage.getItem("userId");
    } catch (error) {
      console.error("Failed to load userId", error);
      throw error;
    }
  },

  // ===== FORM VALIDATION =====
  validateFormData(formData, validators) {
    const errors = {};
    const fieldValidity = {};

    // Core required fields validation
    const coreRequiredFields = [
      {
        field: "email",
        validator: validators.validateEmail,
        label: "Email Address",
      },
      {
        field: "username",
        validator: validators.validateName,
        label: "Username",
      },
      {
        field: "contactNumber",
        validator: validators.validateMobile,
        label: "Phone Number",
      },
      {
        field: "dateOfBirth",
        validator: validators.validateDOB,
        label: "Date of Birth",
      },
      {
        field: "address1",
        validator: (v) => validators.validateAddressField(v, "Address Line 1"),
        label: "Address Line 1",
      },
      {
        field: "address2",
        validator: (v) => validators.validateAddressField(v, "Address Line 2"),
        label: "Address Line 2",
      },
      {
        field: "city",
        validator: (v) => validators.validateAddressField(v, "City"),
        label: "City",
      },
      {
        field: "state",
        validator: (v) => validators.validateAddressField(v, "State"),
        label: "State",
      },
      {
        field: "pincode",
        validator: validators.validatePincode,
        label: "PIN Code",
      },
    ];

    coreRequiredFields.forEach(({ field, validator }) => {
      const value = formData[field] || "";
      const error = validator(value);
      if (error) {
        errors[field] = error;
        fieldValidity[field] = false;
      } else {
        fieldValidity[field] = true;
      }
    });

    // Gender validation
    if (
      !formData.gender ||
      !["male", "female", "other"].includes(formData.gender)
    ) {
      errors.gender = "Please select a valid gender";
      fieldValidity.gender = false;
    }

    // Terms accepted validation
    if (!formData.termsAccepted) {
      errors.termsAccepted = "You must accept the terms and conditions";
      fieldValidity.termsAccepted = false;
    }

    // Aadhaar validation
    if (
      formData.idProofNo &&
      formData.idProofNo.trim() !== "" &&
      !formData.aadhaarVerified
    ) {
      const aadhaarError = validators.validateAadhaar(formData.idProofNo);
      if (aadhaarError) {
        errors.idProofNo = aadhaarError;
        fieldValidity.idProofNo = false;
      } else {
        fieldValidity.idProofNo = true;
      }
    }

    return { errors, fieldValidity, isValid: Object.keys(errors).length === 0 };
  },

  // ===== FORMATTING UTILITIES =====
  formatDateOfBirth(dobString) {
    if (!dobString) return "";
    if (dobString.includes("-")) {
      const parts = dobString.split("-");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(
          2,
          "0"
        )}`;
      }
    }
    return dobString;
  },

  formatVerificationDate(dateString) {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  },

  // ===== INITIAL FORM STATE =====
  getInitialFormState(userData = null) {
    if (!userData) {
      return {
        email: "",
        username: "",
        gender: "male",
        contactNumber: "",
        address1: "",
        address2: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
        dateOfBirth: "",
        phoneVerified: false,
        kycVerified: false,
        termsAccepted: false,
        idProofNo: "",
        aadhaarVerified: false,
        maskedAadhaar: "",
        aadhaarVerificationId: "",
        aadhaarVerifiedAt: "",
        aadhaarStatus: "pending",
      };
    }

    const computedKYC =
      (userData.aadhaarVerified && userData.termsAccepted) ||
      userData.kycVerified ||
      false;

    return {
      email: userData.email || "",
      username: userData.username || "",
      gender: userData.gender || "female",
      contactNumber: userData.contactNumber || "",
      address1: userData.address1 || "",
      address2: userData.address2 || "",
      city: userData.city || "",
      state: userData.state || "",
      pincode: userData.pincode || "",
      country: userData.country || "India",
      dateOfBirth: userData.dateOfBirth || "",
      phoneVerified: userData.phoneVerified || false,
      kycVerified: computedKYC,
      termsAccepted: userData.termsAccepted || false,
      idProofNo: userData.idProofNo || "",
      aadhaarVerified: userData.aadhaarVerified || false,
      maskedAadhaar: userData.maskedAadhaar || "",
      aadhaarVerificationId: userData.aadhaarVerificationId || "",
      aadhaarVerifiedAt: userData.aadhaarVerifiedAt || "",
      aadhaarStatus: userData.aadhaarStatus || "pending",
    };
  },
};

export const parseAadhaarAddress = (addressString, splitAddressData) => {
  try {
    // If we have split_address data from documentData, use that
    if (splitAddressData) {
      return {
        address1: splitAddressData.house || "",
        address2: `${splitAddressData.street || ""} ${splitAddressData.landmark || ""}`.trim(),
        city: splitAddressData.vtc || splitAddressData.city || "",
        state: splitAddressData.state || "",
        pincode: splitAddressData.pincode || "",
        country: splitAddressData.country || "India"
      };
    }

    // Fallback: Parse the address string
    if (!addressString) return null;

    const parts = addressString.split(',').map(part => part.trim()).filter(part => part);

    if (parts.length >= 9) {
      return {
        address1: parts[0] || "",
        address2: parts[1] || "",
        city: parts[2] || "",
        state: parts[6] || "",
        pincode: parts[8] || "",
        country: parts[7] || "India"
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing address:", error);
    return null;
  }
};

export const formatDateOfBirth = (dobString) => {
  if (!dobString) return "";

  if (dobString.includes('-')) {
    const parts = dobString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  return dobString;
};