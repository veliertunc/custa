"use client";

import { useRouter } from "next/navigation";

import { SignInForm } from "@acme/ui/sign-in-form";

import { authClient } from "~/auth/client";

export function OwnerSignIn() {
  const router = useRouter();
  return (
    <SignInForm
      signIn={async (credentials) => {
        const result = await authClient.signIn.email(credentials);
        if (result.error) return false;
        router.refresh();
        return true;
      }}
    />
  );
}
