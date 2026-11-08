import { Button } from "@acme/ui/button";

import { SalesPanel } from "./sales-panel";

export function PitchAndResearch({
  pitch,
  research,
  disabled,
  generating,
  searching,
  onGenerate,
  onSearch,
}: {
  pitch?: string | null;
  research?: string | null;
  disabled: boolean;
  generating: boolean;
  searching: boolean;
  onGenerate: () => void;
  onSearch: () => void;
}) {
  return (
    <SalesPanel title="Pitch and market research">
      <p className="text-muted-foreground mt-1 text-sm">
        Generate a pitch and discover up to 25 LinkedIn prospects per search.
      </p>
      <div className="my-4 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={onGenerate}>
          {generating ? "Generating…" : "Generate pitch"}
        </Button>
        <Button variant="outline" disabled={disabled} onClick={onSearch}>
          {searching ? "Searching…" : "Search LinkedIn"}
        </Button>
      </div>
      {pitch && (
        <div className="bg-muted mb-3 rounded-xl p-4">
          <h3 className="mb-2 font-medium">Sales pitch</h3>
          <p className="text-sm whitespace-pre-wrap">{pitch}</p>
        </div>
      )}
      {research && (
        <div className="bg-muted rounded-xl p-4">
          <h3 className="mb-2 font-medium">Market findings</h3>
          <p className="text-sm whitespace-pre-wrap">{research}</p>
        </div>
      )}
    </SalesPanel>
  );
}
