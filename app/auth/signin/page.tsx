"use client";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter">✦ Astro Chaganti</h1>
        <p className="text-muted-foreground">Sign in to manage your astrological profiles</p>
      </div>
      <Button 
        size="lg" 
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="w-full max-w-sm"
      >
        Continue with Google
      </Button>
    </div>
  );
}
