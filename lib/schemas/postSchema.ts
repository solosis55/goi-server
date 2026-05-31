import { z } from "zod";

/** Misma regla de longitud que Goi App (`POST_BODY_MAX = 280`). */
export const POST_CONTENT_MAX = 280;

export const createPostSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID válido"),
  /** Sincroniza el usuario de la app en Neon si aún no existe. */
  username: z.string().trim().min(1).max(32).optional(),
  avatarUrl: z.string().max(2000).optional(),
  content: z
    .string()
    .trim()
    .min(1, "El contenido es obligatorio")
    .max(POST_CONTENT_MAX, `El contenido no puede superar ${POST_CONTENT_MAX} caracteres`),
  format: z.enum(["standard", "training"]).default("standard"),
  visibility: z.enum(["public", "followers", "private"]).default("public"),
  sessionId: z.string().uuid().nullable().optional(),
});

export const updatePostSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1)
      .max(POST_CONTENT_MAX)
      .optional(),
    format: z.enum(["standard", "training"]).optional(),
    visibility: z.enum(["public", "followers", "private"]).optional(),
    sessionId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envía al menos un campo para actualizar",
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
