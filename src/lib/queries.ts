import { auth } from "@/auth";
import { db } from "@/db/db";
import { cellLogs, InsertCellLog } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getMyCellLogs(userId: string) {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return db.select().from(cellLogs).where(eq(cellLogs.userId, userId));
}

export async function addCellLog(
  log: Omit<InsertCellLog, "userId" | "createdAt">
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.insert(cellLogs).values({
    ...log,
    userId: session.user.id,
  });
}

export async function deleteCellLog(id: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .delete(cellLogs)
    .where(and(eq(cellLogs.id, id), eq(cellLogs.userId, session.user.id)));
}

export async function editCellLog(
  id: number,
  log: Omit<InsertCellLog, "userId" | "createdAt" | "id">
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(cellLogs)
    .set(log)
    .where(and(eq(cellLogs.id, id), eq(cellLogs.userId, session.user.id)));
}
