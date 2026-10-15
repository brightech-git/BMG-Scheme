

import { API_BASE_URL } from "../Config/API";

export const bannerService = {
  async getBanners() {
    try {
      const response = await fetch(`${API_BASE_URL}/schemebanner/all`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const banners = data.banners || [];


      return banners.map((banner) => ({
        id: banner.BannerId,
        title: banner.title || "",
        image_path: banner.image_path,
      }));
    } catch (error) {
      console.error("Error fetching scheme banners:", error);
      throw error;
    }
  },
};