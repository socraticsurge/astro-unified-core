"use client";
import { useEffect, useRef, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

// Single-provider sign-in page. Since Google is the only auth method,
// the canonical experience is to bounce straight to Google's consent
// flow on mount — no extra "Continue with Google" click. The button
// remains as a fallback if the auto-redirect fails or is blocked
// (e.g., by a popup blocker or a bfcache-restored navigation).
export default function SignInPage() {
  const [stalled, setStalled] = useState(false);
  const [stagingMode, setStagingMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let active = true;
    void getProviders().then((providers) => {
      if (!active) return;
      if (providers?.["staging-credentials"]) {
        setStagingMode(true);
        return;
      }
      void signIn("google", { callbackUrl: "/dashboard" });
      // If the redirect has not navigated us away, surface the fallback.
      setTimeout(() => setStalled(true), 2000);
    });
    return () => {
      active = false;
    };
  }, []);

  async function submitStagingCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await signIn("staging-credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
    });
    if (result?.ok && result.url) {
      window.location.assign(result.url);
      return;
    }
    setSubmitting(false);
    setError("Those staging credentials were not accepted.");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-5xl font-medium tracking-tight">✦ Astro Chaganti</h1>
        <p className="text-muted-foreground text-balance">
          {stagingMode
            ? "Isolated review environment — synthetic data only."
            : stalled
            ? "Redirect didn't fire — click below to continue."
            : "Redirecting to Google…"}
        </p>
      </div>
      {stagingMode ? (
        <form className="w-full max-w-sm space-y-5" onSubmit={submitStagingCredentials}>
          <div className="space-y-2">
            <Label htmlFor="staging-email">Synthetic email</Label>
            <Input
              id="staging-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="staging-password">Staging password</Label>
            <Input
              id="staging-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <Button className="w-full" size="lg" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enter isolated staging
          </Button>
        </form>
      ) : !stalled ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <Button
          size="lg"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full max-w-sm"
        >
          Continue with Google
        </Button>
      )}
    </div>
  );
}
