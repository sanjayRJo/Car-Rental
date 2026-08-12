/**
 * Represents a busy time slot for a car (booking, maintenance, or block)
 */
export interface BusySlot {
  car_id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
}

export type DayState = "available" | "booked" | "maintenance" | "blocked" | "unavailable";

export interface AvailabilityGrid {
  days: Date[];
  rows: Record<string, DayState[]>;
}

/**
 * Build an availability grid for display
 */
export function buildGrid(
  slots: BusySlot[],
  carIds: string[],
  from: Date,
  days: number,
): AvailabilityGrid {
  const daysList: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);
    daysList.push(date);
  }

  const rows: Record<string, DayState[]> = {};

  for (const carId of carIds) {
    rows[carId] = daysList.map((date) => {
      const dayStart = new Date(date).getTime();
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayEndTime = dayEnd.getTime();

      // Find all slots for this car on this day
      const daySlots = slots.filter((slot) => {
        if (slot.car_id !== carId) return false;
        const slotStart = new Date(slot.starts_at).getTime();
        const slotEnd = new Date(slot.ends_at).getTime();
        // Check if slot overlaps with this day
        return !(slotEnd <= dayStart || slotStart >= dayEndTime);
      });

      if (daySlots.length === 0) {
        return "available";
      }

      // Determine state based on slot kinds
      const kinds = daySlots.map((s) => s.kind);
      if (kinds.includes("booking")) return "booked";
      if (kinds.includes("maintenance")) return "maintenance";
      if (kinds.includes("block")) return "blocked";
      return "unavailable";
    });
  }

  return { days: daysList, rows };
}

/**
 * Check if a car is available during a given time period
 * @param slots Array of busy time slots
 * @param carId The car ID to check
 * @param pickupAt Start of requested period (ISO string or Date)
 * @param dropAt End of requested period (ISO string or Date)
 * @returns true if the car is free during the entire period
 */
export function isCarFree(
  slots: BusySlot[],
  carId: string,
  pickupAt: string | Date,
  dropAt: string | Date,
): boolean {
  const pickup = new Date(pickupAt).getTime();
  const drop = new Date(dropAt).getTime();

  // Check if any busy slot overlaps with the requested period
  return !slots.some((slot) => {
    // Only check slots for this specific car
    if (slot.car_id !== carId) return false;

    const slotStart = new Date(slot.starts_at).getTime();
    const slotEnd = new Date(slot.ends_at).getTime();

    // Check for overlap: slot overlaps if it doesn't end before pickup
    // and doesn't start after drop
    return !(slotEnd <= pickup || slotStart >= drop);
  });
}
