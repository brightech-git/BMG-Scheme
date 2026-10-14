import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
  Linking,
  Modal,
  BackHandler,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BottomTab } from "../../components";
import { COLORS } from "../../utils/AppTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import WebView from "react-native-webview";
import { digiLockerService } from "../../services/DigiLockerService";
import {
  validateAadhaar,
  validatePAN,
  validateMobile,
  validateEmail,
  validatePincode,
  validateName,
  validateDOB,
  validateNomineeName,
  validateAddressField,
} from "./Validations";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { styles } from "./MemberStyles";
import { API_BASE_URL } from "../../Config/API";

// helpers.js
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const parseAddress = (address1, address2) => {
  return { 
    doorNo: address1 || "", 
    street: address2 || "", 
    area: "" 
  };
};

export const formatDateDisplay = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

export const formatDateForAPI = (dateString) => {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString;
};

export const extractAddressFromSplit = (splitAddress) => {
  if (!splitAddress) return "";

  const parts = [
    splitAddress.house || "",
    splitAddress.street || "",
    splitAddress.landmark || "",
    splitAddress.loc || "",
    splitAddress.vtc || splitAddress.village || "",
    splitAddress.po || "",
    splitAddress.subdist || "",
    splitAddress.dist || "",
    splitAddress.state || "",
    splitAddress.country || "",
    splitAddress.pincode || "",
  ].filter((part) => part.trim() !== "");

  return parts.join(", ");
};

export const formatGender = (genderChar) => {
  switch (genderChar?.toUpperCase()) {
    case "M":
      return "male";
    case "F":
      return "female";
    case "T":
      return "transgender";
    default:
      return "other";
  }
};

export const getMaskedAadhaar = (aadhaar) => {
  if (!aadhaar || aadhaar.length !== 12) return "";
  return `XXXX-XXXX-${aadhaar.substring(8)}`;
};

export const extractLast4FromMaskedAadhaar = (maskedAadhaar) => {
  if (!maskedAadhaar) return "";
  const match = maskedAadhaar.match(/(\d{4})$/);
  return match ? match[1] : "";
};

export const extractLast4FromAadhaar = (aadhaar) => {
  if (!aadhaar) return "";
  const cleanAadhaar = aadhaar.replace(/\s/g, "");
  if (cleanAadhaar.length >= 4) {
    return cleanAadhaar.substring(cleanAadhaar.length - 4);
  }
  return "";
};

export const getInitial = (name) => {
  if (!name || name.trim().length === 0) return "";
  return name.trim().charAt(0).toUpperCase();
};

const INITIAL_FORM = {
  name: "",
  mobile: "",
  email: "",
  dateOfBirth: "",
  maritalStatus: "",
  anniversaryDate: "",
  doorNo: "",
  street: "",
  area: "",
  pincode: "",
  city: "",
  state: "",
  nomeni: "",
  mobile2: "",
  panNumber: "",
  aadharNumber: "",
  nomineeAadhaarNumber: "",
  nomineeAadhaarVerified: false,
  nomineeAadhaarVerificationId: "",
  nomineeName: "",
  nomineeDOB: "",
  nomineeGender: "",
  nomineeAddress: "",
  nomineeCareOf: "",
  nomineeYearOfBirth: "",
  nomineeRelationship: "Spouse",
  nomAddr1: "",
  nomAddr2: "",
  nomCity: "",
  nomState: "",
  nomPincode: "",
  nomCountry: "India",
  selectedSchemeId: null,
  selectedSchemeName: "",
};

const MemberDetailsPage = ({
  onNext,
  onBack,
  validationErrors,
  setValidationErrors,
  initialSchemeId,
  initialSchemeName,
}) => {
  // Refs
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});
  const navigation = useNavigation();

  // States
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [isAadhaarDifferentConfirmed, setIsAadhaarDifferentConfirmed] =
    useState(false);
  const [selectedScheme, setSelectedScheme] = useState({
    id: initialSchemeId || null,
    name: initialSchemeName || "Select a Scheme",
  });
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [selectedDate, setSelectedDate] = useState({
    day: "01",
    month: "01",
    year: "1990",
  });
  const [isAadhaarValid, setIsAadhaarValid] = useState(false);
  const [isValidatingAadhaar, setIsValidatingAadhaar] = useState(false);
  const [nomineeAadhaarStatus, setNomineeAadhaarStatus] = useState({
    isVerified: false,
    isVerifying: false,
    verificationId: "",
    message: "",
    aadhaarData: null,
  });
  const [showDigiLockerWebView, setShowDigiLockerWebView] = useState(false);
  const [digiLockerUrl, setDigiLockerUrl] = useState("");
  const [verificationPolling, setVerificationPolling] = useState(null);
  const [failureHandled, setFailureHandled] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [userData, setUserData] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    (async () => {
      const storedUserId = await AsyncStorage.getItem("userId");
      setUserId(storedUserId);
    })();
  }, []);

  const completeVerification = useCallback(() => {
    if (verificationPolling) {
      clearInterval(verificationPolling);
      setVerificationPolling(null);
    }
    
    setShowDigiLockerWebView(false);
    
    Alert.alert(
      "Verification Pending",
      "Your verification is being processed. Please wait a moment for the results.",
      [{ text: "OK" }]
    );
  }, [verificationPolling]);

  const checkStatusAndComplete = useCallback(() => {
    Alert.alert(
      "Check Verification",
      "Have you completed the verification in DigiLocker?",
      [
        
        {
          text: "Cancel Verification",
          onPress: () => {
            setShowDigiLockerWebView(false);
            
            if (verificationPolling) {
              clearInterval(verificationPolling);
              setVerificationPolling(null);
            }
            
            setNomineeAadhaarStatus({
              isVerified: false,
              isVerifying: false,
              verificationId: "",
              message: "",
              aadhaarData: null,
            });
            
            setFormData(prev => ({
              ...prev,
              nomineeAadhaarVerified: false,
              nomineeAadhaarVerificationId: "",
            }));
            
            Alert.alert(
              "Verification Cancelled",
              "You can try again or proceed with manual verification.",
              [{ text: "OK" }]
            );
          },
          style: "destructive",
        },
      ]
    );
  }, [completeVerification, verificationPolling]);

  const displayMaskedAadhaar = (aadhaar) => {
    if (!aadhaar || aadhaar.length < 12) return "XXXX-XXXX-XXXX";
    const cleanAadhaar = aadhaar.replace(/\s/g, "");
    return `XXXX-XXXX-${cleanAadhaar.substring(8)}`;
  };

  const getUserAadhaarLast4 = useCallback(() => {
    if (userData?.maskedAadhaar) {
      return extractLast4FromMaskedAadhaar(userData.maskedAadhaar);
    }
    if (formData.aadharNumber) {
      return extractLast4FromAadhaar(formData.aadharNumber);
    }
    return "";
  }, [userData, formData.aadharNumber]);

  const isSameAadhaar = useCallback(() => {
    const nomineeAadhaar = formData.nomineeAadhaarNumber.replace(/\s/g, "");
    if (!nomineeAadhaar || nomineeAadhaar.length !== 12) return false;

    const userLast4 = getUserAadhaarLast4();
    const nomineeLast4 = nomineeAadhaar.substring(8);

    if (userLast4 && userLast4 === nomineeLast4) {
      return true;
    }

    const userAadhaar = formData.aadharNumber.replace(/\s/g, "");
    if (
      userAadhaar &&
      userAadhaar.length === 12 &&
      userAadhaar === nomineeAadhaar
    ) {
      return true;
    }

    return false;
  }, [
    formData.nomineeAadhaarNumber,
    formData.aadharNumber,
    getUserAadhaarLast4,
  ]);

  const currentYear = new Date().getFullYear();
  const { days, months, years } = useMemo(
    () => ({
      days: Array.from({ length: 31 }, (_, i) =>
        (i + 1).toString().padStart(2, "0")
      ),
      months: Array.from({ length: 12 }, (_, i) =>
        (i + 1).toString().padStart(2, "0")
      ),
      years: Array.from({ length: currentYear - 1900 + 1 }, (_, i) =>
        (currentYear - i).toString()
      ),
    }),
    [currentYear]
  );

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUserId = await AsyncStorage.getItem("userId");

        if (!currentUserId) {
          console.log("No userId available");
          Alert.alert(
            "Registration Required",
            "Please complete your KYC registration first.",
            [
              {
                text: "Register Now",
                onPress: () => {
                  navigation.navigate("MemberDetailsPage");
                },
              },
            ]
          );
          setApiLoading(false);
          return;
        }

        setApiLoading(true);
        const response = await fetch(`${API_BASE_URL}/user/${currentUserId}`);

        if (!response.ok) {
          if (response.status === 404) {
            Alert.alert(
              "User Not Found",
              "Your profile was not found. Please complete your KYC registration.",
              [
                {
                  text: "Register Now",
                  onPress: () => {
                    AsyncStorage.removeItem("userId");
                    navigation.navigate("UserRegisterForm");
                  },
                },
              ]
            );
            setApiLoading(false);
            return;
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || Object.keys(data).length === 0 || !data.id) {
          Alert.alert(
            "Incomplete Profile",
            "Your profile is incomplete. Please complete your KYC registration.",
            [
              {
                text: "Complete Registration",
                onPress: () => {
                  navigation.navigate("UserRegisterForm");
                },
              },
            ]
          );
          setApiLoading(false);
          return;
        }

        const hasBasicKYC = data.contactNumber && data.email && data.username;
        const hasFullKYC = data.aadhaarVerified && 
                          data.dateOfBirth && 
                          data.pincode && 
                          data.address1;

        if (!data.aadhaarVerified || !hasBasicKYC) {
          Alert.alert(
            "KYC Required",
            "Please complete your KYC registration to proceed.",
            [
              {
                text: "Complete KYC",
                onPress: () => {
                  navigation.navigate("UserRegisterForm", { 
                    userId: data.id,
                    prefillData: {
                      username: data.username,
                      email: data.email,
                      contactNumber: data.contactNumber
                    }
                  });
                },
              }
              
            ]
          );
          setApiLoading(false);
          return;
        }

        setUserData(data);

        if (hasFullKYC) {
          const addressParts = parseAddress(data.address1, data.address2);

          const updatedForm = {
            name: data.username || "",
            mobile: data.contactNumber || "",
            email: data.email || "",
            dateOfBirth: data.dateOfBirth || "",
            pincode: data.pincode || "",
            city: data.city || "",
            state: data.state || "",
            doorNo: addressParts.doorNo || "",
            street: addressParts.street || "",
            area: data.city || "",
            aadharNumber: data.maskedAadhaar || "",
          };

          setFormData((prev) => ({ ...prev, ...updatedForm }));
          setIsAadhaarValid(data.aadhaarVerified || false);
          
          if (data.dateOfBirth) {
            const [year, month, day] = data.dateOfBirth.split("-");
            setSelectedDate({ day, month, year });
          }
        }

      } catch (error) {
        console.error("Error fetching user data:", error);
        
        if (error.message.includes("Network request failed")) {
          Alert.alert(
            "Network Error",
            "Unable to connect to server. Please check your internet connection.",
            [
              {
                text: "Try Again",
                onPress: () => fetchUserData(),
              },
              {
                text: "Register Offline",
                onPress: () => {
                  navigation.navigate("UserRegisterPage");
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Registration Required",
            "Unable to load your profile. Please complete your KYC registration first.",
            [
              {
                text: "Register Now",
                onPress: () => {
                  navigation.navigate("UserRegisterForm");
                },
              },
            ]
          );
        }
      } finally {
        setApiLoading(false);
      }
    };

    fetchUserData();
  }, [userId, navigation]);

  const getUserDataForStorage = useCallback(() => {
    return {
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      dateOfBirth: formData.dateOfBirth,
      maritalStatus: formData.maritalStatus,
      anniversaryDate: formData.anniversaryDate,
      doorNo: formData.doorNo,
      street: formData.street,
      area: formData.area,
      pincode: formData.pincode,
      city: formData.city,
      state: formData.state,
      panNumber: formData.panNumber,
      aadharNumber: formData.aadharNumber,
      selectedSchemeId: selectedScheme.id,
      selectedSchemeName: selectedScheme.name,
    };
  }, [formData, selectedScheme]);

  useEffect(() => {
    if (apiLoading) return;

    const saveUserData = async () => {
      const userDataToSave = getUserDataForStorage();

      try {
        await AsyncStorage.setItem(
          "digigoldUserData",
          JSON.stringify(userDataToSave)
        );
      } catch (error) {
        console.error("Save error:", error);
      }
    };

    saveUserData();
  }, [getUserDataForStorage, apiLoading]);

  useEffect(() => {
    if (apiLoading) return;

    const loadInitialData = async () => {
      try {
        const [savedUserData, savedMemberForm, email, username] = await Promise.all([
          AsyncStorage.getItem("digigoldUserData"),
          AsyncStorage.getItem("digigoldMemberForm"),
          AsyncStorage.getItem("userEmail"),
          AsyncStorage.getItem("username"),
        ]);

        const userDataFromStorage = savedUserData ? JSON.parse(savedUserData) : {};
        const memberForm = savedMemberForm ? JSON.parse(savedMemberForm) : {};

        setFormData((prev) => ({
          ...prev,
          email: prev.email || email || userDataFromStorage.email || "",
          name: prev.name || username || userDataFromStorage.name || "",
          maritalStatus: memberForm.maritalStatus || userDataFromStorage.maritalStatus || prev.maritalStatus || "",
          anniversaryDate: memberForm.anniversaryDate || userDataFromStorage.anniversaryDate || prev.anniversaryDate || "",
          panNumber: memberForm.panNumber || userDataFromStorage.panNumber || prev.panNumber || "",
          // Restore nominee fields from saved form
          nomeni: memberForm.nomeni || prev.nomeni || "",
          mobile2: memberForm.mobile2 || prev.mobile2 || "",
          nomineeAadhaarNumber: memberForm.nomineeAadhaarNumber || prev.nomineeAadhaarNumber || "",
          nomineeAadhaarVerified: memberForm.nomineeAadhaarVerified || false,
          nomineeAadhaarVerificationId: memberForm.nomineeAadhaarVerificationId || "",
          // nomineeName: memberForm.nomineeName || prev.nomineeName || "",
          nomineeDOB: memberForm.nomineeDOB || prev.nomineeDOB || "",
          nomineeGender: memberForm.nomineeGender || prev.nomineeGender || "",
          nomineeAddress: memberForm.nomineeAddress || prev.nomineeAddress || "",
          nomineeCareOf: memberForm.nomineeCareOf || prev.nomineeCareOf || "",
          nomineeYearOfBirth: memberForm.nomineeYearOfBirth || prev.nomineeYearOfBirth || "",
          nomineeRelationship: memberForm.nomineeRelationship || prev.nomineeRelationship || "Spouse",
          nomAddr1: memberForm.nomAddr1 || prev.nomAddr1 || "",
          nomAddr2: memberForm.nomAddr2 || prev.nomAddr2 || "",
          nomCity: memberForm.nomCity || prev.nomCity || "",
          nomState: memberForm.nomState || prev.nomState || "",
          nomPincode: memberForm.nomPincode || prev.nomPincode || "",
          nomCountry: memberForm.nomCountry || prev.nomCountry || "India",
          selectedSchemeId: initialSchemeId || memberForm.selectedSchemeId || null,
          selectedSchemeName: initialSchemeName || memberForm.selectedSchemeName || "",
        }));

        if (initialSchemeId || memberForm.selectedSchemeId) {
          setSelectedScheme({
            id: initialSchemeId || memberForm.selectedSchemeId,
            name: initialSchemeName || memberForm.selectedSchemeName || "Select a Scheme",
          });
        }

        // Restore nominee verification status if previously verified
        if (memberForm.nomineeAadhaarVerified && memberForm.nomineeAadhaarVerificationId) {
          setNomineeAadhaarStatus({
            isVerified: true,
            isVerifying: false,
            verificationId: memberForm.nomineeAadhaarVerificationId,
            message: "Nominee Aadhaar verified",
            aadhaarData: memberForm.nomineeAadhaarData || null,
          });
        }
      } catch (error) {
        console.error("Load error:", error);
      }
    };

    loadInitialData();
  }, [apiLoading, initialSchemeId, initialSchemeName, userData]);

  useEffect(() => {
    if (apiLoading) return;

    const saveFormData = async () => {
      const dataToSave = {
        ...formData,
        selectedSchemeId: selectedScheme.id,
        selectedSchemeName: selectedScheme.name,
        nomineeAadhaarVerified: nomineeAadhaarStatus.isVerified,
        nomineeAadhaarVerificationId: nomineeAadhaarStatus.verificationId,
        nomineeAadhaarData: nomineeAadhaarStatus.aadhaarData,
      };

      try {
        await AsyncStorage.setItem(
          "digigoldMemberForm",
          JSON.stringify(dataToSave)
        );
      } catch (error) {
        console.error("Save error:", error);
      }
    };

    saveFormData();
  }, [formData, selectedScheme, nomineeAadhaarStatus, apiLoading]);

  useEffect(() => {
    const keyboardDidShow = (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (activeInput && inputRefs.current[activeInput]) {
        setTimeout(() => {
          inputRefs.current[activeInput].measureLayout(
            scrollViewRef.current,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: y - 80, animated: true });
            }
          );
        }, 100);
      }
    };

    const keyboardDidHide = () => setKeyboardHeight(0);

    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      keyboardDidShow
    );
    const hideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      keyboardDidHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [activeInput]);

  useEffect(() => {
    if (formData.pincode.length !== 6) {
      setFormData((prev) => ({ ...prev, city: "", state: "" }));
      return;
    }

    const fetchLocation = async () => {
      try {
        const response = await fetch(
          `https://api.postalpincode.in/pincode/${formData.pincode}`
        );
        const data = await response.json();

        if (data[0]?.Status === "Success") {
          const district = data[0].PostOffice[0].District || "";
          const state = data[0].PostOffice[0].State || "";

          setFormData((prev) => ({
            ...prev,
            city: district,
            state: state,
          }));
        } else {
          setFormData((prev) => ({ ...prev, city: "", state: "" }));
        }
      } catch (error) {
        console.error("Pincode fetch error:", error);
      }
    };

    const debounceTimer = setTimeout(fetchLocation, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.pincode]);

  // Android hardware back button handler
  useEffect(() => {
    const handleBackPress = () => {
      if (showDigiLockerWebView) {
        if (!verificationAttempted) {
          checkStatusAndComplete();
        } else {
          setShowDigiLockerWebView(false);
          if (verificationPolling) {
            clearInterval(verificationPolling);
            setVerificationPolling(null);
          }
        }
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handleBackPress
      );
      return () => backHandler.remove();
    }
  }, [showDigiLockerWebView, verificationAttempted, checkStatusAndComplete, verificationPolling]);

  const updateField = useCallback(
    (field, value) => {
      if (
        (field === "mobile" && userData?.contactNumber) ||
        (field === "aadharNumber" && userData?.maskedAadhaar)
      ) {
        return;
      }

      setFormData((prev) => ({ ...prev, [field]: value }));

      if (validationErrors[field]) {
        setValidationErrors((prev) => ({ ...prev, [field]: "" }));
      }

      if (field === "aadharNumber") {
        const cleanValue = value.replace(/\s/g, "");
        if (cleanValue.length === 12) {
          setIsValidatingAadhaar(true);
          const validationTimer = setTimeout(() => {
            const aadhaarErr = validateAadhaar(cleanValue);
            setIsAadhaarValid(!aadhaarErr);
            setIsValidatingAadhaar(false);

            if (aadhaarErr && validationErrors.aadharNumber !== aadhaarErr) {
              setValidationErrors((prev) => ({
                ...prev,
                aadharNumber: aadhaarErr,
              }));
            } else if (!aadhaarErr && validationErrors.aadharNumber) {
              setValidationErrors((prev) => ({ ...prev, aadharNumber: "" }));
            }
          }, 500);
          return () => clearTimeout(validationTimer);
        } else {
          setIsAadhaarValid(false);
        }
      }

      if (field === "nomineeAadhaarNumber") {
        const cleanValue = value.replace(/\s/g, "");

        if (cleanValue.length > 0) {
          setNomineeAadhaarStatus({
            isVerified: false,
            isVerifying: false,
            verificationId: "",
            message: "",
            aadhaarData: null,
          });
          const clearedNomineeFields = {
            nomineeAadhaarVerified: false,
            nomineeAadhaarVerificationId: "",
            // nomineeName: "",
            nomineeDOB: "",
            nomineeGender: "",
            nomineeAddress: "",
            nomineeCareOf: "",
            nomineeYearOfBirth: "",
            nomAddr1: "",
            nomAddr2: "",
            nomCity: "",
            nomState: "",
            nomPincode: "",
          };
          setFormData((prev) => ({ ...prev, ...clearedNomineeFields }));
          AsyncStorage.removeItem("digilocker_verification_id");

          if (isSameAadhaar()) {
            const userLast4 = getUserAadhaarLast4();
            Alert.alert(
              "Same Aadhaar Detected",
              `Cannot use your Aadhaar for nominee.\n\nPlease use a different Aadhaar number for nominee.`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    setFormData((prev) => ({
                      ...prev,
                      nomineeAadhaarNumber: "",
                    }));
                    inputRefs.current.nomineeAadhaarNumber?.focus();
                  },
                },
              ]
            );
            return;
          }
        }

        let formattedValue = cleanValue;
        if (cleanValue.length > 8) {
          formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(
            4,
            8
          )} ${cleanValue.slice(8, 12)}`;
        } else if (cleanValue.length > 4) {
          formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(4)}`;
        }

        setFormData((prev) => ({ ...prev, [field]: formattedValue.trim() }));

        if (validationErrors[field]) {
          setValidationErrors((prev) => ({ ...prev, [field]: "" }));
        }
        return;
      }
    },
    [
      validationErrors,
      setValidationErrors,
      userData,
      isSameAadhaar,
      getUserAadhaarLast4,
    ]
  );

  const handleMobile = useCallback(
    (text) => {
      if (userData?.contactNumber) return;
      updateField("mobile", text.replace(/\D/g, ""));
    },
    [updateField, userData]
  );

  const handleNomineeMobile = useCallback(
    (text) => updateField("mobile2", text.replace(/\D/g, "")),
    [updateField]
  );

  const handlePincode = useCallback(
    (text) => updateField("pincode", text.replace(/\D/g, "")),
    [updateField]
  );

  const handlePan = useCallback(
    (text) =>
      updateField("panNumber", text.replace(/[^A-Za-z0-9]/g, "").toUpperCase()),
    [updateField]
  );

  const handleAadhar = useCallback(
    (text) => {
      if (userData?.maskedAadhaar) return;
      const cleanValue = text.replace(/\D/g, "");
      let formattedValue = cleanValue;
      if (cleanValue.length > 8) {
        formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(
          4,
          8
        )} ${cleanValue.slice(8, 12)}`;
      } else if (cleanValue.length > 4) {
        formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(4)}`;
      }
      updateField("aadharNumber", formattedValue.trim());
    },
    [updateField, userData]
  );

  const handleNomineeAadhaar = useCallback(
    (text) => {
      const cleanValue = text.replace(/\D/g, "");
      let formattedValue = cleanValue;
      if (cleanValue.length > 8) {
        formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(
          4,
          8
        )} ${cleanValue.slice(8, 12)}`;
      } else if (cleanValue.length > 4) {
        formattedValue = `${cleanValue.slice(0, 4)} ${cleanValue.slice(4)}`;
      }
      updateField("nomineeAadhaarNumber", formattedValue.trim());
    },
    [updateField]
  );

  const openDatePicker = useCallback(
    (type) => {
      if (type === "dob" && formData.dateOfBirth) {
        const [year, month, day] = formData.dateOfBirth.split("-");
        setSelectedDate({ day, month, year });
      } else if (type === "anniversary" && formData.anniversaryDate) {
        const [year, month, day] = formData.anniversaryDate.split("-");
        setSelectedDate({ day, month, year });
      } else {
        setSelectedDate({ day: "", month: "", year: "" });
      }
      setShowDatePicker(type);
    },
    [formData.dateOfBirth, formData.anniversaryDate]
  );

  const handleDateConfirm = useCallback(() => {
    if (!selectedDate.day || !selectedDate.month || !selectedDate.year) {
      Alert.alert("Error", "Please select a valid date");
      return;
    }

    const formattedDate = `${selectedDate.year}-${selectedDate.month}-${selectedDate.day}`;

    if (showDatePicker === "dob") {
      updateField("dateOfBirth", formattedDate);
    } else if (showDatePicker === "anniversary") {
      updateField("anniversaryDate", formattedDate);
    }

    setShowDatePicker(null);
  }, [selectedDate, showDatePicker, updateField]);

  const handleMaritalStatus = useCallback(
    (status) => {
      updateField("maritalStatus", status);
      if (status === "unmarried") {
        updateField("anniversaryDate", "");
      }
    },
    [updateField]
  );

  const populateNomineeData = useCallback(
    (aadhaarData) => {
      if (!aadhaarData) return;

      setFormData((prev) => {
        const updates = { ...prev };

        if (aadhaarData.name) {
          updates.nomeni = aadhaarData.name;
          // updates.nomineeName = aadhaarData.name;
        }

        if (aadhaarData.dob) {
          updates.nomineeDOB = formatDateForAPI(aadhaarData.dob);
        }

        if (aadhaarData.year_of_birth) {
          updates.nomineeYearOfBirth = aadhaarData.year_of_birth.toString();
        }

        if (aadhaarData.gender) {
          updates.nomineeGender = formatGender(aadhaarData.gender);
        }

        if (aadhaarData.care_of) {
          updates.nomineeCareOf = aadhaarData.care_of;
        }

        if (aadhaarData.split_address) {
          const splitAddr = aadhaarData.split_address;
          updates.nomineeAddress = extractAddressFromSplit(splitAddr);
          updates.nomAddr1 = splitAddr.house || "";
          if (splitAddr.street) updates.nomAddr2 = splitAddr.street;
          updates.nomCity = splitAddr.dist || splitAddr.vtc || "";
          updates.nomState = splitAddr.state || "";
          updates.nomPincode = splitAddr.pincode || "";
          updates.nomCountry = splitAddr.country || "India";
        } else if (aadhaarData.address) {
          updates.nomineeAddress = aadhaarData.address;
        }

        updates.nomineeAadhaarVerified = true;
        return updates;
      });
    },
    [extractAddressFromSplit, formatGender, formatDateForAPI]
  );

  const initiateNomineeAadhaarVerification = useCallback(() => {
    const aadhaarNumber = formData.nomineeAadhaarNumber.replace(/\s/g, "");

    const aadhaarError = validateAadhaar(aadhaarNumber);
    if (aadhaarError) {
      Alert.alert("Invalid Aadhaar", aadhaarError);
      return;
    }

    if (isSameAadhaar()) {
      const userLast4 = getUserAadhaarLast4();
      Alert.alert(
        "Same Aadhaar Not Allowed",
        `Cannot use your Aadhaar for nominee.\n\nPlease enter a different Aadhaar number for the nominee.`,
        [
          {
            text: "OK",
            onPress: () => {
              setFormData((prev) => ({
                ...prev,
                nomineeAadhaarNumber: "",
              }));
              inputRefs.current.nomineeAadhaarNumber?.focus();
            },
          },
        ]
      );
      return;
    }

    if (nomineeAadhaarStatus.isVerified) {
      Alert.alert(
        "Already Verified",
        "Nominee Aadhaar is already verified. If you need to re-verify, please clear and enter a new Aadhaar number.",
        [{ text: "OK" }]
      );
      return;
    }

    setShowConsentModal(true);
    setIsAadhaarDifferentConfirmed(false);
    setVerificationAttempted(false); // Reset verification attempted flag
  }, [
    formData.nomineeAadhaarNumber,
    nomineeAadhaarStatus.isVerified,
    isSameAadhaar,
    getUserAadhaarLast4,
  ]);

  const handleConsentConfirm = useCallback(async () => {
    if (isSameAadhaar()) {
      const userLast4 = getUserAadhaarLast4();
      Alert.alert(
        "Same Aadhaar Error",
        `You cannot use your own Aadhaar for nominee.\n\nPlease use a different Aadhaar number.`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowConsentModal(false);
              setIsAadhaarDifferentConfirmed(false);
              setFormData((prev) => ({
                ...prev,
                nomineeAadhaarNumber: "",
              }));
            },
          },
        ]
      );
      return;
    }

    if (!isAadhaarDifferentConfirmed) {
      Alert.alert(
        "Consent Required",
        "Please agree to the Terms and Conditions by checking the box.",
        [{ text: "OK" }]
      );
      return;
    }

    setShowConsentModal(false);
    setFailureHandled(false);
    setVerificationAttempted(false); // Reset verification attempted flag

    const aadhaarNumber = formData.nomineeAadhaarNumber.replace(/\s/g, "");

    setNomineeAadhaarStatus((prev) => ({
      ...prev,
      isVerifying: true,
      message: "Starting DigiLocker verification...",
    }));

    try {
      const userId = formData.nomeni
        ? `${formData.nomeni.replace(/\s/g, "_")}_${Date.now()}`
        : `nominee_${Date.now()}`;

      const result = await digiLockerService.createVerificationUrl(
        userId,
        aadhaarNumber
      );

      if (result.success && result.verificationUrl) {
        setNomineeAadhaarStatus((prev) => ({
          ...prev,
          verificationId: result.verificationId,
          message: "Opening DigiLocker...",
        }));

        await AsyncStorage.setItem(
          "digilocker_verification_id",
          result.verificationId
        );
        setDigiLockerUrl(result.verificationUrl);
        setShowDigiLockerWebView(true);
      } else {
        Alert.alert(
          "Verification Failed",
          result.message || "Failed to start verification"
        );
        setNomineeAadhaarStatus((prev) => ({
          ...prev,
          isVerifying: false,
          message: "Failed to start verification",
        }));
      }
    } catch (error) {
      console.error("Verification start error:", error);
      Alert.alert("Error", "Failed to start DigiLocker verification");
      setNomineeAadhaarStatus((prev) => ({
        ...prev,
        isVerifying: false,
        message: "Error starting verification",
      }));
    }
  }, [
    formData.nomineeAadhaarNumber,
    formData.nomeni,
    isAadhaarDifferentConfirmed,
    isSameAadhaar,
    getUserAadhaarLast4,
  ]);

  const getAadhaarDocumentData = useCallback(async (verificationId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/digilocker/document/AADHAAR?verification_id=${verificationId}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      const result = await response.json();

      if (result.status === "FAILURE") {
        return {
          success: false,
          status: "FAILURE",
          message: result.message || "Verification failed",
          data: result,
        };
      }

      if (response.ok) {
        return {
          success: true,
          data: result,
          message: result.message || "Aadhaar document fetched successfully",
        };
      } else {
        throw new Error(
          result.message || result.error || "Failed to fetch Aadhaar document"
        );
      }
    } catch (error) {
      console.error("Get Aadhaar document error:", error);
      return {
        success: false,
        error: error.message,
        message: "Failed to fetch Aadhaar document",
      };
    }
  }, []);

  const startVerificationPolling = useCallback(
    (verificationId) => {
      if (verificationPolling) clearInterval(verificationPolling);

      const pollingInterval = setInterval(async () => {
        try {
          const statusResult = await digiLockerService.checkVerificationStatus(
            verificationId
          );

          if (statusResult.status === "FAILURE" && !failureHandled) {
            clearInterval(pollingInterval);
            setVerificationPolling(null);
            setFailureHandled(true);
            setShowDigiLockerWebView(false);

            setNomineeAadhaarStatus({
              isVerified: false,
              isVerifying: false,
              verificationId: "",
              message: "Verification failed",
              aadhaarData: null,
            });

            Alert.alert("Verification Failed", "Aadhaar verification failed.", [
              {
                text: "OK",
                onPress: async () => {
                  await AsyncStorage.removeItem("digilocker_verification_id");
                },
              },
            ]);
            return;
          }

          if (statusResult.success && statusResult.verified) {
            const documentResult = await getAadhaarDocumentData(verificationId);

            if (documentResult.status === "FAILURE" && !failureHandled) {
              clearInterval(pollingInterval);
              setVerificationPolling(null);
              setFailureHandled(true);
              setShowDigiLockerWebView(false);

              setNomineeAadhaarStatus({
                isVerified: false,
                isVerifying: false,
                verificationId: "",
                message: "Verification failed",
                aadhaarData: null,
              });

              Alert.alert(
                "Verification Failed",
                "Aadhaar document verification failed."
              );
              return;
            }

            if (documentResult.success) {
              clearInterval(pollingInterval);
              setVerificationPolling(null);

              const aadhaarData = documentResult.data;

              setNomineeAadhaarStatus({
                isVerified: true,
                isVerifying: false,
                verificationId: verificationId,
                message: "Nominee Aadhaar verified successfully!",
                aadhaarData: aadhaarData,
              });

              setFormData((prev) => ({
                ...prev,
                nomineeAadhaarVerified: true,
                nomineeAadhaarVerificationId: verificationId,
              }));

              populateNomineeData(aadhaarData);

              Alert.alert(
                "Success",
                "Nominee Aadhaar verified successfully via DigiLocker\n\nNominee details have been auto-filled from Aadhaar data.",
                [{ text: "OK", onPress: () => setShowDigiLockerWebView(false) }]
              );
            }
          } else if (
            statusResult.message?.includes("Failed") ||
            statusResult.status === "REJECTED"
          ) {
            clearInterval(pollingInterval);
            setVerificationPolling(null);

            setNomineeAadhaarStatus((prev) => ({
              ...prev,
              isVerifying: false,
              message: "Verification failed or rejected",
            }));

            Alert.alert(
              "Verification Failed",
              "Please try again or use manual verification"
            );
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 3000);

      setVerificationPolling(pollingInterval);
      return () => {
        if (pollingInterval) clearInterval(pollingInterval);
      };
    },
    [
      verificationPolling,
      getAadhaarDocumentData,
      populateNomineeData,
      failureHandled,
    ]
  );

  const handleWebViewNavigationStateChange = useCallback(
    (navState) => {
      const { url } = navState;

      if (
        url.includes("success") ||
        url.includes("callback") ||
        url.includes("redirect")
      ) {
        AsyncStorage.getItem("digilocker_verification_id").then(
          (verificationId) => {
            if (verificationId) startVerificationPolling(verificationId);
          }
        );
      }
    },
    [startVerificationPolling]
  );

  const validate = useCallback(
    (d = {}) => {
      const errors = {};

      if (!d || typeof d !== "object") {
        errors.form = "Form data missing";
        return errors;
      }

      // Name
      const nameErr = validateName(d.name || "");
      if (nameErr) errors.name = nameErr;

      // Date of Birth
      const dobErr = validateDOB(d.dateOfBirth || "");
      if (dobErr) errors.dateOfBirth = dobErr;

      // Marital Status
      if (!d.maritalStatus) errors.maritalStatus = "Marital Status is required";

      // Anniversary
      if (d.maritalStatus === "married" && !d.anniversaryDate?.trim()) {
        errors.anniversaryDate = "Anniversary Date is required";
      } else if (d.maritalStatus === "married" && d.anniversaryDate) {
        const anniversaryDate = new Date(d.anniversaryDate);
        const today = new Date();
        if (anniversaryDate > today) {
          errors.anniversaryDate = "Anniversary cannot be in the future";
        }
      }

      // Mobile
      if (!d.mobile?.trim()) {
        errors.mobile = "Mobile Number is required";
      } else {
        const mobileErr = validateMobile(d.mobile || "");
        if (mobileErr) errors.mobile = mobileErr;
      }

      // Email (optional)
      if (d.email?.trim()) {
        const emailErr = validateEmail(d.email);
        if (emailErr) errors.email = emailErr;
      }

      // Address
      const doorNoErr = validateAddressField(d.doorNo || "", "Door No.");
      if (doorNoErr) errors.doorNo = doorNoErr;

      const streetErr = validateAddressField(d.street || "", "Street");
      if (streetErr) errors.street = streetErr;

      const areaErr = validateAddressField(d.area || "", "Area/Locality");
      if (areaErr) errors.area = areaErr;

      const pinErr = validatePincode(d.pincode || "");
      if (pinErr) errors.pincode = pinErr;

      if (!d.city?.trim()) errors.city = "City is required";
      if (!d.state?.trim()) errors.state = "State is required";

      // Nominee
      const nomineeErr = validateNomineeName(d.nomeni || "");
      if (nomineeErr) errors.nomeni = nomineeErr;

      const nomMobileErr = validateMobile(d.mobile2 || "");
      if (nomMobileErr) errors.mobile2 = nomMobileErr;

      // Nominee Aadhaar validation
      if (!d.nomineeAadhaarNumber?.trim()) {
        errors.nomineeAadhaarNumber = "Nominee Aadhaar Number is required";
      } else {
        const nomineeAadhaarErr = validateAadhaar(
          d.nomineeAadhaarNumber.replace(/\s/g, "") || ""
        );
        if (nomineeAadhaarErr) {
          errors.nomineeAadhaarNumber = nomineeAadhaarErr;
        } else {
          const userLast4 = getUserAadhaarLast4();
          const nomineeAadhaar = d.nomineeAadhaarNumber.replace(/\s/g, "");
          const nomineeLast4 = nomineeAadhaar.substring(8);

          if (userLast4 && userLast4 === nomineeLast4) {
            errors.nomineeAadhaarNumber = `Cannot use your Aadhaar (ends with ${userLast4}) for nominee. Please use a different Aadhaar.`;
          } else if (
            !d.nomineeAadhaarVerified &&
            !nomineeAadhaarStatus.isVerified
          ) {
            errors.nomineeAadhaarNumber =
              "Nominee Aadhaar must be verified via DigiLocker";
          }
        }
      }

      // PAN (optional)
      if (d.panNumber?.trim()) {
        const panErr = validatePAN(d.panNumber);
        if (panErr) errors.panNumber = panErr;
      }

      // Aadhaar - skip if already verified (API user) or masked value present
      const aadhaarAlreadyVerified = isAadhaarValid || userData?.aadhaarVerified || !!userData?.maskedAadhaar;
      console.log("AADHAAR DEBUG:", { isAadhaarValid, aadhaarVerified: userData?.aadhaarVerified, maskedAadhaar: userData?.maskedAadhaar, aadharNumber: d.aadharNumber, aadhaarAlreadyVerified });
      if (!aadhaarAlreadyVerified) {
        const aadhaarErr = validateAadhaar(
          d.aadharNumber?.replace(/\s/g, "") || ""
        );
        if (aadhaarErr) errors.aadharNumber = aadhaarErr;
      }

      return errors;
    },
    [nomineeAadhaarStatus.isVerified, userData, getUserAadhaarLast4, isAadhaarValid]
  );

  const getMaskedAadhaarWithLast4 = (aadhaar) => {
    if (!aadhaar || aadhaar.length !== 12) return "XXXX-XXXX-XXXX";
    return `XXXX-XXXX-${aadhaar.substring(8)}`;
  };

  const handleNext = useCallback(() => {
    const errors = validate(formData);
    setValidationErrors(errors);

    if (isSameAadhaar()) {
      const userLast4 = getUserAadhaarLast4();
      Alert.alert(
        "Same Aadhaar Detected",
        `Cannot use your Aadhaar for nominee.\n\nPlease use a different Aadhaar number.`,
        [{ text: "OK" }]
      );
      return;
    }

    if (Object.keys(errors).length === 0 && selectedScheme.id) {
      const transformedData = {
        title: "Mr",
        initial: getInitial(formData.name),
        pName: formData.name.trim(),
        sName: "",
        mobile: formData.mobile,
        email: formData.email.trim(),
        dateOfBirth: formData.dateOfBirth,
        maritalStatus: formData.maritalStatus,
        anniversaryDate: formData.anniversaryDate,

        doorNo: formData.doorNo.trim(),
        address1: formData.street.trim(),
        address2: formData.area.trim(),
        area: formData.area.trim(),
        city: formData.city.trim(),
        pinCode: formData.pincode,
        state: formData.state.trim(),
        country: "India",

        panno: formData.panNumber,
        idProof: "Aadhaar",
        idProofNo: userData?.maskedAadhaar || formData.aadharNumber.replace(/\s|-/g, ""),
        aadhaarVerified: isAadhaarValid || userData?.aadhaarVerified || false,

        nomeni: formData.nomeni.trim(),
        mobile2: formData.mobile2,
        nomineeAadhaarNumber: formData.nomineeAadhaarNumber.replace(/\s/g, ""),
        nomineeAadhaarVerified:
          nomineeAadhaarStatus.isVerified || formData.nomineeAadhaarVerified,
        nomineeAadhaarVerificationId:
          nomineeAadhaarStatus.verificationId ||
          formData.nomineeAadhaarVerificationId,

        // nomineeName: formData.nomineeName || formData.nomeni.trim(),
        nomineeDOB: formData.nomineeDOB,
        nomineeGender: formData.nomineeGender,
        nomineeAddress: formData.nomineeAddress,
        nomineeCareOf: formData.nomineeCareOf,
        nomineeYearOfBirth: formData.nomineeYearOfBirth,
        nomineeRelationship: formData.nomineeRelationship || "Spouse",
        nomAddr1: formData.nomAddr1,
        nomAddr2: formData.nomAddr2,
        nomCity: formData.nomCity,
        nomState: formData.nomState,
        nomPincode: formData.nomPincode,
        nomCountry: formData.nomCountry || "India",

        selectedSchemeId: selectedScheme.id,
        selectedSchemeName: selectedScheme.name,

        mobileVerified: true,
        aadhaarVerified: isAadhaarValid || userData?.aadhaarVerified || false,
        nomineeMobileVerified: !!formData.mobile2,
        nomineeAadhaarVerified:
          nomineeAadhaarStatus.isVerified || formData.nomineeAadhaarVerified,

        aadhaarMasked: getMaskedAadhaar(
          formData.aadharNumber.replace(/\s/g, "")
        ),

        userId: userData?.id,
        apiUsername: userData?.username,
        apiEmail: userData?.email,
        apiContactNumber: userData?.contactNumber,
      };

      console.log("Transformed data for next step:", transformedData);

      if (onNext && typeof onNext === "function") {
        onNext(transformedData);
      }

      return;
    }

    const firstError = Object.keys(errors)[0];
    if (firstError && inputRefs.current[firstError]) {
      try {
        inputRefs.current[firstError].measure((x, y, w, h, px, py) => {
          scrollViewRef.current?.scrollTo({ y: py - 100, animated: true });
          inputRefs.current[firstError]?.focus?.();
        });
      } catch (error) {
        // Ignore focus errors for read-only fields
      }
    }

    if (!selectedScheme.id) {
      Alert.alert("Scheme Required", "Please select a scheme to continue.");
    } else {
      Alert.alert("Incomplete Form", "Please fix the highlighted fields.");
    }
  }, [
    formData,
    validate,
    selectedScheme,
    isAadhaarValid,
    nomineeAadhaarStatus,
    userData,
    setValidationErrors,
    onNext,
    isSameAadhaar,
    getUserAadhaarLast4,
  ]);

  const clearSavedData = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem("digigoldUserData"),
        AsyncStorage.removeItem("digigoldMemberForm"),
        AsyncStorage.removeItem("digilocker_verification_id"),
      ]);

      if (userData) {
        setFormData({
          ...INITIAL_FORM,
          name: userData.username || "",
          mobile: userData.contactNumber || "",
          email: userData.email || "",
          dateOfBirth: userData.dateOfBirth || "",
          pincode: userData.pincode || "",
          city: userData.city || "",
          state: userData.state || "",
          aadharNumber: userData.maskedAadhaar || "",
          doorNo: userData.address1 || "",
          street: userData.address2 || "",
          area: userData.city || "",
        });
      } else {
        setFormData(INITIAL_FORM);
      }
      setSelectedScheme({
        id: initialSchemeId || null,
        name: initialSchemeName || "Select a Scheme",
      });

      setValidationErrors({});
      setIsAadhaarValid(false);

      setNomineeAadhaarStatus({
        isVerified: false,
        isVerifying: false,
        verificationId: "",
        message: "",
        aadhaarData: null,
      });

      setFailureHandled(false);
      setIsAadhaarDifferentConfirmed(false);
      setVerificationAttempted(false);

      if (verificationPolling) {
        clearInterval(verificationPolling);
        setVerificationPolling(null);
      }

      Alert.alert("Cleared", "All form data has been reset.");
    } catch (error) {
      console.error("Clear data error:", error);
      Alert.alert("Error", "Failed to clear data");
    }
  }, [
    initialSchemeId,
    initialSchemeName,
    setValidationErrors,
    verificationPolling,
    userData,
  ]);

  const renderCustomPicker = useCallback(
    () => (
      <View style={styles.pickerContainer}>
        {[
          { label: "Day", data: days, key: "day" },
          { label: "Month", data: months, key: "month", isMonth: true },
          { label: "Year", data: years, key: "year" },
        ].map(({ label, data, key, isMonth }) => (
          <View key={key} style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>{label}</Text>
            <ScrollView
              style={styles.pickerScrollView}
              showsVerticalScrollIndicator={false}
            >
              {data.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.pickerItem,
                    selectedDate[key] === item && styles.pickerItemSelected,
                  ]}
                  onPress={() =>
                    setSelectedDate((prev) => ({ ...prev, [key]: item }))
                  }
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      selectedDate[key] === item &&
                        styles.pickerItemTextSelected,
                    ]}
                  >
                    {isMonth ? MONTHS[parseInt(item) - 1] : item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
      </View>
    ),
    [days, months, years, selectedDate]
  );

  const renderConsentModal = useCallback(() => {
    const isSame = isSameAadhaar();

    return (
      <Modal
        visible={showConsentModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowConsentModal(false);
          setIsAadhaarDifferentConfirmed(false);
        }}
      >
        <View style={styles.consentModalOverlay}>
          <View style={styles.consentModalContent}>
            <View style={styles.consentModalHeader}>
              <MaterialIcons
                name="verified-user"
                size={32}
                color={COLORS.primary}
              />
              <Text style={styles.consentModalTitle}>
                Identity Verification Consent
              </Text>
              <TouchableOpacity
                style={styles.consentModalClose}
                onPress={() => {
                  setShowConsentModal(false);
                  setIsAadhaarDifferentConfirmed(false);
                }}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.consentModalBody}>
              <Text style={styles.consentTitle}>
                Consent for Identity Verification & Data Processing
              </Text>

              <Text style={styles.consentText}>
                I voluntarily consent to the collection and use of my personal
                information for the limited purpose of customer identification,
                verification, and transaction processing in relation to
                gold/silver purchase or related services.
              </Text>

              <Text style={styles.consentText}>
                I understand that Aadhaar, if used, is utilised strictly for
                verification purposes only and is not stored by the Company.
              </Text>

              <Text style={styles.consentText}>
                I confirm that I have been informed of my right to provide
                alternative government-issued identity documents such as PAN,
                Voter ID, or Driving Licence.
              </Text>

              <Text style={styles.consentText}>
                I have read and understood the Privacy Policy and agree to the
                processing, storage, and protection of my personal data in
                accordance with applicable laws including the Digital Personal
                Data Protection Act, 2023, the Aadhaar Act, 2016, and the
                Information Technology Act, 2000.
              </Text>

              {isSame && (
                <View style={styles.warningBox}>
                  <MaterialIcons name="warning" size={20} color="#FF6B6B" />
                  <Text style={styles.warningText}>
                    Warning: You are trying to use your own Aadhaar for nominee.
                    This is not allowed. Please use a different Aadhaar number.
                  </Text>
                </View>
              )}

              <View style={styles.confirmationCheckboxContainer}>
                <TouchableOpacity
                  style={styles.checkboxIconContainer}
                  onPress={() =>
                    setIsAadhaarDifferentConfirmed(!isAadhaarDifferentConfirmed)
                  }
                >
                  {isAadhaarDifferentConfirmed ? (
                    <MaterialIcons
                      name="check-box"
                      size={24}
                      color={COLORS.primary}
                    />
                  ) : (
                    <MaterialIcons
                      name="check-box-outline-blank"
                      size={24}
                      color={COLORS.textSecondary}
                    />
                  )}
                </TouchableOpacity>
                <Text style={styles.confirmationText}>
                  I agree to the Terms and Conditions for Aadhaar verification.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.consentModalButtons}>
              <TouchableOpacity
                style={styles.consentCancelButton}
                onPress={() => {
                  setIsAadhaarDifferentConfirmed(false);
                  setShowConsentModal(false);
                }}
              >
                <Text style={styles.consentCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.consentConfirmButton,
                  (!isAadhaarDifferentConfirmed || isSame) &&
                    styles.consentConfirmButtonDisabled,
                ]}
                onPress={handleConsentConfirm}
                disabled={!isAadhaarDifferentConfirmed || isSame}
              >
                <MaterialIcons
                  name="lock-open"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.consentConfirmButtonText}>
                  I Agree & Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, [
    showConsentModal,
    isSameAadhaar,
    isAadhaarDifferentConfirmed,
    handleConsentConfirm,
  ]);

  const renderInput = useCallback(
    (field, label, handler, isRequired = true, editable = true) => (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {label} {isRequired ? "*" : ""}
        </Text>
        <TextInput
          style={[styles.input, validationErrors[field] && styles.errorInput]}
          value={formData[field] || ""}
          onChangeText={handler || ((text) => updateField(field, text))}
          onFocus={() => setActiveInput(field)}
          ref={(ref) => (inputRefs.current[field] = ref)}
          placeholder={`Enter ${label}`}
          placeholderTextColor={COLORS.inputPlaceholder}
          editable={editable}
        />

        {validationErrors[field] && (
          <Text style={styles.errorText}>{validationErrors[field]}</Text>
        )}
      </View>
    ),
    [formData, validationErrors, updateField]
  );

  if (apiLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {userData ? "Loading your profile data..." : "Checking your profile..."}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: keyboardHeight || 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm Your KYC Details</Text>
          <Text style={styles.headerSubtitle}>To Join Our Schemes</Text>
          <TouchableOpacity onPress={clearSavedData} style={styles.clearBtn}>
            <MaterialIcons name="delete" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Basic Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Details</Text>

          {/* Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, validationErrors.name && styles.errorInput]}
              value={formData.name}
              onChangeText={(text) => updateField("name", text)}
              onFocus={() => setActiveInput("name")}
              ref={(ref) => (inputRefs.current.name = ref)}
              placeholder="Enter Name"
              placeholderTextColor={COLORS.inputPlaceholder}
              editable={!userData?.username}
            />
            {validationErrors.name && (
              <Text style={styles.errorText}>{validationErrors.name}</Text>
            )}
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={[
                styles.input1,
                validationErrors.dateOfBirth && styles.errorInput,
              ]}
              onPress={() => openDatePicker("dob")}
              disabled={!!userData?.dateOfBirth}
            >
              <Text
                style={
                  formData.dateOfBirth || userData?.dateOfBirth
                    ? styles.dateText
                    : styles.placeholderText
                }
              >
                {formData.dateOfBirth || userData?.dateOfBirth
                  ? formatDateDisplay(
                      formData.dateOfBirth || userData.dateOfBirth
                    )
                  : "Select Date of Birth"}
              </Text>
              {!userData?.dateOfBirth && (
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.dateIcon}
                />
              )}
            </TouchableOpacity>
            {validationErrors.dateOfBirth && (
              <Text style={styles.errorText}>
                {validationErrors.dateOfBirth}
              </Text>
            )}
          </View>

          {/* Marital Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Marital Status *</Text>
            <View style={styles.checkboxContainer}>
              {["married", "unmarried"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.checkbox,
                    formData.maritalStatus === status &&
                      styles.checkboxSelected,
                  ]}
                  onPress={() => handleMaritalStatus(status)}
                >
                  <Text
                    style={[
                      styles.checkboxText,
                      formData.maritalStatus === status &&
                        styles.checkboxTextSelected,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {validationErrors.maritalStatus && (
              <Text style={styles.errorText}>
                {validationErrors.maritalStatus}
              </Text>
            )}
          </View>

          {/* Anniversary Date (if married) */}
          {formData.maritalStatus === "married" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Anniversary Date *</Text>
              <TouchableOpacity
                style={[
                  styles.input1,
                  validationErrors.anniversaryDate && styles.errorInput,
                ]}
                onPress={() => openDatePicker("anniversary")}
              >
                <Text
                  style={
                    formData.anniversaryDate
                      ? styles.dateText
                      : styles.placeholderText
                  }
                >
                  {formData.anniversaryDate
                    ? formatDateDisplay(formData.anniversaryDate)
                    : "Select Anniversary Date"}
                </Text>
                <MaterialIcons
                  name="event"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.dateIcon}
                />
              </TouchableOpacity>
              {validationErrors.anniversaryDate && (
                <Text style={styles.errorText}>
                  {validationErrors.anniversaryDate}
                </Text>
              )}
            </View>
          )}

          {/* Mobile Number */}
          {renderInput(
            "mobile",
            "Mobile Number",
            handleMobile,
            true,
            !userData?.contactNumber
          )}

          {/* Email */}
          {renderInput(
            "email",
            "Email",
            null,
            !userData?.email,
            !userData?.email
          )}
        </View>

        {/* Aadhaar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aadhaar Verification</Text>
          {renderInput(
            "aadharNumber",
            "Aadhaar Number",
            handleAadhar,
            true,
            !userData?.maskedAadhaar
          )}
          {userData?.aadhaarVerified && (
            <Text style={styles.successText}>✓ Aadhaar verified</Text>
          )}
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address</Text>
          {renderInput("doorNo", "Door No.", null, true, true)}
          {renderInput("street", "Street", null, true, true)}
          {renderInput("area", "Area / Locality", null, false, true)}
          {renderInput("pincode", "PIN Code", handlePincode, true, true)}
          {renderInput("city", "City", null, true, false)}
          {renderInput("state", "State", null, true, false)}
        </View>

        {/* PAN Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAN Card (Optional)</Text>
          <Text style={styles.optionalNote}>
            PAN is optional but recommended for financial transactions.
          </Text>
          {renderInput("panNumber", "PAN Number", handlePan, false, true)}
        </View>

        {/* Nominee Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nominee Details</Text>

          {/* Nominee Mobile */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nominee Mobile Number *</Text>
            <View style={styles.mobileInput}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={[
                  styles.mobileField,
                  validationErrors.mobile2 && styles.errorInput,
                ]}
                value={formData.mobile2}
                onChangeText={handleNomineeMobile}
                onFocus={() => setActiveInput("mobile2")}
                ref={(ref) => (inputRefs.current.mobile2 = ref)}
                placeholder="Enter Nominee Mobile"
                keyboardType="numeric"
                placeholderTextColor={COLORS.inputPlaceholder}
              />
            </View>
            {validationErrors.mobile2 && (
              <Text style={styles.errorText}>{validationErrors.mobile2}</Text>
            )}
          </View>

          {/* Nominee Aadhaar Verification */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nominee Aadhaar Number *</Text>
            <View style={styles.aadhaarContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.aadhaarInput,
                  validationErrors.nomineeAadhaarNumber && styles.errorInput,
                ]}
                value={formData.nomineeAadhaarNumber}
                onChangeText={handleNomineeAadhaar}
                onFocus={() => setActiveInput("nomineeAadhaarNumber")}
                ref={(ref) => (inputRefs.current.nomineeAadhaarNumber = ref)}
                placeholder="XXXX XXXX XXXX"
                placeholderTextColor={COLORS.inputPlaceholder}
                keyboardType="numeric"
                maxLength={14}
                editable={
                  !nomineeAadhaarStatus.isVerified &&
                  !nomineeAadhaarStatus.isVerifying &&
                  !formData.nomineeAadhaarVerified
                }
              />
              {!nomineeAadhaarStatus.isVerified &&
                !nomineeAadhaarStatus.isVerifying &&
                !formData.nomineeAadhaarVerified && (
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={initiateNomineeAadhaarVerification}
                    disabled={
                      formData.nomineeAadhaarNumber.replace(/\s/g, "")
                        .length !== 12
                    }
                  >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </TouchableOpacity>
                )}
            </View>
            {validationErrors.nomineeAadhaarNumber && (
              <Text style={styles.errorText}>
                {validationErrors.nomineeAadhaarNumber}
              </Text>
            )}

            {nomineeAadhaarStatus.isVerifying && (
              <View style={styles.verificationStatus}>
                <ActivityIndicator size="small" color={COLORS.info} />
                <Text style={styles.verifyingText}>
                  {nomineeAadhaarStatus.message ||
                    "Verifying via DigiLocker..."}
                </Text>
              </View>
            )}

            {nomineeAadhaarStatus.isVerified && (
              <Text style={styles.successText}>✓ Nominee Aadhaar verified</Text>
            )}
          </View>

          {/* Auto-filled Nominee Details */}
          {(nomineeAadhaarStatus.isVerified ||
            formData.nomineeAadhaarVerified) && (
            <>
              <Text style={styles.autoFillTitle}>
                Auto-filled from Aadhaar:
              </Text>
              {formData.nomineeName &&
                renderInput("nomineeName", "Nominee Name", null, false, false)}
              {formData.nomineeDOB &&
                renderInput(
                  "nomineeDOB",
                  "Nominee Date of Birth",
                  null,
                  false,
                  false
                )}
              {formData.nomineeGender &&
                renderInput(
                  "nomineeGender",
                  "Nominee Gender",
                  null,
                  false,
                  false
                )}

              <Text style={styles.subSectionTitle}>Address Details:</Text>
              {formData.nomAddr1 &&
                renderInput("nomAddr1", "House/Flat No.", null, false, false)}
              {formData.nomAddr2 &&
                renderInput("nomAddr2", "Street", null, false, false)}
              {formData.nomCity &&
                renderInput("nomCity", "City", null, false, false)}
              {formData.nomState &&
                renderInput("nomState", "State", null, false, false)}
              {formData.nomPincode &&
                renderInput("nomPincode", "PIN Code", null, false, false)}
              {formData.nomineeCareOf &&
                renderInput("nomineeCareOf", "Care of", null, false, false)}
            </>
          )}
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (loading || !selectedScheme.id) && styles.confirmBtnDisabled,
          ]}
          onPress={handleNext}
          disabled={loading || !selectedScheme.id}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.confirmText}>
              {!selectedScheme.id
                ? "Select Scheme First"
                : "Confirm & Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Consent Modal */}
      {renderConsentModal()}

      {/* DigiLocker WebView Modal */}
      <Modal
  visible={showDigiLockerWebView}
  animationType="slide"
  onRequestClose={() => {
    if (!verificationAttempted) {
      checkStatusAndComplete();
    } else {
      setShowDigiLockerWebView(false);
      if (verificationPolling) {
        clearInterval(verificationPolling);
        setVerificationPolling(null);
      }
    }
  }}
>
  <View style={styles.webViewContainer}>
    <CommonHeader
      title="DigiLocker Verification"
      onBackPress={() => {
        if (!verificationAttempted) {
          checkStatusAndComplete();
        } else {
          setShowDigiLockerWebView(false);
          if (verificationPolling) {
            clearInterval(verificationPolling);
            setVerificationPolling(null);
          }
        }
      }}
    />
    
    {/* Add the warning message */}
    <View style={styles.warningContainer}>
      <Text style={styles.warningText}>
        <Text style={styles.warningIcon}>⚠️ </Text>
        Please ensure you do not use the same Aadhaar that was used for registration.
        Nominee Aadhaar must be different from the registered user's Aadhaar.
      </Text>
    </View>
    
    {digiLockerUrl ? (
      <WebView
        source={{ uri: digiLockerUrl }}
        style={styles.webView}
        onNavigationStateChange={handleWebViewNavigationStateChange}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.webViewLoadingText}>
              Loading DigiLocker...
            </Text>
          </View>
        )}
      />
    ) : (
      <View style={styles.webViewLoading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.webViewLoadingText}>
          Preparing verification...
        </Text>
      </View>
    )}
  </View>
</Modal>

      {/* Date Picker Modal */}
      <Modal visible={!!showDatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showDatePicker === "dob"
                  ? "Select Date of Birth"
                  : "Select Anniversary Date"}
              </Text>
              <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.selectedDatePreview}>
              Selected: {selectedDate.day}/{selectedDate.month}/
              {selectedDate.year}
            </Text>
            {renderCustomPicker()}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDatePicker(null)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.setButton}
                onPress={handleDateConfirm}
              >
                <Text style={styles.setButtonText}>Confirm Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BottomTab />
    </KeyboardAvoidingView>
  );
};

export default MemberDetailsPage;