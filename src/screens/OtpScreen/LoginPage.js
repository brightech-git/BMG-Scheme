import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { showToast } from "../../utils/toast";
import theme from "../../utils/AppTheme";
import styles from "./LoginStyles";
import userService from "../../services/UserService";
import { useNavigation } from "@react-navigation/native";
import { saveUserData } from "../../utils/AsynchStorageHelper";

const { COLORS, SIZES, FONTS } = theme;

function LoginPage({ route }) {
  const resetMpin = route?.params?.resetMpin ?? false;
  const [contactOrEmailOrUsername, setContactOrEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    contactOrEmailOrUsername: "",
    password: "",
  });
  const [touched, setTouched] = useState({
    contactOrEmailOrUsername: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigation = useNavigation();

  // ✅ Google Sign-In Config
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        "657047091285-hetgcscq8hvli59d0c6oqvg9aoat8850.apps.googleusercontent.com",
      iosClientId:
        "657047091285-57kkictc0pkfjldtf0u133m82huit6rg.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      offlineAccess: true,
    });
  }, []);

  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };

    switch (fieldName) {
      case "contactOrEmailOrUsername":
        if (!value.trim()) {
          newErrors.contactOrEmailOrUsername = "Please enter email or phone number";
        } else if (!isValidEmailOrPhone(value)) {
          newErrors.contactOrEmailOrUsername = "Please enter a valid email or phone number";
        } else {
          newErrors.contactOrEmailOrUsername = "";
        }
        break;

      case "password":
        if (!value.trim()) {
          newErrors.password = "Please enter password";
        } else if (value.length < 6) {
          newErrors.password = "Password must be at least 6 characters";
        } else {
          newErrors.password = "";
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const isValidEmailOrPhone = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    return emailRegex.test(value) || phoneRegex.test(value.replace(/\D/g, ""));
  };

  const handleFieldChange = (fieldName, value) => {
    switch (fieldName) {
      case "contactOrEmailOrUsername":
        setContactOrEmailOrUsername(value);
        break;
      case "password":
        setPassword(value);
        break;
    }
    if (touched[fieldName]) validateField(fieldName, value);
  };

  const handleFieldBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    validateField(
      fieldName,
      fieldName === "contactOrEmailOrUsername" ? contactOrEmailOrUsername : password
    );
  };

  // ✅ Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      if (!hasPlayServices) throw new Error("Google Play Services unavailable");

      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      const idToken = tokens?.idToken || userInfo?.idToken;

      if (!idToken) throw new Error("No ID token from Google");
      await handleGoogleAuthentication(idToken, userInfo.user);
    } catch (error) {
      handleGoogleSignInError(error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSignInError = (error) => {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        showToast("Google sign-in cancelled");
        break;
      case statusCodes.IN_PROGRESS:
        showToast("Google sign-in already in progress");
        break;
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        showToast("Google Play Services unavailable");
        break;
      default:
        showToast(`Google sign-in failed: ${error.message || "Try again"}`);
    }
  };

  // ✅ Google Auth to backend
  const handleGoogleAuthentication = async (idToken, userInfo = null) => {
    try {
      const payload = { idToken, userInfo };
      const response = await userService.googleLogin(payload);

      if (response.success && response.data) {

        const { id, email, username, message, contactNumber } = response.data;

        await saveUserData(response.data);

        showToast(message || "Logged in successfully with Google");

        if (!contactNumber || contactNumber.trim() === "") {
          navigation.navigate("EnterNumber", { userId: id, email, username });
        } else {
          navigation.navigate(resetMpin ? "ForgotMpin" : "VerifyMpinScreen");
        }
      } else {
        showToast(response.error || "Google authentication failed");
      }
    } catch (error) {
      showToast("Authentication failed. Please try again.");
    }
  };

  // ✅ Regular Login
  const handleLogin = async () => {
    const allTouched = { contactOrEmailOrUsername: true, password: true };
    setTouched(allTouched);

    validateField("contactOrEmailOrUsername", contactOrEmailOrUsername);
    validateField("password", password);

    const hasErrors =
      Object.values(errors).some((error) => error !== "") ||
      !contactOrEmailOrUsername ||
      !password;

    if (hasErrors) {
      showToast("Please fix all errors before submitting");
      return;
    }

    setLoading(true);
    try {
      const res = await userService.loginUser({
        contactOrEmailOrUsername,
        password,
      });

      if (res.success && res.data?.token) {

        const normalizedData = {
          ...res.data,
          contactNumber: res.data.contactNumber || res.data.contact || "",
        };

        await saveUserData(normalizedData);

        showToast("Login successful!");
        navigation.replace(resetMpin ? "ForgotMpin" : "MpinScreen");
      } else {
        showToast(res.error || "Invalid credentials");
        setErrors((prev) => ({
          ...prev,
          password: "Invalid email/phone or password",
        }));
      }
    } catch (err) {
      showToast(err.message || "Network error");
      setErrors((prev) => ({
        ...prev,
        password: "Network error. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => navigation.navigate("RegisterPage");

  const RequiredLabel = ({ children }) => (
    <Text style={styles.label}>
      {children}
      <Text style={styles.requiredStar}> *</Text>
    </Text>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                <Text style={styles.title}>Login</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>

                {/* Email/Phone Field */}
                <RequiredLabel>Email or Phone</RequiredLabel>
                <TextInput
                  style={[styles.input, errors.contactOrEmailOrUsername && styles.inputError]}
                  value={contactOrEmailOrUsername}
                  onChangeText={(value) =>
                    handleFieldChange("contactOrEmailOrUsername", value)
                  }
                  onBlur={() => handleFieldBlur("contactOrEmailOrUsername")}
                  placeholder="Enter email or phone"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                />
                {errors.contactOrEmailOrUsername ? (
                  <Text style={styles.errorText}>{errors.contactOrEmailOrUsername}</Text>
                ) : null}

                {/* Password Field */}
                <RequiredLabel>Password</RequiredLabel>
                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={(value) => handleFieldChange("password", value)}
                    onBlur={() => handleFieldBlur("password")}
                    placeholder="Enter password"
                    placeholderTextColor={COLORS.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconContainer}
                  >
                    <Image
                      source={
                        showPassword
                          ? require("../../assets/icons/eyeopen.png")
                          : require("../../assets/icons/eyeclose.png")
                      }
                      style={styles.eyeIcon}
                    />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("EnterNumber", { mode: "forgot" })
                  }
                  style={styles.forgotPasswordContainer}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.disabledButton]}
                  onPress={handleLogin}
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
                      <Text style={styles.primaryButtonText}>Login</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.divider} />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  style={[styles.googleButton, googleLoading && styles.disabledButton]}
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                >

                  {googleLoading ? (
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

                {/* Register */}
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Don't have an account?</Text>
                  <TouchableOpacity onPress={navigateToRegister}>
                    <Text style={styles.registerLink}> Register</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {(loading || googleLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>
              {googleLoading ? "Signing in with Google..." : "Processing..."}
            </Text>
          </View>
        )}
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

export default LoginPage;