import * as Application from "expo-application";
import { Platform } from "react-native";
import { getAppStatus } from "../services/DevelopmentService";

const parseVersion = (value) => {
  if (typeof value !== "string" || !/^\d+(\.\d+)*$/.test(value.trim())) return null;
  return value.trim().split(".").map(Number);
};

// Startup supplies its status response; other callers fetch fresh API metadata.
export const checkForAppUpdate = async (appStatus) => {
  if (Platform.OS !== "android") return null;
  const status = appStatus ?? await getAppStatus();
  console.log("App version check:", {
    installedVersion: Application.nativeApplicationVersion,
    latestVersion: status?.appversion,
  });
  const installed = parseVersion(Application.nativeApplicationVersion);
  const latest = parseVersion(status?.appversion);
  if (!installed || !latest) {
    console.warn("Unable to check app updates: installed version or API appversion is invalid.");
    return null;
  }

  for (let i = 0; i < Math.max(installed.length, latest.length); i++) {
    if ((installed[i] || 0) > (latest[i] || 0)) return null;
    if ((installed[i] || 0) < (latest[i] || 0)) {
      return {
        forceUpdate: true,
        installedVersion: Application.nativeApplicationVersion,
        latestVersion: status.appversion.trim(),
        storeUrl: "https://play.google.com/store/apps/details?id=com.bmg.bmgscheme",
      };
    }
  }
  return null;
};
