import { useNavigate } from "@tanstack/react-router";

import { Button } from "@acme/ui/button";
import { SignInForm } from "@acme/ui/sign-in-form";

import { authClient } from "~/auth/client";

export function AuthShowcase() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  if (!session) {
    return (
      <SignInForm
        signIn={async (credentials) => {
          const result = await authClient.signIn.email(credentials);
          return !result.error;
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl">
        <span>Logged in as {session.user.name}</span>
      </p>

      <Button
        size="lg"
        onClick={async () => {
          await authClient.signOut();
          await navigate({ href: "/", replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
