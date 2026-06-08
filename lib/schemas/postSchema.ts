import { z } from "zod";
import { POST_CONTENT_MAX } from "@/lib/posts/validateCreatePostContent";

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
