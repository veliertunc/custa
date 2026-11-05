"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";

import { useTRPC } from "~/trpc/react";

type Workspace = RouterOutputs["sales"]["workspace"];
const panel = "rounded-2xl border bg-card p-5 shadow-sm sm:p-7";
const control = "mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm";

const fields = [
  { name: "name", label: "Business name" },
  { name: "market", label: "Target market or region" },
  { name: "offering", label: "Products or services", multiline: true },
  { name: "audience", label: "Ideal customers", multiline: true },
  {
    name: "terms",
    label: "Pricing, order terms, and fulfillment",
    multiline: true,
  },
  { name: "ordersEmail", label: "Order notification email", email: true },
] as const;

export function SalesWorkspace() {
  const trpc = useTRPC();
  const query = useQuery(trpc.sales.workspace.queryOptions());
  if (query.error)
    return (
      <p className="py-8" role="alert">
        Could not load your workspace. Check your database setup and reload.
      </p>
    );
  if (!query.data)
    return (
      <p className="py-8" role="status">
        Loading your workspace…
      </p>
    );
  return <Dashboard data={query.data} />;
}

function Dashboard({ data }: { data: Workspace }) {
  const trpc = useTRPC();
  const cache = useQueryClient();
  const refresh = () =>
    cache.invalidateQueries({ queryKey: trpc.sales.workspace.queryKey() });
  const save = useMutation(
    trpc.sales.saveBusiness.mutationOptions({ onSuccess: refresh }),
  );
  const pitch = useMutation(
    trpc.sales.generatePitch.mutationOptions({ onSuccess: refresh }),
  );
  const research = useMutation(
    trpc.sales.findLeads.mutationOptions({ onSuccess: refresh }),
  );
  const send = useMutation(
    trpc.sales.sendOutreach.mutationOptions({ onSuccess: refresh }),
  );
  const retry = useMutation(
    trpc.sales.retryOrderEmail.mutationOptions({ onSuccess: refresh }),
  );
  const [draft, setDraft] = useState<{ leadId: string; message: string }>();
  const busy =
    save.isPending ||
    pitch.isPending ||
    research.isPending ||
    send.isPending ||
    retry.isPending;
  const error =
    save.error ?? pitch.error ?? research.error ?? send.error ?? retry.error;
  const resetErrors = () => {
    save.reset();
    pitch.reset();
    research.reset();
    send.reset();
    retry.reset();
  };

  return (
    <>
      <section className="my-8 rounded-3xl bg-slate-950 px-6 py-9 text-white sm:px-10">
        <p className="text-xs font-semibold tracking-widest text-teal-300 uppercase">
          Sales operations / LinkedIn
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Sales workspace
        </h1>
        <p className="mt-3 max-w-xl text-slate-300">
          Set up your business, research your market, and review outreach before
          it goes out.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-200">
          <span>{data.leads.length} prospects</span>
          <span>
            {data.leads.filter((lead) => lead.sentAt).length} contacted
          </span>
          <span>{data.orders.length} order requests</span>
        </div>
      </section>
      {!data.providerReady && (
        <p className="bg-muted mb-5 rounded-xl border p-4 text-sm">
          Connect a sales MCP provider to enable pitch, research, outreach, and
          email.
        </p>
      )}
      {error && (
        <p
          className="mb-5 rounded-xl border border-red-500/50 p-4"
          role="alert"
        >
          {error.message}
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className={panel}>
          <h2 className="text-xl font-semibold">Business profile</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Save the details the provider will use to tailor your sales work.
          </p>
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              resetErrors();
              save.mutate({
                name: String(values.get("name")),
                market: String(values.get("market")),
                offering: String(values.get("offering")),
                audience: String(values.get("audience")),
                terms: String(values.get("terms")),
                ordersEmail: String(values.get("ordersEmail")),
              });
            }}
          >
            {fields.map((field) => (
              <label key={field.name} className="block text-sm font-medium">
                {field.label}
                {"multiline" in field ? (
                  <textarea
                    name={field.name}
                    defaultValue={data.business?.[field.name]}
                    className={control}
                    rows={3}
                    required
                    maxLength={6000}
                  />
                ) : (
                  <input
                    name={field.name}
                    defaultValue={data.business?.[field.name]}
                    className={control}
                    type={"email" in field ? "email" : "text"}
                    required
                    maxLength={"email" in field ? 254 : 200}
                  />
                )}
              </label>
            ))}
            <Button disabled={busy} className="justify-self-start">
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
            {save.isSuccess && (
              <p role="status" className="text-muted-foreground text-sm">
                Business profile saved.
              </p>
            )}
          </form>
        </section>
        <div className="grid gap-5">
          <section className={panel}>
            <h2 className="text-xl font-semibold">Pitch and market research</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate a pitch and discover up to 25 LinkedIn prospects per
              search.
            </p>
            <div className="my-4 flex flex-wrap gap-2">
              <Button
                disabled={busy || !data.business || !data.providerReady}
                onClick={() => {
                  resetErrors();
                  pitch.mutate();
                }}
              >
                {pitch.isPending ? "Generating…" : "Generate pitch"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || !data.business || !data.providerReady}
                onClick={() => {
                  resetErrors();
                  research.mutate();
                }}
              >
                {research.isPending ? "Searching…" : "Search LinkedIn"}
              </Button>
            </div>
            {data.business?.pitch && (
              <div className="bg-muted mb-3 rounded-xl p-4">
                <h3 className="mb-2 font-medium">Sales pitch</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {data.business.pitch}
                </p>
              </div>
            )}
            {data.business?.research && (
              <div className="bg-muted rounded-xl p-4">
                <h3 className="mb-2 font-medium">Market findings</h3>
                <p className="text-sm whitespace-pre-wrap">
                  {data.business.research}
                </p>
              </div>
            )}
          </section>
          <section className={panel}>
            <h2 className="text-xl font-semibold">LinkedIn prospects</h2>
            {!data.leads.length && (
              <p className="text-muted-foreground mt-2 text-sm">
                Prospects will appear here after a search finds matches.
              </p>
            )}
            <ul className="divide-y">
              {data.leads.map((lead) => (
                <li key={lead.id} className="py-4">
                  <a
                    href={lead.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-4"
                  >
                    {lead.name}
                  </a>
                  <p className="text-muted-foreground text-sm">
                    {lead.company}
                  </p>
                  <p className="my-2 text-sm">{lead.rationale}</p>
                  {lead.sentAt ? (
                    <span className="text-sm font-medium">Outreach sent</span>
                  ) : draft?.leadId === lead.id ? (
                    <form
                      className="grid gap-3"
                      onSubmit={(event) => {
                        event.preventDefault();
                        resetErrors();
                        send.mutate(draft, {
                          onSuccess: () => setDraft(undefined),
                        });
                      }}
                    >
                      <label className="text-sm font-medium">
                        Review message
                        <textarea
                          className={control}
                          value={draft.message}
                          onChange={(event) =>
                            setDraft({
                              leadId: lead.id,
                              message: event.target.value,
                            })
                          }
                          rows={5}
                          maxLength={1800}
                          required
                        />
                      </label>
                      <p className="text-muted-foreground text-sm">
                        Custa adds a unique order link to this message.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={busy || !data.providerReady}>
                          {send.isPending
                            ? "Sending…"
                            : "Send LinkedIn message"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => setDraft(undefined)}
                        >
                          Cancel
                        </Button>
                      </div>
                      {send.error && (
                        <p className="text-sm" role="alert">
                          {send.error.message}
                        </p>
                      )}
                    </form>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        setDraft({
                          leadId: lead.id,
                          message: (
                            data.business?.pitch ?? `Hi ${lead.name},\n\n`
                          ).slice(0, 1800),
                        })
                      }
                    >
                      Review outreach
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section className={panel}>
            <h2 className="text-xl font-semibold">Order requests</h2>
            {!data.orders.length && (
              <p className="text-muted-foreground mt-2 text-sm">
                Requests from your outreach links will appear here.
              </p>
            )}
            <ul className="divide-y">
              {data.orders.map((order) => (
                <li key={order.id} className="py-4">
                  <p className="font-medium">{order.name}</p>
                  <p className="text-muted-foreground text-sm">{order.email}</p>
                  <p className="my-2 text-sm whitespace-pre-wrap">
                    {order.details}
                  </p>
                  {order.emailedAt ? (
                    <span className="text-sm font-medium">
                      Email accepted by provider
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">Email pending</span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !data.providerReady}
                        onClick={() => {
                          resetErrors();
                          retry.mutate(order.id);
                        }}
                      >
                        Retry email
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
