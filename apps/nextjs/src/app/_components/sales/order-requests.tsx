import type { RouterOutputs } from "@acme/api";
import { Button } from "@acme/ui/button";

import { SalesPanel } from "./sales-panel";

type Workspace = RouterOutputs["sales"]["workspace"];

export function OrderRequests({
  orders,
  disabled,
  onRetry,
}: {
  orders: Workspace["orders"];
  disabled: boolean;
  onRetry: (id: string) => void;
}) {
  return (
    <SalesPanel title="Order requests">
      {!orders.length && (
        <p className="text-muted-foreground mt-2 text-sm">
          Requests from your outreach links will appear here.
        </p>
      )}
      <ul className="divide-y">
        {orders.map((order) => (
          <li key={order.id} className="py-4">
            <p className="font-medium">{order.name}</p>
            <p className="text-muted-foreground text-sm">{order.email}</p>
            <p className="my-2 text-sm whitespace-pre-wrap">{order.details}</p>
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
                  disabled={disabled}
                  onClick={() => onRetry(order.id)}
                >
                  Retry email
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </SalesPanel>
  );
}
