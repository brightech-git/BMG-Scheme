import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Share,
  Clipboard,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";

import { COLORS, SIZES, FONTS, SHADOWS } from "../../utils/AppTheme";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import {
  getReferralDetails,
  applyReferralCode,
  validateReferralCode,
  getAppliedReferralStatus,
} from "../../services/ReferalService";
import { fetchReferralSchemes } from "../../services/ReferralAmount";
import { BottomTab } from "../../components";

const ReferralScreen = () => {
  // =======================
  // STATE
  // =======================
  const [referralCode, setReferralCode] = useState("");
  const [totalBonus, setTotalBonus] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [referralHistory, setReferralHistory] = useState([]);
  const [enteredCode, setEnteredCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [playStoreLink, setPlayStoreLink] = useState("");
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for applied referral
  const [hasAppliedReferral, setHasAppliedReferral] = useState(false);
  const [appliedReferralData, setAppliedReferralData] = useState(null);
  const [isCheckingReferralStatus, setIsCheckingReferralStatus] =
    useState(false);

  // New state for redeem functionality
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // New state for referral schemes from API
  const [referralSchemes, setReferralSchemes] = useState([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);

  // ===============================
  // LOAD DATA FROM API
  // ===============================
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setIsCheckingReferralStatus(true);

    try {
      // Load referral details
      const referralResult = await getReferralDetails();

      if (referralResult.success) {
        const data = referralResult.data;

        // Check if data has the new structure (referrer and transactions)
        if (data && data.referrer && Array.isArray(data.transactions)) {
          const { referrer, transactions } = data;

          // Set user info from referrer object
          setReferralCode(referrer.referral_code || "");
          setTotalBonus(referrer.wallet_balance || referrer.totalCreditedAmount || 0);
          setUsername(referrer.username || "");
          setTotalReferrals(transactions.length);

          // Set referral link
          setReferralLink(
            referrer.referralLink ||
              `https://bmgscheme.com/signup?ref=${referrer.referral_code}`
          );

          // Set Play Store link if available
          setPlayStoreLink(
            referrer.playStoreLink || "https://play.google.com/store/apps"
          );

          // Format and set referral history from transactions
          const history = transactions.map((item) => ({
            id: item.new_member_personal_id || "0",
            name: item.new_member_personal_name || "Unknown User",
            amount: item.credited_amount || 0,
            date: item.created_at
              ? new Date(item.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "N/A",
            schemeId: item.scheme_id || 0,
            schemeName: item.schemeName || "Scheme",
            newMemberReward: item.new_member_reward || 0,
          }));

          setReferralHistory(history);

          // Calculate total bonus from transactions if wallet_balance is not provided
          if (!referrer.wallet_balance && transactions.length > 0) {
            const totalFromHistory = transactions.reduce(
              (sum, item) => sum + (item.credited_amount || 0),
              0
            );
            setTotalBonus(totalFromHistory);
          }
        } else {
          // Fallback to old structure handling
          if (Array.isArray(data) && data.length > 0) {
            const userInfo = data[0];
            setReferralCode(userInfo.referral_code || "");
            setTotalBonus(userInfo.wallet_balance || 0);
            setUsername(userInfo.username || "");

            setReferralLink(
              userInfo.referralLink ||
                `https://bmgscheme.com/signup?ref=${userInfo.referral_code}`
            );

            setPlayStoreLink(
              userInfo.playStoreLink || "https://play.google.com/store/apps"
            );

            const history = data.slice(1).map((item) => ({
              id: item.new_member_personal_id || "0",
              name: item.new_member_personal_name || "Unknown User",
              amount: item.credited_amount || 0,
              date: item.created_at
                ? new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "N/A",
              schemeId: item.scheme_id || 0,
              schemeName: item.schemeName || "Scheme",
              newMemberReward: item.new_member_reward || 0,
            }));

            setReferralHistory(history);
            setTotalReferrals(history.length);

            if (!userInfo.wallet_balance && history.length > 0) {
              const totalFromHistory = history.reduce(
                (sum, item) => sum + (item.amount || 0),
                0
              );
              setTotalBonus(totalFromHistory);
            }
          }
        }
      } else {
        Alert.alert("Error", "Failed to load referral data");
      }

      // Check applied referral status
      const statusResult = await getAppliedReferralStatus();
      if (statusResult.success) {
        setHasAppliedReferral(statusResult.hasAppliedReferral);
        setAppliedReferralData(statusResult.appliedReferralData);
      }

      // Load referral schemes from API
      await loadReferralSchemes();
    } catch (error) {
      console.error("Load data error:", error);
      Alert.alert("Error", "Something went wrong while loading data");
    } finally {
      setIsLoading(false);
      setIsCheckingReferralStatus(false);
    }
  };

  // ===============================
  // LOAD REFERRAL SCHEMES FROM API
  // ===============================
  const loadReferralSchemes = async () => {
    setIsLoadingSchemes(true);
    try {
      const schemesData = await fetchReferralSchemes();

      // Handle API response format
      if (Array.isArray(schemesData)) {
        setReferralSchemes(schemesData);
      } else if (schemesData && Array.isArray(schemesData.data)) {
        setReferralSchemes(schemesData.data);
      } else if (
        schemesData &&
        schemesData.success &&
        Array.isArray(schemesData.data)
      ) {
        setReferralSchemes(schemesData.data);
      } else {
        setReferralSchemes([]);
      }
    } catch (error) {
      console.error("Failed to load referral schemes:", error);
      setReferralSchemes([]);
    } finally {
      setIsLoadingSchemes(false);
    }
  };

  // ===============================
  // RENDER HOW IT WORKS SECTION WITH DYNAMIC SCHEMES
  // ===============================
  const renderHowItWorks = () => {
    const baseSteps = [
      {
        number: 1,
        text: "Share your referral code or link with friends",
      },
      {
        number: 2,
        text: "Ask them to sign up using your code/link",
      },
    ];

    // Dynamic scheme steps
    const schemeSteps =
      referralSchemes.length > 0
        ? referralSchemes.map((scheme, index) => ({
            number: index + 3,
            text: `Earn ₹${scheme.referral_amount || 0} bonus for ${
              scheme.scheme_name || "Unnamed Scheme"
            }`,
          }))
        : [
            {
              number: 3,
              text: "Earn bonus for each successful referral",
            },
          ];

    const finalSteps = [
      ...baseSteps,
      ...schemeSteps,
      {
        number: schemeSteps.length + 3,
        text: "Redeem your earnings when schemes reach maturity date",
      },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works</Text>

        <View style={styles.stepsContainer}>
          {finalSteps.map((step, index) => (
            <View key={`step-${index}`} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.number}</Text>
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ===============================
  // REDEEM FUNCTIONALITY
  // ===============================
  const handleRedeemPress = () => {
    setRedeemModalVisible(true);
  };

  // ===============================
  // SHARE LINK WITH SCHEME INFO
  // ===============================
  const handleShare = async () => {
    if (!referralCode) {
      Alert.alert("Error", "Referral code not available");
      return;
    }

    try {
      let schemesInfo = "";
      if (referralSchemes.length > 0) {
        schemesInfo = "\n\n🎯 **Available Referral Schemes:**\n";
        referralSchemes.forEach((scheme, index) => {
          schemesInfo += `\n• ${
            scheme.scheme_name || `Scheme ${index + 1}`
          }: ₹${scheme.referral_amount || 0} bonus`;
        });
      }

      // Get unique scheme names from history for personal referral stats
      const uniqueSchemes = [...new Set(referralHistory.map(item => item.schemeName))];
      let personalStats = "";
      if (uniqueSchemes.length > 0) {
        personalStats = "\n\n📊 **My Referral Performance:**\n";
        uniqueSchemes.forEach(schemeName => {
          const schemeReferrals = referralHistory.filter(item => item.schemeName === schemeName);
          const totalEarned = schemeReferrals.reduce((sum, item) => sum + item.amount, 0);
          personalStats += `\n• ${schemeName}: ₹${totalEarned} from ${schemeReferrals.length} referral(s)`;
        });
      }

      const shareMessage = playStoreLink
        ? `Join me on BMG Scheme! Use my referral code: **${referralCode}** to get bonus.${schemesInfo}${personalStats}\n\n📱 Download the app: ${playStoreLink}\n🔗 Sign up with my referral link: ${referralLink}`
        : `Join me on BMG Scheme! Use my referral code: **${referralCode}** to get bonus.${schemesInfo}${personalStats}\n\n🔗 Sign up here: ${referralLink}`;

      await Share.share({
        message: shareMessage,
        title: "Refer & Earn with BMG Scheme",
      });

      Alert.alert("Success", "Referral link shared successfully!");
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share referral link");
    }
  };

  // ===============================
  // COPY LINK
  // ===============================
  const handleCopyLink = () => {
    if (!referralCode) {
      Alert.alert("Error", "Referral code not available");
      return;
    }

    const textToCopy =
      referralLink || `https://bmgscheme.com/signup?ref=${referralCode}`;
    Clipboard.setString(textToCopy);
    Alert.alert("Copied!", "Referral link copied to clipboard");
  };

  // ===============================
  // RENDER APPLIED REFERRAL SECTION
  // ===============================
  const renderAppliedReferralSection = () => {
    if (isCheckingReferralStatus) {
      return (
        <View style={styles.appliedReferralCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.checkingText}>Checking referral status...</Text>
        </View>
      );
    }

    if (hasAppliedReferral && appliedReferralData) {
      return (
        <View style={styles.appliedReferralCard}>
          <View style={styles.appliedHeader}>
            <Text style={styles.appliedTitle}>Applied Referral</Text>
            <View style={styles.appliedBadge}>
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          </View>

          <View style={styles.appliedContent}>
            <Text style={styles.appliedLabel}>Friend's Referral Code:</Text>
            <Text style={styles.appliedCode}>
              {appliedReferralData.referral_code || "N/A"}
            </Text>

            <Text style={styles.appliedLabel}>Applied On:</Text>
            <Text style={styles.appliedDate}>
              {appliedReferralData.created_at
                ? new Date(appliedReferralData.created_at).toLocaleDateString(
                    "en-IN",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )
                : "N/A"}
            </Text>
          </View>

          <View style={styles.appliedNote}>
            <Text style={styles.appliedNoteText}>
              ✓ You have already applied a friend's referral code
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Have a Referral Code?</Text>
        <Text style={styles.sectionSubtitle}>
          Enter a friend's referral code to get started with bonus
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter Friend's Referral Code"
            placeholderTextColor={COLORS.inputPlaceholder}
            value={enteredCode}
            onChangeText={setEnteredCode}
            autoCapitalize="characters"
            maxLength={20}
            editable={!isSubmitting}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!enteredCode.trim() || isSubmitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitCode}
          disabled={!enteredCode.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Apply Referral Code</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ===============================
  // SUBMIT REFERRAL CODE
  // ===============================
  const handleSubmitCode = async () => {
    if (!enteredCode.trim()) {
      Alert.alert("Error", "Please enter a referral code");
      return;
    }

    if (isSubmitting) {
      return;
    }

    if (enteredCode.trim().toUpperCase() === referralCode?.toUpperCase()) {
      Alert.alert("Invalid Code", "You cannot use your own referral code!");
      return;
    }

    const validation = validateReferralCode(enteredCode);
    if (!validation.valid) {
      Alert.alert("Invalid Code", validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await applyReferralCode(enteredCode);

      if (result.success) {
        Alert.alert(
          "Success",
          result.message || "Referral code applied successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                setEnteredCode("");
                loadAllData();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Error",
          result.message || "Failed to apply referral code",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Submit referral code error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===============================
  // RENDER HISTORY ITEM
  // ===============================
  const renderHistoryItem = ({ item, index }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {item.name
              .split(" ")
              .map((n) => n[0]?.toUpperCase() || "")
              .join("")
              .slice(0, 2)}
          </Text>
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.historyDate}>{item.date}</Text>
          <View style={styles.schemeInfoRow}>
            <Text style={styles.schemeText}>{item.schemeName}</Text>
            {item.newMemberReward > 0 && (
              <Text style={styles.memberRewardText}>
                Friend got ₹{item.newMemberReward}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={styles.historyAmount}>₹{item.amount.toFixed(2)}</Text>
        <Text style={styles.creditedText}>Credited</Text>
      </View>
    </View>
  );

  // ===============================
  // LOADING STATE
  // ===============================
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CommonHeader
          title="Refer & Earn"
          subtitle="Share your referral code and earn rewards"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading referral data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ===============================
  // UI
  // ===============================
  return (
    <>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <CommonHeader
            title="Refer & Earn"
            subtitle="Share your referral code and earn rewards"
          />

          {/* ===== MY REFERRAL CODE ===== */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Referral Code</Text>

            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Referral Code</Text>
              <Text style={styles.codeText}>{referralCode || "---"}</Text>
              {username && (
                <Text style={styles.usernameText}>@{username.trim()}</Text>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !referralCode && styles.buttonDisabled,
                ]}
                onPress={handleShare}
                disabled={!referralCode}
              >
                <Text style={styles.primaryButtonText}>
                  Share Referral Link
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  !referralCode && styles.buttonDisabled,
                ]}
                onPress={handleCopyLink}
                disabled={!referralCode}
              >
                <Text style={styles.secondaryButtonText}>Copy Link</Text>
              </TouchableOpacity>
            </View>

            {/* Stats with Redeem Button */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>₹{totalBonus.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Bonus Earned</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{totalReferrals}</Text>
                <Text style={styles.statLabel}>Total Referrals</Text>
              </View>
            </View>

            {/* Redeem Button */}
            <TouchableOpacity
              style={styles.redeemButtonMain}
              onPress={handleRedeemPress}
            >
              <Text style={styles.redeemButtonMainText}>How to Redeem</Text>
            </TouchableOpacity>
          </View>

          {/* ===== APPLIED REFERRAL / INPUT SECTION ===== */}
          {renderAppliedReferralSection()}

          {/* ===== HOW IT WORKS ===== */}
          {renderHowItWorks()}


        </ScrollView>

        {/* Redeem Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={redeemModalVisible}
          onRequestClose={() => setRedeemModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Redeem Amount</Text>
                <TouchableOpacity
                  onPress={() => setRedeemModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Total Redeemable Amount */}
              <View style={styles.totalRedeemableCard}>
                <Text style={styles.totalRedeemableLabel}>
                  Total Redeemable
                </Text>
                <Text style={styles.totalRedeemableAmount}>
                  ₹{totalBonus.toFixed(2)}
                </Text>
              </View>

              {/* Important Note */}
              <View style={styles.redeemNoteContainer}>
                <Text style={styles.redeemNoteTitle}>Important:</Text>
                <Text style={styles.redeemNoteText}>
                  • Reward money is applicable only for purchases of ₹10,000 and above. {"\n\n"} • Redemption is subject to eligibility, validity period, and the company’s reward policy.{"\n\n"}• The
                  company reserves the right to modify or withdraw the reward
                  {/* scheme without prior notice{"\n\n"}✅ Redemption is allowed
                  after scheme completion / eligibility {"\n\n"}🏬 Visit any authorized
                  showroom / branch {"\n\n"}📱 Carry your registered mobile number / App
                  ID {"\n\n"}🧾 Benefits can be redeemed only against jewellery purchase
                  {"\n\n"}⚖️ Final value depends on prevailing gold / silver rate on
                  redemption date {"\n\n"}🔖 Valid ID proof may be required {"\n\n"}⏳
                  Redemption must be done within the validity period{"\n\n"} 🚫 Benefits
                  are non-transferable and cannot be encashed{"\n\n"} 📜 Subject to
                  scheme Terms & Conditions */}
                </Text>
              </View>
            </View>
          </View>
        </Modal>
      </View>
      <BottomTab screen="ReferralScreen" />
    </>
  );
};

// ============================================
// STYLES
// ============================================
const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContent: {
    paddingBottom: SIZES.padding.xxl,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.md,
  },

  // Section
  section: {
    marginTop: SIZES.margin.lg,
    paddingHorizontal: SIZES.padding.lg,
  },
  sectionTitle: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
    marginBottom: SIZES.margin.xs,
  },
  sectionSubtitle: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.md,
  },

  // Code Card
  codeCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.xl,
    alignItems: "center",
    ...SHADOWS.sm,
    marginBottom: SIZES.margin.md,
  },
  codeLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.xs,
  },
  codeText: {
    ...FONTS.h2,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
    letterSpacing: 4,
    marginBottom: SIZES.margin.xs,
  },
  usernameText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.medium,
  },

  // Buttons
  buttonRow: {
    flexDirection: "row",
    gap: SIZES.margin.sm,
    marginBottom: SIZES.margin.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.padding.md,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    fontFamily: FONTS.family.semiBold,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.padding.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  secondaryButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.primary,
    fontFamily: FONTS.family.semiBold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Redeem Button (Main)
  redeemButtonMain: {
    backgroundColor: COLORS.success,
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.padding.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SIZES.margin.md,
    ...SHADOWS.sm,
  },
  redeemButtonMainText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
  },

  // Stats Cards
  statsRow: {
    flexDirection: "row",
    gap: SIZES.margin.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  statValue: {
    ...FONTS.h3,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
    marginBottom: SIZES.margin.xs,
  },
  statLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Steps Container
  stepsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    ...SHADOWS.sm,
    marginBottom: SIZES.margin.lg,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SIZES.margin.lg,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryOpacity20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.margin.md,
  },
  stepNumberText: {
    ...FONTS.bodySmall,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
  },
  stepText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },

  // Schemes Container
  schemesContainer: {
    marginTop: SIZES.margin.lg,
  },
  schemesTitle: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
    fontFamily: FONTS.family.bold,
    marginBottom: SIZES.margin.md,
  },

  // Scheme Card
  schemeCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    marginBottom: SIZES.margin.md,
    ...SHADOWS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  schemeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin.md,
  },
  schemeName: {
    ...FONTS.bodyLarge,
    color: COLORS.textPrimary,
    fontFamily: FONTS.family.bold,
    flex: 1,
  },
  schemeBadge: {
    backgroundColor: COLORS.secondaryOpacity20,
    paddingHorizontal: SIZES.padding.sm,
    paddingVertical: SIZES.padding.xs,
    borderRadius: SIZES.radius.xs,
  },
  schemeBadgeText: {
    ...FONTS.caption,
    color: COLORS.secondary,
    fontFamily: FONTS.family.semiBold,
  },
  schemeDetails: {
    marginBottom: SIZES.margin.md,
  },
  schemeDetailRow: {
    flexDirection: "row",
    gap: SIZES.margin.md,
  },
  schemeDetailItem: {
    flex: 1,
    alignItems: "center",
    padding: SIZES.padding.md,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radius.sm,
  },
  schemeDetailLabel: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.xs,
    textAlign: "center",
  },
  schemeAmount: {
    ...FONTS.bodyMedium,
    color: COLORS.success,
    fontFamily: FONTS.family.bold,
  },
  schemePercentage: {
    ...FONTS.bodyMedium,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
  },
  schemeNote: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingTop: SIZES.padding.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },

  // Loading Schemes
  loadingSchemes: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.xl,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.sm,
  },

  // No Schemes
  noSchemesContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  noSchemesText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.md,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.padding.lg,
    paddingVertical: SIZES.padding.sm,
    borderRadius: SIZES.radius.sm,
  },
  retryButtonText: {
    ...FONTS.bodySmall,
    color: COLORS.white,
    fontFamily: FONTS.family.semiBold,
  },

  // Input Container
  inputContainer: {
    marginBottom: SIZES.margin.md,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.sm,
    paddingHorizontal: SIZES.padding.md,
    paddingVertical: SIZES.padding.md,
    fontSize: SIZES.font.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    ...SHADOWS.xs,
  },

  // Submit Button
  submitButton: {
    backgroundColor: COLORS.secondary,
    borderRadius: SIZES.radius.md,
    paddingVertical: SIZES.padding.md,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
  },

  // History Header
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin.sm,
  },
  historyCount: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
  },

  // History Container
  historyContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.md,
    ...SHADOWS.sm,
  },

  // History Item
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SIZES.padding.md,
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryOpacity20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SIZES.margin.md,
  },
  avatarText: {
    ...FONTS.bodyMedium,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    fontFamily: FONTS.family.medium,
    marginBottom: 2,
  },
  historyDate: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  schemeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  schemeText: {
    ...FONTS.captionSmall,
    color: COLORS.primary,
    fontFamily: FONTS.family.medium,
  },
  memberRewardText: {
    ...FONTS.captionSmall,
    color: COLORS.success,
    fontFamily: FONTS.family.medium,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyAmount: {
    ...FONTS.bodyLarge,
    color: COLORS.success,
    fontFamily: FONTS.family.bold,
    marginBottom: 2,
  },
  creditedText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // History Summary
  historySummary: {
    paddingTop: SIZES.padding.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SIZES.margin.sm,
  },
  historySummaryText: {
    ...FONTS.bodyMedium,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
    textAlign: "center",
  },

  // Empty State
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.xxl,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  emptyText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.xs,
  },
  emptySubtext: {
    ...FONTS.caption,
    color: COLORS.textTertiary,
    textAlign: "center",
  },

  // Applied Referral Styles
  appliedReferralCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius.md,
    padding: SIZES.padding.lg,
    marginHorizontal: SIZES.padding.lg,
    marginTop: SIZES.margin.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  appliedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SIZES.margin.md,
  },
  appliedTitle: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
  },
  appliedBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.padding.sm,
    paddingVertical: SIZES.padding.xs,
    borderRadius: SIZES.radius.xs,
  },
  appliedBadgeText: {
    ...FONTS.caption,
    color: COLORS.white,
    fontFamily: FONTS.family.semiBold,
  },
  appliedContent: {
    marginBottom: SIZES.margin.md,
  },
  appliedLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.xs,
  },
  appliedCode: {
    ...FONTS.bodyLarge,
    color: COLORS.primary,
    fontFamily: FONTS.family.bold,
    marginTop: 2,
  },
  appliedDate: {
    ...FONTS.body,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  appliedNote: {
    backgroundColor: COLORS.successOpacity20,
    padding: SIZES.padding.md,
    borderRadius: SIZES.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  appliedNoteText: {
    ...FONTS.body,
    color: COLORS.successDark,
    fontFamily: FONTS.family.medium,
  },
  checkingText: {
    ...FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.margin.sm,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radius.xl,
    borderRadius: SIZES.radius.xl,
    maxHeight: height * 0.85,
    paddingBottom: SIZES.padding.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.padding.lg,
    paddingVertical: SIZES.padding.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    ...FONTS.h4,
    color: COLORS.textPrimary,
    fontFamily: FONTS.family.bold,
  },
  closeButton: {
    padding: SIZES.padding.xs,
  },
  closeButtonText: {
    ...FONTS.h4,
    color: COLORS.textSecondary,
  },
  totalRedeemableCard: {
    backgroundColor: COLORS.successOpacity10,
    marginHorizontal: SIZES.padding.lg,
    marginVertical: SIZES.margin.lg,
    padding: SIZES.padding.lg,
    borderRadius: SIZES.radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.successOpacity30,
  },
  totalRedeemableLabel: {
    ...FONTS.bodySmall,
    color: COLORS.textSecondary,
    marginBottom: SIZES.margin.xs,
  },
  totalRedeemableAmount: {
    fontSize: SIZES.heading.h2,
    lineHeight: SIZES.heading.h2 * 1.3,
    color: COLORS.success,
    fontFamily: FONTS.family.bold,
  },

  // Redeem Note
  redeemNoteContainer: {
    backgroundColor: COLORS.warningOpacity10,
    marginHorizontal: SIZES.padding.lg,
    padding: SIZES.padding.md,
    borderRadius: SIZES.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  redeemNoteTitle: {
    ...FONTS.bodySmall,
    color: COLORS.warning,
    fontFamily: FONTS.family.semiBold,
    marginBottom: SIZES.margin.xs,
  },
  redeemNoteText: {
    ...FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontSize: 14,
  },
});

export default ReferralScreen;