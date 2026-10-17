// screens/DigiLockerWebViewScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
  Alert,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import theme from "../../utils/AppTheme";
import { digiLockerService } from "../../services/DigiLockerService";

const { COLORS, SIZES, FONTS } = theme;

const DigiLockerWebViewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const webViewRef = useRef(null);

  const {
    verificationUrl,
    verificationId,
    aadhaarNumber,
    onVerificationComplete,
    userId, // Add userId from params
    sourceScreen, // e.g. "profile" when launched outside the register form
  } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Guards: ensure verification completion runs exactly once,
  // and the success-redirect is only handled once.
  const completionStartedRef = useRef(false);
  const redirectHandledRef = useRef(false);

  // Navigate back to the caller after verification finishes.
  // If a callback was provided, the caller's own screen handles the result,
  // so we simply pop back instead of stacking a new UserRegisterForm.
  const navigateBackToCaller = (params = {}) => {
    if (onVerificationComplete) {
      try {
        if (sourceScreen === "profile" && navigation.canGoBack()) {
          // Skip the intermediate AadhaarVerification screen when possible
          navigation.pop(2);
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.replace("UserRegisterForm", { userId, ...params });
        }
      } catch (e) {
        navigation.goBack();
      }
    } else {
      navigation.replace("UserRegisterForm", { userId, ...params });
    }
  };

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (webViewRef.current && currentUrl !== verificationUrl) {
          webViewRef.current.goBack();
          return true;
        }

        Alert.alert(
          "Exit Verification",
          "Are you sure you want to exit? Your verification progress may be lost.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Exit",
              style: "destructive",
              onPress: () => handleExitVerification(),
            },
          ]
        );
        return true;
      }
    );

    return () => backHandler.remove();
  }, [currentUrl, verificationUrl]);

  const handleExitVerification = () => {
    // Inform the caller (if any) that verification was cancelled
    if (onVerificationComplete) {
      onVerificationComplete({
        success: false,
        aadhaarVerified: false,
        message: "Verification cancelled by user",
      });
    }
    navigateBackToCaller({
      verificationCancelled: true,
      aadhaarNumber: aadhaarNumber,
      message: "Verification cancelled by user",
      allowManualEntry: true,
    });
  };

  // Complete verification process (guarded — runs at most once)
  const completeVerification = async () => {
    if (completionStartedRef.current) {
      return;
    }
    completionStartedRef.current = true;
    setIsCheckingStatus(true);

    try {
      // Use the complete verification method that fetches document data
      const verificationResult = await digiLockerService.completeVerification(
        verificationId, 
        aadhaarNumber
      );


      // If verification simply isn't finished yet (still pending), stay on this
      // screen and let the user finish or retry instead of kicking them out.
      if (
        !verificationResult.success &&
        (verificationResult.aadhaarStatus === "PENDING" ||
          /not completed/i.test(verificationResult.message || ""))
      ) {
        completionStartedRef.current = false;
        redirectHandledRef.current = false;
        setIsCheckingStatus(false);
        Alert.alert(
          "Verification Not Complete",
          "Your DigiLocker verification hasn't finished yet. Please complete it and then tap Check Status.",
          [{ text: "OK" }]
        );
        return;
      }

      // Pass result to callback if exists
      if (onVerificationComplete) {
        onVerificationComplete(verificationResult);
      }

      // Navigate back with verification data
      if (verificationResult.success && verificationResult.aadhaarVerified) {
        // Format date of birth from DD-MM-YYYY to YYYY-MM-DD
        const formatDOB = (dobString) => {
          if (!dobString) return '';
          if (dobString.includes('-')) {
            const parts = dobString.split('-');
            if (parts.length === 3) {
              return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }
          return dobString;
        };

        // Extract data for auto-fill
        const aadhaarData = verificationResult.userDetails || {};
        const documentData = verificationResult.documentData || {};

        navigateBackToCaller({
          verificationData: verificationResult,
          aadhaarVerified: true,
          aadhaarNumber: verificationResult.idProofNo,
          maskedAadhaar: verificationResult.maskedAadhaar || digiLockerService.formatAadhaarNumber(verificationResult.idProofNo, true),
          aadhaarVerificationId: verificationResult.aadhaarVerificationId,
          aadhaarVerifiedAt: verificationResult.aadhaarVerifiedAt,
          aadhaarStatus: verificationResult.aadhaarStatus || 'VERIFIED',
          kycVerified: false, // Will be computed based on terms acceptance

          // Auto-fill data
          username: aadhaarData.name || '',
          dateOfBirth: formatDOB(aadhaarData.dob) || '',
          gender: aadhaarData.gender || '',
          address1: aadhaarData.address || '',
        });
      } else {
        // Verification failed
        navigateBackToCaller({
          verificationError: verificationResult.message || "Verification failed",
          aadhaarNumber: aadhaarNumber,
          allowManualEntry: true,
        });
      }

    } catch (error) {
      console.error("Verification completion error:", error);
      if (onVerificationComplete) {
        onVerificationComplete({
          success: false,
          aadhaarVerified: false,
          message: "Verification failed. Please try again.",
        });
      }
      navigateBackToCaller({
        verificationError: "Verification failed. Please try again or enter manually.",
        aadhaarNumber: aadhaarNumber,
        allowManualEntry: true,
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Check verification status
  const checkStatusAndComplete = async () => {
    Alert.alert(
      "Check Verification",
      "Have you completed the verification in DigiLocker?",
      [
        {
          text: "Not Yet",
          style: "cancel",
        },
        {
          text: "Yes, I Completed It",
          onPress: completeVerification,
        },
        {
          text: "Cancel Verification",
          onPress: () => handleExitVerification(),
          style: "destructive",
        },
      ]
    );
  };

  const handleNavigationStateChange = (navState) => {
    const url = navState.url;
    setCurrentUrl(url);
    setIsLoading(navState.loading);

    // Check if redirected to the configured redirect_url (bmgjewellers.com).
    // Guarded so multiple navigation-state events only trigger completion once.
    if (
      url &&
      url.startsWith("https://bmgjewellers.com") &&
      !redirectHandledRef.current
    ) {
      redirectHandledRef.current = true;
      // Give DigiLocker's backend a moment to persist status, then verify once
      setTimeout(() => {
        completeVerification();
      }, 2000);
    }
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    Alert.alert(
      "Error Loading DigiLocker",
      "Failed to load DigiLocker. Please check your internet connection.",
      [{
        text: "OK",
        onPress: () => {
          if (onVerificationComplete) {
            onVerificationComplete({
              success: false,
              aadhaarVerified: false,
              message: "Failed to load DigiLocker",
            });
          }
          navigateBackToCaller({
            verificationError: "Failed to load DigiLocker",
            aadhaarNumber: aadhaarNumber,
            allowManualEntry: true,
          });
        }
      }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader
        title="DigiLocker Verification"
        subtitle="Complete your Aadhaar verification"
        showBackButton={true}
        onBackPress={checkStatusAndComplete}
        showActionButton={true}
        actionButtonText="Check Status"
        onActionPress={checkStatusAndComplete}
      />

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Complete the verification in DigiLocker. After completion, you'll be redirected back.
        </Text>
        <Text style={styles.verificationIdText}>
          Verification ID: {verificationId}
        </Text>
        {aadhaarNumber && (
          <Text style={styles.aadhaarText}>
            Aadhaar: {digiLockerService.formatAadhaarNumber(aadhaarNumber, true)}
          </Text>
        )}
        {userId && (
          <Text style={styles.userIdText}>
            User ID: {userId}
          </Text>
        )}
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: verificationUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {isCheckingStatus && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              Fetching Aadhaar data...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  infoContainer: {
    padding: SIZES.padding.md,
    backgroundColor: COLORS.primaryLight + "20",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoText: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SIZES.margin.xs,
  },
  verificationIdText: {
    ...FONTS.caption,
    color: COLORS.primary,
    textAlign: "center",
    fontWeight: "500",
  },
  aadhaarText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SIZES.margin.xs,
  },
  userIdText: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: SIZES.margin.xs,
    fontSize: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.md,
  },
});

export default DigiLockerWebViewScreen;