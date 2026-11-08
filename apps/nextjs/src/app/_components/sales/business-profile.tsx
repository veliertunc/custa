import { Button } from "@acme/ui/button";

import { SalesPanel } from "./sales-panel";

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

export type BusinessProfileValues = Record<
  (typeof fields)[number]["name"],
  string
>;

export function BusinessProfile({
  profile,
  disabled,
  saving,
  saved,
  onSave,
}: {
  profile?: BusinessProfileValues | null;
  disabled: boolean;
  saving: boolean;
  saved: boolean;
  onSave: (values: BusinessProfileValues) => void;
}) {
  return (
    <SalesPanel title="Business profile">
      <p className="text-muted-foreground mt-1 text-sm">
        Save the details the provider will use to tailor your sales work.
      </p>
      <form
        className="mt-5 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          const values = new FormData(event.currentTarget);
          onSave({
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
                defaultValue={profile?.[field.name]}
                className={control}
                rows={3}
                required
                maxLength={6000}
              />
            ) : (
              <input
                name={field.name}
                defaultValue={profile?.[field.name]}
                className={control}
                type={"email" in field ? "email" : "text"}
                required
                maxLength={"email" in field ? 254 : 200}
              />
            )}
          </label>
        ))}
        <Button disabled={disabled} className="justify-self-start">
          {saving ? "Saving…" : "Save profile"}
        </Button>
        {saved && (
          <p role="status" className="text-muted-foreground text-sm">
            Business profile saved.
          </p>
        )}
      </form>
    </SalesPanel>
  );
}
