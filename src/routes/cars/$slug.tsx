import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { addDays, differenceInHours } from "date-fns";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createBooking, fetchBusySlots, fetchCarBySlug, fetchLocations } from "@/lib/db";
import { isCarFree } from "@/lib/availability";
import { formatCurrency } from "@/lib/pricing";
import { carTitle, toLocalInput } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%' y='50%' font-family='system-ui' font-size='16' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3ENo image available%3C/text%3E%3C/svg%3E";

export const Route = createFileRoute("/cars/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Rent the ${params.slug.replace(/-/g, " ")} | Drivora` },
      {
        name: "description",
        content:
          "Full specs, pricing and live availability for this vehicle. Reserve it in a couple of minutes with transparent, itemised pricing.",
      },
      { property: "og:title", content: "Vehicle details | Drivora" },
      { property: "og:description", content: "Specs, pricing and availability for this vehicle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CarDetailPage,
});

function CarDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const car = useQuery({ queryKey: ["car", slug], queryFn: () => fetchCarBySlug(slug) });
  const locations = useQuery({ queryKey: ["locations"], queryFn: fetchLocations });
  const slots = useQuery({
    queryKey: ["busy", "detail"],
    queryFn: () => fetchBusySlots(new Date(), addDays(new Date(), 45)),
  });

  const [pickupAt, setPickupAt] = useState(toLocalInput(addDays(new Date(), 1)));
  const [dropAt, setDropAt] = useState(toLocalInput(addDays(new Date(), 3)));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [license, setLicense] = useState("");
  const [saving, setSaving] = useState(false);

  const data = car.data;
  if (car.isLoading) {
    return (
      <PageShell>
        <p className="mx-auto max-w-7xl px-4 py-20 text-muted-foreground">Loading vehicle…</p>
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell>
        <p className="mx-auto max-w-7xl px-4 py-20">This vehicle is no longer listed.</p>
      </PageShell>
    );
  }

  const start = new Date(pickupAt);
  const end = new Date(dropAt);
  const hours = Math.max(1, differenceInHours(end, start));
  const days = Math.max(1, Math.ceil(hours / 24));
  const base = days * Number(data.daily_rate);
  const insurance = Math.round(base * 0.05);
  const tax = Math.round((base + insurance) * 0.18);
  const deposit = Number(data.security_deposit ?? 5000);
  const total = base + insurance + tax;
  const free = isCarFree(slots.data ?? [], data.id, start, end);

  async function book(event: React.FormEvent) {
    event.preventDefault();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("Please sign in to complete your booking.");
      void navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    try {
      const booking = await createBooking({
        carId: data!.id,
        pickupAt: start,
        dropAt: end,
        pickupLocationId: data!.location_id,
        dropLocationId: data!.location_id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        licenseNumber: license,
        baseAmount: base,
        insuranceAmount: insurance,
        taxAmount: tax,
        discountAmount: 0,
        securityDeposit: deposit,
        totalAmount: total,
      });
      toast.success(`Booking confirmed — ${booking.booking_number}`);
      void navigate({ to: "/account" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <img
            src={data.images[0] ?? PLACEHOLDER_IMAGE}
            alt={`${carTitle(data)} self-drive rental car`}
            className="aspect-16/10 w-full rounded-2xl object-cover"
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold">{carTitle(data)}</h1>
            <Badge variant="secondary">{data.registration_number}</Badge>
            <Badge variant={free ? "default" : "destructive"}>
              {free ? "Available for your dates" : "Busy for your dates"}
            </Badge>
          </div>
          <p className="mt-3 text-muted-foreground">{data.description}</p>
          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ["Transmission", data.transmission],
              ["Fuel", data.fuel],
              ["Seats", String(data.seats)],
              ["Type", data.car_type],
              ["Branch", data.location?.name ?? "—"],
              // ["Odometer", `${data.odometer_km ?? 0} km`],
              ["Daily rate", formatCurrency(Number(data.daily_rate))],
              ["Deposit", formatCurrency(deposit)],
            ].map(([label, value]) => (
              <div key={label} className="surface-card p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-medium capitalize">{value}</dd>
              </div>
            ))}
          </dl>
          {data.features.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-xl font-semibold">Features</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.features.map((feature) => (
                  <li key={feature}>
                    <Badge variant="outline">{feature}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <form id="book" className="surface-card h-fit grid gap-4 p-6" onSubmit={book}>
          <h2 className="font-display text-xl font-semibold">Reserve this car</h2>
          <div className="grid gap-2">
            <Label htmlFor="b-pickup">Pickup</Label>
            <Input
              id="b-pickup"
              type="datetime-local"
              value={pickupAt}
              onChange={(event) => setPickupAt(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="b-drop">Drop-off</Label>
            <Input
              id="b-drop"
              type="datetime-local"
              min={pickupAt}
              value={dropAt}
              onChange={(event) => setDropAt(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="b-name">Full name</Label>
            <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="b-email">Email</Label>
            <Input
              id="b-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="b-phone">Phone</Label>
            <Input
              id="b-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="b-license">Driving licence number</Label>
            <Input id="b-license" value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>

          <dl className="grid gap-1 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt>
                Rental ({days} day{days > 1 ? "s" : ""})
              </dt>
              <dd>{formatCurrency(base)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Insurance</dt>
              <dd>{formatCurrency(insurance)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>GST (18%)</dt>
              <dd>{formatCurrency(tax)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Refundable deposit</dt>
              <dd>{formatCurrency(deposit)}</dd>
            </div>
            <div className="mt-2 flex justify-between font-display text-lg font-semibold">
              <dt>Total payable</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
          </dl>

          <Button type="submit" size="lg" disabled={saving || !free}>
            {saving ? "Confirming…" : free ? "Confirm booking" : "Not available"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Free cancellation up to 24 hours before pickup. Confirmation is sent by email and WhatsApp.
          </p>
          <input type="hidden" value={locations.data?.length ?? 0} readOnly />
        </form>
      </div>
    </PageShell>
  );
}
