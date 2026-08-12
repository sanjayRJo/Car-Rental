import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create an account | Drivora" },
      {
        name: "description",
        content:
          "Log in to manage your Drivora self-drive bookings, or create an account in seconds to reserve a car.",
      },
      { property: "og:title", content: "Sign in | Drivora" },
      { property: "og:description", content: "Manage your Drivora self-drive rentals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    void navigate({ to: "/account" });
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — you can start booking");
    void navigate({ to: "/account" });
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-md px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">Your Drivora account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The first account created on a fresh install becomes the admin.
        </p>
        <Tabs defaultValue="login" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form className="surface-card mt-4 grid gap-4 p-6" onSubmit={signIn}>
              <div className="grid gap-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form className="surface-card mt-4 grid gap-4 p-6" onSubmit={signUp}>
              <div className="grid gap-2">
                <Label htmlFor="reg-name">Full name</Label>
                <Input
                  id="reg-name"
                  value={fullName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-phone">Phone (for WhatsApp updates)</Label>
                <Input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPhone(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}
