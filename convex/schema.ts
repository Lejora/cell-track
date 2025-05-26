import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cellLogs: defineTable({
    time: v.string(),
    createdAt: v.number(),
    mcc: v.string(),
    mnc: v.string(),
    tac: v.string(),
    cid: v.string(),
  }),
});
