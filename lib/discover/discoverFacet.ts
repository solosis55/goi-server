import { isNearbyMatch } from "@/lib/geo/nearby";
import type { UserRow } from "@/lib/users/types";
import type { RankedDiscoverUser } from "@/lib/discover/discoverUsers";

export type DiscoverFacetParam = "all" | "active" | "trained" | "sameGoal" | "nearby";

const VALID_FACETS = new Set<DiscoverFacetParam>([
  "all",
  "active",
  "trained",
  "sameGoal",
  "nearby",
]);

export function parseDiscoverFacet(raw: string | null): DiscoverFacetParam {
  if (raw && VALID_FACETS.has(raw as DiscoverFacetParam)) {
    return raw as DiscoverFacetParam;
  }
  return "all";
}

function norm(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

export function filterRankedByFacet(
  ranked: RankedDiscoverUser[],
  facet: DiscoverFacetParam,
  viewer: UserRow
): RankedDiscoverUser[] {
  if (facet === "all") return ranked;
  const viewerGoal = norm(viewer.goal);
  return ranked.filter((row) => {
    switch (facet) {
      case "active":
        return row.activeThisWeek;
      case "trained":
        return row.trainedThisWeek;
      case "sameGoal":
        return viewerGoal.length > 0 && viewerGoal === norm(row.user.goal);
      case "nearby":
        return row.nearby || isNearbyMatch(viewer, row.user).nearby;
      default:
        return true;
    }
  });
}
