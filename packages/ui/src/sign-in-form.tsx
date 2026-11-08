"use client";

import { useState } from "react";

import { Button } from "./button";
import { Input } from "./input";

export function SignInForm(props: {
  signIn: (credentials: {
    email: string;
    password: string;
  }) => Promise<boolean>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="mx-auto grid w-full max-w-sm gap-3 text-left"
      method="post"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const email = data.get("email");
        const password = data.get("password");
        if (typeof email !== "string" || typeof password !== "string") return;
        setPending(true);
        setError("");
        try {
          const signedIn = await props.signIn({ email, password });
          if (!signedIn) setError("Check your email and password.");
        } catch {
          setError("Sign-in failed. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="grid gap-1 text-sm font-medium">
        Email
        <Input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Password
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <Button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}
