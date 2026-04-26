import { create } from "zustand";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { AdminNotification } from "@/types/database";

interface NotificationState {
    notifications: AdminNotification[];
    unreadCount: number;
    isLoading: boolean;
    isInitialized: boolean;
    setNotifications: (notifications: AdminNotification[]) => void;
    addNotification: (notification: AdminNotification) => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchInitial: () => Promise<void>;
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
        const supabase = getSupabaseBrowserClient();
        
        // Optimistic UI update
        set((state) => ({
            notifications: state.notifications.map((n) => 
                n.id === id ? { ...n, is_read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
        }));

        const { error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("id", id);

        if (error) {
            console.error("Failed to mark notification as read", error);
            // Revert optimistic update here if needed
        }
    },

    markAllAsRead: async () => {
        const supabase = getSupabaseBrowserClient();
        
        // Optimistic UI update
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
            unreadCount: 0,
        }));

        const { error } = await supabase
            .from("admin_notifications")
            .update({ is_read: true })
            .eq("is_read", false);

        if (error) {
            console.error("Failed to mark all as read", error);
        }
    },

    fetchInitial: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true });
        const supabase = getSupabaseBrowserClient();
        
        const { data, error } = await supabase
            .from("admin_notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50);

        if (!error && data) {
            set({ 
                notifications: data as AdminNotification[],
                unreadCount: data.filter((n) => !n.is_read).length,
                isInitialized: true,
                isLoading: false
            });
        } else {
            set({ isLoading: false });
        }
    }
}));
