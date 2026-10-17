import { API_BASE_URL } from "../Config/API";

export async function getAppBanners() {
  try {
    const response = await fetch(`${API_BASE_URL}/schemeslider/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch banners");
    }

    const json = await response.json();

    // NEW API returns → { sliders: [ ... ] }

    return json.sliders || [];
  } catch (error) {
    console.error("Banner API Error:", error);
    return []; // return empty to avoid crashes
  }
}
