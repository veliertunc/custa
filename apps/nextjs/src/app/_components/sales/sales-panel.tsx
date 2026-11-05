import type { ReactNode } from "react";

export function SalesPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
