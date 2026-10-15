import { API_BASE_URL } from "../Config/API";

const smsService = {
  /**
   * Send Welcome SMS
   */
  async sendWelcomeSMS(
    mobileNumber,
    name,
    schemeName,
    amount,
    date,
    company = "BMG JEWELLERS PVT LTD"
  ) {
    const payload = {
      templateCode: "BMG_PLAN_WELCOME",
      mobileNumber,
      variables: [name, schemeName, amount, date, company],
    };

    return await this.sendSMSRequest(payload);
  },

  /**
   * Send Payment Success SMS
   */
  async sendPaymentSuccessSMS(
    mobileNumber,
    name,
    schemeName,
    amount,
    monthYear,
    paidDate,
    nextDueDate
  ) {
    const payload = {
      templateCode: "BMG_PAYMENT_RECEIVED",
      mobileNumber,
      variables: [name, schemeName, amount, monthYear, paidDate, nextDueDate],
    };

    return await this.sendSMSRequest(payload);
  },

  /**
   * Send Payment Due Reminder SMS
   * @param {string} mobileNumber - Recipient's mobile number
   * @param {string} name - Customer name
   * @param {string} schemeName - Scheme name
   * @param {string} amount - Payment amount
   * @param {string} monthYear - Month and year (e.g. "NOV-2025")
   * @param {string} dueDate - Due date (e.g. "10-NOV-2025")
   */
  async sendPaymentDueSMS(
    mobileNumber,
    name,
    schemeName,
    amount,
    monthYear,
    dueDate
  ) {
    const payload = {
      templateCode: "BMG_PAYMENT_DUE",
      mobileNumber,
      variables: [name, schemeName, amount, monthYear, dueDate],
    };

    return await this.sendSMSRequest(payload);
  },

  /**
   * Core SMS request handler with retries
   */
  async sendSMSRequest(payload) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {

        const response = await fetch(`${API_BASE_URL}/sms/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️ Attempt ${attempt} failed with status ${response.status}:`, errorText);
          lastError = new Error(`Server responded with status ${response.status}`);
        } else {
          // Try JSON, fallback to plain text
          let data;
          const text = await response.text();
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }

          return data;
        }
      } catch (error) {
        console.error(`❌ Network error on attempt ${attempt}:`, error.message);
        lastError = error;
      }

      if (attempt < 3) await delay(1500);
    }

    console.error("❌ Failed to send SMS after 3 attempts:", lastError?.message || lastError);
    throw lastError;
  },
};

export default smsService;
