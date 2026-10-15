// Keep payment amounts/order references visible; redact credentials and personal data.
const privateField = /authorization|token|signature|secret|password|aadhar|aadhaar|idproofno|pan(number)?|mobile|contact|email|pname|sname|surname|^name$|address|doorno|dob|dateofbirth|nominee|nomeni/i;

export const sanitizePaymentLog = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    // processResult may contain a Java Map string with personal information.
    return value.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/((?:mobile|contact|email|pName|sName|idProofNo|panNumber|dob|address\d*)\s*[=:]\s*)[^,}\n]+/gi, "$1[REDACTED]");
  }
  if (typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => sanitizePaymentLog(item, seen));
  const result = {};
  if (value instanceof Error || (typeof value.message === "string" && typeof value.stack === "string")) {
    result.name = value.name;
    result.message = sanitizePaymentLog(value.message, seen);
    result.stack = sanitizePaymentLog(value.stack, seen);
  }
  for (const [key, item] of Object.entries(value)) {
    result[key] = privateField.test(key) ? "[REDACTED]" : sanitizePaymentLog(item, seen);
  }
  return result;
};

export const createPaymentLogger = (flow) => {
  const traceId = `${flow}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return (step, event, details = {}, level = "log") => {
    if (level !== "warn" && level !== "error") return;
    const operation = step.includes("CREATE ORDER") ? "CREATE ORDER"
      : step.includes("VERIFY PAYMENT") ? "VERIFY PAYMENT"
      : step.includes("CHECKOUT") ? "RAZORPAY CHECKOUT" : "PAYMENT API";
    console[level](`[PAYMENT][${traceId}][${operation}] ${event}\n${JSON.stringify(sanitizePaymentLog(details), null, 2)}`);
  };
};
