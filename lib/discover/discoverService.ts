import { filterRankedByFacet, parseDiscoverFacet } from "@/lib/discover/discoverFacet";
import {
  loadOutgoingFollowStatusMap,
  mapRankedToDiscoverDto,
} from "@/lib/discover/discoverDto";
import { rankAllDiscoverUsers } from "@/lib/discover/discoverUsers";
import { findUserById } from "@/lib/users/repository";

export async function getDiscoverPage(
  viewerId: string,
  opts: { limit: number; offset: number; facetRaw: string | null }
) {
  const facet = parseDiscoverFacet(opts.facetRaw);
  const viewer = await findUserById(viewerId);
  if (!viewer) {
    return { users: [], nextOffset: null, total: 0, facet };
  }

  const [rankedAll, statusMap] = await Promise.all([
    rankAllDiscoverUsers(viewerId),
    loadOutgoingFollowStatusMap(viewerId),
  ]);

  const ranked = filterRankedByFacet(rankedAll, facet, viewer);
  const page = ranked.slice(opts.offset, opts.offset + opts.limit);
  const nextOffset = opts.offset + opts.limit < ranked.length ? opts.offset + opts.limit : null;

  const users = page.map((row) => mapRankedToDiscoverDto(row, viewerId, statusMap));

  return { users, nextOffset, total: ranked.length, facet };
}
