/**
 * PricingService — all money maths lives here, never in components.
 */

export type PricingConfig = {
  taxPercent: number;
  insurancePerDay: number;
  lateFeePerHour: number;
  extraKmCharge: number;
  weekendSurchargePercent: number;
  peakSurchargePercent: number;
};

export const DEFAULT_PRICING: PricingConfig = {
  taxPercent: 18,
  insurancePerDay: 150,
  lateFeePerHour: 250,
  extraKmCharge: 12,
  weekendSurchargePercent: 8,
  peakSurchargePercent: 0,
};

export type RateCard = {
  hourlyRate: number;
  dailyRate: number;
  weeklyRate: number;
  securityDeposit: number;
};

export type Quote = {
  hours: number;
  days: number;
  weeks: number;
  baseAmount: number;
  weekendSurcharge: number;
  insuranceAmount: number;
  taxAmount: number;
  discountAmount: number;
  securityDeposit: number;
  totalAmount: number;
  payableNow: number;
};

const HOUR = 1000 * 60 * 60;

export function durationHours(pickupAt: Date, dropAt: Date): number {
  return Math.max(1, Math.ceil((dropAt.getTime() - pickupAt.getTime()) / HOUR));
}

function countWeekendDays(pickupAt: Date, dropAt: Date): number {
  let count = 0;
  const cursor = new Date(pickupAt);
  cursor.setHours(12, 0, 0, 0);
  while (cursor < dropAt) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function quoteBooking(params: {
  rates: RateCard;
  pickupAt: Date;
  dropAt: Date;
  config?: Partial<PricingConfig>;
  discountAmount?: number;
  couponPercent?: number;
}): Quote {
  const config = { ...DEFAULT_PRICING, ...params.config };
  const hours = durationHours(params.pickupAt, params.dropAt);
  const days = Math.ceil(hours / 24);
  const weeks = Math.floor(days / 7);

  // Cheapest-of ladder: weeks, then days, then hours for sub-day rentals.
  let baseAmount: number;
  if (hours < 24) {
    baseAmount = Math.min(hours * params.rates.hourlyRate, params.rates.dailyRate);
  } else {
    const remainderDays = days - weeks * 7;
    baseAmount = weeks * params.rates.weeklyRate + remainderDays * params.rates.dailyRate;
    baseAmount = Math.min(baseAmount, days * params.rates.dailyRate);
  }

  const weekendDays = countWeekendDays(params.pickupAt, params.dropAt);
  const weekendSurcharge = Math.round(
    ((weekendDays * params.rates.dailyRate) / 100) * config.weekendSurchargePercent,
  );
  const peakSurcharge = Math.round((baseAmount / 100) * config.peakSurchargePercent);
  const subtotal = baseAmount + weekendSurcharge + peakSurcharge;

  const insuranceAmount = Math.max(1, days) * config.insurancePerDay;
  const couponDiscount = params.couponPercent
    ? Math.round((subtotal / 100) * params.couponPercent)
    : 0;
  const discountAmount = (params.discountAmount ?? 0) + couponDiscount;
  const taxable = Math.max(0, subtotal + insuranceAmount - discountAmount);
  const taxAmount = Math.round((taxable / 100) * config.taxPercent);
  const securityDeposit = params.rates.securityDeposit;
  const totalAmount = taxable + taxAmount + securityDeposit;

  return {
    hours,
    days,
    weeks,
    baseAmount: subtotal,
    weekendSurcharge,
    insuranceAmount,
    taxAmount,
    discountAmount,
    securityDeposit,
    totalAmount,
    payableNow: totalAmount,
  };
}

export function lateReturnFee(dropAt: Date, returnedAt: Date, config = DEFAULT_PRICING): number {
  const late = returnedAt.getTime() - dropAt.getTime();
  if (late <= 0) return 0;
  return Math.ceil(late / HOUR) * config.lateFeePerHour;
}

export type CancellationRules = {
  freeUntilHours: number;
  lateFeePercent: number;
  afterPickupRefund: number;
};

export const DEFAULT_CANCELLATION: CancellationRules = {
  freeUntilHours: 24,
  lateFeePercent: 25,
  afterPickupRefund: 0,
};

export function cancellationOutcome(params: {
  pickupAt: Date;
  now?: Date;
  paidAmount: number;
  rules?: CancellationRules;
}): { refundAmount: number; feeAmount: number; reason: string } {
  const rules = params.rules ?? DEFAULT_CANCELLATION;
  const now = params.now ?? new Date();
  const hoursToPickup = (params.pickupAt.getTime() - now.getTime()) / HOUR;

  if (hoursToPickup <= 0) {
    return {
      refundAmount: Math.round((params.paidAmount / 100) * rules.afterPickupRefund),
      feeAmount: params.paidAmount,
      reason: "Cancelled after pickup time — no refund",
    };
  }
  if (hoursToPickup >= rules.freeUntilHours) {
    return { refundAmount: params.paidAmount, feeAmount: 0, reason: "Free cancellation window" };
  }
  const feeAmount = Math.round((params.paidAmount / 100) * rules.lateFeePercent);
  return {
    refundAmount: params.paidAmount - feeAmount,
    feeAmount,
    reason: `Cancelled within ${rules.freeUntilHours}h of pickup — ${rules.lateFeePercent}% fee`,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
