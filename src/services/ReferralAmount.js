import { API_BASE_URL_OLD } from "../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
/**
 * Get Referral Scheme List
 * @returns {Promise<Array>}
 */
export const fetchReferralSchemes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL_OLD}/account/referral-scheme`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Referral Scheme API Error:", error);
    throw error;
  }
};




// --------------------------------------------------------
// 1️⃣ Get Referral Details with Enhanced Structure
// --------------------------------------------------------
export const getReferralDetails = async () => {

  const userId = await AsyncStorage.getItem("userId");

  try {
    const url = `${API_BASE_URL_OLD}/account/referrals/${userId}`;

    const response = await fetch(url);

    if (!response.ok) {
      return { 
        success: false, 
        message: "Network error occurred",
        userReferralData: null,
        earnedHistory: []
      };
    }

    const data = await response.json();

    // Check if data is an array and has at least one item
    if (!Array.isArray(data) || data.length === 0) {
      return {
        success: true,
        userReferralData: null,
        earnedHistory: [],
        totalEarnings: 0,
        totalReferrals: 0
      };
    }

    // First element is user's referral data
    const userReferralData = data[0];

    // Subsequent elements are earned history (if any)
    const earnedHistory = data.slice(1);

    // Calculate totals
    const totalEarnings = userReferralData?.totalCreditedAmount || 0;
    const totalReferrals = earnedHistory.length;

    return {
      success: true,
      userReferralData,
      earnedHistory,
      totalEarnings,
      totalReferrals,
      rawData: data // Keep raw data for debugging
    };

  } catch (error) {
    console.error("🔴 STEP 10: Catch error →", error);
    return { 
      success: false, 
      message: "Something went wrong",
      userReferralData: null,
      earnedHistory: []
    };
  }
};

// --------------------------------------------------------
// Helper function to format earned history data
// --------------------------------------------------------
export const formatEarnedHistory = (earnedHistory) => {
  if (!Array.isArray(earnedHistory)) return [];

  return earnedHistory.map(item => ({
    id: item.new_member_personal_id,
    name: item.new_member_personal_name,
    mobile: item.new_member_mobile,
    scheme: item.schemeName,
    amount: item.credited_amount,
    reward: item.new_member_reward,
    date: item.created_at,
    schemeId: item.scheme_id,
    referringPersonId: item.referring_personal_id,
    referringPersonName: item.referring_personal_name
  }));
};

// --------------------------------------------------------
// Get formatted referral summary
// --------------------------------------------------------
export const getReferralSummary = async () => {
  const result = await getReferralDetails();

  if (!result.success || !result.userReferralData) {
    return {
      success: false,
      message: result.message || "No referral data found",
      summary: null
    };
  }

  const { userReferralData, earnedHistory, totalEarnings, totalReferrals } = result;

  const summary = {
    // User info
    userId: userReferralData.user_id,
    username: userReferralData.username,
    contactNumber: userReferralData.contact_number,

    // Referral info
    referralCode: userReferralData.referral_code,
    referralLink: userReferralData.referralLink,
    playStoreLink: userReferralData.playStoreLink,

    // Financial info
    walletBalance: userReferralData.wallet_balance,
    totalEarnings: totalEarnings,
    totalNewMemberReward: userReferralData.totalNewMemberReward,

    // Stats
    totalReferrals: totalReferrals,
    recentReferrals: formatEarnedHistory(earnedHistory).slice(0, 10), // Last 10

    // Raw data (for reference)
    rawUserData: userReferralData,
    rawHistory: earnedHistory
  };

  return {
    success: true,
    summary,
    formattedHistory: formatEarnedHistory(earnedHistory)
  };
};