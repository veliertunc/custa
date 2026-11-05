"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

const control = "mt-2 w-full rounded-lg border bg-background px-3 py-2";

export function OrderForm({ token }: { token: string }) {
  const trpc = useTRPC();
  const order = useQuery(
    trpc.sales.orderPage.queryOptions(token, { retry: false }),
  );
  const submit = useMutation(trpc.sales.submitOrder.mutationOptions());

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <section className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
        <p className="mb-3 text-sm font-semibold tracking-widest uppercase">
          Custa / Orders
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Order request</h1>
        {order.isPending && (
          <p role="status" className="mt-4">
            Loading…
          </p>
        )}
        {order.error && (
          <p role="alert" className="mt-4">
            {order.error.message}
          </p>
        )}
        {order.data && (
          <p className="text-muted-foreground mt-3">For {order.data.name}</p>
        )}
        {(order.data?.submitted || submit.isSuccess) && (
          <p role="status" className="mt-5">
            Your order request has been received.
          </p>
        )}
        {order.data && !order.data.submitted && !submit.isSuccess && (
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              submit.mutate({
                token,
                name: String(values.get("name")),
                email: String(values.get("email")),
                details: String(values.get("details")),
              });
            }}
          >
            <label>
              Your name
              <input
                className={control}
                name="name"
                autoComplete="name"
                required
                maxLength={200}
              />
            </label>
            <label>
              Your email
              <input
                className={control}
                name="email"
                autoComplete="email"
                type="email"
                required
                maxLength={254}
              />
            </label>
            <label>
              What would you like to order?
              <textarea
                className={control}
                name="details"
                rows={5}
                required
                maxLength={6000}
                placeholder="Include products, quantities, and any fulfillment details."
              />
            </label>
            <Button disabled={submit.isPending}>
              {submit.isPending ? "Submitting…" : "Submit order request"}
            </Button>
            {submit.error && <p role="alert">{submit.error.message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
