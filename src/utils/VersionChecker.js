import * as Application from "expo-application";
import { Platform } from "react-native";

const parseVersion = (value) => {
  if (typeof value !== "string" || !/^\d+(\.\d+)*$/.test(value.trim())) return null;
  return value.trim().split(".").map(Number);
};

// Reuse the status response already fetched at startup; no second network request.
export const checkForAppUpdate = async (appStatus) => {
  if (Platform.OS !== "android") return null;
  console.log("App version check:", {
    installedVersion: Application.nativeApplicationVersion,
    latestVersion: appStatus?.appversion,
  });
  const installed = parseVersion(Application.nativeApplicationVersion);
  const latest = parseVersion(appStatus?.appversion);
  if (!installed || !latest) return null;

  for (let i = 0; i < Math.max(installed.length, latest.length); i++) {
    if ((installed[i] || 0) > (latest[i] || 0)) return null;
    if ((installed[i] || 0) < (latest[i] || 0)) {
      return {
        forceUpdate: true,
        installedVersion: Application.nativeApplicationVersion,
        latestVersion: appStatus.appversion,
        storeUrl: "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme",
      };
    }
  }
  return null;
};
