import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, TurboModuleRegistry } from "react-native";
import { API_BASE_URL } from "../Config/API";
import { fetchWithTimeout, savePendingPayment, clearPendingPayment } from "../utils/PaymentUtils";
import { createPaymentLogger } from "../utils/PaymentLogger";

const authorization = (token) => {
  if (!token) throw new Error("Please login to continue with payment.");
  return `Bearer ${token.replace(/^Bearer\s+/i, "").trim()}`;
};

const request = async (path, body, token, log = createPaymentLogger("api"), step = "API") => {
  const started = Date.now();
  const url = `${API_BASE_URL}/razorpay/${path}`;
  log(step, "REQUEST", { url, method: "POST",
    headers: { Authorization: "Bearer <login-token>", "Content-Type": "application/json" }, payload: body });
  try {
  const response = await fetchWithTimeout(`${API_BASE_URL}/razorpay/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization(token) },
    body: JSON.stringify(body),
  }, 45000);
  const raw = await response.text();
  let result;
  try { result = JSON.parse(raw); } catch (cause) {
    log(step, "INVALID JSON RESPONSE", { responseBody: raw, error: cause }, "error");
    throw new Error(`Payment API returned invalid JSON (HTTP ${response.status}).`);
  }
  log(step, "RESPONSE BODY", { status: response.status, body: result });
  if (!response.ok || result.success !== true) {
    const error = new Error(result.message || `Payment request failed (${response.status})`);
    error.code = result.code;
    throw error;
  }
  return result;
  } catch (error) {
    log(step, "REQUEST FAILED", { url, elapsedMs: Date.now() - started, error }, "error");
    throw error;
  }
};

// PAYMENT_SUCCESS confirms capture, but processResult separately confirms credit.
export const isRazorpayCreditComplete = (result) => {
  const value = String(result?.data?.processResult || "");
  return value.length > 0 && !/^(ERROR|PROCESS_FAILED|PROCESS_ERROR|TEMP_NOT_FOUND|NO_TEMP_DATA|ALREADY_PROCESSED|false|null)/i.test(value);
};

export const verifyRazorpayPayment = (payment, token, log = createPaymentLogger("verification")) =>
  request("verify-payment", payment, token, log, "07 VERIFY PAYMENT");

export const normalizeRazorpayError = (error) => {
  let parsed = {};
  try {
    parsed = typeof error?.description === "string" ? JSON.parse(error.description) : error?.description || {};
  } catch { /* The SDK can also return a plain description. */ }
  const detail = parsed?.error || error?.error || parsed || {};
  const reason = String(detail.reason || "").toLowerCase();
  // Installed Android Checkout.PAYMENT_CANCELED = 0; NETWORK_ERROR = 2.
  const cancelled = error?.code === 0 || error?.code === "0" ||
    ["payment_cancelled", "payment_canceled", "user_cancelled", "user_canceled"].includes(reason);
  const description = [detail.description, parsed?.error ? null : error?.description, error?.message]
    .find(value => typeof value === "string" && value.trim() &&
      !["undefined", "null"].includes(value.trim().toLowerCase()) && !value.trim().startsWith("{"));
  return {
    cancelled,
    code: error?.code,
    reason,
    gatewayCode: detail.code,
    message: cancelled ? "Checkout was closed. Check payment history if money was deducted."
      : description || (error?.code === 2 || error?.code === "2"
        ? "A network error interrupted checkout. Check your connection and payment history before retrying."
        : "Payment was not completed. Check payment history if money was deducted."),
  };
};

export const payWithRazorpay = async ({ token, newJoin, body, orderDetails, productData }) => {
  const log = createPaymentLogger(newJoin ? "JOIN" : "INSTALLMENT");
  let currentStep = "01 START";
  try {
  currentStep = "02 SDK CHECK";
  const nativeCheckout = TurboModuleRegistry?.get?.("RNRazorpayCheckout") || NativeModules?.RNRazorpayCheckout;
  if (!nativeCheckout || typeof nativeCheckout.open !== "function") {
    throw new Error("Razorpay native module is missing from this app. Rebuild and install Android with npx.cmd expo run:android. Restarting Metro alone cannot add the native SDK.");
  }
  let RazorpayCheckout;
  try {
    RazorpayCheckout = require("react-native-razorpay").default;
  } catch {
    throw new Error("Razorpay is unavailable. Install a new development or release build.");
  }
  if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
    throw new Error("Razorpay is unavailable. Install a new development or release build.");
  }
  currentStep = "03 CREATE ORDER";
  const created = await request(`create-order?NEWJOIN=${newJoin ? "true" : "false"}`, body, token, log, currentStep);
  const order = created.data;
  if (!order?.order_id || !order.key || !Number.isFinite(Number(order.amount)) || Number(order.amount) <= 0) {
    throw new Error("The backend returned an invalid Razorpay order.");
  }
  const details = { ...orderDetails, orderId: order.order_id, merchantTxnNo: order.order_id };
  const record = {
    merchantTxnNo: order.order_id, gateway: "razorpay", type: newJoin ? "join" : "installment",
    payload: { orderDetails: details, productData },
  };
  currentStep = "04 SAVE PENDING";
  await savePendingPayment(record);
  let payment;
  try {
    currentStep = "05 CHECKOUT";
    const options = {
      key: order.key, order_id: order.order_id, amount: order.amount,
      currency: order.currency || "INR", name: "BMG Jewellers",
      description: newJoin ? "Scheme enrollment" : "Scheme installment",
      prefill: { name: details.customer?.name || order.name || "", contact: order.contact || details.customer?.contact || "", email: order.email || "" },
      theme: { color: "#8B1A1A" },
    };
    log(currentStep, "OPEN CHECKOUT", options);
    payment = await RazorpayCheckout.open(options);
    log(currentStep, "CHECKOUT SUCCESS CALLBACK", payment);
  } catch (error) {
    const normalized = normalizeRazorpayError(error);
    log(currentStep, normalized.cancelled ? "CHECKOUT CANCELLED" : "CHECKOUT ERROR CALLBACK",
      { error, normalized, pendingRecordRetained: true }, normalized.cancelled ? "log" : "error");
    // Retain the record: dismissal/network errors can race a captured payment.
    const failure = new Error(normalized.message);
    failure.cancelled = normalized.cancelled;
    failure.code = normalized.code;
    failure.reason = normalized.reason;
    failure.gatewayCode = normalized.gatewayCode;
    failure.orderDetails = details;
    throw failure;
  }
  currentStep = "06 CHECKOUT RESPONSE";
  if (payment.razorpay_order_id !== order.order_id || !payment.razorpay_payment_id || !payment.razorpay_signature) {
    throw new Error("Invalid checkout response. Please check your payment history before retrying.");
  }
  await savePendingPayment({ ...record, payment });
  let verified;
  try {
    currentStep = "07 VERIFY PAYMENT";
    verified = await verifyRazorpayPayment(payment, token, log);
  } catch (error) {
    // Never encourage another charge when checkout succeeded but verification failed.
    verified = { success: false, message: error.message, data: {} };
  }
  const creditPending = verified.code !== "PAYMENT_SUCCESS" || !isRazorpayCreditComplete(verified);
  currentStep = "08 CREDIT RESULT";
  if (!creditPending) await clearPendingPayment(order.order_id);
  const paymentStatus = { ...verified, orderStatus: verified.code === "PAYMENT_SUCCESS" ? "PAID" : "PENDING", razorpayResponse: payment };
  try {
    currentStep = "09 CACHE RECEIPT";
    await AsyncStorage.setItem("paymentResponse", JSON.stringify({ ...paymentStatus, orderDetails: details }));
  } catch (error) {
  }
  return { orderDetails: details, paymentStatus, creditPending };
  } catch (error) {
    throw error;
  }
};
