/** Consulta LEFT JOIN de sql/queries.sql (mantener ambos sincronizados). */
export const LIST_POSTS_WITH_RELATIONS_SQL = `
SELECT
  p.id,
  p.user_id,
  p.content,
  p.format,
  p.visibility,
  p.session_id,
  p.created_at,
  p.updated_at,
  json_agg(pc.*) FILTER (WHERE pc.id IS NOT NULL) AS comments,
  json_agg(pt.tag) FILTER (WHERE pt.id IS NOT NULL) AS tags
FROM posts p
LEFT JOIN post_comments pc ON p.id = pc.post_id
LEFT JOIN post_tags pt ON p.id = pt.post_id
GROUP BY p.id
ORDER BY p.created_at DESC
`.trim();
