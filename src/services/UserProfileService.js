// memberPhotoService.js
import { API_BASE_URL } from "../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";

const memberPhotoService = {
  uploadPhoto: async (image) => {
    try {
      const memberId = await AsyncStorage.getItem("userId");
      if (!memberId) throw new Error("User ID not found in AsyncStorage");

      const endpoint = `${API_BASE_URL}/photo/${memberId}`;

      // Ensure the URI starts with file:// (important for Android)
      const uri = image.uri.startsWith("file://")
        ? image.uri
        : "file://" + image.uri;

      // Prepare FormData
      const formData = new FormData();
      formData.append("photo", {
        uri,
        name: image.fileName || `profile_${Date.now()}.jpg`,
        type: image.type || "image/jpeg",
      });

      // Debug log to compare with Postman

      const headers = {
        Accept: "application/json",
        // DO NOT set 'Content-Type' for FormData
      };

      const response = await fetch(endpoint, {
        method: "PUT",
        headers,
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      // Handle backend error key properly
      if (!response.ok) {
        console.error("Backend returned error:", data);
        throw new Error(
          data.message ||
            data.error ||
            `Upload failed with status ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("Upload Photo Error:", error);
      throw error;
    }
  },

  deletePhoto: async () => {
    try {
      const memberId = await AsyncStorage.getItem("userId");
      if (!memberId) throw new Error("User ID not found in AsyncStorage");

      const endpoint = `${API_BASE_URL}/photo/${memberId}`;

      const headers = {
        Accept: "application/json",
      };

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      if (!response.ok) {
        throw new Error(
          data.message || `Delete failed with status ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error("Delete Photo Error:", error);
      throw error;
    }
  },
};

export default memberPhotoService;
