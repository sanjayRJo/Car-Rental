import { format } from "date-fns";

export const formatDate = (value: string | Date) => format(new Date(value), "dd MMM yyyy");
export const formatTime = (value: string | Date) => format(new Date(value), "hh:mm a");
export const formatDateTime = (value: string | Date) => format(new Date(value), "dd MMM yyyy, hh:mm a");
export const toLocalInput = (value: Date) => format(value, "yyyy-MM-dd'T'HH:mm");

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function elapsed(from: string | Date, to: Date = new Date()): string {
  const ms = Math.max(0, to.getTime() - new Date(from).getTime());
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export function carTitle(car: { brand: string; model: string; variant?: string | null }): string {
  return [car.brand, car.model, car.variant].filter(Boolean).join(" ");
}
