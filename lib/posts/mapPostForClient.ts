import type { ApiComment } from "@/lib/types/comment";
import type { ApiPost } from "@/lib/types/post";
import type { ClientComment, ClientPost } from "@/lib/types/clientPost";

type RawCommentJson = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_username?: string;
  author_avatar_url?: string;
};

export function mapCommentJson(raw: RawCommentJson): ClientComment {
  return {
    id: raw.id,
    postId: raw.post_id,
    userId: raw.user_id,
    authorUsername: raw.author_username ?? "Usuario",
    authorAvatarUrl: raw.author_avatar_url ?? "",
    content: raw.content,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export function mapApiCommentForClient(comment: ApiComment, author?: { username: string; avatarUrl: string }): ClientComment {
  return {
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    authorUsername: author?.username ?? "Usuario",
    authorAvatarUrl: author?.avatarUrl ?? "",
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

export function normalizeCommentsJson(raw: unknown): ClientComment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => mapCommentJson(item as RawCommentJson));
}

export function mapPostForClient(
  post: ApiPost,
  opts: {
    authorUsername: string;
    authorAvatarUrl?: string;
    comments?: ClientComment[];
    likesCount?: number;
    likedByMe?: boolean;
  }
): ClientPost {
  return {
    id: post.id,
    userId: post.userId,
    authorUsername: opts.authorUsername,
    authorAvatarUrl: opts.authorAvatarUrl ?? "",
    content: post.content,
    format: post.format,
    sessionId: post.sessionId,
    workoutId: null,
    visibility: post.visibility,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    likesCount: opts.likesCount ?? 0,
    likedByMe: opts.likedByMe ?? false,
    comments: opts.comments ?? [],
  };
}
