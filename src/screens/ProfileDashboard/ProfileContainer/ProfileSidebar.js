import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Image,
  PanResponder,
  Share,
  Linking,
  Platform,
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TextDefault } from "../../../components";
import theme from "../../../utils/AppTheme";
import {
  getUserData,
  clearUserData,
  saveUserData,
  logoutUser,
} from "../../../utils/AsynchStorageHelper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import { checkForAppUpdate } from "../../../utils/VersionChecker";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import memberPhotoService from "../../../services/UserProfileService";
import { API_BASE_URL } from "../../../Config/API";

const { COLORS, SIZES, FONTS, moderateScale } = theme;
const { width, height } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.8;
const IMAGE_BASE_URL = "https://scheme.bmgjewellers.com";

// Constants
const ANIMATION_DURATION = {
  drawer: 320,
  fade: 220,
  profile: 300,
};

const MENU_ITEMS = [
  { label: "Register MySelf", icon: "description", route: "UserRegisterForm" },
  { label: "My Rewards", icon: "card-giftcard", route: "Rewards" },
  { label: "My Schemes", icon: "credit-card", route: "MyScheme" },
  { label: "My Pay Now", icon: "credit-card", route: "DuePayment" },
  { label: "My Redeemption", icon: "card-giftcard", route: "SchemeListPage" },
  { label: "My Referal Pending", icon: "card-giftcard", route: "ReferralPending" },
  { label: "About", icon: "info", route: "AboutPage" },
  { label: "Privacy Policy", icon: "privacy-tip", route: "PrivacyPolicy" },
  { label: "Terms & Conditions", icon: "description", route: "TermsandCondition" },
  { label: "FAQ", icon: "description", route: "FAQPage" },
];

const SETTINGS_ITEMS = [
  { label: "Update Profile Picture", icon: "photo-camera", action: "profilePicture" },
  { label: "Reset MPIN", icon: "lock-reset", route: "ResetMpin" },
  { label: "Account Delete", icon: "delete", route: "DeleteButton" },
];

const DrawerMenu = ({ isVisible, onClose }) => {
  const navigation = useNavigation();
  const route = useRoute();

  // State
  const [userData, setUserData] = useState({});
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const profileY = useRef(new Animated.Value(20)).current;
  const profileOpacity = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;
  const abortControllerRef = useRef(null);

  // Memoized values
  const activeRoute = useMemo(() => route.name, [route.name]);

  const isActive = useCallback((routeName) => activeRoute === routeName, [activeRoute]);

  // API Functions
  const fetchUserDataFromAPI = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        console.error("No user ID found");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal,
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const apiUserData = await response.json();
      const storedProfilePic = await AsyncStorage.getItem("userProfilePicture");

      const mergedData = {
        ...apiUserData,
        username: apiUserData.username,
        contactNumber: apiUserData.contactNumber,
        email: apiUserData.email,
        picture: storedProfilePic || apiUserData.picture,
      };

      setUserData(mergedData);
      await saveUserData(mergedData);

      if (storedProfilePic) {
        await AsyncStorage.setItem("userProfilePicture", storedProfilePic);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      console.error("Fetch user data error:", error);

      // Fallback to stored data
      try {
        const storedData = await getUserData();
        if (storedData) setUserData(storedData);
      } catch (storageError) {
        console.error("Storage fallback error:", storageError);
      }

      if (error.name !== "AbortError") {
        Alert.alert(
          "Network Error",
          "Unable to fetch updated user data. Using cached data.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const storedData = await getUserData();
        if (storedData) {
          setUserData(storedData);

          const storedProfilePic = await AsyncStorage.getItem("userProfilePicture");
          if (storedProfilePic && !storedData.picture) {
            setUserData(prev => ({ ...prev, picture: storedProfilePic }));
          }

          // Debounced API fetch
          setTimeout(fetchUserDataFromAPI, 500);
        }
      } catch (error) {
        console.error("Error fetching initial user data:", error);
      }
    };

    fetchInitialData();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleApprefernavigate = () => {
    navigation.navigate("ReferralShareScreen");
  };

  // Drawer open/close effects
  useEffect(() => {
    if (isVisible) {
      fetchUserDataFromAPI();

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_DURATION.drawer,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION.fade,
          useNativeDriver: true,
        }),
        Animated.stagger(70, [
          Animated.parallel([
            Animated.timing(profileY, {
              toValue: 0,
              duration: ANIMATION_DURATION.profile,
              useNativeDriver: true,
            }),
            Animated.timing(profileOpacity, {
              toValue: 1,
              duration: ANIMATION_DURATION.profile,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(profileOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => setShowSettings(false));
    }
  }, [isVisible]);

  // Settings submenu animation
  useEffect(() => {
    Animated.timing(settingsAnim, {
      toValue: showSettings ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showSettings]);

  // Version check on mount
  useEffect(() => {
    const verifyVersion = async () => {
      const result = await checkForAppUpdate();

      if (result?.forceUpdate) {
        Alert.alert(
          "Update Available",
          `A new version (${result.latestVersion}) is available. Please update the app.`,
          [
            {
              text: "Update Now",
              onPress: () => {
                Linking.openURL(
                  "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme"
                );
              },
            },
            { text: "Later", style: "cancel" },
          ]
        );
      }
    };

    verifyVersion().catch(error => {
      console.warn("Profile update check failed:", error);
    });
  }, []);

  // PanResponder for swipe-to-close
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 10 && Math.abs(gesture.dy) < 60;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          slideAnim.setValue(Math.min(DRAWER_WIDTH, -gesture.dx));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const closeThreshold = 80;
        if (-gesture.dx > closeThreshold) {
          Animated.timing(slideAnim, {
            toValue: DRAWER_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(onClose);
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Image handling functions
const pickImageFromGallery = useCallback(async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelectedImagePreview(result.assets[0]);
      setPreviewModalVisible(true);
    }
  } catch (error) {
    console.error("Error picking image:", error);
    Alert.alert("Error", "Failed to pick image from gallery.");
  }
}, []);


  const takePhotoWithCamera = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "We need camera permission to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImagePreview(result.assets[0]);
        setPreviewModalVisible(true);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo.");
    }
  }, []);

  const uploadProfilePicture = useCallback(async (imageAsset) => {
    setUploading(true);

    try {
      const image = {
        uri: imageAsset.uri,
        type: imageAsset.mimeType || "image/jpeg",
        fileName: imageAsset.fileName || `profile_${Date.now()}.jpg`,
      };

      const response = await memberPhotoService.uploadPhoto(image);

      if (response.photoPath) {
        let fullImageUrl;

        if (response.photoPath.startsWith('http')) {
          fullImageUrl = response.photoPath;
        } else if (response.photoPath.startsWith('/')) {
          fullImageUrl = `${IMAGE_BASE_URL}${response.photoPath}`;
        } else {
          fullImageUrl = `${IMAGE_BASE_URL}/uploads/${response.photoPath}`;
        }

        setUserData(prev => ({ ...prev, picture: fullImageUrl }));
        await AsyncStorage.setItem("userProfilePicture", fullImageUrl);

        Alert.alert("Success", response.message || "Profile picture updated successfully!");
      } else {
        Alert.alert("Warning", "Upload completed but no photo path returned.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.message || "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteProfilePicture = useCallback(async () => {
    Alert.alert(
      "Delete Profile Picture",
      "Are you sure you want to remove your profile picture?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setUploading(true);
              await memberPhotoService.deletePhoto();
              setUserData(prev => ({ ...prev, picture: null }));
              await AsyncStorage.removeItem("userProfilePicture");
              Alert.alert("Success", "Profile picture removed successfully!");
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete profile picture.");
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  }, []);

  const handleUseImage = useCallback(async () => {
    if (selectedImagePreview) {
      setPreviewModalVisible(false);
      await uploadProfilePicture(selectedImagePreview);
      setSelectedImagePreview(null);
    }
  }, [selectedImagePreview, uploadProfilePicture]);

  const handleProfilePictureUpdate = useCallback(() => {
    const options = [
      { text: "Take Photo", onPress: takePhotoWithCamera },
      { text: "Choose from Gallery", onPress: pickImageFromGallery },
      ...(userData.picture ? [{
        text: "Remove Current Photo",
        onPress: deleteProfilePicture,
        style: "destructive",
      }] : []),
      { text: "Cancel", style: "cancel" },
    ];

    Alert.alert("Update Profile Picture", "Choose an option", options);
  }, [userData.picture, takePhotoWithCamera, pickImageFromGallery, deleteProfilePicture]);

  // Navigation and utility functions
  const handleMenuNavigate = useCallback((routeName) => {
    onClose();
    setTimeout(() => navigation.navigate(routeName), 220);
  }, [navigation, onClose]);

  const handleLogout = useCallback(async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            // Shared logout: clears session keys but preserves onboarding
            // flag and payment-recovery/idempotency records.
            await logoutUser();
          } catch (error) {
            console.error("Logout error:", error);
          } finally {
            onClose();
            navigation.replace("LoginPage");
          }
        },
      },
    ]);
  }, [navigation, onClose]);

  const handleShareApp = useCallback(async () => {
    try {
      const url = "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme";
      await Share.share({ message: `Check out this app: ${url}`, url });
    } catch (error) {
      console.error("Share error", error);
    }
  }, []);

  const handleRateUs = useCallback(async () => {
    const androidUrl = "market://details?id=com.bmg.bmgscheme";
    const webUrl = "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme";

    try {
      if (Platform.OS === "android") {
        const canOpen = await Linking.canOpenURL(androidUrl);
        if (canOpen) return Linking.openURL(androidUrl);
      }

      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) return Linking.openURL(webUrl);

      Alert.alert("Can't open store", "Unable to open the store URL.");
    } catch (err) {
      console.error("RateUs error", err);
    }
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const handleSettingsAction = useCallback((item) => {
    if (item.action === 'profilePicture') {
      handleProfilePictureUpdate();
    } else if (item.route) {
      handleMenuNavigate(item.route);
    }
  }, [handleProfilePictureUpdate, handleMenuNavigate]);

  // Render helpers
  const renderMenuItem = useCallback((item, index) => {
    const active = isActive(item.route);

    return (
      <TouchableOpacity
        key={`menu-${index}`}
        style={[styles.menuItem, active && styles.menuItemActive]}
        onPress={() => handleMenuNavigate(item.route)}
      >
        <View style={styles.menuItemContent}>
          <MaterialIcons
            name={item.icon}
            size={moderateScale(22)}
            color={active ? COLORS.primary : COLORS.textPrimary}
          />
          <TextDefault style={[styles.menuItemText, active && styles.menuItemTextActive]}>
            {item.label}
          </TextDefault>
        </View>
      </TouchableOpacity>
    );
  }, [isActive, handleMenuNavigate]);

  const renderSettingsSubmenu = useCallback(() => (
    <Animated.View
      style={[
        styles.submenuContainer,
        {
          maxHeight: settingsAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 180],
          }),
          opacity: settingsAnim,
        },
      ]}
    >
      {SETTINGS_ITEMS.map((item, index) => (
        <TouchableOpacity
          key={`settings-${index}`}
          style={styles.submenuItem}
          onPress={() => handleSettingsAction(item)}
        >
          <View style={styles.submenuItemContent}>
            <MaterialIcons
              name={item.icon}
              size={moderateScale(18)}
              color={COLORS.textPrimary}
              style={styles.submenuIcon}
            />
            <TextDefault style={styles.submenuItemText}>
              {item.label}
            </TextDefault>
          </View>
        </TouchableOpacity>
      ))}
    </Animated.View>
  ), [settingsAnim, handleSettingsAction]);

  return (
    <>
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          <SafeAreaView style={styles.drawerContent}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.headerContainer}
              start={[1, 0]}
              end={[0, 1]}
            >
              <View style={styles.headerTopRow}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.buttonPressed]}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={moderateScale(28)}
                    color={COLORS.white}
                  />
                </Pressable>

                <Pressable
                  onPress={fetchUserDataFromAPI}
                  style={({ pressed }) => [styles.refreshButton, pressed && styles.buttonPressed]}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <MaterialIcons
                      name="refresh"
                      size={moderateScale(22)}
                      color={COLORS.white}
                    />
                  )}
                </Pressable>
              </View>

              <Animated.View
                style={[
                  styles.profileHeader,
                  { transform: [{ translateY: profileY }], opacity: profileOpacity },
                ]}
              >
                <TouchableOpacity
                  style={styles.profileCircle}
                  onPress={handleProfilePictureUpdate}
                  disabled={uploading}
                >
                  {uploading || loading ? (
                    <ActivityIndicator size="large" color={COLORS.white} />
                  ) : userData.picture ? (
                    <Image
                      source={{ uri: userData.picture }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <MaterialIcons
                      name="account-circle"
                      size={moderateScale(80)}
                      color={COLORS.white}
                    />
                  )}
                  <View style={styles.editProfileIcon}>
                    <MaterialIcons
                      name="edit"
                      size={moderateScale(12)}
                      color={COLORS.white}
                    />
                  </View>
                </TouchableOpacity>

                <TextDefault style={styles.welcomeText}>
                  {loading ? "Loading..." : `Welcome, ${userData.username || "User"}`}
                </TextDefault>

                {userData.contactNumber && (
                  <TextDefault style={styles.phoneText}>
                    {userData.contactNumber}
                  </TextDefault>
                )}

              </Animated.View>
            </LinearGradient>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {MENU_ITEMS.map(renderMenuItem)}

              <View style={styles.settingsContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={toggleSettings}>
                  <View style={styles.menuItemContent}>
                    <MaterialIcons
                      name="settings"
                      size={moderateScale(22)}
                      color={COLORS.textPrimary}
                    />
                    <TextDefault style={styles.menuItemText}>
                      Settings
                    </TextDefault>
                    <MaterialIcons
                      name={showSettings ? "expand-less" : "expand-more"}
                      size={moderateScale(22)}
                      color={COLORS.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
                {renderSettingsSubmenu()}
              </View>

              <View style={styles.spacerSmall} />

              <TouchableOpacity style={styles.menuItem} onPress={handleShareApp}>
                <View style={styles.menuItemContent}>
                  <MaterialIcons name="share" size={moderateScale(22)} color={COLORS.textPrimary} />
                  <TextDefault style={styles.menuItemText}>Share App</TextDefault>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleRateUs}>
                <View style={styles.menuItemContent}>
                  <MaterialIcons name="star-rate" size={moderateScale(22)} color={COLORS.textPrimary} />
                  <TextDefault style={styles.menuItemText}>Rate Us</TextDefault>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleApprefernavigate}>
                <View style={styles.menuItemContent}>
                  <MaterialIcons name="share" size={moderateScale(22)} color={COLORS.textPrimary} />
                  <TextDefault style={styles.menuItemText}>Refer App & Earn</TextDefault>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <View style={styles.menuItemContent}>
                  <MaterialIcons name="logout" size={moderateScale(22)} color={COLORS.error} />
                  <TextDefault style={[styles.menuItemText, styles.logoutText]}>
                    Logout
                  </TextDefault>
                </View>
              </TouchableOpacity>

              <View style={styles.footer}>
                <TextDefault style={styles.versionText}>
                  Version {Application.nativeApplicationVersion}
                </TextDefault>
              </View>

              <View style={styles.spacerLarge} />
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {previewModalVisible && (
        <Modal
          visible={previewModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewModalVisible(false)}
        >
          <View style={styles.previewModalContainer}>
            <View style={styles.previewModalContent}>
              <Text style={styles.previewTitle}>Profile Picture Preview</Text>

              {selectedImagePreview && (
                <Image
                  source={{ uri: selectedImagePreview.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}

              <View style={styles.previewButtonsContainer}>
                <TouchableOpacity
                  style={[styles.previewButton, styles.cancelButton]}
                  onPress={() => {
                    setPreviewModalVisible(false);
                    setSelectedImagePreview(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.previewButton, styles.useButton]}
                  onPress={handleUseImage}
                >
                  <Text style={styles.useButtonText}>Use Image</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000066",
  },
  overlayTouchable: {
    flex: 1,
  },

  // Drawer
  drawer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: COLORS.surface || COLORS.background || "#fff",
    ...theme.SHADOWS.xl,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(0,0,0,0.08)",
  },
  drawerContent: {
    flex: 1,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },

  // Header
  headerContainer: {
    paddingBottom: SIZES.padding.md,
    paddingTop: SIZES.padding.sm,
    borderBottomLeftRadius: 12,
    overflow: "hidden",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SIZES.padding.lg,
  },
  closeButton: {
    padding: 6,
    marginLeft: -6,
  },
  refreshButton: {
    padding: 6,
    marginRight: -6,
  },
  buttonPressed: {
    opacity: 0.6,
  },

  // Profile
  profileHeader: {
    paddingHorizontal: SIZES.padding.lg,
    alignItems: "center",
    marginTop: SIZES.padding.sm,
  },
  profileCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SIZES.padding.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    position: "relative",
    ...theme.SHADOWS.md,
  },
  profileImage: {
    width: moderateScale(96),
    height: moderateScale(96),
    borderRadius: moderateScale(48),
  },
  editProfileIcon: {
    position: "absolute",
    bottom: moderateScale(6),
    right: moderateScale(6),
    backgroundColor: COLORS.primary,
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: moderateScale(11),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  welcomeText: {
    ...FONTS.h5,
    color: COLORS.white || COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SIZES.xs,
  },
  phoneText: {
    ...FONTS.body,
    color: "rgba(255,255,255,0.9)",
    marginBottom: SIZES.xs,
  },
  walletBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: SIZES.padding.md,
    paddingVertical: SIZES.xs,
    borderRadius: 20,
    marginTop: SIZES.xs,
  },
  walletText: {
    ...FONTS.body,
    color: COLORS.white,
    marginLeft: SIZES.xs,
    fontWeight: "600",
  },

  // Menu Items
  menuItem: {
    paddingVertical: SIZES.padding.lg,
    paddingHorizontal: SIZES.padding.xl,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  menuItemActive: {
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    ...FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginLeft: SIZES.padding.md,
    flex: 1,
  },
  menuItemTextActive: {
    color: COLORS.primary,
  },
  logoutText: {
    color: COLORS.error,
  },

  // Settings
  settingsContainer: {
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  submenuContainer: {
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.02)",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginHorizontal: SIZES.padding.lg,
    marginBottom: SIZES.padding.sm,
  },
  submenuItem: {
    paddingVertical: SIZES.padding.md,
    paddingHorizontal: SIZES.padding.xl,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  submenuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: SIZES.padding.md,
  },
  submenuIcon: {
    marginRight: SIZES.padding.md,
  },
  submenuItemText: {
    ...FONTS.body,
    color: COLORS.textPrimary,
  },

  // Spacers
  spacerSmall: {
    height: 8,
  },
  spacerLarge: {
    height: 20,
  },

  // Footer
  footer: {
    marginTop: SIZES.padding.lg,
    paddingHorizontal: SIZES.padding.xl,
    alignItems: "center",
  },
  versionText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginBottom: SIZES.padding.md,
  },

  // Preview Modal
  previewModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  previewModalContent: {
    backgroundColor: COLORS.background || "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    ...theme.SHADOWS.xxl,
  },
  previewTitle: {
    ...FONTS.h5,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    marginBottom: 25,
    backgroundColor: "#f5f5f5",
  },
  previewButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 15,
  },
  previewButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.error + "20",
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  useButton: {
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cancelButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.error,
    fontWeight: "600",
  },
  useButtonText: {
    ...FONTS.bodyMedium,
    color: COLORS.white,
    fontWeight: "600",
  },
});

export default React.memo(DrawerMenu);
