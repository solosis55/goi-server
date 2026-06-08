import { z } from "zod";

const latCoord = z.number().finite().min(-90).max(90);
const lngCoord = z.number().finite().min(-180).max(180);

export const updateProfileSchema = z
  .object({
    username: z.string().trim().min(3).max(24).optional(),
    bio: z.string().max(200).optional(),
    goal: z.string().max(60).optional(),
    avatarUrl: z.string().max(500_000).optional(),
    bannerUrl: z.string().max(500_000).optional(),
    bannerShowInFeed: z.boolean().optional(),
    websiteUrl: z.string().max(200).optional(),
    instagramUrl: z.string().max(200).optional(),
    stravaUrl: z.string().max(200).optional(),
    location: z.string().max(80).optional(),
    latitude: latCoord.nullable().optional(),
    longitude: lngCoord.nullable().optional(),
    profileVisibility: z.enum(["public", "followers", "private", "request"]).optional(),
    pinnedPostId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Envía al menos un campo para actualizar",
  });
