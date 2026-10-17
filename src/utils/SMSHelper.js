import smsService from "../services/SMSService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Send daily reminder for AmountScheme if within 7 days of due
export async function checkAndSendDueSMS(product, user) {
  if (!product || !product.nextDueDate) return;

  const { nextDueDate, schemeSummary } = product;
  const schemeName = schemeSummary?.schemeName || "Your Scheme";
  const amountDue = product.schemaSummaryTransBalance?.instAmount || 0;

  const today = new Date();
  const dueDate = new Date(nextDueDate);

  // Difference in days
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 7 || diffDays < 0) return; // Not within 7 days before due date

  // Use AsyncStorage to track if SMS sent today
  const smsKey = `smsSent-${product.regNo}-${nextDueDate}`;
  const lastSent = await AsyncStorage.getItem(smsKey);

  if (lastSent === today.toDateString()) return; // Already sent today

  // Send SMS
  try {
    await smsService.sendPaymentDueSMS(
      user.mobileNumber,
      user.name,
      schemeName,
      amountDue,
      dueDate.toLocaleString("default", { month: "short", year: "numeric" }).toUpperCase(),
      dueDate.toLocaleDateString("en-GB").replace(/\//g, "-")
    );

    // Mark SMS as sent today
    await AsyncStorage.setItem(smsKey, today.toDateString());
  } catch (err) {
    console.error("❌ Failed to send due SMS:", err.message);
  }
}
