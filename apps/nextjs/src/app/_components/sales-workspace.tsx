"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";

import { useTRPC } from "~/trpc/react";
import { BusinessProfile } from "./sales/business-profile";
import { LinkedInProspects } from "./sales/linkedin-prospects";
import { OrderRequests } from "./sales/order-requests";
import { PitchAndResearch } from "./sales/pitch-and-research";
import { WorkspaceSummary } from "./sales/workspace-summary";

type Workspace = RouterOutputs["sales"]["workspace"];
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
      <WorkspaceSummary
        prospectCount={data.leads.length}
        contactedCount={data.leads.filter((lead) => lead.sentAt).length}
        orderCount={data.orders.length}
      />
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
        <BusinessProfile
          profile={data.business}
          disabled={busy}
          saving={save.isPending}
          saved={save.isSuccess}
          onSave={(values) => {
            resetErrors();
            save.mutate(values);
          }}
        />
        <div className="grid gap-5">
          <PitchAndResearch
            pitch={data.business?.pitch}
            research={data.business?.research}
            disabled={busy || !data.business || !data.providerReady}
            generating={pitch.isPending}
            searching={research.isPending}
            onGenerate={() => {
              resetErrors();
              pitch.mutate();
            }}
            onSearch={() => {
              resetErrors();
              research.mutate();
            }}
          />
          <LinkedInProspects
            leads={data.leads}
            pitch={data.business?.pitch}
            busy={busy}
            providerReady={data.providerReady}
            sending={send.isPending}
            error={send.error?.message}
            onSend={(draft, onSuccess) => {
              resetErrors();
              send.mutate(draft, { onSuccess });
            }}
          />
          <OrderRequests
            orders={data.orders}
            disabled={busy || !data.providerReady}
            onRetry={(id) => {
              resetErrors();
              retry.mutate(id);
            }}
          />
        </div>
      </div>
    </>
  );
}
