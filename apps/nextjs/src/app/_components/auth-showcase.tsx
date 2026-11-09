import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@acme/ui/button";

import { auth, getSession, signInProviders } from "~/auth/server";
import { OwnerSignIn } from "./owner-sign-in";

export async function AuthShowcase() {
  const session = await getSession();

  if (!session) return <OwnerSignIn providers={signInProviders} />;

  return (
    <div className="flex items-center gap-3">
      <p className="text-center text-sm">
        <span>Logged in as {session.user.name}</span>
      </p>

      <form>
        <Button
          size="sm"
          formAction={async () => {
            "use server";
            await auth.api.signOut({
              headers: await headers(),
            });
            redirect("/");
          }}
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
