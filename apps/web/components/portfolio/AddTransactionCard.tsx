import type { AppDictionary } from "../../lib/i18n";
import { TooltipInfo } from "../ui/TooltipInfo";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import type { TransactionInput } from "./types";

interface AddTransactionCardProps {
  value: TransactionInput;
  accountOptions: Array<{ id: string; name: string }>;
  pending: boolean;
  onChange: (next: TransactionInput) => void;
  onSubmit: () => Promise<void>;
  dict: AppDictionary;
}

export function AddTransactionCard({ value, accountOptions, pending, onChange, onSubmit, dict }: AddTransactionCardProps) {
  function setField<K extends keyof TransactionInput>(key: K, nextValue: TransactionInput[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <Card className="animate-fade-in-up">
      <div className="mb-4">
        <h2 className="text-2xl">{dict.transactions.title}</h2>
        <p className="mt-1 text-sm text-muted">{dict.transactions.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.accountTerm}
            <TooltipInfo
              label={dict.transactions.accountTerm}
              content={dict.tooltips.txAccount}
              triggerTestId="tooltip-tx-account-trigger"
              contentTestId="tooltip-tx-account-content"
            />
          </span>
          <select
            value={value.accountId}
            onChange={(event) => setField("accountId", event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
            data-testid="tx-account-select"
          >
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.id})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.typeTerm}
            <TooltipInfo
              label={dict.transactions.typeTerm}
              content={dict.tooltips.txType}
              triggerTestId="tooltip-tx-type-trigger"
              contentTestId="tooltip-tx-type-content"
            />
          </span>
          <select
            value={value.type}
            onChange={(event) => setField("type", event.target.value as "BUY" | "SELL")}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
          >
            <option value="BUY">{dict.transactions.typeBuy}</option>
            <option value="SELL">{dict.transactions.typeSell}</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.symbolTerm}
            <TooltipInfo
              label={dict.transactions.symbolTerm}
              content={dict.tooltips.txSymbol}
              triggerTestId="tooltip-tx-symbol-trigger"
              contentTestId="tooltip-tx-symbol-content"
            />
          </span>
          <input
            value={value.symbol}
            onChange={(event) => setField("symbol", event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.quantityTerm}
            <TooltipInfo
              label={dict.transactions.quantityTerm}
              content={dict.tooltips.txQuantity}
              triggerTestId="tooltip-tx-quantity-trigger"
              contentTestId="tooltip-tx-quantity-content"
            />
          </span>
          <input
            type="number"
            value={value.quantity}
            onChange={(event) => setField("quantity", Number(event.target.value))}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
            data-testid="tx-quantity-input"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.priceTerm}
            <TooltipInfo
              label={dict.transactions.priceTerm}
              content={dict.tooltips.txPrice}
              triggerTestId="tooltip-tx-price-trigger"
              contentTestId="tooltip-tx-price-content"
            />
          </span>
          <input
            type="number"
            value={value.priceNtd}
            onChange={(event) => setField("priceNtd", Number(event.target.value))}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
            data-testid="tx-price-input"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.tradeDateTerm}
            <TooltipInfo
              label={dict.transactions.tradeDateTerm}
              content={dict.tooltips.txTradeDate}
              triggerTestId="tooltip-tx-trade-date-trigger"
              contentTestId="tooltip-tx-trade-date-content"
            />
          </span>
          <input
            type="date"
            value={value.tradeDate}
            onChange={(event) => setField("tradeDate", event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex items-center gap-1 text-xs uppercase tracking-[0.08em] text-muted">
            {dict.transactions.dayTradeTerm}
            <TooltipInfo
              label={dict.transactions.dayTradeTerm}
              content={dict.tooltips.txDayTrade}
              triggerTestId="tooltip-tx-day-trade-trigger"
              contentTestId="tooltip-tx-day-trade-content"
            />
          </span>
          <select
            value={value.isDayTrade ? "yes" : "no"}
            onChange={(event) => setField("isDayTrade", event.target.value === "yes")}
            className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3"
          >
            <option value="no">{dict.transactions.dayTradeNo}</option>
            <option value="yes">{dict.transactions.dayTradeYes}</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={() => onSubmit()} disabled={pending} data-testid="tx-submit-button">
          {pending ? dict.actions.submitting : dict.actions.submitTransaction}
        </Button>
      </div>
    </Card>
  );
}
