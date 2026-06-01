export type FeedNotification = {
  id: string;
  type: "like" | "comment" | "follow";
  actorUserId: string;
  actorUsername: string;
  actorAvatarUrl: string;
  postId?: string;
  postPreview?: string;
  commentPreview?: string;
  commentId?: string;
  createdAt: string;
  read?: boolean;
};

export type NotificationsResponse = {
  notifications: FeedNotification[];
  unreadCount: number;
};
