// services/MemberCreateService.js
// Single source of truth for building and submitting the /member/create
// request. Used by the join flow (AddNewMember) AND by payment recovery,
// so an app crash after a successful payment can still complete enrollment
// with exactly the same payload.

import { API_BASE_URL_OLD } from "../Config/API";
import { fetchWithTimeout } from "../utils/PaymentUtils";

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
  const aadhaarValue = memberData.idProofNo || memberData.aadharNumber || "";
  if (!aadhaarValue || aadhaarValue.replace(/[\s-X]/g, "").length < 4) {
    throw new Error("Valid Aadhaar number is required");
  }
  if (!memberData.dateOfBirth) {
    throw new Error("Date of Birth is required");
  }

  const nowDateTime = new Date().toISOString().slice(0, 10) + " 00:00:00";

  const newMember = {
    title: memberData.title || "Mr",
    initial: memberData.initial || (memberData.pName ? memberData.pName.charAt(0).toUpperCase() : ""),
    pName: memberData.pName || "",
    sName: memberData.sName || "",

    doorNo: memberData.doorNo || "",
    address1: memberData.address1 || "",
    address2: memberData.address2 || "",
    area: memberData.area || "",
    city: memberData.city || "",
    state: memberData.state || "",
    country: "India",
    pinCode: memberData.pinCode || memberData.pincode || "",

    mobile: memberData.mobile || "",
    mobile2: memberData.mobile2 || "",
    email: memberData.email || "",

    idProof: "Aadhaar",
    idProofNo: (memberData.idProofNo || memberData.aadharNumber || "").replace(/[\s-]/g, ""),
    aadhaarMasked: memberData.aadhaarMasked || memberData.maskedAadhaar || "",
    panno: memberData.panno || memberData.panNumber || "",

    dob: memberData.dateOfBirth || "",
    anniversaryDate: memberData.anniversaryDate ? `${memberData.anniversaryDate} 00:00:00` : "",

    nomeni: memberData.nomeni || "",
    nomineeMobile: memberData.mobile2 || "",
    nomineeRelationship: memberData.nomineeRelationship || "Spouse",
    nomAddr1: memberData.nomAddr1 || "",
    nomAddr2: memberData.nomAddr2 || "",
    nomCity: memberData.nomCity || "",
    nomState: memberData.nomState || "",
    nomPincode: memberData.nomPincode || "",
    nomCountry: memberData.nomCountry || "India",

    nomineeMobileVerified: memberData.nomineeMobileVerified !== undefined ? memberData.nomineeMobileVerified : !!memberData.mobile2,
    nomineeAadhaarVerified: memberData.nomineeAadhaarVerified !== undefined ? memberData.nomineeAadhaarVerified : false,

    upDateTime: nowDateTime,
    userId: "999",
    appVer: "WEB",
  };

  const createSchemeSummary = {
    schemeId: numericSchemeId,
    groupCode: groupCode,
    // joinDate: nowDateTime,
    // upDateTime2: nowDateTime,
    // openingDate: nowDateTime,
    // userId: "9999",
    iEmp: 25,
  };

  const schemeCollectInsert = {
    amount: Number(schemeFormData.amount),
    // modePay: schemeFormData.modePay,
    // accCode: schemeFormData.accCode || "",
  };

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
