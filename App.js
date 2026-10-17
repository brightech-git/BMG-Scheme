import React, { useEffect, useRef, useState } from "react";
import { AppState, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import FlashMessage from "react-native-flash-message";
import AppContainer from "./src/routes/routes";
import DevelopmentScreen from "./src/screens/Splashscreen/DevelopmentScreen";
import SplashScreen from "./src/screens/Splashscreen/SplashScreen";
import { colors } from "./src/utils/colors";
import useFonts from "./src/utils/Fonts";
import { getAppStatus } from "./src/services/DevelopmentService";
import "react-native-gesture-handler";
import {
  listenForNotifications,
  removeNotificationListeners,
  checkInitialNotification,
  ensureNotificationPermission,
  registerForPushNotifications,
} from "./src/utils/Notification";

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [appEnabled, setAppEnabled] = useState(null);
  const [appStatus, setAppStatus] = useState(null);
  const [devMessage, setDevMessage] = useState("");
  const navigationRef = useRef(null);
  const listenersRef = useRef(null);

  useEffect(() => {
    if (!fontsLoaded || appEnabled !== true) return;
    let disposed = false;
    let timer;
    let previousState = AppState.currentState;
    const checkPermission = async () => {
      if (await ensureNotificationPermission()) {
        const userId = await AsyncStorage.getItem("userId");
        await registerForPushNotifications(userId);
      }
    };
    const runCheck = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed && AppState.currentState === "active" && navigationRef.current?.isReady()) {
          checkPermission().catch(error => {
            console.error("Notification setup failed:", error);
          });
        } else if (!disposed && AppState.currentState === "active") {
          runCheck();
        }
      }, 750);
    };
    if (previousState === "active") runCheck();
    const subscription = AppState.addEventListener("change", nextState => {
      const wasBackground = previousState === "background" || previousState === null;
      previousState = nextState;
      if (wasBackground && nextState === "active") runCheck();
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [fontsLoaded, appEnabled]);

  useEffect(() => {
    const initApp = async () => {
      try {
        await useFonts();
        setFontsLoaded(true);

        const response = await getAppStatus();
        setAppStatus(response);
        setAppEnabled(response?.enabled ?? false);
        setDevMessage(response?.message ?? "");

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
        <AppContainer ref={navigationRef} appStatus={appStatus} />
      ) : (
        <DevelopmentScreen message={devMessage} />
      )}
      <FlashMessage position="top" />
    </SafeAreaView>
  );
}
