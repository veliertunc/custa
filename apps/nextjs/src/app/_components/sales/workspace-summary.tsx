export function WorkspaceSummary({
  prospectCount,
  contactedCount,
  orderCount,
}: {
  prospectCount: number;
  contactedCount: number;
  orderCount: number;
}) {
  return (
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
        <span>{prospectCount} prospects</span>
        <span>{contactedCount} contacted</span>
        <span>{orderCount} order requests</span>
      </div>
    </section>
  );
}
