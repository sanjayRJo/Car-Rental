import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BusySlot } from "./availability";

export type Car = Database["public"]["Tables"]["cars"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
export type CarBlock = Database["public"]["Tables"]["car_blocks"]["Row"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type CarWithLocation = Car & { location: Pick<Location, "id" | "name" | "city"> | null };
export type BookingWithCar = Booking & {
  car: Pick<Car, "id" | "brand" | "model" | "registration_number" | "images" | "slug"> | null;
  pickup_location: Pick<Location, "id" | "name" | "city"> | null;
};

const CAR_SELECT = "*, location:locations!cars_location_id_fkey(id,name,city)";
const BOOKING_SELECT =
  "*, car:cars(id,brand,model,registration_number,images,slug), pickup_location:locations!bookings_pickup_location_id_fkey(id,name,city)";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export async function fetchLocations(): Promise<Location[]> {
  return unwrap(
    await supabase.from("locations").select("*").eq("is_active", true).order("city"),
  ) as Location[];
}

export type CarFilters = {
  locationId?: string;
  carTypes?: string[];
  transmissions?: string[];
  fuels?: string[];
  seats?: number[];
  brands?: string[];
  maxPrice?: number;
  sort?: "price_asc" | "price_desc" | "popular" | "rating" | "newest";
};

export async function fetchCars(filters: CarFilters = {}): Promise<CarWithLocation[]> {
  let query = supabase.from("cars").select(CAR_SELECT).neq("status", "inactive");

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.carTypes?.length)
    query = query.in("car_type", filters.carTypes as Car["car_type"][]);
  if (filters.transmissions?.length)
    query = query.in("transmission", filters.transmissions as Car["transmission"][]);
  if (filters.fuels?.length) query = query.in("fuel", filters.fuels as Car["fuel"][]);
  if (filters.brands?.length) query = query.in("brand", filters.brands);
  if (filters.maxPrice) query = query.lte("daily_rate", filters.maxPrice);
  if (filters.seats?.length) {
    query = filters.seats.includes(7)
      ? query.or(`seats.in.(${filters.seats.join(",")}),seats.gte.7`)
      : query.in("seats", filters.seats);
  }

  switch (filters.sort) {
    case "price_desc":
      query = query.order("daily_rate", { ascending: false });
      break;
    case "popular":
      query = query.order("bookings_count", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    case "newest":
      query = query.order("year", { ascending: false });
      break;
    default:
      query = query.order("daily_rate", { ascending: true });
  }

  return unwrap(await query) as CarWithLocation[];
}

export async function fetchCarBySlug(slug: string): Promise<CarWithLocation | null> {
  const { data, error } = await supabase.from("cars").select(CAR_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data as CarWithLocation | null;
}

export async function fetchBusySlots(from: Date, to: Date): Promise<BusySlot[]> {
  const { data, error } = await supabase.rpc("get_busy_slots", {
    _from: from.toISOString(),
    _to: to.toISOString(),
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as BusySlot[];
}

export async function fetchMyBookings(): Promise<BookingWithCar[]> {
  return unwrap(
    await supabase.from("bookings").select(BOOKING_SELECT).order("pickup_at", { ascending: false }),
  ) as BookingWithCar[];
}

export async function fetchBookingByNumber(bookingNumber: string): Promise<BookingWithCar | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("booking_number", bookingNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BookingWithCar | null;
}

export type CreateBookingInput = {
  carId: string;
  pickupAt: Date;
  dropAt: Date;
  pickupLocationId: string | null;
  dropLocationId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  licenseNumber?: string;
  address?: string;
  emergencyContact?: string;
  baseAmount: number;
  insuranceAmount: number;
  taxAmount: number;
  discountAmount: number;
  securityDeposit: number;
  totalAmount: number;
};

const ERROR_MESSAGES: Record<string, string> = {
  CAR_NOT_AVAILABLE: "This car is no longer available for the selected period.",
  CAR_NOT_FOUND: "This vehicle could not be found.",
  INVALID_PERIOD: "The drop-off time must be after the pickup time.",
  AUTH_REQUIRED: "Please sign in to complete your booking.",
  FORBIDDEN: "You are not allowed to change this booking.",
  BOOKING_NOT_FOUND: "Booking not found.",
};

function friendlyError(message: string): Error {
  const code = Object.keys(ERROR_MESSAGES).find((key) => message.includes(key));
  return new Error(code ? ERROR_MESSAGES[code] : message);
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await supabase.rpc("create_booking", {
    _car_id: input.carId,
    _pickup_at: input.pickupAt.toISOString(),
    _drop_at: input.dropAt.toISOString(),
    _pickup_location_id: input.pickupLocationId as string,
    _drop_location_id: (input.dropLocationId ?? input.pickupLocationId) as string,
    _customer_name: input.customerName,
    _customer_email: input.customerEmail,
    _customer_phone: input.customerPhone,
    _license_number: input.licenseNumber ?? "",
    _address: input.address ?? "",
    _emergency_contact: input.emergencyContact ?? "",
    _base: input.baseAmount,
    _insurance: input.insuranceAmount,
    _tax: input.taxAmount,
    _discount: input.discountAmount,
    _deposit: input.securityDeposit,
    _total: input.totalAmount,
  });
  if (error) throw friendlyError(error.message);
  return data as unknown as Booking;
}

export async function extendBooking(bookingId: string, newDropAt: Date): Promise<Booking> {
  const { data, error } = await supabase.rpc("extend_booking", {
    _booking_id: bookingId,
    _new_drop_at: newDropAt.toISOString(),
  });
  if (error) throw friendlyError(error.message);
  return data as unknown as Booking;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) throw friendlyError(error.message);
  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: "cancelled",
    note: "Cancelled by customer",
  });
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  note?: string,
): Promise<void> {
  const patch: Partial<Booking> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
  const { error } = await supabase.from("bookings").update(patch).eq("id", bookingId);
  if (error) throw friendlyError(error.message);
  await supabase
    .from("booking_status_history")
    .insert({ booking_id: bookingId, status, note: note ?? `Status set to ${status}` });
}

export async function fetchAllBookings(): Promise<BookingWithCar[]> {
  return unwrap(
    await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false })
      .limit(500),
  ) as BookingWithCar[];
}

export async function fetchCustomers(): Promise<Profile[]> {
  return unwrap(
    await supabase.from("profiles").select("*").order("created_at", { ascending: false }),
  ) as Profile[];
}

export async function fetchReviews(carId: string): Promise<Review[]> {
  return unwrap(
    await supabase
      .from("reviews")
      .select("*")
      .eq("car_id", carId)
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
  ) as Review[];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  return unwrap(
    await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
  ) as AuditLog[];
}

export async function fetchNotifications(): Promise<Notification[]> {
  return unwrap(
    await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200),
  ) as Notification[];
}

export async function fetchSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function recordAudit(params: {
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
}): Promise<void> {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    actor_id: data.user?.id ?? null,
    actor_email: data.user?.email ?? null,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    old_value: (params.oldValue ?? null) as never,
    new_value: (params.newValue ?? null) as never,
  });
}

export async function upsertCar(car: Database["public"]["Tables"]["cars"]["Insert"]): Promise<Car> {
  const { data, error } = await supabase.from("cars").upsert(car).select().single();
  if (error) throw new Error(error.message);
  return data as Car;
}

export async function setCarStatus(carId: string, status: Car["status"]): Promise<void> {
  const { error } = await supabase.from("cars").update({ status }).eq("id", carId);
  if (error) throw new Error(error.message);
  await recordAudit({ action: "car.status_changed", entity: "car", entityId: carId, newValue: { status } });
}

export async function createCarBlock(input: {
  carId: string;
  kind: CarBlock["kind"];
  startsAt: Date;
  endsAt: Date;
  reason: string;
}): Promise<void> {
  const { error } = await supabase.from("car_blocks").insert({
    car_id: input.carId,
    kind: input.kind,
    starts_at: input.startsAt.toISOString(),
    ends_at: input.endsAt.toISOString(),
    reason: input.reason,
  });
  if (error) throw new Error(error.message);
  await recordAudit({ action: "car.blocked", entity: "car", entityId: input.carId, newValue: input });
}
