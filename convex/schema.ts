import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  earthquakes: defineTable({
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
    isTest: v.boolean(), // Flag to distinguish test earthquakes
    createdAt: v.number(), // Timestamp when saved
  })
    .index("by_time", ["time"])
    .index("by_magnitude", ["magnitude"])
    .index("by_isTest", ["isTest"]),
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    location: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),
  alertSettings: defineTable({
    clerkId: v.string(), // Clerk user ID
    enabled: v.boolean(),
    minMagnitude: v.number(), // Minimum magnitude to trigger alerts
    alertLocation: v.optional(
      v.object({
        latitude: v.number(),
        longitude: v.number(),
        radiusKm: v.number(), // Radius in kilometers
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"]),
  notifications: defineTable({
    clerkId: v.string(), // Clerk user ID
    type: v.union(v.literal("earthquake"), v.literal("alert")),
    title: v.string(),
    message: v.string(),
    earthquakeId: v.optional(v.string()), // Reference to earthquake if type is earthquake
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_clerkId_read", ["clerkId", "read"])
    .index("by_clerkId_createdAt", ["clerkId", "createdAt"]),
});

