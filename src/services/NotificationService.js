import { API_BASE_URL } from "../Config/API";

class NotificationService {
  // Get all notifications for a user
  async getUserNotifications(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}`
      );


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      return {
        code: 200,
        data: data.data || data.notifications || data || [],
        message: "Fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return {
        code: 500,
        data: [],
        message: error.message || "Failed to fetch notifications",
      };
    }
  }

  // Get unread notification count for a user
  async getUnreadCount(userId) {
    try {

      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}/unread-count`
      );



      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();


      return {
        code: 200,
        data: {
          unreadCount: data.unreadCount || data.count || 0,
          status: data.status || "success"
        },
        message: "Unread count fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return {
        code: 500,
        data: { unreadCount: 0, status: "error" },
        message: error.message,
      };
    }
  }

  // Rest of the methods remain the same...
  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/read/all/${userId}`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        code: 200,
        data: {
          updated: data.updated || data.count || 0,
          status: data.status || "success"
        },
        message: "All notifications marked as read",
      };
    } catch (error) {
      console.error("Error marking all as read:", error);
      return {
        code: 500,
        data: { updated: 0, status: "error" },
        message: error.message,
      };
    }
  }

  // Mark a specific notification as read
  async markAsRead(notificationId, userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/read/${notificationId}/user/${userId}`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        code: 200,
        data: {
          read: data.read || data.status === "success" || false,
          status: data.status || "success"
        },
        message: "Notification marked as read",
      };
    } catch (error) {
      console.error("Error marking as read:", error);
      return {
        code: 500,
        data: { read: false, status: "error" },
        message: error.message,
      };
    }
  }

  // Delete a single notification by ID
  async deleteNotification(notificationId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/notification/${notificationId}`,
        {
          method: "DELETE",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        code: 200,
        data,
        message: "Notification deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Delete all notifications for a user
  async deleteAllNotifications(userId) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/user/${userId}`,
        {
          method: "DELETE",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
        }
      );


      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server error details: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        code: 200,
        data,
        message: "All notifications deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      throw error;
    }
  }

  // Format date for display
  formatNotificationDate(dateString) {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Filter notifications by status
  filterNotificationsByStatus(notifications, status) {
    return notifications.filter((n) => n.Status === status);
  }

  // Sort notifications by date (newest first by default)
  sortNotificationsByDate(notifications, ascending = false) {
    return notifications.sort((a, b) => {
      const dateA = new Date(a.CreatedAt || a.createdAt || a.Date || a.date);
      const dateB = new Date(b.CreatedAt || b.createdAt || b.Date || b.date);
      return ascending ? dateA - dateB : dateB - dateA;
    });
  }

  // Get notification statistics (unread vs total)
  async getNotificationStats(userId) {
    try {
      // Get both notifications and unread count
      const [notificationsResponse, unreadResponse] = await Promise.all([
        this.getUserNotifications(userId),
        this.getUnreadCount(userId)
      ]);

      return {
        code: 200,
        data: {
          total: notificationsResponse.data.length,
          unread: unreadResponse.data.unreadCount,
          read: notificationsResponse.data.length - unreadResponse.data.unreadCount
        },
        message: "Notification stats fetched successfully"
      };
    } catch (error) {
      console.error("Error getting notification stats:", error);
      return {
        code: 500,
        data: { total: 0, unread: 0, read: 0 },
        message: error.message
      };
    }
  }
}

export default new NotificationService();