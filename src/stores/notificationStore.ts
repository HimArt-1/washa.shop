import { create } from "zustand";
import {
    getAdminNotifications,
    getUnreadNotificationsCount,
    markAllNotificationsRead as markAllAdminNotificationsRead,
    markNotificationRead as markAdminNotificationRead,
} from "@/app/actions/notifications";
import { createPollingNetworkGuard } from "@/lib/browser-polling-guard";
import type { AdminNotification } from "@/types/database";

const notificationFetchGuard = createPollingNetworkGuard();

interface NotificationState {
    notifications: AdminNotification[];
    unreadCount: number;
    isLoading: boolean;
    isInitialized: boolean;
    setNotifications: (notifications: AdminNotification[]) => void;
    addNotification: (notification: AdminNotification) => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchInitial: (force?: boolean) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    isInitialized: false,

    setNotifications: (notifications) => set({ 
        notifications, 
        unreadCount: notifications.filter((n) => !n.is_read).length 
    }),

    addNotification: (notification) => set((state) => {
        // Prevent duplicates
        if (state.notifications.some(n => n.id === notification.id)) return state;
        
        const newNotifications = [notification, ...state.notifications];
        return {
            notifications: newNotifications,
            unreadCount: state.unreadCount + 1,
        };
    }),

    markAsRead: async (id: string) => {
        const previous = get();
        const target = previous.notifications.find((notification) => notification.id === id);
        if (!target || target.is_read) return;
        // Optimistic UI update
        set((state) => ({
            notifications: state.notifications.map((n) => 
                n.id === id ? { ...n, is_read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));

        const result = await markAdminNotificationRead(id);
        if (!result.success) {
            console.error("Failed to mark notification as read", result.error);
            set({ notifications: previous.notifications, unreadCount: previous.unreadCount });
        }
    },

    markAllAsRead: async () => {
        const previous = get();
        // Optimistic UI update
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
            unreadCount: 0,
        }));

        const result = await markAllAdminNotificationsRead();
        if (!result.success) {
            console.error("Failed to mark all as read", result.error);
            set({ notifications: previous.notifications, unreadCount: previous.unreadCount });
        }
    },

    fetchInitial: async (force = false) => {
        if (get().isLoading) return;
        if (!force && get().isInitialized) return;
        if (!notificationFetchGuard.canAttempt()) return;
        
        set({ isLoading: true });
        try {
            const [data, unreadCount] = await Promise.all([
                getAdminNotifications(50),
                getUnreadNotificationsCount(),
            ]);
            notificationFetchGuard.recordSuccess();
            set({ 
                notifications: data,
                unreadCount,
                isInitialized: true,
                isLoading: false
            });
        } catch (error) {
            const { shouldLog } = notificationFetchGuard.recordFailure();
            if (shouldLog) {
                console.warn("Admin notifications fetch paused after a network failure; will retry automatically.", error);
            }
            set({ isLoading: false });
        }
    }
}));
