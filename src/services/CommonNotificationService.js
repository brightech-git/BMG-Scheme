// 📌 Function to send "Join Scheme" notification
import { API_BASE_URL } from "../Config/API";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showMessage } from "react-native-flash-message";

function getISTTimeISO() {
  const now = new Date();

  // IST offset = UTC + 5:30 = 330 minutes
  const istOffset = 330 * 60 * 1000;

  const istTime = new Date(now.getTime() + istOffset);

  return istTime.toISOString().slice(0, 19);
}

export async function sendJoinSchemeNotification(schemeId, amount, schemeName) {
  try {
    const userId = await AsyncStorage.getItem("userId");
    const scheduledTime = getISTTimeISO();


    if (!userId) {
      console.error("User ID not found in AsyncStorage");
      return null;
    }

    // 🍃 Default text + fallback image
    let message = "";
    let imageUrl =
      "https://tse2.mm.bing.net/th/id/OIP.HZcuqG_YpD6NqjorfHWx5wHaHa?w=768&h=768&rs=1&pid=ImgDetMain&o=7&rm=3";

    switch (schemeId) {
      case 1: // Monthly Installment
        message = `You have successfully enrolled in the ${schemeName}. Your monthly installment is ₹${amount}. Pay anytime before the due date each month.`;
        imageUrl =
          "https://www.pngall.com/wp-content/uploads/5/Gold-Jewels-PNG-Free-Image.png";
        break;

      case 2: // Multiple Payment
        message = `You have successfully enrolled in the ${schemeName}. You can make multiple flexible payments totaling ₹${amount}.`;
        imageUrl =
          "https://tse1.mm.bing.net/th/id/OIP.f67hGJz0sNHqCWwTGcv6DgHaHa?w=600&h=600&rs=1&pid=ImgDetMain&o=7&rm=3";
        break;

      case 3: // Fixed Deposit
        message = `You have successfully enrolled in the ${schemeName}. Your one-time deposit of ₹${amount} is now active.`;
        imageUrl =
          "https://media.istockphoto.com/photos/indian-jewellery-picture-id486592060?k=20&m=486592060&s=612x612&w=0&h=6_VWcfgKq6TOf-d9W2CJ5YnHFiCbLDizjNefcUAnMcU=";
        break;

      default:
        message = `You have successfully joined the ${schemeName} scheme. Amount: ₹${amount}.`;
        imageUrl =
          "https://tse1.mm.bing.net/th/id/OIP.f67hGJz0sNHqCWwTGcv6DgHaHa?w=600&h=600&rs=1&pid=ImgDetMain&o=7&rm=3";
    }

    const payload = {
      userId: userId.toString(),
      title: `${schemeName} Joined`,
      message,
      imageUrl,
      scheduledTime,
    };

    const response = await fetch(`${API_BASE_URL}/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // ✅ SAFE PARSING
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text }; // normalize text response
    }

    if (!response.ok) {
      console.error("Notification API error:", data);

      showMessage({
        message: "Failed to send notification",
        description: data?.message || "Please try again",
        type: "danger",
        duration: 3000,
      });

      return null;
    }


    // 🍀 Toast on success
    showMessage({
      message: `${schemeName} Joined`,
      description: message,
      type: "success",
      duration: 5000,
    });

    return data;
  } catch (error) {
    console.error("Error sending notification:", error);

    showMessage({
      message: "Error sending notification",
      description: error.message,
      type: "danger",
      duration: 3000,
    });

    return null;
  }
}
