// utils/PaymentUtils.js
// Shared payment helpers: strict gateway URL classification, strict status
// interpretation, fetch timeouts, idempotency guards, and pending-payment
// persistence for crash/close recovery.
//
// IMPORTANT: the backend must remain the source of truth for payment status.
// These helpers only make the app's *reading* of the backend strict and safe.

import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_PAYMENTS_KEY = "pendingPayments_v1";
const PROCESSED_TXN_PREFIX = "processedTxn_v1:";

// ---------------------------------------------------------------------------
// fetch with timeout (default 30s). Never lets the UI hang forever.
// ---------------------------------------------------------------------------
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error("Request timed out. Please check your connection and try again.");
      e.isTimeout = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

// ---------------------------------------------------------------------------
// Strict gateway redirect classification.
// Matches exact, known path segments only — never bare substrings like
// "/success" which can appear inside unrelated gateway URLs.
// Returns: "success" | "failure" | "cancel" | null
// ---------------------------------------------------------------------------
export const classifyGatewayUrl = (url) => {
  if (!url || typeof url !== "string") return null;

  let pathname = "";
  try {
    pathname = new URL(url).pathname.toLowerCase().replace(/\/+$/, "");
  } catch {
    return null; // not an absolute URL — let the WebView load it
  }

  const endsWithAny = (suffixes) => suffixes.some((s) => pathname.endsWith(s));

  if (endsWithAny(["/payment-success", "/payment/success"])) return "success";
  if (endsWithAny(["/payment-failure", "/payment/failure", "/payment-failed"])) return "failure";
  if (
    endsWithAny([
      "/payment-cancel",
      "/payment-cancelled",
      "/payment/cancel",
      "/payment/cancelled",
    ])
  )
    return "cancel";

  return null;
};

// ---------------------------------------------------------------------------
// Strict interpretation of the /payment/status response.
// Whitelist only — no message-substring heuristics ("transaction unsuccessful"
// must NEVER be treated as success).
// Returns: "PAID" | "CANCELLED" | "FAILED" | "PENDING"
// ---------------------------------------------------------------------------
export const interpretPaymentStatus = (data) => {
  if (!data || typeof data !== "object") return "PENDING";
  const pay = data.payphiResponse || {};

  const orderStatus = String(data.orderStatus || data.status || "").toUpperCase();
  const txnStatus = String(pay.txnStatus || "").toUpperCase();
  const respCode = String(pay.txnResponseCode || "");

  if (orderStatus === "CANCELLED" || txnStatus === "CANC" || txnStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (orderStatus === "PAID" || txnStatus === "SUC" || txnStatus === "SUCCESS") {
    return "PAID";
  }

  // PayPhi pending/awaiting codes
  if (orderStatus === "PENDING" || txnStatus === "PEN" || txnStatus === "PENDING") {
    return "PENDING";
  }

  if (
    orderStatus === "FAILED" ||
    orderStatus === "FAILURE" ||
    txnStatus === "FAIL" ||
    txnStatus === "FAILED" ||
    (respCode && !["000", "00", "0000"].includes(respCode))
  ) {
    return "FAILED";
  }

  // Unknown → treat as pending (never enroll on ambiguity)
  return "PENDING";
};

// ---------------------------------------------------------------------------
// Idempotency guard: has this transaction already produced its enrollment /
// collection insert? Prevents duplicate inserts from redirect races, retries,
// and recovery runs.
// ---------------------------------------------------------------------------
export const wasTxnProcessed = async (merchantTxnNo) => {
  if (!merchantTxnNo) return false;
  try {
    const v = await AsyncStorage.getItem(PROCESSED_TXN_PREFIX + merchantTxnNo);
    return v === "true";
  } catch {
    return false;
  }
};

export const markTxnProcessed = async (merchantTxnNo) => {
  if (!merchantTxnNo) return;
  try {
    await AsyncStorage.setItem(PROCESSED_TXN_PREFIX + merchantTxnNo, "true");
  } catch (e) {
  }
};

// ---------------------------------------------------------------------------
// Pending-payment persistence: saved BEFORE the gateway opens, cleared when
// the flow reaches a terminal state. If the app is closed mid-payment, the
// record allows recovery on next launch.
// record = { merchantTxnNo, type: "installment"|"join", createdAt, payload }
// ---------------------------------------------------------------------------
export const savePendingPayment = async (record) => {
  if (!record?.merchantTxnNo) return;
  try {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => r.merchantTxnNo !== record.merchantTxnNo);
    filtered.push({ ...record, createdAt: record.createdAt || new Date().toISOString() });
    await AsyncStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(filtered));
  } catch (e) {
  }
};

export const getPendingPayments = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Ignore records older than 48h (gateway sessions are long dead)
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return list.filter((r) => new Date(r.createdAt).getTime() > cutoff);
  } catch {
    return [];
  }
};

export const clearPendingPayment = async (merchantTxnNo) => {
  if (!merchantTxnNo) return;
  try {
    const raw = await AsyncStorage.getItem(PENDING_PAYMENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(
      PENDING_PAYMENTS_KEY,
      JSON.stringify(list.filter((r) => r.merchantTxnNo !== merchantTxnNo))
    );
  } catch (e) {
  }
};
