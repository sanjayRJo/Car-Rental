/**
 * Represents a busy time slot for a car (booking, maintenance, or block)
 */
export interface BusySlot {
  car_id: string;
  starts_at: string;
  ends_at: string;
  kind: string;
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
