/** Shape alineado con Goi App / Web (`types/post.ts`). */
export type ClientComment = {
  id: string;
  postId: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientPost = {
  id: string;
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  content: string;
  format: "standard" | "training";
  sessionId: string | null;
  workoutId: string | null;
  visibility: "public" | "followers" | "private";
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  likedByMe: boolean;
  comments: ClientComment[];
};

export type FeedPageResponse = {
  items: { kind: "post"; post: ClientPost }[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PostsByUserPageResponse = {
  posts: ClientPost[];
  nextCursor: string | null;
  total: number;
};
