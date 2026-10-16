import { API_BASE_URL_OLD } from "../Config/API";



/**
 * Fetch all schemes using fetch()
 * GET /scheme
 */
export const getAllSchemes = async () => {
  try {
    const response = await fetch(`${API_BASE_URL_OLD}/member/scheme`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching schemes:", error);
    throw error;
  }
};
