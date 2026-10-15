import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/MaterialIcons";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { API_BASE_URL } from "../../Config/API";
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function EmailFormPage() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
    title: ""
  });
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];

  const scrollViewRef = useRef(null);
  const messageInputRef = useRef(null);
  const subjectInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const nameInputRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const showToast = (title, message, type = "info") => {
    setToast({ visible: true, message, type, title });

    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(-100);

    // Slide in and fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 4 seconds
    setTimeout(() => {
      hideToast();
    }, 2000);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast({ visible: false, message: "", type: "info", title: "" });
    });
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const handleSend = async () => {
    // Dismiss keyboard first to ensure button press is registered
    dismissKeyboard();

    if (isSubmitting) return;

    if (!name || !email || !subject || !message) {
      showToast("Validation Error", "Please fill all fields", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Validation Error", "Please enter a valid email address", "error");
      return;
    }

    if (message.length > 500) {
      showToast("Validation Error", "Message must be less than 500 characters", "error");
      return;
    }

    setIsSubmitting(true);
    showToast("Sending", "Please wait while we send your message...", "info");

    try {
      const response = await fetch(
        `${API_BASE_URL}/customer/inquiry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
          }),
        }
      );

      const data = await response.text();

      if (response.ok) {
        showToast("Success", data || "Your inquiry has been sent successfully!", "success");

        // Clear form
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");

        // Wait for toast to show, then navigate back after 2 seconds
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        showToast("Error", data || "Something went wrong. Please try again.", "error");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("API Error:", error);
      showToast("Network Error", "Unable to connect to the server. Please check your connection.", "error");
      setIsSubmitting(false);
    }
  };

  const getToastIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Icon name="check-circle" size={24} color="#fff" />;
      case 'error':
        return <Icon name="error" size={24} color="#fff" />;
      case 'info':
        return <Icon name="info" size={24} color="#fff" />;
      default:
        return <Icon name="info" size={24} color="#fff" />;
    }
  };

  const getToastBackground = () => {
    switch (toast.type) {
      case 'success':
        return ["#4CAF50", "#2E7D32"];
      case 'error':
        return ["#F44336", "#C62828"];
      case 'info':
        return ["#2196F3", "#1565C0"];
      default:
        return ["#2196F3", "#1565C0"];
    }
  };

  // Handle keyboard-aware scrolling
  const handleContentSizeChange = () => {
    if (scrollViewRef.current && keyboardVisible) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <CommonHeader title="Contact Us" subtitle="We'd love to hear from you" />
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={handleContentSizeChange}
        >
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="person" size={16} color="#4b79a1" /> Full Name
              </Text>
              <TextInput
                ref={nameInputRef}
                style={styles.input}
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999"
                editable={!isSubmitting}
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="email" size={16} color="#4b79a1" /> Email Address
              </Text>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="john@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
                editable={!isSubmitting}
                returnKeyType="next"
                onSubmitEditing={() => subjectInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Subject Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="subject" size={16} color="#4b79a1" /> Subject
              </Text>
              <TextInput
                ref={subjectInputRef}
                style={styles.input}
                placeholder="What is this regarding?"
                value={subject}
                onChangeText={setSubject}
                placeholderTextColor="#999"
                editable={!isSubmitting}
                returnKeyType="next"
                onSubmitEditing={() => messageInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            {/* Message Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Icon name="message" size={16} color="#4b79a1" /> Your Message
              </Text>
              <TextInput
                ref={messageInputRef}
                style={[styles.input, styles.messageBox]}
                placeholder="Type your message here..."
                multiline
                numberOfLines={6}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
                placeholderTextColor="#999"
                maxLength={500}
                editable={!isSubmitting}
                returnKeyType="done"
                onSubmitEditing={dismissKeyboard}
                blurOnSubmit={true}
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
              <Text style={styles.charCount}>
                {message.length}/500 characters
              </Text>
            </View>

            {/* Send Button */}
            <TouchableOpacity 
              onPress={handleSend} 
              activeOpacity={0.9}
              disabled={isSubmitting}
              style={styles.buttonTouchable}
            >
              <LinearGradient
                colors={["#4b79a1", "#283e51"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.button, isSubmitting && styles.buttonDisabled]}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="hourglass-empty" size={22} color="#fff" />
                    <Text style={styles.buttonText}>Sending...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={22} color="#fff" />
                    <Text style={styles.buttonText}>Send Message</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity 
              onPress={() => {
                dismissKeyboard();
                navigation.goBack();
              }} 
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Icon name="info" size={16} color="#666" />
              <Text style={styles.noteText}>
                We'll respond to your inquiry within 24 hours
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Custom Toast Notification */}
        {toast.visible && (
          <Animated.View
            style={[
              styles.toastContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={getToastBackground()}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.toastGradient}
            >
              <TouchableOpacity
                style={styles.toastContent}
                onPress={hideToast}
                activeOpacity={0.8}
              >
                <View style={styles.toastIcon}>
                  {getToastIcon()}
                </View>
                <View style={styles.toastTextContainer}>
                  <Text style={styles.toastTitle}>{toast.title}</Text>
                  <Text style={styles.toastMessage}>{toast.message}</Text>
                </View>
                <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingBottom: 50, // Extra padding for better scroll
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b79a1",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f8f9fa",
    color: "#333",
  },
  messageBox: {
    minHeight: 140,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginTop: 6,
    marginRight: 4,
  },
  buttonTouchable: {
    marginTop: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#4b79a1",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    padding: 12,
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1e7ff",
  },
  noteText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
    fontStyle: "italic",
  },
  // Toast Styles
  toastContainer: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastGradient: {
    borderRadius: 12,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingRight: 12,
  },
  toastIcon: {
    marginRight: 12,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});