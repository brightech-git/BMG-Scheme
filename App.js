import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FlashMessage from "react-native-flash-message";
import AppContainer from "./src/routes/routes";
import DevelopmentScreen from "./src/screens/Splashscreen/DevelopmentScreen";
import SplashScreen from "./src/screens/Splashscreen/SplashScreen";
import { colors } from "./src/utils/colors";
import useFonts from "./src/utils/Fonts";
import { getAppStatus } from "./src/services/DevelopmentService";
import "react-native-gesture-handler";
import { checkForAppUpdate } from "./src/utils/VersionChecker";
import {
  listenForNotifications,
  removeNotificationListeners,
  checkInitialNotification,
} from "./src/utils/Notification";

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appEnabled, setAppEnabled] = useState(null);
  const [devMessage, setDevMessage] = useState("");
  const navigationRef = useRef(null);
  const listenersRef = useRef(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        await useFonts();
        setFontsLoaded(true);

        const response = await getAppStatus();
        setAppEnabled(response?.enabled ?? false);
        setDevMessage(response?.message ?? "");

        setTimeout(() => checkForAppUpdate(), 1500);
      } catch (error) {
        console.error("Initialization error:", error);
        setAppEnabled(false);
      }
    };
    initApp();
  }, []);

  // Setup FCM listeners once app is ready.
  // Pass a proxy that dereferences the ref at NAVIGATION time — the
  // NavigationContainer mounts after this effect runs, so capturing
  // navigationRef.current here would capture null forever.
  const navigationProxy = {
    navigate: (...args) => navigationRef.current?.navigate(...args),
    goBack: () => navigationRef.current?.goBack(),
  };

  useEffect(() => {
    if (!appEnabled || listenersRef.current) return;

    listenersRef.current = listenForNotifications(navigationProxy);
    checkInitialNotification(navigationProxy);

    return () => {
      if (listenersRef.current) {
        removeNotificationListeners(listenersRef.current);
        listenersRef.current = null;
      }
    };
  }, [appEnabled]);

  if (!fontsLoaded || appEnabled === null) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="dark-content" />
      {appEnabled ? (
        <AppContainer ref={navigationRef} />
      ) : (
        <DevelopmentScreen message={devMessage} />
      )}
      <FlashMessage position="top" />
    </SafeAreaView>
  );
}
