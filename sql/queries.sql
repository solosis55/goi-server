-- Goi — consultas reutilizables (Fase 7: JOIN)
-- Equivalente NoteFlow: notes + checklist_items + note_tags
-- Goi: posts + post_comments + post_tags

-- ---------------------------------------------------------------------------
-- Publicaciones con comentarios y tags agregados (LEFT JOIN + json_agg)
-- ---------------------------------------------------------------------------
-- FROM posts p
--   Tabla principal (≈ notes). Cada fila es una publicación del feed.
--
-- LEFT JOIN post_comments pc ON p.id = pc.post_id
--   LEFT JOIN incluye posts aunque no tengan comentarios (≈ checklist_items).
--   Si no hay comentarios, las columnas de pc son NULL.
--
-- LEFT JOIN post_tags pt ON p.id = pt.post_id
--   Igual para etiquetas (≈ note_tags): posts sin tags siguen apareciendo.
--
-- json_agg(...) FILTER (WHERE ... IS NOT NULL)
--   Agrupa hijos en arrays JSON; FILTER evita un array con un null suelto.
--
-- GROUP BY p.id
--   Una fila por publicación tras juntar comentarios/tags.
--
-- ORDER BY p.created_at DESC
--   Feed reciente primero.

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
ORDER BY p.created_at DESC;
