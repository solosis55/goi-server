/** Alineado con Goi App (`POST_BODY_MIN`) y Goi Web server. */
export const POST_BODY_MIN = 4;
export const POST_CONTENT_MAX = 280;

export function validateCreatePostContent(
  rawContent: string,
  attachmentCount: number
): { ok: true; content: string } | { ok: false; message: string } {
  const content = rawContent.trim();
  if (content.length > POST_CONTENT_MAX) {
    return {
      ok: false,
      message: `El contenido no puede superar ${POST_CONTENT_MAX} caracteres`,
    };
  }
  if (attachmentCount === 0 && content.length < POST_BODY_MIN) {
    return {
      ok: false,
      message: `Escribe al menos ${POST_BODY_MIN} caracteres o adjunta una foto`,
    };
  }
  return { ok: true, content };
}
