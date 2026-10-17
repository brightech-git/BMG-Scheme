// services/DigiLockerService.js
import { API_BASE_URL } from "../Config/API";

export const AADHAAR_STATUS = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  SUCCESS: 'SUCCESS',
  AUTHENTICATED: 'AUTHENTICATED',
  APPROVED: 'APPROVED',
  FAILURE:'FAILURE'
};

class DigiLockerService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Create DigiLocker verification URL
   */
  async createVerificationUrl(userId, aadhaarNumber) {
    try {
      const verificationId = this.generateVerificationId();

      const requestBody = {
        verification_id: verificationId,
        document_requested: ["AADHAAR"],
        redirect_url: "https://bmgjewellers.com",
        user_flow: "signup",
      };


      const response = await fetch(`${this.baseURL}/digilocker/create-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        const verificationUrl = result.url || 
                               result.verification_url || 
                               result.data?.url;

        if (verificationUrl) {
          return {
            success: true,
            verificationId: verificationId,
            verificationUrl: verificationUrl,
            message: result.message || 'Verification URL created successfully'
          };
        } else {
          throw new Error('Verification URL not found in response');
        }
      } else {
        throw new Error(result.message || result.error || 'Failed to create verification URL');
      }
    } catch (error) {
      console.error('Create verification URL error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create DigiLocker verification URL'
      };
    }
  }

  /**
   * Check verification status
   */
  async checkVerificationStatus(verificationId) {
    try {
      const response = await fetch(
        `${this.baseURL}/digilocker/status?verification_id=${verificationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        const statusData = result.data || result;

        // Check if verification is successful
        const isVerified = statusData.verified || 
                          statusData.status === 'AUTHENTICATED' || 
                          statusData.status === 'APPROVED' || 
                          statusData.status === 'SUCCESS' ||
                          statusData.status === 'VERIFIED';

        return {
          success: true,
          verified: isVerified,
          status: statusData.status || 'PENDING',
          message: result.message || statusData.message,
          verificationId: verificationId
        };
      } else {
        throw new Error(result.message || result.error || 'Failed to check status');
      }
    } catch (error) {
      console.error('Check status error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to check verification status'
      };
    }
  }

  /**
   * Get Aadhaar document data after verification
   */
  async getAadhaarDocument(verificationId) {
    try {
      const response = await fetch(
        `${this.baseURL}/digilocker/document/AADHAAR?verification_id=${verificationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const result = await response.json();
      // Do NOT log the full document — it contains the person's Aadhaar data (PII)

      if (response.ok) {
        return {
          success: true,
          data: result,
          message: result.message || 'Aadhaar document fetched successfully'
        };
      } else {
        throw new Error(result.message || result.error || 'Failed to fetch Aadhaar document');
      }
    } catch (error) {
      console.error('Get Aadhaar document error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch Aadhaar document'
      };
    }
  }

  /**
   * Complete verification flow - Check status and get document
   */
  async completeVerification(verificationId, originalAadhaarNumber) {
    try {
      // Step 1: Check verification status
      const statusResult = await this.checkVerificationStatus(verificationId);

      if (!statusResult.success || !statusResult.verified) {
        return {
          success: false,
          verified: false,
          message: statusResult.message || 'Verification not completed',
          aadhaarStatus: statusResult.status || 'PENDING'
        };
      }

      // Step 2: Get Aadhaar document data
      const documentResult = await this.getAadhaarDocument(verificationId);

      if (!documentResult.success) {
      return {
        success: false,
        verified: false,
        message: documentResult.message || 'Failed to get Aadhaar data',
        aadhaarStatus: 'VERIFIED_NO_DATA'
      };
    }

    const documentData = documentResult.data;

    // Extract data from the document response
    const aadhaarNumber = documentData.uid || originalAadhaarNumber;
    const name = documentData.name || '';
    const dob = documentData.dob || '';
    const gender = documentData.gender || '';
    const address = this.formatAddress(documentData.split_address || {});

    // Prepare verification data
    const verificationData = {
      success: true,
      verified: true,
      aadhaarVerified: true,
      idProofNo: aadhaarNumber,
      maskedAadhaar: this.formatAadhaarNumber(aadhaarNumber, true),
      aadhaarVerificationId: verificationId,
      aadhaarVerifiedAt: new Date().toISOString(),
      aadhaarStatus: documentData.status || 'VERIFIED',

      // User details from Aadhaar
      userDetails: {
        name: name,
        dob: dob,
        gender: this.formatGender(gender),
        address: address,
        careOf: documentData.care_of || '',
        yearOfBirth: documentData.year_of_birth || '',
        uid: aadhaarNumber
      },

      // Include documentData for address parsing
      documentData: {
        ...documentData,
        split_address: documentData.split_address || {}
      },

      message: 'Aadhaar verified successfully via DigiLocker'
    };

    return verificationData;

  } catch (error) {
    console.error('Complete verification error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Verification process failed',
      aadhaarVerified: false
    };
  }
}
  /**
   * Format address from split_address object
   */

formatAddress(splitAddress) {
  if (!splitAddress) return '';

  const parts = [
    splitAddress.house || '',
    splitAddress.street || '',
    splitAddress.landmark || '',
    splitAddress.loc || '',
    splitAddress.vtc || splitAddress.village || splitAddress.city || '',
    splitAddress.po || '',
    splitAddress.subdist || '',
    splitAddress.dist || '',
    splitAddress.state || '',
    splitAddress.country || 'India',
    splitAddress.pincode || ''
  ].filter(part => part.trim() !== '');

  return parts.join(', ');
}

  /**
   * Format gender from single character
   */
  formatGender(genderChar) {
    if (!genderChar || typeof genderChar !== "string") return "other";
    switch(genderChar.toUpperCase()) {
      case 'M': return 'male';
      case 'F': return 'female';
      case 'T': return 'transgender';
      default: return 'other';
    }
  }

  /**
   * Simple verification flow - Just get URL
   */
  async verifyAadhaar(userId, aadhaarNumber) {
    try {
      const urlResult = await this.createVerificationUrl(userId, aadhaarNumber);

      if (!urlResult.success) {
        return urlResult;
      }

      return {
        success: true,
        verificationId: urlResult.verificationId,
        verificationUrl: urlResult.verificationUrl,
        message: 'Please open DigiLocker to verify Aadhaar'
      };
    } catch (error) {
      console.error('Verify Aadhaar error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to start verification'
      };
    }
  }

  /**
   * Format Aadhaar number with masking
   */
  formatAadhaarNumber(aadhaar, mask = false) {
    if (!aadhaar) return '';
    const digits = aadhaar.replace(/\D/g, '');

    if (mask && digits.length === 12) {
      return `XXXX XXXX ${digits.substring(8)}`;
    }

    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }

  /**
   * Generate verification ID
   */
  generateVerificationId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `VER_${timestamp}_${random}`.toUpperCase();
  }
}

// Export singleton instance
export const digiLockerService = new DigiLockerService();
