/** Campos de likes; $N = viewer user id (null → liked_by_me siempre false). */
function likesFields(viewerParam: string) {
  return `
  (SELECT COUNT(*)::int FROM post_likes pl WHERE pl.post_id = p.id) AS likes_count,
  EXISTS(
    SELECT 1 FROM post_likes pl_me
    WHERE pl_me.post_id = p.id AND pl_me.user_id = ${viewerParam}::uuid
  ) AS liked_by_me`;
}

const COMMENTS_AGG = `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', pc.id,
          'post_id', pc.post_id,
          'user_id', pc.user_id,
          'content', pc.content,
          'created_at', pc.created_at,
          'updated_at', pc.updated_at,
          'author_username', cu.username,
          'author_avatar_url', cu.avatar_url
        )
        ORDER BY pc.created_at ASC
      )
      FROM post_comments pc
      INNER JOIN users cu ON cu.id = pc.user_id
      WHERE pc.post_id = p.id
    ),
    '[]'::json
  ) AS comments`;

const TAGS_AGG = `
  COALESCE(
    (
      SELECT json_agg(DISTINCT pt.tag)
      FROM post_tags pt
      WHERE pt.post_id = p.id
    ),
    '[]'::json
  ) AS tags`;

/** Listados completos (perfil, detalle). */
const POST_CORE_LIST = `
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.media,
  p.created_at,
  p.updated_at`;

/** Feed: solo URLs de fichero (sin data URLs en JSONB). */
const FEED_MEDIA_AGG = `
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('type', 'image', 'url', elem->>'url')
        ORDER BY ord
      )
      FROM jsonb_array_elements(COALESCE(p.media, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
      WHERE elem->>'type' = 'image'
        AND COALESCE(elem->>'url', '') <> ''
        AND elem->>'url' NOT LIKE 'data:%'
    ),
    '[]'::jsonb
  ) AS media`;

const POST_CORE_LIST_FEED = `
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  ${FEED_MEDIA_AGG},
  (COALESCE(jsonb_array_length(p.media), 0) > 0) AS has_media,
  p.created_at,
  p.updated_at`;

/** Detalle de un post (incluye media). */
const POST_CORE_DETAIL = `
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.media,
  p.created_at,
  p.updated_at`;

/** Feed paginado; params: [viewerUserId | null, limit] */
export const LIST_POSTS_FEED_SQL = `
SELECT
  ${POST_CORE_LIST_FEED},
  ${likesFields("$1")},
  ${COMMENTS_AGG},
  ${TAGS_AGG}
FROM posts p
INNER JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC
LIMIT $2
`.trim();

/** Perfil (sin ORDER; añadir cursor/LIMIT en runtime); params: [profileUserId, viewerUserId | null] */
export const LIST_POSTS_BY_USER_SQL = `
SELECT
  ${POST_CORE_LIST},
  ${likesFields("$2")},
  ${COMMENTS_AGG},
  ${TAGS_AGG}
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.user_id = $1::uuid
`.trim();

/** Rejilla de perfil: sin agregar comentarios (más rápido). */
export const LIST_POSTS_BY_USER_GRID_SQL = `
SELECT
  ${POST_CORE_LIST},
  ${likesFields("$2")},
  '[]'::json AS comments,
  ${TAGS_AGG}
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.user_id = $1::uuid
`.trim();

/** Por ids; params: [uuid[], viewerUserId | null] */
export const LIST_POSTS_BY_IDS_GRID_SQL = `
SELECT
  ${POST_CORE_LIST},
  ${likesFields("$2")},
  '[]'::json AS comments,
  ${TAGS_AGG}
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.id = ANY($1::uuid[])
`.trim();

/** Detalle; params: [viewerUserId | null, postId] */
export const GET_POST_WITH_RELATIONS_SQL = `
SELECT
  ${POST_CORE_DETAIL},
  ${likesFields("$1")},
  ${COMMENTS_AGG},
  ${TAGS_AGG}
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.id = $2
`.trim();
