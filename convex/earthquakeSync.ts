import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Action to sync real earthquakes from PHIVOLCS and save them to database
 * This should be called periodically (e.g., every 5 minutes) to check for new earthquakes
 */
export const syncRealEarthquakes = action({
  args: {},
  handler: async (ctx) => {
    // Import the server action to fetch earthquakes
    // Note: We can't directly import server actions, so we'll need to use HTTP or create a mutation
    // For now, we'll create a mutation that can be called from a scheduled task
    
    // This action will be called from a scheduled task or HTTP endpoint
    // It should fetch earthquakes and save new ones
    return { success: true, message: "Sync function ready - implement HTTP call to fetch earthquakes" };
  },
});

/**
 * Internal mutation to save a real earthquake (called from action or HTTP endpoint)
 */
export const processNewEarthquake = internalMutation({
  args: {
    id: v.string(),
    magnitude: v.number(),
    place: v.string(),
    time: v.number(),
    updated: v.number(),
    url: v.string(),
    detail: v.string(),
    status: v.string(),
    tsunami: v.number(),
    sig: v.number(),
    net: v.string(),
    code: v.string(),
    ids: v.string(),
    sources: v.string(),
    types: v.string(),
    nst: v.union(v.number(), v.null()),
    dmin: v.union(v.number(), v.null()),
    rms: v.number(),
    gap: v.union(v.number(), v.null()),
    magType: v.string(),
    type: v.string(),
    title: v.string(),
    coordinates: v.object({
      longitude: v.number(),
      latitude: v.number(),
      depth: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if earthquake with this ID already exists
    const existing = await ctx.db
      .query("earthquakes")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (existing) {
      // Already exists, don't create notification
      return { isNew: false, _id: existing._id };
    }

    // Insert new real earthquake
    const earthquakeId = await ctx.db.insert("earthquakes", {
      ...args,
      isTest: false,
      createdAt: Date.now(),
    });

    // Check if this earthquake matches any user's alert settings and create notifications
    await ctx.scheduler.runAfter(0, internal.alerts.checkAndCreateNotification, {
      earthquakeId: args.id,
      magnitude: args.magnitude,
      place: args.place,
      coordinates: args.coordinates,
    });

    return { isNew: true, _id: earthquakeId };
  },
});

