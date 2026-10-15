import { API_BASE_URL_OLD,API_BASE_URL } from "../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

// --------------------------------------------------------
// 1️⃣ Get Referral Details (existing function)
// --------------------------------------------------------
export const getReferralDetails = async () => {

  const userId = await AsyncStorage.getItem("userId");

  try {
    const url = `${API_BASE_URL_OLD}/account/referrals/${userId}`;

    const response = await fetch(url);

    if (!response.ok) {
      return { success: false, message: "Network error occurred" };
    }

    const data = await response.json();

    return { success: true, data };
  } catch (error) {
    console.error("🔴 STEP 8: Catch error →", error);
    return { success: false, message: "Something went wrong" };
  }
};


// --------------------------------------------------------
// 2️⃣ Check Applied Referral Status (NEW FUNCTION)
// --------------------------------------------------------
export const getAppliedReferralStatus = async () => {

  try {
    const userId = await AsyncStorage.getItem("userId");

    if (!userId) {
      return { success: false, hasAppliedReferral: false };
    }

    const url = `${API_BASE_URL}/referral/logs/${userId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });


    if (!response.ok) {
      console.error("🔴 STEP 6: Failed API call");
      return { success: false, hasAppliedReferral: false };
    }

    const data = await response.json();

    const hasAppliedReferral = Array.isArray(data) && data.length > 0;

    if (hasAppliedReferral) {
    }

    return {
      success: true,
      hasAppliedReferral,
      appliedReferralData: hasAppliedReferral ? data[0] : null,
    };
  } catch (error) {
    console.error("🔴 STEP 10: Catch error →", error);
    return { success: false, hasAppliedReferral: false };
  }
};


// --------------------------------------------------------
// 3️⃣ Apply Friend's Referral Code
// --------------------------------------------------------
export const applyReferralCode = async (referralCode) => {
  try {
    const userId = await AsyncStorage.getItem("userId");

    if (!userId) {
      return { success: false, message: "User not logged in" };
    }

    if (!referralCode || referralCode.trim() === "") {
      return { success: false, message: "Invalid referral code" };
    }

    const cleanReferralCode = referralCode.trim().toUpperCase();

    const url = `${API_BASE_URL}/referral/check?userId=${userId}&referralCode=${cleanReferralCode}`;

    const response = await fetch(url, { method: "POST" });
    const data = await response.json();

    // ✅ HANDLE BACKEND STATUS
    if (response.ok && data.status === "allowed") {
      return {
        success: true,
        message: data.message || "Referral applied successfully",
        data,
      };
    }

    // ❌ BACKEND REJECTION (your case)
    return {
      success: false,
      message: data.message || "Referral code is invalid",
      status: data.status,
    };
  } catch (error) {
    return {
      success: false,
      message: "Network error. Please try again.",
    };
  }
};


// --------------------------------------------------------
// 4️⃣ Validate Referral Code Format (Helper Function)
// --------------------------------------------------------
export const validateReferralCode = (code) => {

  if (!code || code.trim() === "") {
    return { valid: false };
  }

  const cleanCode = code.trim();

  if (cleanCode.length < 3) {
    return { valid: false };
  }

  if (cleanCode.length > 20) {
    return { valid: false };
  }

  return { valid: true };
};

// Add this new function in your ReferralAmount service file
export const getRewardsData = async () => {

  const userId = await AsyncStorage.getItem("userId");

  if (!userId) {
    return {
      success: false,
      message: "User ID not found. Please login again.",
      referrer: null,
      transactions: []
    };
  }

  try {
    const url = `${API_BASE_URL_OLD}/account/referrals/${userId}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔴 Error response:", errorText);

      return {
        success: false,
        message: `Network error: ${response.status}`,
        referrer: null,
        transactions: []
      };
    }

    const data = await response.json();

    // Check if data is an object with referrer property
    if (data && typeof data === 'object' && data.referrer) {

      return {
        success: true,
        referrer: data.referrer || null,
        transactions: data.transactions || []
      };
    } 
    // Handle array structure (for backward compatibility)
    else if (Array.isArray(data)) {
      const referrer = data[0] || null;
      const transactions = data.slice(1) || [];

      return {
        success: true,
        referrer,
        transactions
      };
    }
    // Handle unexpected format
    else {
      return {
        success: true,
        referrer: null,
        transactions: []
      };
    }

  } catch (error) {
    console.error("🔴 STEP 10: Catch error →", error);
    return {
      success: false,
      message: error.message || "Something went wrong",
      referrer: null,
      transactions: []
    };
  }
};