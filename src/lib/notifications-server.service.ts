import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { providers, renderTemplate, type Channel } from "./notifications.server";
import { REMINDER_OFFSETS, reminderKey } from "./availability";

type ReminderSettings = {
  pickup: Record<string, boolean>;
  drop: Record<string, boolean>;
  active: Record<string, boolean>;
  channels: { email: boolean; whatsapp: boolean };
};

const DEFAULT_REMINDERS: ReminderSettings = {
  pickup: { "24h": true, "6h": true, "2h": true },
  drop: { "24h": true, "6h": true, "4h": true, "2h": true },
  active: { "2h": true, "4h": true, daily: true },
  channels: { email: true, whatsapp: true },
};

type BookingRow = {
  id: string;
  booking_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_at: string;
  drop_at: string;
  status: string;
  cars: { brand: string; model: string; registration_number: string } | null;
  locations: { name: string } | null;
};

const BOOKING_SELECT =
  "id,booking_number,user_id,customer_name,customer_email,customer_phone,pickup_at,drop_at,status,cars(brand,model,registration_number),locations:pickup_location_id(name)";

function templateVars(booking: BookingRow): Record<string, string> {
  const car = booking.cars
    ? `${booking.cars.brand} ${booking.cars.model} (${booking.cars.registration_number})`
    : "your car";
  const fmt = (value: string) =>
    new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return {
    booking_number: booking.booking_number,
    name: booking.customer_name,
    car,
    pickup: fmt(booking.pickup_at),
    drop: fmt(booking.drop_at),
    location: booking.locations?.name ?? "the pickup branch",
  };
}

async function loadTemplate(code: string, channel: Channel) {
  const { data } = await supabaseAdmin
    .from("notification_templates")
    .select("code,subject,body")
    .eq("code", code)
    .maybeSingle();
  if (data) return data;
  const { data: fallback } = await supabaseAdmin
    .from("notification_templates")
    .select("code,subject,body")
    .eq("channel", channel)
    .limit(1)
    .maybeSingle();
  return fallback ?? { code, subject: "Booking update", body: "Booking {{booking_number}} updated." };
}

export async function dispatchBookingNotification(input: {
  bookingId: string;
  templateCode: string;
  channels: ("email" | "whatsapp")[];
  reminderKey?: string | undefined;
}) {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", input.bookingId)
    .maybeSingle();

  if (!booking) return { sent: 0, results: [], error: "BOOKING_NOT_FOUND" as const };

  const row = booking as unknown as BookingRow;
  const vars = templateVars(row);
  const results: { channel: string; status: string; error?: string | undefined }[] = [];

  for (const channel of input.channels) {
    const template = await loadTemplate(input.templateCode, channel);
    const body = renderTemplate(template.body, vars);
    const subject = template.subject ? renderTemplate(template.subject, vars) : undefined;
    const recipient = channel === "email" ? row.customer_email : row.customer_phone;
    const key = input.reminderKey ? `${input.reminderKey}:${channel}` : null;

    const { data: logRow, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert({
        booking_id: row.id,
        user_id: row.user_id,
        recipient,
        channel,
        template_code: input.templateCode,
        reminder_key: key,
        body,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    // Unique reminder_key violation => already handled, stay idempotent.
    if (insertError || !logRow) {
      results.push({ channel, status: "skipped", error: "already_queued" });
      continue;
    }

    const provider = providers[channel];
    const outcome = await provider.send({ to: recipient, subject, body });
    await supabaseAdmin
      .from("notifications")
      .update(
        outcome.ok
          ? { status: "sent", sent_at: new Date().toISOString() }
          : { status: "failed", failed_at: new Date().toISOString(), error: outcome.error ?? null },
      )
      .eq("id", logRow.id);

    results.push({ channel, status: outcome.ok ? "sent" : "failed", error: outcome.error });
  }

  return { sent: results.filter((r) => r.status === "sent").length, results };
}

async function reminderSettings(): Promise<ReminderSettings> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "reminders")
    .maybeSingle();
  return { ...DEFAULT_REMINDERS, ...((data?.value as ReminderSettings | undefined) ?? {}) };
}

/**
 * Finds bookings whose reminder window has just opened and queues notifications.
 * Idempotent: reminder_key is unique per booking + type + slot + channel.
 */
export async function sweepReminders({ dryRun = false }: { dryRun?: boolean }) {
  const settings = await reminderSettings();
  const channels: ("email" | "whatsapp")[] = [
    ...(settings.channels.email ? (["email"] as const) : []),
    ...(settings.channels.whatsapp ? (["whatsapp"] as const) : []),
  ];
  const now = Date.now();
  const windowMs = 30 * 60 * 1000;

  const { data } = await supabaseAdmin
    .from("bookings")
    .select(BOOKING_SELECT)
    .in("status", ["confirmed", "ready_for_pickup", "customer_arrived", "picked_up", "active"])
    .gte("drop_at", new Date(now - 24 * 3_600_000).toISOString())
    .lte("pickup_at", new Date(now + 3 * 24 * 3_600_000).toISOString());

  const bookings = (data ?? []) as unknown as BookingRow[];
  const planned: { bookingId: string; templateCode: string; key: string }[] = [];

  for (const booking of bookings) {
    const pickupAt = new Date(booking.pickup_at).getTime();
    const dropAt = new Date(booking.drop_at).getTime();
    const isActive = ["picked_up", "active"].includes(booking.status);

    for (const [label, hours] of Object.entries(REMINDER_OFFSETS.pickup)) {
      if (!settings.pickup[label] || isActive) continue;
      const due = pickupAt - hours * 3_600_000;
      if (Math.abs(now - due) <= windowMs && now < pickupAt) {
        planned.push({
          bookingId: booking.id,
          templateCode: "PICKUP_REMINDER",
          key: reminderKey(booking.id, `pickup_${label}`, new Date(due).toISOString().slice(0, 13)),
        });
      }
    }

    for (const [label, hours] of Object.entries(REMINDER_OFFSETS.drop)) {
      if (!settings.drop[label]) continue;
      const due = dropAt - hours * 3_600_000;
      if (Math.abs(now - due) <= windowMs && now < dropAt) {
        planned.push({
          bookingId: booking.id,
          templateCode: "DROP_REMINDER",
          key: reminderKey(booking.id, `drop_${label}`, new Date(due).toISOString().slice(0, 13)),
        });
      }
    }

    if (isActive) {
      for (const [label, hours] of Object.entries(REMINDER_OFFSETS.active)) {
        if (!settings.active[label]) continue;
        if (label === "daily") {
          const elapsedDays = Math.floor((now - pickupAt) / (24 * 3_600_000));
          if (elapsedDays >= 1) {
            planned.push({
              bookingId: booking.id,
              templateCode: "RENTAL_ACTIVE",
              key: reminderKey(booking.id, "active_daily", `day-${elapsedDays}`),
            });
          }
          continue;
        }
        const due = pickupAt + hours * 3_600_000;
        if (Math.abs(now - due) <= windowMs) {
          planned.push({
            bookingId: booking.id,
            templateCode: "RENTAL_ACTIVE",
            key: reminderKey(booking.id, `active_${label}`, new Date(due).toISOString().slice(0, 13)),
          });
        }
      }
    }
  }

  if (dryRun || channels.length === 0) {
    return { scanned: bookings.length, planned: planned.length, dispatched: 0, dryRun: true };
  }

  let dispatched = 0;
  for (const item of planned) {
    const result = await dispatchBookingNotification({
      bookingId: item.bookingId,
      templateCode: item.templateCode,
      channels,
      reminderKey: item.key,
    });
    dispatched += result.sent;
  }

  return { scanned: bookings.length, planned: planned.length, dispatched, dryRun: false };
}
