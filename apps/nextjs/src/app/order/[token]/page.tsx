import { notFound } from "next/navigation";
import { z } from "zod/v4";

import { OrderForm } from "./order-form";

export const metadata = {
  title: "Submit an order request | Custa",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
} as const;

export default async function OrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!z.uuid().safeParse(token).success) notFound();
  return <OrderForm token={token} />;
}
