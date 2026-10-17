import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this import
import NotificationService from "../../services/NotificationService";
import CommonHeader from "../../components/CommonHeader/CommonHeader";
import { Ionicons } from "@expo/vector-icons";
import { BottomTab } from "../../components";
import { SIZES, COLORS, moderateScale, SHADOWS } from "../../utils/AppTheme";

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get("window");


const NotificationItem = ({ item, index, onDelete, onMarkAsRead, userId }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRead, setIsRead] = useState(item.isRead || item.IsRead || false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [unreadcount, setUnReadcount] = useState(0);
  const swipeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade and slide-in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleExpand = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);

    // Mark as read when user clicks on notification
    if (!isRead && onMarkAsRead) {
      try {
        setMarkingAsRead(true);
        await onMarkAsRead(item.id || item.Id, userId);
        setIsRead(true);
      } catch (error) {
        console.error("Error marking notification as read:", error);
      } finally {
        setMarkingAsRead(false);
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) swipeAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -120) {
          // Swipe threshold: animate out
          Animated.timing(swipeAnim, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsDeleting(true);
            onDelete(item.id || item.Id);
          });
        } else {
          // Return to original position
          Animated.spring(swipeAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  if (isDeleting) return null;

  const swipeProgress = swipeAnim.interpolate({
    inputRange: [-120, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Style for read/unread notifications
  const itemStyle = isRead
    ? styles.readNotification
    : styles.unreadNotification;

  return (
    <Animated.View
      style={[
        styles.notificationItem,
        itemStyle,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Unread indicator dot */}
      {!isRead && <View style={styles.unreadIndicator} />}

      {/* Delete background */}
      <View style={styles.deleteBackground}>
        <Animated.View
          style={[styles.deleteAction, { opacity: swipeProgress }]}
        >
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.notificationTouchable,
          { transform: [{ translateX: swipeAnim }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.notificationContent}
          onPress={toggleExpand}
          disabled={markingAsRead}
        >
          {item.ImageUrl || item.imageUrl ? (
            <Image
              source={{ uri: item.ImageUrl || item.imageUrl }}
              style={styles.notificationImage}
            />
          ) : (
            <View style={[styles.notificationImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>🔔</Text>
            </View>
          )}

          <View style={styles.notificationText}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.notificationTitle,
                  isRead ? styles.readTitle : styles.unreadTitle,
                ]}
                numberOfLines={2}
              >
                {item.Title || item.title || "No Title"}
              </Text>

              {/* Read status badge */}
              <View
                style={[
                  styles.readStatusBadge,
                  isRead ? styles.readBadge : styles.unreadBadge,
                ]}
              >
                <Text style={styles.readStatusText}>
                  {isRead ? "Read" : "New"}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.notificationMessage,
                isRead ? styles.readMessage : styles.unreadMessage,
              ]}
              numberOfLines={isExpanded ? undefined : 3}
            >
              {item.Message || item.message || "No message"}
            </Text>

            {/* Show "Read More/Less" only if content is long enough */}
            {(item.Message || item.message) &&
              (item.Message?.length > 150 || item.message?.length > 150) && (
                <TouchableOpacity
                  onPress={toggleExpand}
                  style={styles.readMoreButton}
                >
                  <Text style={styles.readMoreText}>
                    {isExpanded ? "Read Less" : "Read More"}
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null); // Initialize as null

  // Fetch userId from AsyncStorage
  const getUserIdFromStorage = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      return storedUserId;
    } catch (error) {
      console.error('Error fetching userId from AsyncStorage:', error);
      return null;
    }
  };

  // Load notifications when userId is available
  const loadNotifications = async (currentUserId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await NotificationService.getUserNotifications(currentUserId);

      if (response.code === 200) {
        const notificationsData = response.data || [];
        setNotifications(notificationsData);
        await loadUnreadCount(currentUserId);
      } else {
        setError(response.message || "Failed to load notifications");
        Alert.alert(
          "Error",
          response.message || "Failed to load notifications"
        );
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setError(error.message);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async (currentUserId) => {
    try {
      const response = await NotificationService.getUnreadCount(currentUserId);


      if (response.code === 200) {
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // Initialize - fetch userId first, then load notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const storedUserId = await getUserIdFromStorage();
        if (storedUserId) {
          setUserId(storedUserId);
          await loadNotifications(storedUserId);
        } else {
          setError("User ID not found. Please login again.");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing notifications:", error);
        setError("Failed to load user data");
        setLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await loadNotifications(userId);
    }
    setRefreshing(false);
  }, [userId]);

  const handleDeleteNotification = async (notificationId) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      // Update local state
      setNotifications((prev) =>
        prev.filter((item) => (item.id || item.Id) !== notificationId)
      );
      // Refresh unread count if needed
      if (userId) {
        await loadUnreadCount(userId);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      Alert.alert("Error", "Failed to delete notification");
    }
  };

  const handleMarkAsRead = async (notificationId, currentUserId) => {
    try {
      const response = await NotificationService.markAsRead(
        notificationId,
        currentUserId
      );

      if (
        response.code === 200 &&
        (response.data.read || response.data.status === "success")
      ) {
        // Update local state
        setNotifications((prev) =>
          prev.map((item) =>
            (item.id || item.Id) === notificationId
              ? { ...item, isRead: true, IsRead: true }
              : item
          )
        );
        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error marking as read:", error);
      throw error;
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not available");
      return;
    }

    try {
      const response = await NotificationService.markAllAsRead(userId);

      if (response.code === 200) {
        // Update all notifications to read
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, isRead: true, IsRead: true }))
        );
        // Reset unread count
        setUnreadCount(0);
        Alert.alert(
          "Success",
          `${response.data.updated} notifications marked as read`
        );
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all as read");
    }
  };

  const handleDeleteAll = async () => {
    if (!userId) {
      Alert.alert("Error", "User ID not available");
      return;
    }

    Alert.alert(
      "Delete All",
      "Are you sure you want to delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            try {
              await NotificationService.deleteAllNotifications(userId);
              setNotifications([]);
              setUnreadCount(0);
              Alert.alert("Success", "All notifications deleted");
            } catch (error) {
              console.error("Error deleting all notifications:", error);
              Alert.alert("Error", "Failed to delete all notifications");
            }
          },
        },
      ]
    );
  };

  // Filter notifications based on selected filter
  const filteredNotifications = notifications.filter((item) => {
    if (selectedFilter === "all") return true;
    const isReadStatus = item.isRead || item.IsRead || false;
    if (selectedFilter === "unread") return !isReadStatus;
    if (selectedFilter === "read") return isReadStatus;
    return true;
  });

  // Sort notifications (unread first, then by date)
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    // Unread notifications first
    const aIsRead = a.isRead || a.IsRead || false;
    const bIsRead = b.isRead || b.IsRead || false;

    if (!aIsRead && bIsRead) return -1;
    if (aIsRead && !bIsRead) return 1;

    // Then by date (newest first)
    const dateA = new Date(a.CreatedAt || a.createdAt || a.Date || a.date || 0);
    const dateB = new Date(b.CreatedAt || b.createdAt || b.Date || b.date || 0);
    return dateB - dateA;
  });

  // Show loading while fetching userId
  if (loading && !userId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            // Retry initialization
            const retry = async () => {
              const storedUserId = await getUserIdFromStorage();
              if (storedUserId) {
                setUserId(storedUserId);
                await loadNotifications(storedUserId);
              }
            };
            retry();
          }}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <CommonHeader
          title="Notifications"
          rightComponent={
            <TouchableOpacity onPress={handleDeleteAll} activeOpacity={0.7}>
              <View
                style={{
                  width: moderateScale(40),
                  height: moderateScale(40),
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: SIZES.radius.full,
                  backgroundColor: COLORS.primary,
                  ...SHADOWS.sm,
                }}
              >
                <Ionicons
                  name="trash"
                  size={SIZES.icon.md}
                  color={COLORS.white}
                />
              </View>
            </TouchableOpacity>
          }
        />

        {/* Filter buttons */}
        <View style={styles.filterContainer}>
          {["all", "unread", "read"].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selectedFilter === filter && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive,
                ]}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications list */}
        <ScrollView
          style={styles.notificationsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#007AFF"]}
              tintColor="#007AFF"
            />
          }
        >
          {sortedNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>📭</Text>
              <Text style={styles.emptyMessage}>
                {selectedFilter === "unread"
                  ? "No unread notifications"
                  : selectedFilter === "read"
                  ? "No read notifications"
                  : "No notifications yet"}
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => userId && loadNotifications(userId)}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sortedNotifications.map((item, index) => (
              <NotificationItem
                key={item.id || item.Id || index}
                item={item}
                index={index}
                onDelete={handleDeleteNotification}
                onMarkAsRead={handleMarkAsRead}
                userId={userId}
              />
            ))
          )}
        </ScrollView>
      </View>
      <BottomTab screen={'NotificationsPage'} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  statsContainer: {
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  unreadStat: {
    color: "#ff3b30",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  markAllButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  markAllText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  deleteAllButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  deleteAllText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: "#fff",
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyMessage: {
    fontSize: 18,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // NotificationItem styles
  notificationItem: {
    marginBottom: 12,
    position: "relative",
  },
  readNotification: {
    opacity: 0.8,
  },
  unreadNotification: {
    opacity: 1,
  },
  unreadIndicator: {
    position: "absolute",
    left: 8,
    top: "50%",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#007AFF",
    zIndex: 10,
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: "#dc3545",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAction: {
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  deleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  notificationTouchable: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationContent: {
    flexDirection: "row",
    padding: 16,
  },
  notificationImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 14,
    resizeMode: "cover",
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 28,
  },
  notificationText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  readTitle: {
    color: "#666",
  },
  unreadTitle: {
    color: "#1a1a1a",
  },
  readStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  readBadge: {
    backgroundColor: "#e0e0e0",
  },
  unreadBadge: {
    backgroundColor: "#ff3b30",
  },
  readStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  notificationMessage: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
  },
  readMessage: {
    color: "#777",
  },
  unreadMessage: {
    color: "#444",
  },
  readMoreButton: {
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  readMoreText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  notificationDate: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
  },
});

export default NotificationsPage;
