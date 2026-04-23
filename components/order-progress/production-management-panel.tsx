import { Language } from "@/lib/i18n";

type ProductionManagementPanelProps = {
  language: Language;
};

const FIELD_SLOT_COUNT = 8;

export function ProductionManagementPanel({ language }: ProductionManagementPanelProps) {
  const en = language === "en";
  const sectionTitle = en ? "Production management" : "生产管理";
  const sectionIntro = en
    ? "Use the slots below as scaffolding: swap each block for labels, inputs, tables, or KPI cards when you define the data model."
    : "下方为字段占位区：后续可将每一块替换为标签、输入框、表格或指标卡片等，按实际业务建模即可。";
  const slotLabel = (i: number) =>
    en ? `Field slot ${i}` : `字段区域 ${i}`;
  const slotHint = en ? "Reserved" : "预留";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {sectionTitle}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{sectionIntro}</p>

        <div
          className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="list"
          aria-label={en ? "Reserved field areas" : "预留字段区域"}
        >
          {Array.from({ length: FIELD_SLOT_COUNT }, (_, idx) => {
            const n = idx + 1;
            return (
              <div
                key={n}
                role="listitem"
                className="flex min-h-[7.5rem] flex-col rounded-xl border border-dashed border-app-border/80 bg-app-accent-soft/25 p-4 transition-colors hover:border-app-border hover:bg-app-accent-soft/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                    {slotLabel(n)}
                  </span>
                  <span className="shrink-0 rounded-md border border-app-border/60 bg-app-surface px-2 py-0.5 text-[10px] font-medium text-foreground/50">
                    {slotHint}
                  </span>
                </div>
                <div className="mt-3 flex-1 rounded-lg border border-transparent bg-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
