import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarCheck, Car, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { CarCard } from "@/components/cars/car-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { fetchCars, fetchLocations } from "@/lib/db";
import { toLocalInput } from "@/lib/format";

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-family='system-ui' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo image available%3C/text%3E%3C/svg%3E";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Carvyo — Self-drive car rental across Tamil Nadu" },
      {
        name: "description",
        content:
          "Book self-drive cars by the hour, day or trip in Chennai, Coimbatore, Trichy, Madurai and Thanjavur. Live vehicle-level availability and transparent pricing.",
      },
      { property: "og:title", content: "Carvyo — Self-drive car rental" },
      {
        property: "og:description",
        content:
          "Choose your car, check real availability for each vehicle and hit the road. Hourly, daily and weekly rentals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { icon: MapPin, title: "Search", copy: "Pick your branch and the exact hours you need the car." },
  { icon: Car, title: "Choose", copy: "See each individual vehicle's calendar and pick a free one." },
  { icon: CalendarCheck, title: "Book", copy: "Confirm details, review the price breakdown and lock it in." },
  { icon: Sparkles, title: "Drive", copy: "Collect the keys at your branch and start the trip." },
];

const FAQS = [
  {
    q: "What documents do I need at pickup?",
    a: "A valid driving licence, one government photo ID and the card used for the security deposit.",
  },
  {
    q: "How is availability calculated?",
    a: "Every physical vehicle has its own booking timeline. A car is only offered when no confirmed booking, maintenance window or block overlaps your requested hours.",
  },
  {
    q: "Can I extend an active rental?",
    a: "Yes — request an extension from your dashboard. It is approved instantly if the vehicle has no reservation right after yours.",
  },
  {
    q: "What is the cancellation policy?",
    a: "Free cancellation until 24 hours before pickup, 25% after that, and no refund once the pickup time passes. Admins can tune these rules.",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const now = new Date();
  const [pickupAt, setPickupAt] = useState(toLocalInput(addDays(now, 1)));
  const [dropAt, setDropAt] = useState(toLocalInput(addDays(now, 3)));
  const [locationId, setLocationId] = useState("");

  const locations = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
  const popular = useQuery({
    queryKey: ["cars", "popular"],
    queryFn: () => fetchCars({ sort: "popular" }),
  });

  return (
    <PageShell>
      <section className="relative isolate overflow-hidden">
        <img
          src={PLACEHOLDER_IMAGE}
          alt="Premium SUV parked on a coastal highway at sunset"
          width={1920}
          height={1088}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            Self-drive rentals
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold text-balance-tight text-ink-foreground sm:text-6xl">
            Your journey. Your car. Your way.
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-foreground/80 sm:text-lg">
            Book reliable cars by the hour, day or trip. Choose your car, check its availability and
            hit the road.
          </p>

          <form
            className="surface-card mt-10 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({
                to: "/cars",
                search: { location: locationId || undefined, pickup: pickupAt, drop: dropAt },
              });
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="pickup-location">Pickup branch</Label>
              <select
                id="pickup-location"
                value={locationId}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setLocationId(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Any city</option>
                {(locations.data ?? []).map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} · {location.city}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pickup-at">Pickup date &amp; time</Label>
              <Input
                id="pickup-at"
                type="datetime-local"
                value={pickupAt}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPickupAt(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="drop-at">Drop date &amp; time</Label>
              <Input
                id="drop-at"
                type="datetime-local"
                value={dropAt}
                min={pickupAt}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDropAt(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" size="lg" className="w-full">
                Search cars
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold">Popular right now</h2>
            <p className="mt-2 text-muted-foreground">
              Every listing is a specific vehicle with its own registration and calendar.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/cars">Browse the full fleet</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popular.isLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-80 rounded-2xl" />
              ))
            : (popular.data ?? []).slice(0, 6).map((car) => <CarCard key={car.id} car={car} />)}
        </div>
      </section>

      <section id="how-it-works" className="bg-surface py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="surface-card p-6">
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Safety first",
              copy: "Every car is sanitised, serviced on schedule and insured before it leaves the branch.",
            },
            {
              icon: Wallet,
              title: "No surprise pricing",
              copy: "Rental, insurance, taxes and deposit are shown before you pay. Late fees are published upfront.",
            },
            {
              icon: CalendarCheck,
              title: "Real availability",
              copy: "Vehicle-level timelines mean the car you booked is the car waiting for you.",
            },
          ].map((item) => (
            <article key={item.title} className="surface-card p-6">
              <item.icon className="size-6 text-accent" aria-hidden />
              <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="locations" className="bg-surface py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-semibold">Featured locations</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(locations.data ?? []).map((location) => (
              <article key={location.id} className="surface-card p-5">
                <h3 className="font-display text-lg font-semibold">{location.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{location.address}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Open {format(new Date(`2026-01-01T${location.opening_time}`), "h:mm a")} –{" "}
                  {format(new Date(`2026-01-01T${location.closing_time}`), "h:mm a")}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Frequently asked</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </PageShell>
  );
}
