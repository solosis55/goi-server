/** Consulta con autor + comentarios anidados (mantener alineado con sql/queries.sql § enriquecido). */
export const LIST_POSTS_WITH_RELATIONS_SQL = `
SELECT
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.created_at,
  p.updated_at,
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
  ) AS comments,
  COALESCE(
    (
      SELECT json_agg(DISTINCT pt.tag)
      FROM post_tags pt
      WHERE pt.post_id = p.id
    ),
    '[]'::json
  ) AS tags
FROM posts p
INNER JOIN users u ON u.id = p.user_id
ORDER BY p.created_at DESC
`.trim();

export const LIST_POSTS_BY_USER_SQL = `
SELECT
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.created_at,
  p.updated_at,
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
  ) AS comments,
  COALESCE(
    (
      SELECT json_agg(DISTINCT pt.tag)
      FROM post_tags pt
      WHERE pt.post_id = p.id
    ),
    '[]'::json
  ) AS tags
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.user_id = $1
ORDER BY p.created_at DESC
`.trim();

export const GET_POST_WITH_RELATIONS_SQL = `
SELECT
  p.id,
  p.user_id,
  u.username AS author_username,
  u.avatar_url AS author_avatar_url,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.created_at,
  p.updated_at,
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
  ) AS comments,
  COALESCE(
    (
      SELECT json_agg(DISTINCT pt.tag)
      FROM post_tags pt
      WHERE pt.post_id = p.id
    ),
    '[]'::json
  ) AS tags
FROM posts p
INNER JOIN users u ON u.id = p.user_id
WHERE p.id = $1
`.trim();
