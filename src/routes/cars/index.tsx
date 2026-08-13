import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { PageShell } from "@/components/page-shell";
import { CarCard } from "@/components/cars/car-card";
import { AvailabilityGrid } from "@/components/booking/availability-grid";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBusySlots, fetchCars, fetchLocations } from "@/lib/db";
import { isCarFree } from "@/lib/availability";
import { carTitle } from "@/lib/format";

type CarSearch = {
  location?: string | undefined;
  pickup?: string | undefined;
  drop?: string | undefined;
  type?: string | undefined;
  sort?: string | undefined;
};

export const Route = createFileRoute("/cars/")({
  validateSearch: (search: Record<string, unknown>): CarSearch => ({
    location: typeof search["location"] === "string" ? search["location"] : undefined,
    pickup: typeof search["pickup"] === "string" ? search["pickup"] : undefined,
    drop: typeof search["drop"] === "string" ? search["drop"] : undefined,
    type: typeof search["type"] === "string" ? search["type"] : undefined,
    sort: typeof search["sort"] === "string" ? search["sort"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Available self-drive cars | Carvyo" },
      {
        name: "description",
        content:
          "Filter the Carvyo fleet by city, body type, fuel and transmission, then check each vehicle's live day-by-day availability before you book.",
      },
      { property: "og:title", content: "Available self-drive cars | Carvyo" },
      {
        property: "og:description",
        content: "Vehicle-level availability for every car in the Carvyo fleet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarsPage,
});

function CarsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const pickupAt = search.pickup ? new Date(search.pickup) : addDays(new Date(), 1);
  const dropAt = search.drop ? new Date(search.drop) : addDays(new Date(), 3);

  const locations = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
  const cars = useQuery({
    queryKey: ["cars", search.location, search.type, search.sort],
    queryFn: () =>
      fetchCars({
        ...(search.location ? { locationId: search.location } : {}),
        ...(search.type ? { carTypes: [search.type] } : {}),
        sort: (search.sort as "price_asc" | undefined) ?? "price_asc",
      }),
  });
  const slots = useQuery({
    queryKey: ["busy", pickupAt.toDateString()],
    queryFn: () => fetchBusySlots(addDays(pickupAt, -1), addDays(pickupAt, 10)),
  });

  const list = cars.data ?? [];
  const busy = slots.data ?? [];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Available cars</h1>
        <p className="mt-2 text-muted-foreground">
          Availability is calculated per physical vehicle, including maintenance and blocked windows.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="filter-location">City / branch</Label>
            <select
              id="filter-location"
              value={search.location ?? ""}
              onChange={(event) =>
                void navigate({
                  search: (prev) => ({ ...prev, location: event.target.value || undefined }),
                })
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All branches</option>
              {(locations.data ?? []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-type">Car type</Label>
            <select
              id="filter-type"
              value={search.type ?? ""}
              onChange={(event) =>
                void navigate({
                  search: (prev) => ({ ...prev, type: event.target.value || undefined }),
                })
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All types</option>
              {["hatchback", "sedan", "suv", "luxury", "ev"].map((type) => (
                <option key={type} value={type}>
                  {type.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filter-sort">Sort by</Label>
            <select
              id="filter-sort"
              value={search.sort ?? "price_asc"}
              onChange={(event) =>
                void navigate({ search: (prev) => ({ ...prev, sort: event.target.value }) })
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="popular">Popularity</option>
              <option value="rating">Rating</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {list.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-semibold">Fleet availability</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Pick a vehicle whose row is free across your travel dates.
            </p>
            <AvailabilityGrid
              cars={list.slice(0, 12).map((car) => ({
                id: car.id,
                label: carTitle(car),
                registration: car.registration_number,
              }))}
              slots={busy}
              from={pickupAt}
              days={7}
            />
          </section>
        )}

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cars.isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-2xl" />
              ))
            : list.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  available={car.status === "available" && isCarFree(busy, car.id, pickupAt, dropAt)}
                />
              ))}
        </section>

        {!cars.isLoading && list.length === 0 && (
          <p className="mt-12 text-center text-muted-foreground">
            No cars match those filters yet. Try another branch or car type.
          </p>
        )}
      </div>
    </PageShell>
  );
}
