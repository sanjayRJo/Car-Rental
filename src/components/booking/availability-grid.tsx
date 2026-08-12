import { format } from "date-fns";
import { buildGrid, type BusySlot, type DayState } from "@/lib/availability";
import { cn } from "@/lib/utils";

const STATE_STYLES: Record<DayState, string> = {
  available: "bg-success/15 text-success border-success/30",
  booked: "bg-destructive/15 text-destructive border-destructive/30",
  maintenance: "bg-warning/20 text-warning-foreground border-warning/40",
  blocked: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-muted text-muted-foreground border-border",
};

export type GridCar = { id: string; label: string; registration: string };

export function AvailabilityGrid({
  cars,
  slots,
  from,
  days = 7,
  selectedCarId,
  onSelect,
}: {
  cars: GridCar[];
  slots: BusySlot[];
  from: Date;
  days?: number;
  selectedCarId?: string | null;
  onSelect?: (carId: string) => void;
}) {
  const grid = buildGrid(
    slots,
    cars.map((car) => car.id),
    from,
    days,
  );

  return (
    <div className="surface-card overflow-x-auto p-4">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
        <caption className="sr-only">Vehicle availability by day</caption>
        <thead>
          <tr>
            <th scope="col" className="w-56 px-2 text-left font-medium text-muted-foreground">
              Vehicle
            </th>
            {grid.days.map((day) => (
              <th key={day.toISOString()} scope="col" className="px-1 text-center font-medium">
                <span className="block text-xs text-muted-foreground">{format(day, "EEE")}</span>
                {format(day, "d MMM")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => {
            const states = grid.rows[car.id] ?? [];
            const selectable = states.every((state) => state === "available");
            return (
              <tr key={car.id}>
                <th scope="row" className="px-2 text-left font-normal">
                  <button
                    type="button"
                    disabled={!onSelect || !selectable}
                    onClick={() => onSelect?.(car.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                      selectedCarId === car.id
                        ? "border-accent bg-accent/15"
                        : "border-border hover:bg-muted",
                      !selectable && "opacity-60",
                    )}
                  >
                    <span className="block font-medium">{car.label}</span>
                    <span className="block text-xs text-muted-foreground">{car.registration}</span>
                  </button>
                </th>
                {states.map((state, index) => (
                  <td key={index} className="p-0">
                    <span
                      className={cn(
                        "grid h-10 place-items-center rounded-md border text-[10px] uppercase tracking-wide",
                        STATE_STYLES[state],
                      )}
                      title={state}
                    >
                      {state === "available" ? "free" : state.slice(0, 5)}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-success" /> Available
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-destructive" /> Booked
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-warning" /> Maintenance
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-muted-foreground/40" /> Blocked
        </li>
      </ul>
    </div>
  );
}
