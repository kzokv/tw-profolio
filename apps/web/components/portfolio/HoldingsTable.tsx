import type { LocaleCode } from "@tw-portfolio/shared-types";
import type { AppDictionary } from "../../lib/i18n";
import { TooltipInfo } from "../ui/TooltipInfo";
import { Card } from "../ui/Card";
import type { Holding } from "./types";

interface HoldingsTableProps {
  holdings: Holding[];
  dict: AppDictionary;
  locale: LocaleCode;
}

function formatNtd(value: number, locale: LocaleCode): string {
  const intlLocale = locale === "zh-TW" ? "zh-TW" : "en-US";
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function HoldingsTable({ holdings, dict, locale }: HoldingsTableProps) {
  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl">{dict.holdings.title}</h2>
          <p className="mt-1 text-sm text-muted">{dict.holdings.description}</p>
        </div>
        <p className="text-xs tracking-[0.08em] text-muted">{dict.holdings.entries(holdings.length)}</p>
      </div>

      <div className="overflow-x-auto" data-testid="holdings-table">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-soft text-xs tracking-[0.08em] text-muted">
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.holdings.accountTerm}
                  <TooltipInfo
                    label={dict.holdings.accountTerm}
                    content={dict.tooltips.holdingsAccount}
                    triggerTestId="tooltip-holdings-account-trigger"
                    contentTestId="tooltip-holdings-account-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.holdings.symbolTerm}
                  <TooltipInfo
                    label={dict.holdings.symbolTerm}
                    content={dict.tooltips.holdingsSymbol}
                    triggerTestId="tooltip-holdings-symbol-trigger"
                    contentTestId="tooltip-holdings-symbol-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.holdings.quantityTerm}
                  <TooltipInfo
                    label={dict.holdings.quantityTerm}
                    content={dict.tooltips.holdingsQuantity}
                    triggerTestId="tooltip-holdings-quantity-trigger"
                    contentTestId="tooltip-holdings-quantity-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.holdings.totalCostTerm}
                  <TooltipInfo
                    label={dict.holdings.totalCostTerm}
                    content={dict.tooltips.holdingsTotalCost}
                    triggerTestId="tooltip-holdings-total-cost-trigger"
                    contentTestId="tooltip-holdings-total-cost-content"
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={`${holding.accountId}-${holding.symbol}`} className="border-b border-line last:border-0">
                <td className="px-3 py-2">{holding.accountId}</td>
                <td className="px-3 py-2 font-semibold tracking-wide">{holding.symbol}</td>
                <td className="px-3 py-2">{holding.quantity}</td>
                <td className="px-3 py-2">{formatNtd(holding.costNtd, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
