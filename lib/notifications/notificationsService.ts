import { buildNotificationsForRecipient } from "@/lib/notifications/buildNotifications";
import { getReadKeysForUser, markNotificationsRead } from "@/lib/notifications/readsRepository";
import type { NotificationsResponse } from "@/lib/types/notifications";

export async function listNotificationsForUser(
  userId: string
): Promise<NotificationsResponse> {
  const built = await buildNotificationsForRecipient(userId);
  const readSet = await getReadKeysForUser(userId);
  const notifications = built.map((n) => ({ ...n, read: readSet.has(n.id) }));
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markReadsForUser(
  userId: string,
  opts: { keys?: string[]; all?: boolean }
): Promise<{ marked: number }> {
  const validKeys = new Set(
    (await buildNotificationsForRecipient(userId)).map((n) => n.id)
  );

  let toMark: string[];
  if (opts.all) {
    toMark = [...validKeys];
  } else if (opts.keys?.length) {
    toMark = opts.keys.filter((k) => validKeys.has(k));
  } else {
    return { marked: 0 };
  }

  const marked = await markNotificationsRead(userId, toMark);
  return { marked };
}
