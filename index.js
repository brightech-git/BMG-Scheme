import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { displayNotification } from './src/utils/Notification';
import App from './App';

// ── Background FCM handler ────────────────────────────────────────
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const { notification, data } = remoteMessage;
  if (!notification && data?.title) {
    await displayNotification(data.title, data.body ?? '', data, data.imageUrl);
  }
});

// ── Background notifee handler ────────────────────────────────────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
  }
});

// ── Foreground FCM handler (registered ONCE here, not inside React) ──
let foregroundFCMRegistered = false;
if (!foregroundFCMRegistered) {
  foregroundFCMRegistered = true;
  messaging().onMessage(async (remoteMessage) => {
    const { notification, data } = remoteMessage;
    if (notification) {
      const imageUrl =
        notification.android?.imageUrl ??
        notification.apple?.imageUrl ??
        data?.image ??
        data?.imageUrl;
      await displayNotification(
        notification.title ?? 'Notification',
        notification.body ?? '',
        data ?? {},
        imageUrl
      );
    }
  });
}

registerRootComponent(App);
