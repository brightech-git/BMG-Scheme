import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPendingPayments, clearPendingPayment } from "../utils/PaymentUtils";
import { verifyRazorpayPayment, isRazorpayCreditComplete } from "./RazorpayService";
let recoveryInFlight = false;
// Backend owns credits and enrollment; recovery only replays signature verification.
export const recoverPendingPayments = async () => {

  if (recoveryInFlight) {
    return { recovered: [], stillPending: 0 };
  }
  recoveryInFlight = true;
  const recovered = [];
  let stillPending = 0;
  try {
    const token = await AsyncStorage.getItem("authToken");
    const records = await getPendingPayments();
    for (const record of records) {
      // Without a signature, recovery relies on the backend Razorpay webhook.
      if (!token || record.gateway !== "razorpay" || !record.payment) {
        stillPending++; continue;
      }
      try {
        const result = await verifyRazorpayPayment(record.payment, token);
        if (result.code === "PAYMENT_SUCCESS" && isRazorpayCreditComplete(result)) {
          await clearPendingPayment(record.merchantTxnNo);
          recovered.push({ merchantTxnNo: record.merchantTxnNo, type: record.type,
            amount: record.payload?.orderDetails?.amount });
        } else {
          stillPending++;
        }
      } catch (error) {
        stillPending++;
      }
    }
  } catch (error) {
    throw error;
  } finally { recoveryInFlight = false; }
  return { recovered, stillPending };
};
