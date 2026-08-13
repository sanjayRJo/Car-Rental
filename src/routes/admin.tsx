import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvailabilityGrid } from "@/components/booking/availability-grid";
import {
  fetchAllBookings,
  fetchBusySlots,
  fetchCars,
  fetchCustomers,
  fetchNotifications,
  setCarStatus,
  updateBookingStatus,
  type BookingStatus,
} from "@/lib/db";
import { formatCurrency } from "@/lib/pricing";
import { carTitle, formatDateTime, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Fleet operations dashboard | Carvyo" },
      {
        name: "description",
        content:
          "Admin console for the Carvyo fleet: revenue and utilisation KPIs, booking lifecycle control, vehicle status and notification logs.",
      },
      { property: "og:title", content: "Fleet operations dashboard | Carvyo" },
      { property: "og:description", content: "Manage the Carvyo fleet, bookings and customers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  pending: "confirmed",
  confirmed: "active",
  active: "completed",
};

function AdminPage() {
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ["admin", "bookings"], queryFn: fetchAllBookings });
  const cars = useQuery({ queryKey: ["admin", "cars"], queryFn: () => fetchCars({}) });
  const customers = useQuery({ queryKey: ["admin", "customers"], queryFn: fetchCustomers });
  const notifications = useQuery({ queryKey: ["admin", "notifications"], queryFn: fetchNotifications });
  const slots = useQuery({
    queryKey: ["admin", "busy"],
    queryFn: () => fetchBusySlots(new Date(), addDays(new Date(), 21)),
  });

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      updateBookingStatus(id, status, "Updated from admin console"),
    onSuccess: () => {
      toast.success("Booking updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleCar = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "available" | "maintenance" }) =>
      setCarStatus(id, status),
    onSuccess: () => {
      toast.success("Vehicle status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin", "cars"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = bookings.data ?? [];
  const fleet = cars.data ?? [];
  const revenue = list
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + Number(booking.total_amount), 0);
  const active = list.filter((booking) => booking.status === "active").length;
  const utilisation = fleet.length ? Math.round((active / fleet.length) * 100) : 0;

  function exportCsv() {
    const rows = [
      ["booking_number", "customer", "car", "pickup", "drop", "status", "total"],
      ...list.map((booking) => [
        booking.booking_number,
        booking.customer_name,
        booking.car ? carTitle(booking.car) : "",
        booking.pickup_at,
        booking.drop_at,
        booking.status,
        String(booking.total_amount),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "Carvyo-bookings.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Fleet operations</h1>
            <p className="mt-2 text-muted-foreground">
              Live view of bookings, vehicles, customers and notifications.
            </p>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            Export bookings CSV
          </Button>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Total bookings", String(list.length)],
            ["Revenue", formatCurrency(revenue)],
            ["Active rentals", String(active)],
            ["Fleet utilisation", `${utilisation}%`],
          ].map(([label, value]) => (
            <div key={label} className="surface-card p-5">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
              <dd className="mt-2 font-display text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <Tabs defaultValue="bookings" className="mt-10">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-6 grid gap-3">
            {list.map((booking) => {
              const next = NEXT_STATUS[booking.status];
              return (
                <div
                  key={booking.id}
                  className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {booking.booking_number} · {booking.customer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.car ? carTitle(booking.car) : "—"} ·{" "}
                      {formatDateTime(booking.pickup_at)} → {formatDateTime(booking.drop_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{statusLabel(booking.status)}</Badge>
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(booking.total_amount))}
                    </span>
                    {next && (
                      <Button
                        size="sm"
                        onClick={() => advance.mutate({ id: booking.id, status: next })}
                      >
                        Mark {next}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <AvailabilityGrid
              cars={fleet.map((car) => ({
                id: car.id,
                label: carTitle(car),
                registration: car.registration_number,
              }))}
              slots={slots.data ?? []}
              from={new Date()}
              days={10}
            />
          </TabsContent>

          <TabsContent value="fleet" className="mt-6 grid gap-3">
            {fleet.map((car) => (
              <div
                key={car.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">{carTitle(car)}</p>
                  <p className="text-sm text-muted-foreground">
                    {car.registration_number} · {car.location?.name ?? "—"} ·{" "}
                    {formatCurrency(Number(car.daily_rate))}/day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={car.status === "available" ? "default" : "secondary"}>
                    {car.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toggleCar.mutate({
                        id: car.id,
                        status: car.status === "available" ? "maintenance" : "available",
                      })
                    }
                  >
                    {car.status === "available" ? "Send to maintenance" : "Mark available"}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="customers" className="mt-6 grid gap-3">
            {(customers.data ?? []).map((customer) => (
              <div key={customer.id} className="surface-card p-4">
                <p className="font-medium">{customer.full_name ?? "Unnamed customer"}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.email} · {customer.phone ?? "no phone"}
                </p>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="notifications" className="mt-6 grid gap-3">
            {(notifications.data ?? []).map((notification) => (
              <div key={notification.id} className="surface-card p-4">
                <p className="font-medium">
                  {notification.channel} · {notification.status}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.recipient ?? "—"} ·{" "}
                  {formatDateTime(notification.created_at)}
                </p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
