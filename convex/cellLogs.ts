import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cellLogs").collect();
  },
});

export const count = query(async ({ db }) => {
  return await db
    .query("cellLogs")
    .collect()
    .then((items) => items.length);
});

export const insert = mutation({
  args: {
    time: v.string(),
    createdAt: v.number(),
    mcc: v.string(),
    mnc: v.string(),
    tac: v.string(),
    cid: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("cellLogs", args);
  },
});

export const remove = mutation({
  args: {
    id: v.id("cellLogs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
