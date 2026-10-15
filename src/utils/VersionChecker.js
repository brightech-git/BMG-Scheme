import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { Alert, Linking, Platform } from "react-native";

/**
 * Compare semantic versions (e.g. 1.1.1)
 * Returns true if current < target
 */
const isVersionLower = (current, target) => {
  const c = current.split(".").map(Number);
  const t = target.split(".").map(Number);

  for (let i = 0; i < t.length; i++) {
    if ((c[i] || 0) < t[i]) return true;
    if ((c[i] || 0) > t[i]) return false;
  }
  return false;
};

export const checkForAppUpdate = async () => {
  try {
    const localVersion = Application.nativeApplicationVersion;

    /* ----------------------------------
       1️⃣ OTA UPDATE (ONLY IN PROD)
    ----------------------------------- */
    if (!__DEV__ && Updates.isEnabled) {
      const otaUpdate = await Updates.checkForUpdateAsync();
      if (otaUpdate.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
        return;
      }
    }

    /* ----------------------------------
       2️⃣ PLAY STORE VERSION CHECK
    ----------------------------------- */
const response = await fetch(
  "https://raw.githubusercontent.com/JK-08/BMG-Scheme/Update-Alerts/app-version.json?ts=" +
    Date.now()
);

    if (!response.ok) {
      throw new Error("Failed to fetch version config");
    }

    const text = await response.text();
    let config;
    try {
      config = JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON in app-version.json");
    }

    if (Platform.OS === "android") {
      const { latestVersion, playStoreUrl } = config.android;

      // ✨ OPTIONAL UPDATE ONLY
      if (isVersionLower(localVersion, latestVersion)) {
        Alert.alert(
          "New Version Available ✨",
          `A new version (${latestVersion}) is available.\nYou're using ${localVersion}.`,
          [
            { text: "Later", style: "cancel" },
            {
              text: "Update",
              onPress: () => Linking.openURL(playStoreUrl),
            },
          ]
        );
      } else {
      }
    }
  } catch (error) {
    console.error("Version check failed:", error.message || error);
  }
};
