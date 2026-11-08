import { useState } from "react";

import type { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";

import { SalesPanel } from "./sales-panel";

type Workspace = RouterOutputs["sales"]["workspace"];

type Draft = { leadId: string; message: string };
const control = "mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm";

export function LinkedInProspects({
  leads,
  pitch,
  busy,
  providerReady,
  sending,
  error,
  onSend,
}: {
  leads: Workspace["leads"];
  pitch?: string | null;
  busy: boolean;
  providerReady: boolean;
  sending: boolean;
  error?: string;
  onSend: (draft: Draft, onSuccess: () => void) => void;
}) {
  const [draft, setDraft] = useState<Draft>();
  return (
    <SalesPanel title="LinkedIn prospects">
      {!leads.length && (
        <p className="text-muted-foreground mt-2 text-sm">
          Prospects will appear here after a search finds matches.
        </p>
      )}
      <ul className="divide-y">
        {leads.map((lead) => (
          <li key={lead.id} className="py-4">
            <a
              href={lead.profileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              {lead.name}
            </a>
            <p className="text-muted-foreground text-sm">{lead.company}</p>
            <p className="my-2 text-sm">{lead.rationale}</p>
            {lead.sentAt ? (
              <span className="text-sm font-medium">Outreach sent</span>
            ) : draft?.leadId === lead.id ? (
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSend(draft, () => setDraft(undefined));
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
                  <Button disabled={busy || !providerReady}>
                    {sending ? "Sending…" : "Send LinkedIn message"}
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
                {error && (
                  <p className="text-sm" role="alert">
                    {error}
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
                    message: (pitch ?? `Hi ${lead.name},\n\n`).slice(0, 1800),
                  })
                }
              >
                Review outreach
              </Button>
            )}
          </li>
        ))}
      </ul>
    </SalesPanel>
  );
}
