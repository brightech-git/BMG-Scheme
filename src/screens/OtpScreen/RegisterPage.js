import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
const OtpVerifyLib = Platform.OS === "android" ? require("react-native-otp-verify") : {};
const { getHash = () => Promise.resolve([]) } = OtpVerifyLib;
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { showToast } from "../../utils/toast";
import theme from "../../utils/AppTheme";
import styles from "./RegisterStyles";
import userService from "../../services/UserService";
import { saveUserData } from "../../utils/AsynchStorageHelper";

const { COLORS, SIZES } = theme;

function RegisterPage({ navigation }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    referralCode: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [errors, setErrors] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    phone: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [appHash, setAppHash] = useState("");

  // Validation rules
  const validationRules = {
    username: (value) => {
      if (!value.trim()) return "Please enter username";
      if (value.trim().length < 3) return "Username must be at least 3 characters";
      return "";
    },
    email: (value) => {
      if (!value.trim()) return "Please enter email address";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address";
      return "";
    },
    phone: (value) => {
      if (!value.trim()) return "Please enter mobile number";
      if (!/^[6-9]\d{9}$/.test(value)) return "Please enter a valid 10-digit Indian mobile number";
      return "";
    },
    password: (value) => {
      if (!value.trim()) return "Please enter password";
      if (value.length < 6) return "Password must be at least 6 characters";
      return "";
    }
  };

  // ✅ Google Sign-In Config & App Hash
  useEffect(() => {
    initializeGoogleSignIn();
    initializeAppHash();
  }, []);

  const initializeGoogleSignIn = useCallback(() => {
    if (Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId: "657047091285-hetgcscq8hvli59d0c6oqvg9aoat8850.apps.googleusercontent.com",
        scopes: ["profile", "email"],
        offlineAccess: true,
      });
    }
  }, []);

  const initializeAppHash = useCallback(async () => {
    try {
      if (Platform.OS === "android") {
        const hashCodes = await getHash();
        if (hashCodes?.[0]) {
          setAppHash(hashCodes[0]);
        }
      }
    } catch (error) {
      console.error("Error getting app hash:", error);
    }
  }, []);

  // Validation functions
  const validateField = useCallback((fieldName, value) => {
    const error = validationRules[fieldName](value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  const handleFieldChange = useCallback((fieldName, value) => {
    let processedValue = value;
    
    if (fieldName === "phone") {
      processedValue = value.replace(/\D/g, "").slice(0, 10);
    } else if (fieldName === "referralCode") {
      // Convert to uppercase and remove spaces
      processedValue = value.trim().toUpperCase();
      // Clear any referral error when user types
      setReferralError("");
      
      // Auto-mark as applied if it has minimum length
      if (processedValue.length >= 4) {
        setReferralApplied(true);
      } else {
        setReferralApplied(false);
        if (processedValue.length > 0) {
          setReferralError("Referral code must be at least 4 characters");
        }
      }
    }

    setFormData(prev => ({ ...prev, [fieldName]: processedValue }));

    if (touched[fieldName]) {
      validateField(fieldName, processedValue);
    }
  }, [touched, validateField]);

  const handleFieldBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, formData[fieldName]);
  }, [formData, validateField]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const toggleReferralInput = useCallback(() => {
    setShowReferralInput(prev => !prev);
    if (showReferralInput) {
      setFormData(prev => ({ ...prev, referralCode: "" }));
      setReferralApplied(false);
      setReferralError("");
    }
  }, [showReferralInput]);

  // ✅ Handle Google Sign-In
  const handleGoogleSignIn = useCallback(async () => {
    try {
      setSocialLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) throw new Error("No ID token from Google");
      await handleSocialAuthentication(idToken, "google");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      handleGoogleSignInError(error);
    } finally {
      setSocialLoading(false);
    }
  }, []);

  const handleGoogleSignInError = useCallback((error) => {
    const errorMessages = {
      [statusCodes.SIGN_IN_CANCELLED]: "Google sign-in cancelled",
      [statusCodes.IN_PROGRESS]: "Google sign-in already in progress",
      [statusCodes.PLAY_SERVICES_NOT_AVAILABLE]: "Google Play Services unavailable",
    };

    showToast(errorMessages[error.code] || `Google sign-in failed: ${error.message || "Try again"}`);
  }, []);

  // ✅ Apple Sign-In
  const handleAppleSignIn = useCallback(async () => {
    try {
      setSocialLoading(true);
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        showToast("Apple Sign-In is not available on this device");
        return;
      }
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const idToken = credential.identityToken;
      if (!idToken) throw new Error("No identity token from Apple");
      await handleSocialAuthentication(idToken, "apple");
    } catch (error) {
      if (error.code === "ERR_REQUEST_CANCELED") return;
      showToast(error.message || "Apple sign-in failed");
    } finally {
      setSocialLoading(false);
    }
  }, []);

  // ✅ Social Auth to backend (Google or Apple)
  const handleSocialAuthentication = useCallback(async (idToken, provider) => {
    try {
      const payload = { idToken, used_referral_code: formData.referralCode.trim() || "" };
      const response = provider === "apple"
        ? await userService.appleLogin(payload)
        : await userService.googleLogin(payload);

      if (response.success && response.data) {
        const { id, email, username, message, contactNumber } = response.data;
        await saveUserData(response.data);
        showToast(message || `Logged in successfully with ${provider === "apple" ? "Apple" : "Google"}`);
        if (!contactNumber || contactNumber.trim() === "") {
          navigation.navigate("GoogleContactUpdate", { userId: id, email, username });
        } else {
          navigation.navigate("MpinScreen", { step: 3 });
        }
      } else {
        showToast(response.error || `${provider === "apple" ? "Apple" : "Google"} authentication failed`);
      }
    } catch (error) {
      console.error("Social authentication error:", error);
      showToast("Authentication failed. Please try again.");
    }
  }, [navigation, formData.referralCode]);

  const validateAllFields = useCallback(() => {
    const allTouched = Object.keys(formData).reduce((acc, key) => {
      if (key !== "referralCode") {
        acc[key] = true;
      }
      return acc;
    }, {});
    setTouched(allTouched);

    Object.keys(formData).forEach(key => {
      if (key !== "referralCode") {
        validateField(key, formData[key]);
      }
    });

    return Object.values(errors).every(error => error === "") && 
           Object.values(formData).every(value => 
             value === formData.referralCode || value.trim() !== ""
           );
  }, [formData, errors, validateField]);

  const handleRegister = useCallback(async () => {
    if (!validateAllFields()) {
      showToast("Please fix all errors before submitting");
      return;
    }

    // Validate referral code if entered
    if (formData.referralCode.trim() && formData.referralCode.trim().length < 4) {
      setReferralError("Referral code must be at least 4 characters");
      showToast("Please enter a valid referral code");
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        contactNumber: formData.phone,
        password: formData.password,
        hashKey: appHash || "",
        used_referral_code: formData.referralCode.trim() || ""
      };

      console.log("📤 Sending registration data:", registrationData);

      const res = await userService.registerUser(registrationData);

      console.log("📥 Registration response:", res);

      if (res.success) {
        await AsyncStorage.setItem(
          "tempUserData",
          JSON.stringify({
            username: formData.username,
            email: formData.email,
            phone: formData.phone,
            password: formData.password,
            appHash,
            used_referral_code: formData.referralCode || ""
          })
        );

        console.log("✅ Registration successful!");
        showToast("Registration successful! OTP sent.");
        navigation.navigate("OTP", {
          phoneNumber: formData.phone,
          appHash: appHash,
        });
      } else {
        handleRegistrationError(res.error, res.details);
      }
    } catch (error) {
      console.error("🚨 Registration error:", error);
      console.error("🚨 Error response:", error.response?.data);
      showToast("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [formData, appHash, navigation, validateAllFields]);

  const handleRegistrationError = useCallback((error, details = {}) => {
    const errorMessage = error?.toString()?.toLowerCase() || "";
    const detailsMessage = details?.message?.toString()?.toLowerCase() || "";

    const errorHandlers = [
      {
        condition: () => errorMessage.includes("email already exists") || 
                      detailsMessage.includes("email already exists") ||
                      details.message === "Email already exists",
        action: () => {
          showToast("This email is already registered. Please use another email or login.");
          setFormData(prev => ({ ...prev, email: "" }));
          setErrors(prev => ({ ...prev, email: "This email is already registered" }));
          setTimeout(() => {
            Alert.alert(
              "Email Already Exists",
              "This email is already registered. Would you like to login?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Login",
                  onPress: () => navigation.navigate("LoginPage", { prefillEmail: formData.email }),
                },
              ]
            );
          }, 1500);
        }
      },
      {
        condition: () => errorMessage.includes("contact number already exists") || 
                      errorMessage.includes("phone already exists") || 
                      errorMessage.includes("number already exists") ||
                      detailsMessage.includes("contact number already exists") ||
                      detailsMessage.includes("phone already exists") ||
                      detailsMessage.includes("number already exists"),
        action: () => {
          setErrors(prev => ({ ...prev, phone: "This phone number is already registered" }));
          Alert.alert(
            "Number Already Registered",
            "This phone number is already registered. Would you like to login instead?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Login",
                onPress: () => navigation.navigate("LoginPage", { prefillPhone: formData.phone }),
              },
            ]
          );
        }
      },
      {
        condition: () => errorMessage.includes("username already exists") || 
                      detailsMessage.includes("username already exists"),
        action: () => {
          showToast("This username is already taken. Please choose another or login with existing account.");
          setFormData(prev => ({ ...prev, username: "" }));
          setErrors(prev => ({ ...prev, username: "This username is already taken" }));
          setTimeout(() => {
            Alert.alert(
              "Username Already Exists",
              "This username is already taken. Would you like to login?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Login", onPress: () => navigation.navigate("LoginPage") },
              ]
            );
          }, 1500);
        }
      }
    ];

    const handler = errorHandlers.find(h => h.condition());
    if (handler) {
      handler.action();
      return;
    }

    showToast(error || details.message || "Registration failed");
  }, [formData, navigation]);

  const navigateToLogin = useCallback(() => {
    navigation.navigate("LoginPage");
  }, [navigation]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const RequiredLabel = useCallback(({ children }) => (
    <Text style={styles.label}>
      {children}
      <Text style={styles.requiredStar}> *</Text>
    </Text>
  ), []);

  const renderInputField = useCallback((fieldName, props = {}) => {
    const commonProps = {
      style: [styles.input, errors[fieldName] && styles.inputError],
      value: formData[fieldName],
      onChangeText: (value) => handleFieldChange(fieldName, value),
      onBlur: () => handleFieldBlur(fieldName),
      placeholderTextColor: COLORS.textTertiary,
      autoCapitalize: "none",
      autoCorrect: false,
      ...props
    };

    return (
      <>
        <TextInput {...commonProps} />
        {errors[fieldName] ? (
          <Text style={styles.errorText}>{errors[fieldName]}</Text>
        ) : null}
      </>
    );
  }, [formData, errors, handleFieldChange, handleFieldBlur]);

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ImageBackground
        source={require("../../assets/image.png")}
        style={styles.backgroundImage}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? SIZES.xxl : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.container}>
              <View style={styles.logoContainer}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logoImage}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>Create Account</Text>

                {/* Username Field */}
                <RequiredLabel>Username</RequiredLabel>
                {renderInputField("username", {
                  placeholder: "Enter username"
                })}

                {/* Email Field */}
                <RequiredLabel>Email</RequiredLabel>
                {renderInputField("email", {
                  placeholder: "Enter email",
                  keyboardType: "email-address"
                })}

                {/* Mobile Number Field */}
                <RequiredLabel>Mobile Number</RequiredLabel>
                <View style={[
                  styles.inputContainer,
                  (errors.phone || !/^[6-9]\d{9}$/.test(formData.phone)) &&
                    touched.phone &&
                    styles.inputError,
                ]}>
                  <Text style={styles.countryCode}>+91</Text>
                  <TextInput
                    style={styles.phoneInput}
                    value={formData.phone}
                    onChangeText={(value) => handleFieldChange("phone", value)}
                    onBlur={() => handleFieldBlur("phone")}
                    placeholder="Enter 10-digit number"
                    placeholderTextColor={COLORS.textTertiary}
                    maxLength={10}
                    keyboardType="phone-pad"
                  />
                </View>
                {errors.phone ? (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                ) : null}

                {/* Password Field */}
                <RequiredLabel>Password</RequiredLabel>
                <View style={[
                  styles.passwordContainer,
                  errors.password && styles.inputError,
                ]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.password}
                    onChangeText={(value) => handleFieldChange("password", value)}
                    onBlur={() => handleFieldBlur("password")}
                    placeholder="Enter password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={togglePasswordVisibility}
                  >
                    <Image
                      source={
                        showPassword
                          ? require("../../assets/icons/eyeopen.png")
                          : require("../../assets/icons/eyeclose.png")
                      }
                      style={styles.eyeIconImage}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}

                {/* Referral Code Section */}
                <TouchableOpacity
                  style={styles.referralToggleContainer}
                  onPress={toggleReferralInput}
                >
                  <Text style={styles.referralToggleText}>
                    {showReferralInput ? "Cancel referral code" : "Have a referral code?"}
                  </Text>
                  <Image
                    source={require("../../assets/icons/down.png")}
                    style={[
                      styles.chevronIcon,
                      showReferralInput && styles.chevronIconRotated
                    ]}
                  />
                </TouchableOpacity>

                {showReferralInput && (
                  <View style={styles.referralContainer}>
                    <View style={[
                      styles.referralInputContainer,
                      referralError && styles.inputError,
                      referralApplied && styles.referralApplied
                    ]}>
                      <TextInput
                        style={styles.referralInput}
                        value={formData.referralCode}
                        onChangeText={(value) => handleFieldChange("referralCode", value)}
                        placeholder="Enter referral code"
                        placeholderTextColor={COLORS.textTertiary}
                        autoCapitalize="characters"
                        maxLength={20}
                      />
                    </View>
                    {referralError ? (
                      <Text style={styles.errorText}>{referralError}</Text>
                    ) : null}
                    {referralApplied && formData.referralCode.length >= 10 ? (
                      <Text style={styles.referralSuccessText}>
                        Referral code will be applied
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Register Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={COLORS.gradient.brand}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Social Buttons */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={[styles.googleButton, socialLoading && styles.disabledButton]}
                    onPress={handleAppleSignIn}
                    disabled={socialLoading}
                  >
                    {socialLoading ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <View style={styles.googleButtonContent}>
                        <Text style={[styles.googleButtonText, { fontSize: 18, marginRight: SIZES.md }]}>
                          
                        </Text>
                        <Text style={styles.googleButtonText}>Continue with Apple</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.googleButton, socialLoading && styles.disabledButton]}
                    onPress={handleGoogleSignIn}
                    disabled={socialLoading}
                  >
                    {socialLoading ? (
                      <ActivityIndicator color={COLORS.primary} />
                    ) : (
                      <View style={styles.googleButtonContent}>
                        <Image
                          source={require("../../assets/icons/google.png")}
                          style={styles.googleIcon}
                        />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Already have an account?</Text>
                  <TouchableOpacity onPress={navigateToLogin}>
                    <Text style={styles.loginLink}> Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Loading Overlay */}
          {(loading || socialLoading) && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {socialLoading ? "Signing in..." : "Creating your account..."}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

export default RegisterPage;