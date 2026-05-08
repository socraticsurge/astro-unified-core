"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Single-provider sign-in page. Since Google is the only auth method,
// the canonical experience is to bounce straight to Google's consent
// flow on mount — no extra "Continue with Google" click. The button
// remains as a fallback if the auto-redirect fails or is blocked
// (e.g., by a popup blocker or a bfcache-restored navigation).
export default function SignInPage() {
  const [stalled, setStalled] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void signIn("google", { callbackUrl: "/dashboard" });
    // If the redirect hasn't navigated us away after a couple of
    // seconds, assume something blocked it and surface the manual
    // button so the user isn't stuck.
    const t = setTimeout(() => setStalled(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-5xl font-medium tracking-tight">✦ Astro Chaganti</h1>
        <p className="text-muted-foreground">
          {stalled
            ? "Redirect didn't fire — click below to continue."
            : "Redirecting to Google…"}
        </p>
      </div>
      {!stalled ? (
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
