import { queryOptions } from "@tanstack/react-query";
import { getFeaturedPrediction, getUpcomingFixtures } from "./football.functions";

export const upcomingQuery = queryOptions({
  queryKey: ["fixtures", "upcoming"],
  queryFn: () => getUpcomingFixtures({ data: { days: 9 } }),
  staleTime: 5 * 60 * 1000,
});

export const featuredQuery = queryOptions({
  queryKey: ["fixtures", "featured"],
  queryFn: () => getFeaturedPrediction(),
  staleTime: 5 * 60 * 1000,
});
