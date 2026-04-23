import type { Language } from "@/lib/i18n";

type OrderFulfillmentsPanelProps = {
  language: Language;
};

function tableLabels(language: Language) {
  const en = language === "en";
  return {
    title: en ? "Order fulfillments" : "订单履约",
    intro: en
      ? "Fulfillment lines will appear here once wired to data. Column headers match your logistics template."
      : "数据接入后在此展示履约行。表头与物流模板一致，可在后续绑定数据源。",
    shipFrom: en ? "Ship from" : "发货地",
    shipTo: en ? "Ship to" : "收货地",
    etd: en ? "ETD" : "ETD（预计发运）",
    eta: en ? "ETA" : "ETA（预计到达）",
    trackingLink: en ? "Tracking link" : "跟踪链接",
    mpBatch: en ? "MP batch" : "MP 批次",
    balanceQty: en ? "Balance Qty" : "结余数量",
    empty: en ? "No rows yet." : "暂无数据。",
  };
}

export function OrderFulfillmentsPanel({ language }: OrderFulfillmentsPanelProps) {
  const t = tableLabels(language);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{t.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>

        <div className="app-table-shell mt-6 overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left font-semibold text-foreground">
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.shipFrom}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.shipTo}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.etd}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.eta}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.trackingLink}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5 last:border-r-0">{t.mpBatch}</th>
                <th className="px-3 py-2.5">{t.balanceQty}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-app-muted">
                  {t.empty}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
