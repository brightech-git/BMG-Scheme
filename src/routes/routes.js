import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStackNavigator } from "@react-navigation/stack";
import * as Screen from "../screens";
import SplashScreen from "../screens/Splashscreen/SplashScreen";
import ForceUpdateScreen from "../screens/ForceUpdate/ForceUpdateScreen";
import { checkForAppUpdate } from "../utils/VersionChecker";


const MainStack = createStackNavigator();
const NavigationStack = createStackNavigator();

function Drawer() {
  return (
    <NavigationStack.Navigator screenOptions={{ headerShown: false }}>
      <NavigationStack.Screen name="MainLanding" component={Screen.MainLanding} />
      <NavigationStack.Screen name="DeleteButton" component={Screen.DeleteButton} />
      <NavigationStack.Screen name="ProductDescription" component={Screen.ProductDescription} />
      <NavigationStack.Screen name="ProfileDashboard" component={Screen.ProfileDashboard} />
      <NavigationStack.Screen name="MyScheme" component={Screen.MyScheme} />
      <NavigationStack.Screen name="HelpCenter" component={Screen.HelpCenterPage} />
      <NavigationStack.Screen name="PrivacyPolicy" component={Screen.PrivacyPolicyPage} />
      <NavigationStack.Screen name="TermsandCondition" component={Screen.TermsConditionsPage} />
      <NavigationStack.Screen name="AddNewMember" component={Screen.AddNewMember} />
      <NavigationStack.Screen name="GoldPlanScreen" component={Screen.GoldPlanScreen} />
      <NavigationStack.Screen name="KnowMore" component={Screen.KnowMore} />
      <NavigationStack.Screen name="Buy" component={Screen.Buy} />
      <NavigationStack.Screen name="EditingProfile" component={Screen.EditingProfile} />
      <NavigationStack.Screen name="PaymentHistory" component={Screen.PaymentHistory} />
      <NavigationStack.Screen name="MainPageWithYouTube" component={Screen.MainPageWithYouTube} />
      <NavigationStack.Screen name="ProfileSidebar" component={Screen.ProfileSidebar} />
      <NavigationStack.Screen name="AboutPage" component={Screen.AboutPage} />
      <NavigationStack.Screen name="PaymentDetailScreen" component={Screen.PaymentDetailScreen} />
      <NavigationStack.Screen name="PaymentGateway" component={Screen.PaymentGateway} />
      <NavigationStack.Screen name="PaymentWebView" component={Screen.PaymentWebView} />
      <NavigationStack.Screen name="PaymentSuccess" component={Screen.PaymentSuccess} />
      <NavigationStack.Screen name="PaymentFailure" component={Screen.PaymentFailure} />
      <NavigationStack.Screen name="PaymentCancelled" component={Screen.PaymentCancelled} />
      <NavigationStack.Screen name="FAQPage" component={Screen.FAQPage} />
      <NavigationStack.Screen name="NotificationsPage" component={Screen.NotificationsPage} />
      <NavigationStack.Screen name="Rewards" component={Screen.RewardsPage} />
      <NavigationStack.Screen name="EmailFormPage" component={Screen.EmailFormPage} />
      <NavigationStack.Screen name="ReferralScreen" component={Screen.ReferralScreen} />
      <NavigationStack.Screen name="ResetMpin" component={Screen.ResetMpin} />
      <NavigationStack.Screen name="ClosedSchemes" component={Screen.SchemeClosingHistoryScreen} />
      <NavigationStack.Screen name="DigiLockerWebViewScreen" component={Screen.DigiLockerWebViewScreen} />
      <NavigationStack.Screen name="DigiLockerStatusScreen" component={Screen.DigiLockerStatusScreen} />
      <NavigationStack.Screen name="MemberDetailsPage" component={Screen.MemberDetailsPage} />
      <NavigationStack.Screen name="SchemeDetailsPage" component={Screen.SchemeDetailsPage} />
      <NavigationStack.Screen name="SmartPayKnowMore" component={Screen.SmartPayKnowMore} />
      <NavigationStack.Screen name="BrightKnowMore" component={Screen.BrightKnowMore} />
      <NavigationStack.Screen name="LumpsumKnowMore" component={Screen.LumpsumKnowMore} />
      <NavigationStack.Screen name="UserRegisterForm" component={Screen.UserRegisterForm} />
      <NavigationStack.Screen name="AadhaarVerification" component={Screen.AadhaarVerificationScreen} />
      <NavigationStack.Screen name="DuePayment" component={Screen.DuePayment} />
      <NavigationStack.Screen name="SchemeListPage" component={Screen.SchemeListPage} />
      <NavigationStack.Screen name="ReferralPending" component={Screen.ReferralPending} />
      <NavigationStack.Screen name="ReferralShareScreen" component={Screen.ReferralShareScreen} />
    </NavigationStack.Navigator>
  );
}

// forwardRef so App.js can attach its navigationRef to the NavigationContainer —
// without this, notification-tap deep links have no navigator to act on.
const AppContainer = React.forwardRef(function AppContainer(props, ref) {
  const [initialRoute, setInitialRoute] = useState(null);

useEffect(() => {
  const checkUserState = async () => {
    try {
      const updateInfo = await checkForAppUpdate(props.appStatus);
      if (updateInfo?.forceUpdate) {
        setInitialRoute({ name: "ForceUpdate", params: updateInfo });
        return;
      }

      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      const isMpinCreated = await AsyncStorage.getItem("isMpinCreated");
      const authToken = await AsyncStorage.getItem("authToken");

      if (!hasSeenOnboarding) {
        setInitialRoute({ name: "OnboardingScreen" });
      } else if (!authToken) {
        setInitialRoute({ name: "LoginPage" });
      } else if (isMpinCreated === "true") {
        setInitialRoute({ name: "VerifyMpinScreen" });
      } else {
        setInitialRoute({ name: "MpinScreen" });
      }
    } catch (error) {
      console.error("❌ Error checking user state:", error);
      setInitialRoute({ name: "LoginPage" });
    }
  };

  checkUserState();
}, []);


  if (!initialRoute) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer ref={ref}>
      <MainStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={initialRoute.name}
      >
        {/* Force Update */}
        <MainStack.Screen name="ForceUpdate" component={ForceUpdateScreen} initialParams={initialRoute.params} />
        {/* Onboarding & Auth Screens */}
        <MainStack.Screen name="OnboardingScreen" component={Screen.OnboardingScreen} />
        <MainStack.Screen name="LoginPage" component={Screen.LoginPage} />
        <MainStack.Screen name="RegisterPage" component={Screen.RegisterPage} />
        <MainStack.Screen name="OTP" component={Screen.OTP} />

        {/* MPIN Screens */}
        <MainStack.Screen name="MpinScreen" component={Screen.MpinScreen} />
        <MainStack.Screen name="VerifyMpinScreen" component={Screen.VerifyMpinScreen} />
        <MainStack.Screen name="ForgotMpin" component={Screen.ResetMpinScreen} />
        <MainStack.Screen name="EnterNumber" component={Screen.EnterNumberScreen} />
        <MainStack.Screen name="VerifyOtp" component={Screen.VerifyOtpScreen} />
        <MainStack.Screen name="GoogleContactUpdate" component={Screen.GoogleContactUpdateScreen} />
        <MainStack.Screen name="GoogleContactVerifyOTP" component={Screen.GoogleContactVerifyOTPScreen} />

        {/* Main App */}
        <MainStack.Screen name="Drawer" component={Drawer} />
      </MainStack.Navigator>
    </NavigationContainer>
  );
});

export default AppContainer;
