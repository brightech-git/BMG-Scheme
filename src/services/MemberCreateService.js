// services/MemberCreateService.js
// Single source of truth for building and submitting the /member/create
// request. Used by the join flow (AddNewMember) AND by payment recovery,
// so an app crash after a successful payment can still complete enrollment
// with exactly the same payload.

import { API_BASE_URL_OLD } from "../Config/API";
import { fetchWithTimeout } from "../utils/PaymentUtils";

const generateCashPaymentDetails = () => {
  const cardNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  const rtnNumber = Math.floor(100000 + Math.random() * 900000).toString();
  return { cardNumber, rtnReason: `CASH-${rtnNumber}` };
};

/**
 * Build the full /member/create request body.
 * Throws if mandatory data (name, mobile, Aadhaar, DOB, regNo, groupCode) is missing.
 */
export const buildMemberCreateBody = ({
  memberData,
  numericSchemeId,
  groupCode,
  regNo,
  schemeFormData,
  referralCode = "",
  paymentResponse = null,
  cashPayment = false,
}) => {
  if (!memberData) throw new Error("No member data available");

  if (!memberData.pName || memberData.pName.trim() === "") {
    throw new Error("Member name is required");
  }
  if (!memberData.mobile || memberData.mobile.length < 10) {
    throw new Error("Valid mobile number is required");
  }
  if (!memberData.aadharNumber || memberData.aadharNumber.replace(/\s/g, "").length < 12) {
    throw new Error("Valid Aadhaar number is required");
  }
  if (!memberData.dateOfBirth) {
    throw new Error("Date of Birth is required");
  }
  if (!regNo) {
    throw new Error("No registration number available for this scheme. Please try again.");
  }
  if (!groupCode) {
    throw new Error("No group code available for this scheme. Please try again.");
  }

  const nowDateTime = new Date().toISOString().slice(0, 10) + " 00:00:00";

  const newMember = {
    title: memberData.title || "Mr",
    initial:
      memberData.initial ||
      (memberData.pName ? memberData.pName.charAt(0).toUpperCase() : ""),
    pName: memberData.pName || "",
    sName: memberData.sName || "",

    doorNo: memberData.doorNo || "",
    address1: memberData.address1 || "",
    address2: memberData.address2 || "",
    area: memberData.area || "",
    city: memberData.city || "",
    state: memberData.selectedState || memberData.state || "",
    country: "India",
    pinCode: memberData.pincode || "",

    mobile: memberData.mobile || "",
    mobile2: memberData.mobile2 || "",

    email: memberData.email || "",

    nomeni: memberData.nomeni || "",
    nomineeMobile: memberData.mobile2 || memberData.mobile || "",
    nomineeRelationship: memberData.nomineeRelationship || "Spouse",
    nomAddr1: memberData.nomAddr1 || memberData.address1 || "",
    nomAddr2: memberData.nomAddr2 || memberData.address2 || "",
    nomCity: memberData.nomCity || memberData.city || "",
    nomState: memberData.nomState || memberData.state || "",
    nomPincode: memberData.nomPincode || memberData.pincode || "",
    nomCountry: memberData.nomCountry || "India",

    nomineeName: memberData.nomineeName || memberData.nomeni || "",
    nomineeDOB: memberData.nomineeDOB || "",
    nomineeGender: memberData.nomineeGender || "",
    nomineeCareOf: memberData.nomineeCareOf || "",
    nomineeYearOfBirth: memberData.nomineeYearOfBirth || "",

    idProof: "Aadhaar",
    idProofNo: (memberData.aadharNumber || "").replace(/\s/g, ""),
    aadhaarMasked: memberData.aadhaarMasked || "XXXX-XXXX-XXXX",
    panNumber: memberData.panNumber || "",

    dob: memberData.dateOfBirth || "",
    anniversaryDate: memberData.anniversaryDate
      ? `${memberData.anniversaryDate} 00:00:00`
      : "",
    maritalStatus: memberData.maritalStatus || "",

    mobileVerified:
      memberData.mobileVerified !== undefined ? memberData.mobileVerified : true,
    aadhaarVerified:
      memberData.aadhaarVerified !== undefined ? memberData.aadhaarVerified : true,
    nomineeMobileVerified:
      memberData.nomineeMobileVerified !== undefined
        ? memberData.nomineeMobileVerified
        : !!memberData.mobile2,
    nomineeAadhaarVerified:
      memberData.nomineeAadhaarVerified !== undefined
        ? memberData.nomineeAadhaarVerified
        : false,

    upDateTime: nowDateTime,
    userId: "999",
    appVer: "WEB",
  };

  const createSchemeSummary = {
    schemeId: numericSchemeId,
    groupCode: groupCode,
    regNo: regNo,
    joinDate: nowDateTime,
    upDateTime2: nowDateTime,
    openingDate: nowDateTime,
    userId2: "999",
  };

  const schemeCollectInsert = {
    amount: Number(schemeFormData.amount),
    modePay: schemeFormData.modePay, // "C" for cash, "O" for online
    accCode: "1",
    chqBankCode: "1",
    chqCardNo: "",
    chqBranch: "",
    chkBank: "",
    chqRtnReason: "",
  };

  if (cashPayment) {
    const { cardNumber, rtnReason } = generateCashPaymentDetails();
    schemeCollectInsert.chqCardNo = cardNumber;
    schemeCollectInsert.chqBranch = "Received";
    schemeCollectInsert.chkBank = "CASH";
    schemeCollectInsert.chqRtnReason = rtnReason;
  } else if (paymentResponse?.payphiResponse) {
    const resp = paymentResponse.payphiResponse;
    schemeCollectInsert.chqCardNo = resp?.txnID || "N/A";
    schemeCollectInsert.chqBranch = resp?.paymentSubInstType || "N/A";
    schemeCollectInsert.chkBank = resp?.paymentMode || "N/A";
    schemeCollectInsert.chqRtnReason = resp?.merchantTxnNo || "N/A";
  }

  return {
    newMember,
    createSchemeSummary,
    schemeCollectInsert,
    referralCode: referralCode || "",
  };
};

/**
 * Submit the member creation request to the backend.
 * Throws on HTTP or parse errors.
 */
export const createMember = async (requestBody) => {
  const response = await fetchWithTimeout(
    `${API_BASE_URL_OLD}/member/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    },
    45000
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${responseText}`);
  }

  return JSON.parse(responseText);
};
