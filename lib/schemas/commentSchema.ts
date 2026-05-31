import { z } from "zod";

/** Misma regla que Goi Web (`COMMENT` max 180). */
export const COMMENT_CONTENT_MAX = 180;

export const createCommentSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID válido"),
  content: z
    .string()
    .trim()
    .min(1, "El comentario es obligatorio")
    .max(COMMENT_CONTENT_MAX, `Máximo ${COMMENT_CONTENT_MAX} caracteres`),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "El comentario es obligatorio")
    .max(COMMENT_CONTENT_MAX, `Máximo ${COMMENT_CONTENT_MAX} caracteres`),
});
