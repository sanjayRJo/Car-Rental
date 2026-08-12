import { Link } from "@tanstack/react-router";
import { Fuel, Gauge, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/pricing";
import { carTitle } from "@/lib/format";
import type { CarWithLocation } from "@/lib/db";

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-family='system-ui' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo image available%3C/text%3E%3C/svg%3E";

export function CarCard({ car, available }: { car: CarWithLocation; available?: boolean }) {
  return (
    <article className="surface-card group flex flex-col overflow-hidden">
      <div className="relative aspect-16/10 overflow-hidden bg-muted">
        <img
          src={car.images[0] ?? PLACEHOLDER_IMAGE}
          alt={`${carTitle(car)} available for self-drive rental`}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <Badge className="absolute left-3 top-3" variant="secondary">
          {car.vehicle_code}
        </Badge>
        {available !== undefined && (
          <Badge
            className="absolute right-3 top-3"
            variant={available ? "default" : "destructive"}
          >
            {available ? "Available" : "Booked"}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{carTitle(car)}</h3>
            <p className="text-xs text-muted-foreground">
              {car.registration_number} · {car.location?.name ?? "Multiple branches"}
            </p>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium">
            <Star className="size-4 fill-accent text-accent" aria-hidden />
            {Number(car.rating).toFixed(1)}
          </span>
        </div>
        <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <li className="flex items-center gap-1">
            <Gauge className="size-3.5" aria-hidden /> {car.transmission}
          </li>
          <li className="flex items-center gap-1">
            <Users className="size-3.5" aria-hidden /> {car.seats} seats
          </li>
          <li className="flex items-center gap-1">
            <Fuel className="size-3.5" aria-hidden /> {car.fuel}
          </li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <p className="font-display text-xl font-semibold">
            {formatCurrency(Number(car.daily_rate))}
            <span className="text-sm font-normal text-muted-foreground">/day</span>
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/cars/$slug" params={{ slug: car.slug }}>
                Details
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/cars/$slug" params={{ slug: car.slug }} hash="book">
                Book now
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
