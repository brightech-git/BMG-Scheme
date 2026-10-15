import { Alert, Platform, PermissionsAndroid } from "react-native";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import notifee, { AndroidImportance, AndroidVisibility, EventType } from "@notifee/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../Config/API";

const fcm = getMessaging();
export const CHANNEL_ID = "bmg_default";

/* ── Create Android channel ── */
export async function createNotificationChannel() {
  if (Platform.OS !== "android") return;
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "BMG Notifications",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: "default",
    vibration: true,
  });
}

/* ── Display notification via notifee (supports image) ── */
export async function displayNotification(title, body, data, imageUrl) {
  await createNotificationChannel();
  await notifee.displayNotification({
    title,
    body,
    data,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      sound: "default",
      pressAction: { id: "default" },
      ...(imageUrl && {
        largeIcon: imageUrl,
        style: { type: 0, picture: imageUrl },
      }),
    },
    ios: {
      sound: "default",
      ...(imageUrl && { attachments: [{ url: imageUrl }] }),
    },
  });
}

/* ── Device ID ── */
async function generateDeviceId() {
  const saved = await AsyncStorage.getItem("deviceId");
  if (saved) return saved;
  const newId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  await AsyncStorage.setItem("deviceId", newId);
  return newId;
}

/* ── Send FCM token to backend ── */
export async function sendPushTokenToServer(fcmToken, userId) {
  try {
    const deviceId = await generateDeviceId();
    const payload = { deviceId, deviceType: "mobile", expoToken: "", fcmToken, userId };
    const res = await fetch(`${API_BASE_URL}/device/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.error("❌ Token send failed:", err);
    return false;
  }
}

/* ── Register for push notifications ── */
export async function registerForPushNotifications(userId) {
  try {
    await createNotificationChannel();

    // Android 13+ permission
    if (Platform.OS === "android" && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Notifications Disabled", "Enable notifications to receive important updates.");
        return null;
      }
    }

    const authStatus = await requestPermission(fcm);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      Alert.alert("Notifications Disabled", "Enable notifications to receive important updates.");
      return null;
    }

    const fcmToken = await getToken(fcm);

    if (userId) await sendPushTokenToServer(fcmToken, userId);

    onTokenRefresh(fcm, async (newToken) => {
      if (userId) await sendPushTokenToServer(newToken, userId);
    });

    return fcmToken;
  } catch (error) {
    console.error("❌ Push registration error:", error);
    return null;
  }
}

/* ── Listen for notifications ── */
export function listenForNotifications(navigation) {
  // Foreground notifee tap
  const foregroundNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      handleNavigation(navigation, detail.notification.data);
    }
  });

  // Background FCM tap
  const backgroundOpenSub = onNotificationOpenedApp(fcm, (remoteMessage) => {
    handleNavigation(navigation, remoteMessage.data);
  });

  return { foregroundNotifee, backgroundOpenSub };
}

/* ── Check app opened from closed state ── */
export async function checkInitialNotification(navigation) {
  const remoteMessage = await getInitialNotification(fcm);
  if (remoteMessage) {
    handleNavigation(navigation, remoteMessage.data);
  }

  const initialNotifee = await notifee.getInitialNotification();
  if (initialNotifee?.notification?.data) {
    handleNavigation(navigation, initialNotifee.notification.data);
  }
}

/* ── Navigation helper ── */
function handleNavigation(navigation, data) {
  if (!data || !navigation) return;
  if (data?.type === "payment") navigation.navigate("Payments");
  if (data?.type === "rate_update") navigation.navigate("Rates");
}

/* ── Remove listeners ── */
export function removeNotificationListeners(listeners) {
  listeners?.foregroundNotifee?.();
  listeners?.backgroundOpenSub?.();
}
