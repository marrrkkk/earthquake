import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Save a test earthquake
export const saveTestEarthquake = mutation({
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
      .withIndex("by_isTest", (q) => q.eq("isTest", true))
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (existing) {
      // Update existing
      return await ctx.db.patch(existing._id, {
        ...args,
        isTest: true,
        updated: Date.now(),
        createdAt: existing.createdAt,
      });
    }

    // Insert new
    const earthquakeId = await ctx.db.insert("earthquakes", {
      ...args,
      isTest: true,
      createdAt: Date.now(),
    });

    // Check if this earthquake matches any user's alert settings and create notifications
    // Schedule immediately (delay 0) for real-time notifications - this will create notifications
    // which will automatically appear in the nav notifications dropdown via Convex real-time subscriptions
    await ctx.scheduler.runAfter(0, internal.alerts.checkAndCreateNotification, {
      earthquakeId: args.id,
      magnitude: args.magnitude,
      place: args.place,
      coordinates: args.coordinates,
    });

    return earthquakeId;
  },
});

// Get all test earthquakes
export const getTestEarthquakes = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db
      .query("earthquakes")
      .withIndex("by_isTest", (q) => q.eq("isTest", true))
      .collect();
    
    // Sort by time descending (most recent first)
    return all.sort((a, b) => b.time - a.time);
  },
});

// Get all earthquakes (test + real) from last 24 hours
export const getAllEarthquakes = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    
    // Get all earthquakes (both test and real)
    const all = await ctx.db
      .query("earthquakes")
      .collect();
    
    // Filter to last 24 hours and sort by time descending
    return all
      .filter((eq) => eq.time >= twentyFourHoursAgo)
      .sort((a, b) => b.time - a.time);
  },
});

// Get test earthquakes by magnitude threshold
export const getTestEarthquakesByMagnitude = query({
  args: {
    minMagnitude: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("earthquakes")
      .withIndex("by_isTest", (q) => q.eq("isTest", true))
      .filter((q) => q.gte(q.field("magnitude"), args.minMagnitude))
      .collect();
  },
});

// Get recent test earthquakes
export const getRecentTestEarthquakes = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const all = await ctx.db
      .query("earthquakes")
      .withIndex("by_isTest", (q) => q.eq("isTest", true))
      .collect();
    
    // Sort by time descending and take limit
    return all
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  },
});

// Delete a test earthquake
export const deleteTestEarthquake = mutation({
  args: {
    id: v.id("earthquakes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Clear all test earthquakes
export const clearAllTestEarthquakes = mutation({
  args: {},
  handler: async (ctx) => {
    const testEarthquakes = await ctx.db
      .query("earthquakes")
      .withIndex("by_isTest", (q) => q.eq("isTest", true))
      .collect();

    for (const eq of testEarthquakes) {
      await ctx.db.delete(eq._id);
    }

    return { deleted: testEarthquakes.length };
  },
});

// Save a real earthquake (from PHIVOLCS)
export const saveRealEarthquake = mutation({
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
      // Update existing (don't create notification for updates)
      return await ctx.db.patch(existing._id, {
        ...args,
        isTest: false,
        updated: Date.now(),
        createdAt: existing.createdAt,
      });
    }

    // Insert new real earthquake
    const earthquakeId = await ctx.db.insert("earthquakes", {
      ...args,
      isTest: false,
      createdAt: Date.now(),
    });

    // Check if this earthquake matches any user's alert settings and create notifications
    // Schedule immediately (delay 0) for real-time notifications - this will create notifications
    // which will automatically appear in the nav notifications dropdown via Convex real-time subscriptions
    await ctx.scheduler.runAfter(0, internal.alerts.checkAndCreateNotification, {
      earthquakeId: args.id,
      magnitude: args.magnitude,
      place: args.place,
      coordinates: args.coordinates,
    });

    return earthquakeId;
  },
});

