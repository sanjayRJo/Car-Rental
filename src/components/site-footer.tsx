import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="ink-panel mt-24">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold">Carvyo</p>
          <p className="mt-3 max-w-xs text-sm opacity-75">
            Self-drive rentals across Tamil Nadu. Hourly, daily or trip-based — with transparent
            pricing and real vehicle-level availability.
          </p>
        </div>
        <nav aria-label="Fleet" className="text-sm">
          <p className="mb-3 font-medium uppercase tracking-wide opacity-60">Fleet</p>
          <ul className="space-y-2 opacity-80">
            <li>
              <Link to="/cars">All cars</Link>
            </li>
            <li>
              <a href="/cars?type=suv">
                SUVs
              </a>
            </li>
            <li>
              <a href="/cars?type=ev">
                Electric
              </a>
            </li>
            <li>
              <a href="/cars?type=luxury">
                Luxury
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Company" className="text-sm">
          <p className="mb-3 font-medium uppercase tracking-wide opacity-60">Company</p>
          <ul className="space-y-2 opacity-80">
            <li>
              <a href="/#how-it-works">
                How it works
              </a>
            </li>
            <li>
              <a href="/#locations">
                Locations
              </a>
            </li>
            <li>
              <a href="/#faq">
                FAQ
              </a>
            </li>
            <li>
              <Link to="/account">My bookings</Link>
            </li>
          </ul>
        </nav>
        <div className="text-sm opacity-80">
          <p className="mb-3 font-medium uppercase tracking-wide opacity-60">Support</p>
          <p>+91 90000 11000</p>
          <p>care@Carvyo.example</p>
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] opacity-60">Built by</p>
            <a
              href="https://sjoenix.vercel.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 transition-opacity hover:opacity-90"
            >
              <img
                src="https://sjoenix.vercel.app/assets/sjoenix-brand-BWnhMCaE.png"
                alt="SJOENIX TECHNOLOGIES"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                SJOENIX TECHNOLOGIES
              </span>
            </a>
          </div>
          <p className="mt-4 text-xs opacity-60">
            © {new Date().getFullYear()} Carvyo Mobility. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
