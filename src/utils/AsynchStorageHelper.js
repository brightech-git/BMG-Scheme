// utils/AsyncStorageHelper.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key constants for consistency
const STORAGE_KEYS = {
  USER_DATA: "userData",
  AUTH_TOKEN: "authToken",
  USER_ID: "userId",
  USER_EMAIL: "userEmail",
  USERNAME: "username",
  USER_PHONE_NUMBER: "userPhoneNumber", // ✅ ADD THIS
  IS_LOGGED_IN: "isLoggedIn",
};


/**
 * Save user data with guaranteed token preservation
 */
export const saveUserData = async (data) => {
  try {
    if (!data) return;

    if (data.token) {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.token);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));

    const promises = [];

    if (data.id) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.USER_ID, String(data.id)));
    }

    if (data.email) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, data.email));
    }

    if (data.username) {
      promises.push(AsyncStorage.setItem(STORAGE_KEYS.USERNAME, data.username));
    }

    // ✅ STORE PHONE NUMBER
    if (data.contactNumber) {
      promises.push(
        AsyncStorage.setItem(
          STORAGE_KEYS.USER_PHONE_NUMBER,
          String(data.contactNumber)
        )
      );
    }

    promises.push(AsyncStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, "true"));

    await Promise.all(promises);

    return data;
  } catch (error) {
    console.error("❌ Error saving user data:", error);
    throw error;
  }
};
export const getUserPhoneNumber = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE_NUMBER);
  } catch (error) {
    console.error("❌ Error getting phone number:", error);
    return null;
  }
};


/**
 * Update user data while preserving the token
 */
export const updateUserData = async (updates) => {
  try {
    if (!updates || Object.keys(updates).length === 0) {
      return null;
    }

    // Get existing data
    const existingData = await getUserData();

    if (!existingData) {
      // No existing data, save as new
      return await saveUserData(updates);
    }

    // IMPORTANT: Never allow token to be removed
    const token = existingData.token || await getAuthToken();

    // Merge updates with existing data
    const mergedData = {
      ...existingData,
      ...updates,
      token: token, // Always preserve token
    };

    // Save merged data
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(mergedData));


    return mergedData;
  } catch (error) {
    console.error("❌ Error updating user data:", error);
    throw error;
  }
};

/**
 * Safely update user profile without affecting authentication data
 */
export const updateUserProfile = async (profileData) => {
  try {
    // Define authentication fields that should NEVER be overwritten
    const PROTECTED_FIELDS = ['token', 'referralCode', 'referralLink', 'playStoreLink', 'password', 'usedReferralCode'];

    // Filter out protected fields from profile updates
    const safeProfileData = Object.keys(profileData).reduce((acc, key) => {
      if (!PROTECTED_FIELDS.includes(key)) {
        acc[key] = profileData[key];
      }
      return acc;
    }, {});

    // Update with safe data
    return await updateUserData(safeProfileData);
  } catch (error) {
    console.error("❌ Error updating user profile:", error);
    throw error;
  }
};

/**
 * Get full user data from storage
 */
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("❌ Error getting user data:", error);
    return null;
  }
};

/**
 * Get auth token - checks multiple sources
 */
export const getAuthToken = async () => {
  try {
    // First check dedicated auth token storage
    let token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    if (token) {
      return token;
    }

    // Fallback to user data
    const userData = await getUserData();
    if (userData?.token) {
      // Restore to dedicated storage for consistency
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, userData.token);
      return userData.token;
    }

    return null;
  } catch (error) {
    console.error("❌ Error getting auth token:", error);
    return null;
  }
};

/**
 * Clear all user data
 */
export const clearUserData = async () => {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error("❌ Error clearing user data:", error);
  }
};

/**
 * Single, complete logout used by every logout button in the app.
 * Clears ALL session/user keys, but deliberately PRESERVES:
 *  - "hasSeenOnboarding" (device-level flag, not user data)
 *  - "pendingPayments_v1" and "processedTxn_v1:*" (payment-recovery and
 *    idempotency records — clearing these could lose a paid-but-uncredited
 *    payment or allow a duplicate credit)
 */
export const logoutUser = async () => {
  try {
    const sessionKeys = [
      ...Object.values(STORAGE_KEYS),
      "mpin",
      "isMpinCreated",
      "tempGoogleUser",
      "debug_user_data",
      "userProfilePicture",
      "paymentResponse",
    ];
    await AsyncStorage.multiRemove(sessionKeys);
  } catch (error) {
    console.error("❌ Error during logout cleanup:", error);
  }
};

/**
 * Verify token exists and is valid
 */
export const verifyToken = async () => {
  try {
    const token = await getAuthToken();
    const userData = await getUserData();


    return {
      hasToken: !!token,
      token: token,
      userData: userData
    };
  } catch (error) {
    console.error("❌ Error verifying token:", error);
    return { hasToken: false, token: null, userData: null };
  }
};

export const updateAuthToken = async (token) => {
  try {
    if (!token) {
      console.warn("⚠️ No token provided for restoration");
      return false;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

    // Also ensure it's in user data
    const userData = await getUserData();
    if (userData) {
      userData.token = token;
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    }

    return true;
  } catch (error) {
    console.error("❌ Error restoring token:", error);
    return false;
  }
};

