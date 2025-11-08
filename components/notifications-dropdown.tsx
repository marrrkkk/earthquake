"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Settings, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertSettingsDialog } from "./alert-settings-dialog";
import Link from "next/link";

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export function NotificationsDropdown() {
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const notifications = useQuery(
    api.alerts.getNotifications,
    user ? { clerkId: user.id, limit: 20 } : "skip"
  );
  
  const unreadCount = useQuery(
    api.alerts.getUnreadCount,
    user ? { clerkId: user.id } : "skip"
  );
  
  const markAsRead = useMutation(api.alerts.markAsRead);
  const markAllAsRead = useMutation(api.alerts.markAllAsRead);
  const deleteNotification = useMutation(api.alerts.deleteNotification);

  if (!user) {
    return null;
  }

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead({ notificationId: notificationId as any });
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead({ clerkId: user.id });
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification({ notificationId: notificationId as any });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount !== undefined && unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount !== undefined && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllAsRead();
                  }}
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsOpen(true);
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications === undefined ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification._id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onSelect={(e) => {
                    e.preventDefault();
                    if (!notification.read) {
                      handleMarkAsRead(notification._id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          notification.type === "earthquake"
                            ? "text-orange-500"
                            : "text-primary"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification._id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {notification.earthquakeId && (
                    <Link
                      href="/earthquakes"
                      className="text-xs text-primary hover:underline mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View earthquake →
                    </Link>
                  )}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

