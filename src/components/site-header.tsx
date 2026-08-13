import { Link } from "@tanstack/react-router";
import { Menu, CarFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { label: "Cars", href: "/cars" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Locations", href: "/#locations" },
  { label: "Help", href: "/#faq" },
];

export function SiteHeader() {
  const { user, isStaff, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <CarFront className="size-5" aria-hidden />
          </span>
          Carvyo
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {isStaff && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">Admin</Link>
            </Button>
          )}
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/account">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Login</Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to="/cars">Book a car</Link>
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
                {NAV.map((item) => (
                  <a
              key={item.label}
              href={item.href}
                    className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  >
                    {item.label}
            </a>
                ))}
                <Link to="/account" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">
                  My dashboard
                </Link>
                {isStaff && (
                  <Link to="/admin" className="rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    Admin
                  </Link>
                )}
                <div className="mt-4 grid gap-2">
                  {user ? (
                    <Button variant="outline" onClick={() => void signOut()}>
                      Sign out
                    </Button>
                  ) : (
                    <Button asChild variant="outline">
                      <Link to="/auth">Login</Link>
                    </Button>
                  )}
                  <Button asChild>
                    <Link to="/cars">Book a car</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
