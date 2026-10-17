import React from "react";
import { View, Text, Button } from "react-native";
// Compatibility route for old navigation state. Checkout opens from Buy/AddNewMember.
export default function PaymentWebView({ navigation }) {
  return <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
    <Text>Checkout has changed. Check payment history before starting a new payment.</Text>
    <Button title="Go back" onPress={() => navigation.goBack()} />
  </View>;
}
