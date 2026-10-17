// src/services/schemeService.js
import { API_BASE_URL } from "../Config/API";
import { fetchWithTimeout } from "../utils/PaymentUtils";

export const getAppStatus = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/app-control/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }, 10000);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    {} // ✅ Log first
    return data; // ✅ Then return

    /*
      Example Response:
      {
        enabled: false,
        message: "We are launching soon 🚀"
      }
    */

  } catch (error) {
    console.error("Error fetching app status:", error);
    throw error;
  }
};
