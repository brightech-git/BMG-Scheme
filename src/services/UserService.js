import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../Config/API";


// Get auth headers dynamically
const getAuthHeader = async () => {
  const token = await AsyncStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Unified fetch wrapper (simplified logging)
// Unified fetch wrapper (fixed to handle business logic errors)
const request = async (url, options = {}, requireAuth = true, apiName = "Unknown API") => {
  console.log(`▶️ [${apiName}] START`);

  let headers = { "Content-Type": "application/json", ...options.headers };
  if (requireAuth) {
    const authHeader = await getAuthHeader();
    headers = { ...headers, ...authHeader };
  }

  try {
    const response = await fetch(url, { ...options, headers });
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    // Check both HTTP status AND business logic errors in response
    if (!response.ok) {
      console.log(`❌ [${apiName}] HTTP ERROR: ${response.status}`);
      const errorMessage =
        data?.message ||
        data?.error ||
        data?.details?.message ||
        `HTTP Error: ${response.status}`;

      return {
        success: false,
        error: errorMessage,
        status: response.status,
        details: data,
      };
    }

    // Handle business logic errors that still return 200 OK
    // Check for error messages that indicate failure despite 200 status
    const errorIndicators = [
      "already exists",
      "contact number already exists", 
      "email already exists",
      "username already exists",
      "invalid",
      "failed",
      "error"
    ];

    const responseMessage = data?.message?.toString().toLowerCase() || "";
    const hasBusinessError = errorIndicators.some(indicator => 
      responseMessage.includes(indicator.toLowerCase())
    );

    if (hasBusinessError) {
      console.log(`❌ [${apiName}] BUSINESS ERROR: ${data.message}`);
      return {
        success: false,
        error: data.message || "Operation failed",
        status: response.status,
        details: data,
      };
    }

    console.log(`✅ [${apiName}] SUCCESS`);
    return { success: true, data };
  } catch (err) {
    console.log(`🚨 [${apiName}] NETWORK ERROR`);
    return {
      success: false,
      error: err.message || "Network error",
      isNetworkError: true,
    };
  } finally {
    console.log(`⏹ [${apiName}] END`);
  }
};

const userService = {
  // ---------------- Public APIs ----------------
  registerUser: async (userData) => {
    console.log("🟢 Register User - Step 1: Initiating");
    return request(
      `${API_BASE_URL}/user/register`,
      {
        method: "POST",
        body: JSON.stringify(userData),
      },
      false,
      "REGISTER_USER"
    );
  },

  verifyOtp: async (contactNumber, otp) => {
    console.log("🟢 Verify OTP - Step 1: Sending");
    const params = new URLSearchParams({ contactNumber, otp });
    return request(
      `${API_BASE_URL}/user/verify-otp?${params.toString()}`,
      { method: "POST" },
      false,
      "VERIFY_OTP"
    );
  },

  loginUser: async (credentials) => {
    console.log("🟢 Login User - Step 1: Authenticating");
    const res = await request(
      `${API_BASE_URL}/user/login`,
      {
        method: "POST",
        body: JSON.stringify(credentials),
      },
      false,
      "LOGIN_USER"
    );

    if (res.success && res.data?.token) {
      console.log("🟢 Login User - Step 2: Saving Token");
      await AsyncStorage.setItem("authToken", res.data.token);
    } else {
      console.log("🔴 Login User - Step 2: Failed (No token)");
    }

    return res;
  },

  forgotPassword: async (data) => {
    console.log("🟢 Forgot Password - Step 1: Requesting");
    return request(
      `${API_BASE_URL}/user/forgot-password`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false,
      "FORGOT_PASSWORD"
    );
  },

  resetPassword: async (data) => {
    console.log("🟢 Reset Password - Step 1: Submitting");
    return request(
      `${API_BASE_URL}/user/reset-password`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      false,
      "RESET_PASSWORD"
    );
  },

  //Referal code apply//
 // Referal code apply
checkReferralCode: async (userId, referralCode) => {
  try {
    const url = `${API_BASE_URL}/referral/check?userId=${userId}&referralCode=${referralCode}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // required if backend expects body
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || "Referral check failed",
        data,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Referral check error:", error);
    return {
      success: false,
      error: "Network error",
    };
  }
},


    
  

  // ---------------- Authenticated APIs ----------------
  getUserById: async (id) => {
    console.log("🟢 Get User By ID - Step 1: Fetching");
    return request(
      `${API_BASE_URL}/user/getUserMasterDataById/${id}`,
      {},
      true,
      "GET_USER_BY_ID"
    );
  },

  getProfile: async () => {
    console.log("🟢 Get Profile - Step 1: Fetching");
    return request(`${API_BASE_URL}/user/profile`, {}, true, "GET_PROFILE");
  },

  googleLogin: async (payload) => {
    console.log("🟢 Google Login - Step 1: Sending Data");
    const res = await request(
      `${API_BASE_URL}/google-login`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
      "GOOGLE_LOGIN"
    );

    if (res.success && res.data?.token) {
      console.log("🟢 Google Login - Step 2: Saving Token");
      await AsyncStorage.setItem("authToken", res.data.token);
    } else {
      console.log("🔴 Google Login - Step 2: Failed");
    }

    return res;
  },

  appleLogin: async (payload) => {
    console.log("🟢 Apple Login - Step 1: Sending Data");
    const res = await request(
      `${API_BASE_URL}/apple-login`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false,
      "APPLE_LOGIN"
    );

    if (res.success && res.data?.token) {
      console.log("🟢 Apple Login - Step 2: Saving Token");
      await AsyncStorage.setItem("authToken", res.data.token);
    } else {
      console.log("🔴 Apple Login - Step 2: Failed");
    }

    return res;
  },

  requestGoogleContactUpdate: async (params) => {
    const query = new URLSearchParams({
      userId: params.userId,
      newContactNumber: params.newContactNumber,
      ...(params.usedReferralCode ? { usedReferralCode: params.usedReferralCode } : {}),
      ...(params.hashKey ? { hashKey: params.hashKey } : {}),
    });
    return request(
      `${API_BASE_URL}/request-google-contact-update?${query.toString()}`,
      { method: "POST" },
      false,
      "GOOGLE_CONTACT_UPDATE"
    );
  },

  verifyGoogleContactOtp: async (params) => {
    const query = new URLSearchParams({
      newContactNumber: params.newContactNumber,
      otp: params.otp,
    });
    return request(
      `${API_BASE_URL}/verify-google-contact-otp?${query.toString()}`,
      { method: "POST" },
      false,
      "GOOGLE_CONTACT_VERIFY_OTP"
    );
  },

  debugAuthStatus: async () => {
    console.log("🟢 Debug Auth - Checking Stored Data");
    const token = await AsyncStorage.getItem("authToken");
    const debugData = await AsyncStorage.getItem("debug_user_data");
    return { hasToken: !!token, debugData };
  },

  clearAuthData: async () => {
    console.log("🧹 Clearing Auth Data");
    await AsyncStorage.multiRemove(["authToken", "debug_user_data"]);
    console.log("✅ Cleared");
  },
};

export default userService;
