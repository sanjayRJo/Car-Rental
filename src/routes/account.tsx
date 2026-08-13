import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays } from "date-fns";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelBooking, extendBooking, fetchMyBookings } from "@/lib/db";
import { formatCurrency } from "@/lib/pricing";
import { carTitle, formatDateTime, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "My bookings | Carvyo" },
      {
        name: "description",
        content:
          "Track upcoming and past Carvyo rentals, extend an active trip, download invoices and cancel bookings.",
      },
      { property: "og:title", content: "My bookings | Carvyo" },
      { property: "og:description", content: "Manage your Carvyo self-drive rentals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const queryClient = useQueryClient();
  const bookings = useQuery({ queryKey: ["my-bookings"], queryFn: fetchMyBookings });

  const cancel = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      toast.success("Booking cancelled");
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const extend = useMutation({
    mutationFn: ({ id, dropAt }: { id: string; dropAt: Date }) => extendBooking(id, dropAt),
    onSuccess: () => {
      toast.success("Rental extended by one day");
      void queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const list = bookings.data ?? [];

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">My bookings</h1>
        <p className="mt-2 text-muted-foreground">
          Extend an active rental or cancel an upcoming one. Every change notifies you by email and
          WhatsApp.
        </p>

        {bookings.isLoading && <p className="mt-10 text-muted-foreground">Loading bookings…</p>}
        {!bookings.isLoading && list.length === 0 && (
          <p className="mt-10 text-muted-foreground">
            You have no bookings yet. Browse the fleet to make your first reservation.
          </p>
        )}

        <ul className="mt-8 grid gap-4">
          {list.map((booking) => (
            <li key={booking.id} className="surface-card grid gap-3 p-5 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    {booking.car ? carTitle(booking.car) : "Vehicle"}
                  </h2>
                  <Badge variant="secondary">{booking.booking_number}</Badge>
                  <Badge>{statusLabel(booking.status)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateTime(booking.pickup_at)} → {formatDateTime(booking.drop_at)}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {formatCurrency(Number(booking.total_amount))}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                {(booking.status === "confirmed" || booking.status === "ongoing") && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={extend.isPending}
                    onClick={() =>
                      extend.mutate({ id: booking.id, dropAt: addDays(new Date(booking.drop_at), 1) })
                    }
                  >
                    Extend 1 day
                  </Button>
                )}
                {(booking.status === "pending" || booking.status === "confirmed") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(booking.id)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
