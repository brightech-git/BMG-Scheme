import { API_BASE_URL } from "../Config/API";
import { Platform } from "react-native";
const OtpVerifyLib = Platform.OS === "android" ? require("react-native-otp-verify") : {};
const { getHash = () => Promise.resolve([]) } = OtpVerifyLib;
import { saveUserData } from "../utils/AsynchStorageHelper";

class OTPService {
  // Get hash key for OTP
  async getHashKey() {
    try {
      const hashArray = await getHash();
      if (Array.isArray(hashArray) && hashArray.length > 0) {
        return hashArray[0];
      }
      throw new Error("Unable to generate hash key");
    } catch (error) {
      console.warn("Failed to get hash:", error);
      throw error;
    }
  }

  // Send OTP for forgot password
  async sendForgotPasswordOTP(contactNumber, hashKey) {
    const payload = { contactNumber, hashKey };

    const response = await fetch(`${API_BASE_URL}/user/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await this._parseResponse(response);

    if (!response.ok) {
      throw new Error(data.error || data.message || "Failed to send OTP");
    }

    return data;
  }

  // Send OTP for contact number update
  async sendContactUpdateOTP(userId, contactNumber) {
    const formData = new FormData();
    if (userId) formData.append("userId", userId);
    formData.append("newContactNumber", contactNumber);

    const response = await fetch(
      `${API_BASE_URL}/request-google-contact-update`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to send OTP");
    }

    return data;
  }

  // Verify OTP for contact update
  async verifyContactOTP(contactNumber, otp) {
    const url = `${API_BASE_URL}/verify-google-contact-otp?newContactNumber=${contactNumber}&otp=${otp}`;

    const response = await fetch(url, { method: "POST" });
    const data = await this._parseResponse(response);

    if (!response.ok) {
      throw new Error(data.error || data.message || "Verification failed");
    }

    // ✅ Save the user data if token exists
    if (data.token) {
      await saveUserData(data);
    }

    return data;
  }

  // Verify OTP for password reset
  async verifyForgotPasswordOTP(contactNumber, otp, newPassword) {
    const params = new URLSearchParams();
    params.append("contactNumber", contactNumber);
    params.append("otp", otp);
    params.append("newPassword", newPassword);

    const response = await fetch(`${API_BASE_URL}/user/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await this._parseResponse(response);

    if (!response.ok) {
      throw new Error(data.error || data.message || "Verification failed");
    }

    return data;
  }

  // Helper method to parse response safely
  async _parseResponse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }
}

class UserService {
  // Load user data based on mode
  async loadUserData(mode, routeParams) {
    if (mode === "forgot") return null;

    try {
      const googleUserFlag = await AsyncStorage.getItem("tempGoogleUser");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (googleUserFlag === "true" && storedUserData) {
        const parsed = JSON.parse(storedUserData);
        return parsed.id;
      } else {
        const storedId = await AsyncStorage.getItem("userId");
        if (storedId) return Number(storedId);
        return routeParams?.userId || null;
      }
    } catch (error) {
      console.warn("Error loading user data:", error);
      return null;
    }
  }

  // Validate contact number
  validateContactNumber(contactNumber) {
    return contactNumber && contactNumber.trim().length === 10;
  }

  // Validate OTP
  validateOTP(otp) {
    return otp && otp.trim().length >= 4;
  }

  // Validate password
  validatePassword(password) {
    return password && password.trim().length >= 6;
  }
}

// Create instances
const otpServiceInstance = new OTPService();
const userServiceInstance = new UserService();

// Export named exports
export { otpServiceInstance as OTPService, userServiceInstance as UserService };

// Export default as an object containing both services
export default {
  OTPService: otpServiceInstance,
  UserService: userServiceInstance,
};
