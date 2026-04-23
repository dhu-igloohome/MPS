import type { Language } from "@/lib/i18n";

type OrderFulfillmentsPanelProps = {
  language: Language;
};

const SLOT_COUNT = 6;

export function OrderFulfillmentsPanel({ language }: OrderFulfillmentsPanelProps) {
  const en = language === "en";
  const title = en ? "Order fulfillments" : "订单履约";
  const intro = en
    ? "Placeholder layout for fulfillment tracking (lines, dates, carriers, proof of delivery). Replace each slot with real fields when your process is defined."
    : "以下为订单履约相关信息的占位版面（行项目、日期、承运商、签收凭证等）；流程确定后可替换为实际表单项或列表。";
  const slotLabel = (i: number) => (en ? `Field slot ${i}` : `字段区域 ${i}`);
  const slotHint = en ? "Reserved" : "预留";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{intro}</p>
        <div
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label={en ? "Reserved fulfillment fields" : "预留履约字段"}
        >
          {Array.from({ length: SLOT_COUNT }, (_, idx) => {
            const n = idx + 1;
            return (
              <div
                key={n}
                role="listitem"
                className="flex min-h-[6.5rem] flex-col rounded-xl border border-dashed border-app-border/80 bg-app-accent-soft/25 p-4 transition-colors hover:border-app-border hover:bg-app-accent-soft/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                    {slotLabel(n)}
                  </span>
                  <span className="shrink-0 rounded-md border border-app-border/60 bg-app-surface px-2 py-0.5 text-[10px] font-medium text-foreground/50">
                    {slotHint}
                  </span>
                </div>
                <div className="mt-3 flex-1 rounded-lg border border-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
