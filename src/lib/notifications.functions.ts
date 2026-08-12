import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const notifySchema = z.object({
  bookingId: z.string().uuid(),
  templateCode: z.string().min(2),
  channels: z.array(z.enum(["email", "whatsapp"])).min(1),
  reminderKey: z.string().optional(),
});

const sweepSchema = z.object({ dryRun: z.boolean().optional() }).optional();

/** Sends one templated notification for a booking across the requested channels. */
export const sendBookingNotification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => notifySchema.parse(data))
  .handler(async ({ data }) => {
    const { dispatchBookingNotification } = await import("./notification-service.server");
    return dispatchBookingNotification(data);
  });

/** Idempotent reminder sweep — safe to run every 15 minutes. */
export const runReminderSweep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sweepSchema.parse(data) ?? {})
  .handler(async ({ data }) => {
    const { sweepReminders } = await import("./notification-service.server");
    return sweepReminders({ dryRun: data?.dryRun ?? false });
  });
