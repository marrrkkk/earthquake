import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get or create alert settings for a user
 */
export const getAlertSettings = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("alertSettings")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!settings) {
      // Return default settings
      return {
        enabled: false,
        minMagnitude: 5.0,
        alertLocation: null,
      };
    }

    return {
      enabled: settings.enabled,
      minMagnitude: settings.minMagnitude,
      alertLocation: settings.alertLocation || null,
    };
  },
});

/**
 * Update alert settings for a user
 */
export const updateAlertSettings = mutation({
  args: {
    clerkId: v.string(),
    enabled: v.boolean(),
    minMagnitude: v.number(),
    alertLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        radiusKm: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("alertSettings")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        minMagnitude: args.minMagnitude,
        alertLocation: args.alertLocation,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("alertSettings", {
        clerkId: args.clerkId,
        enabled: args.enabled,
        minMagnitude: args.minMagnitude,
        alertLocation: args.alertLocation,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get notifications for a user
 */
export const getNotifications = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_clerkId_createdAt", (q) => q.eq("clerkId", args.clerkId))
      .order("desc")
      .take(limit);

    return notifications.map((n) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      earthquakeId: n.earthquakeId,
      read: n.read,
      createdAt: n.createdAt,
    }));
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_clerkId_read", (q) => 
        q.eq("clerkId", args.clerkId).eq("read", false)
      )
      .collect();

    return unread.length;
  },
});

/**
 * Mark notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      read: true,
    });
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_clerkId_read", (q) => 
        q.eq("clerkId", args.clerkId).eq("read", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, {
        read: true,
      });
    }
  },
});

/**
 * Create a notification
 */
export const createNotification = mutation({
  args: {
    clerkId: v.string(),
    type: v.union(v.literal("earthquake"), v.literal("alert")),
    title: v.string(),
    message: v.string(),
    earthquakeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      clerkId: args.clerkId,
      type: args.type,
      title: args.title,
      message: args.message,
      earthquakeId: args.earthquakeId,
      read: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
  },
});

/**
 * Calculate distance between two coordinates in kilometers (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if an earthquake matches a user's alert settings and create notification
 * This should be called when a new earthquake is detected
 */
export const checkAndCreateNotification = internalMutation({
  args: {
    earthquakeId: v.string(),
    magnitude: v.number(),
    place: v.string(),
    coordinates: v.object({
      latitude: v.number(),
      longitude: v.number(),
      depth: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Get all users with enabled alert settings
    const allSettings = await ctx.db.query("alertSettings").collect();
    const enabledSettings = allSettings.filter((s) => s.enabled);

    // If no users have alert settings, create notifications for all users (for testing)
    // Otherwise, only create for users with enabled settings
    let usersToNotify: string[] = [];
    
    if (enabledSettings.length === 0) {
      // No alert settings configured - get all users and notify them
      const allUsers = await ctx.db.query("users").collect();
      usersToNotify = allUsers.map(u => u.clerkId);
    } else {
      usersToNotify = enabledSettings.map(s => s.clerkId);
    }

    for (const clerkId of usersToNotify) {
      // Get alert settings for this user (if they exist)
      const setting = enabledSettings.find(s => s.clerkId === clerkId);
      
      // If user has settings, check if earthquake matches
      if (setting) {
        // Check magnitude threshold
        if (args.magnitude < setting.minMagnitude) {
          continue;
        }

        // Check location if specified
        if (setting.alertLocation) {
          const distance = calculateDistance(
            args.coordinates.latitude,
            args.coordinates.longitude,
            setting.alertLocation.latitude,
            setting.alertLocation.longitude
          );

          if (distance > setting.alertLocation.radiusKm) {
            continue; // Earthquake is outside the alert radius
          }
        }
      }

      // Check if notification already exists for this earthquake and user
      const existing = await ctx.db
        .query("notifications")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
        .filter((q) =>
          q.and(
            q.eq(q.field("type"), "earthquake"),
            q.eq(q.field("earthquakeId"), args.earthquakeId)
          )
        )
        .first();

      if (existing) {
        continue; // Notification already exists
      }

      // Create notification
      const title = `Earthquake Alert: M${args.magnitude.toFixed(1)}`;
      let locationText = "matching your criteria";
      if (setting?.alertLocation) {
        locationText = `within ${setting.alertLocation.radiusKm}km of your alert location`;
      } else if (!setting) {
        locationText = "detected";
      }
      const message = `A magnitude ${args.magnitude.toFixed(1)} earthquake occurred ${locationText}: ${args.place}`;

      await ctx.db.insert("notifications", {
        clerkId: clerkId,
        type: "earthquake",
        title,
        message,
        earthquakeId: args.earthquakeId,
        read: false,
        createdAt: Date.now(),
      });
    }
  },
});

