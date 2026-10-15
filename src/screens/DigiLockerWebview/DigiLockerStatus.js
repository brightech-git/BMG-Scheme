import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { fetchAadhaarIfAuthenticated } from "../../services/DigiLockerService";

export default function DigiLockerStatusScreen({ route }) {
  const { verificationId } = route.params;
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    const timer = setInterval(async () => {
      const res = await fetchAadhaarIfAuthenticated(verificationId);

      if (res.step === "SUCCESS") {
        clearInterval(timer);
        setStatus("Verified ✅");
      } else {
        setStatus(res.status || "Pending...");
      }
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>{status}</Text>
    </View>
  );
}
