import { getSession } from "~/auth/server";
import { AuthShowcase } from "./_components/auth-showcase";
import { SalesWorkspace } from "./_components/sales-workspace";

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 pb-16 sm:px-10">
      <header className="flex items-center justify-between border-b py-5">
        <a
          href="/"
          className="flex items-center gap-3 text-xl font-semibold tracking-tight"
        >
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white"
          >
            C
          </span>
          Custa
        </a>
        {session && <AuthShowcase />}
      </header>
      {session ? (
        <SalesWorkspace />
      ) : (
        <section className="mx-auto max-w-3xl py-20 text-center sm:py-28">
          <p className="text-sm font-semibold tracking-widest text-teal-700 uppercase dark:text-teal-300">
            LinkedIn sales workspace
          </p>
          <h1 className="mt-5 text-5xl leading-tight font-semibold tracking-tight sm:text-7xl">
            Find the right buyers. Turn conversations into orders.
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-lg text-lg">
            Build a pitch from your business profile, research LinkedIn
            prospects, and give buyers a direct link to submit an order request.
          </p>
          <div className="mt-8">
            <AuthShowcase />
          </div>
        </section>
      )}
    </main>
  );
}
