"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@acme/ui/button";
import { SignInForm } from "@acme/ui/sign-in-form";

import type { signInProviders } from "~/auth/server";
import { authClient } from "~/auth/client";

const providerNames = {
  google: "Google",
  apple: "Apple",
  linkedin: "LinkedIn",
};

export function OwnerSignIn(props: { providers: typeof signInProviders }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <SignInForm
        signIn={async (credentials) => {
          const result = await authClient.signIn.email(credentials);
          if (result.error) return false;
          router.refresh();
          return true;
        }}
      />
      {props.providers.length > 0 && (
        <div className="mx-auto mt-4 grid w-full max-w-sm gap-2">
          {props.providers.map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="outline"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError("");
                try {
                  const { error } = await authClient.signIn.social({
                    provider,
                    callbackURL: "/",
                  });
                  if (error)
                    setError("Could not start sign-in. Please try again.");
                } catch {
                  setError("Could not start sign-in. Please try again.");
                } finally {
                  setPending(false);
                }
              }}
            >
              Sign in with {providerNames[provider]}
            </Button>
          ))}
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
