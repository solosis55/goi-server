/** Fila tal como viene de PostgreSQL (snake_case). */
export type PostRow = {
  id: string;
  user_id: string;
  content: string;
  format: "standard" | "training";
  visibility: "public" | "followers" | "private";
  session_id: string | null;
  created_at: string;
  updated_at: string;
};

/** JSON de la API (camelCase, alineado con Goi App / Web). */
export type ApiPost = {
  id: string;
  userId: string;
  content: string;
  format: "standard" | "training";
  visibility: "public" | "followers" | "private";
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
};
