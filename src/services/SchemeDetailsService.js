import { API_BASE_URL_OLD } from "../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getPhoneDetails = async (userPhoneNumber) => {

  try {

    const response = await fetch(
      `${API_BASE_URL_OLD}/account/phone_details?phoneNo=${encodeURIComponent(
        userPhoneNumber
      )}`,
      {
        method: "GET",
        headers: {

          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error fetching phone details:", error);
    throw error;
  }
};
