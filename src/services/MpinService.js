import { getAuthToken } from "../utils/AsynchStorageHelper";
import { API_BASE_URL_2 } from "../Config/API";

/**
 * 🔹 Helper: Get API headers with Bearer token
 */
const getHeaders = async () => {
  try {
    const token = await getAuthToken();

    if (!token) console.warn("⚠️ No auth token found in AsyncStorage!");

    return {
      "Content-Type": "application/json",
      Authorization: token ,
    };
  } catch (error) {
    console.error("❌ Error fetching headers:", error);
    return { "Content-Type": "application/json" };
  }
};

/**
 * 🔹 Helper: Parse API response (text or JSON)
 */
const parseResponse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text; // fallback if plain text
  }
};

/**
 * 🔹 Create MPIN
 * Endpoint: POST /api/v1/mpin/create?mpin=1234
 */
export const createMpinApi = async (mpin) => {
  try {
    const headers = await getHeaders();
    const token = await getAuthToken();

    const response = await fetch(
      `${API_BASE_URL_2}/create?mpin=${encodeURIComponent(mpin)}`,
      { method: "POST", headers }
    );

    const resultText = await response.text();
    let result;
    try {
      result = JSON.parse(resultText);
    } catch {
      result = resultText;
    }

    // ✅ Handle 409 Conflict
    if (response.status === 409) {
      return { alreadyExists: true, message: result?.message || result };
    }

    if (!response.ok) {
      throw new Error(result?.message || result || "Error creating MPIN");
    }

    return result;
  } catch (error) {
    console.error("❌ Create MPIN API Error:", error);
    throw error;
  }
};

/**
 * 🔹 Verify MPIN
 * Endpoint: POST /api/v1/mpin/verify?enteredMpin=1234
 */
export const verifyMpinApi = async (mpin) => {
  try {
    const headers = await getHeaders();
    const response = await fetch(
      `${API_BASE_URL_2}/verify?enteredMpin=${encodeURIComponent(mpin)}`,
      { method: "POST", headers }
    );
    const result = await parseResponse(response);
    return result;
  } catch (error) {
    console.error("❌ Verify MPIN API Error:", error);
    throw error;
  }
};

/**
 * 🔹 Reset MPIN (Existing - without old MPIN)
 * Endpoint: POST /api/v1/mpin/reset?newMpin=1234
 */
export const resetMpinApi = async (newMpin) => {
  try {
    const headers = await getHeaders();

    const response = await fetch(
      `${API_BASE_URL_2}/reset?newMpin=${encodeURIComponent(newMpin)}`,
      { method: "POST", headers }
    );

    const result = await parseResponse(response);

    // Token expired or unauthorized
    if (response.status === 401 || response.status === 403) {
      throw new Error("SESSION_EXPIRED");
    }

    if (!response.ok) {
      const errMsg = typeof result === "string" ? result : (result?.message || "Failed to reset MPIN");
      throw new Error(errMsg);
    }
    return result;
  } catch (error) {
    console.error("❌ Reset MPIN API Error:", error);
    throw error;
  }
};

/**
 * 🔹 Reset MPIN with Old MPIN (NEW SERVICE - FIXED)
 * Endpoint: POST /api/v1/mpin/reset?oldMpin=1709&newMpin=1708
 */
export const resetMpinWithOldApi = async (oldMpin, newMpin) => {
  try {
    const headers = await getHeaders();

    // FIXED: Use the correct endpoint structure
    const url = `${API_BASE_URL_2}/resetMpin?oldMpin=${encodeURIComponent(oldMpin)}&newMpin=${encodeURIComponent(newMpin)}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
    });

    const result = await parseResponse(response);


    // Handle 400 Bad Request - Old MPIN incorrect or same as new
    if (response.status === 400) {
      const errorMsg = typeof result === 'string' ? result :
                      (result?.message || result?.error || "Old MPIN is incorrect or new MPIN cannot be same as old MPIN.");
      throw new Error(errorMsg);
    }

    // Token expired or unauthorized
    if (response.status === 401 || response.status === 403) {
      throw new Error("SESSION_EXPIRED");
    }

    // Handle other error statuses
    if (!response.ok) {
      const errorMsg = typeof result === 'string' ? result : 
                      (result?.message || result?.error || "Failed to reset MPIN");
      throw new Error(errorMsg);
    }

    // Handle success (200 OK)
    if (response.status === 200) {
      const successMsg = typeof result === 'string' ? result : 
                        (result?.message || "MPIN reset successfully.");
      return successMsg;
    }

    return result;

  } catch (error) {
    console.error("❌ Reset MPIN API Error:", error);
    throw error;
  }
};

/**
 * 🔹 Increment Failed Attempts
 * Endpoint: POST /api/v1/mpin/increment-failed-attempts?contactNumber=XXXXXXXXXX
 */
export const incrementFailedAttemptsApi = async (contactNumber) => {
  try {
    const headers = await getHeaders();
    console.error("📤 Increment Failed Attempts Headers:", headers);

    const response = await fetch(
      `${API_BASE_URL_2}/increment-failed-attempts?contactNumber=${encodeURIComponent(contactNumber)}`,
      { method: "POST", headers }
    );

    const result = await parseResponse(response);
    console.error("📩 Increment Failed Attempts Response:", result);

    if (!response.ok) throw new Error(result?.message || result || "Failed to increment attempts");
    return result;
  } catch (error) {
    console.error("❌ Increment Failed Attempts API Error:", error);
    throw error;
  }
};

/**
 * 🔹 Reset Failed Attempts
 * Endpoint: POST /api/v1/mpin/reset-failed-attempts?contactNumber=XXXXXXXXXX
 */
export const resetFailedAttemptsApi = async (contactNumber) => {
  try {
    const headers = await getHeaders();
    console.error("📤 Reset Failed Attempts Headers:", headers);

    const response = await fetch(
      `${API_BASE_URL_2}/reset-failed-attempts?contactNumber=${encodeURIComponent(contactNumber)}`,
      { method: "POST", headers }
    );

    const result = await parseResponse(response);
    console.error("📩 Reset Failed Attempts Response:", result);

    if (!response.ok) throw new Error(result?.message || result || "Failed to reset attempts");
    return result;
  } catch (error) {
    console.error("❌ Reset Failed Attempts API Error:", error);
    throw error;
  }
};