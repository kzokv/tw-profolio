"use client";

import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AccountDto,
  FeeProfileBindingDto,
  FeeProfileDto,
  LocaleCode,
  UserSettings,
} from "@tw-portfolio/shared-types";
import { getJson, postJson, putJson } from "../../lib/api";
import { formatRecomputeMessage, getDictionary } from "../../lib/i18n";
import { AddTransactionCard } from "../portfolio/AddTransactionCard";
import { HoldingsTable } from "../portfolio/HoldingsTable";
import { RecomputeCard } from "../portfolio/RecomputeCard";
import type { Holding, TransactionInput } from "../portfolio/types";
import { SettingsDrawer, type SettingsDraft } from "../settings/SettingsDrawer";
import { Button } from "../ui/Button";
import { TooltipInfo } from "../ui/TooltipInfo";
import { TopBar } from "./TopBar";

interface FeeConfigResponse {
  accounts: AccountDto[];
  feeProfiles: FeeProfileDto[];
  feeProfileBindings: FeeProfileBindingDto[];
  integrityIssue: { code: string; message: string } | null;
}

const DEFAULT_TRANSACTION: TransactionInput = {
  accountId: "",
  symbol: "2330",
  quantity: 1,
  priceNtd: 100,
  tradeDate: "2026-01-01",
  type: "BUY",
  isDayTrade: false,
};

export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [profiles, setProfiles] = useState<FeeProfileDto[]>([]);
  const [feeProfileBindings, setFeeProfileBindings] = useState<FeeProfileBindingDto[]>([]);
  const [integrityIssue, setIntegrityIssue] = useState<FeeConfigResponse["integrityIssue"]>(null);
  const [showIntegrityDialog, setShowIntegrityDialog] = useState(false);
  const [newTx, setNewTx] = useState<TransactionInput>(DEFAULT_TRANSACTION);

  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [isRunningRecompute, setIsRunningRecompute] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [globalError, setGlobalError] = useState("");
  const [recomputeMessage, setRecomputeMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const locale: LocaleCode = settings?.locale ?? "en";
  const dict = getDictionary(locale);

  const drawerOpen = searchParams.get("drawer") === "settings";

  const setDrawerOpen = useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (open) params.set("drawer", "settings");
      else params.delete("drawer");

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const refresh = useCallback(async () => {
    const [nextSettings, nextHoldings, nextFeeConfig] = await Promise.all([
      getJson<UserSettings>("/settings"),
      getJson<Holding[]>("/portfolio/holdings"),
      getJson<FeeConfigResponse>("/settings/fee-config"),
    ]);

    setSettings(nextSettings);
    setHoldings(nextHoldings);
    setAccounts(nextFeeConfig.accounts);
    setProfiles(nextFeeConfig.feeProfiles);
    setFeeProfileBindings(nextFeeConfig.feeProfileBindings);
    setIntegrityIssue(nextFeeConfig.integrityIssue);
    setShowIntegrityDialog(Boolean(nextFeeConfig.integrityIssue));

    const defaultAccountId = nextFeeConfig.accounts[0]?.id ?? "";
    setNewTx((previous) => ({
      ...previous,
      accountId: nextFeeConfig.accounts.some((account) => account.id === previous.accountId)
        ? previous.accountId
        : defaultAccountId,
    }));
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        await refresh();
      } catch (error) {
        if (!mounted) return;
        setGlobalError(String(error));
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  async function handleSubmitTransaction() {
    if (!newTx.accountId) {
      setGlobalError(dict.feedback.noAccounts);
      return;
    }

    setIsSubmittingTx(true);
    setGlobalError("");

    try {
      await postJson("/portfolio/transactions", newTx, {
        "idempotency-key": `web-${Date.now()}`,
      });
      await refresh();
    } catch (error) {
      setGlobalError(String(error));
    } finally {
      setIsSubmittingTx(false);
    }
  }

  async function handleRecompute() {
    const proceed = window.confirm(dict.recompute.fallbackConfirm);
    if (!proceed) return;

    setIsRunningRecompute(true);
    setGlobalError("");

    try {
      const preview = await postJson<{ id: string; items: Array<{ transactionId: string }> }>(
        "/portfolio/recompute/preview",
        {
          useFallbackBindings: true,
        },
      );

      const confirmed = await postJson<{ status: string }>("/portfolio/recompute/confirm", {
        jobId: preview.id,
      });

      setRecomputeMessage(formatRecomputeMessage(locale, confirmed.status, preview.items.length));
      await refresh();
    } catch (error) {
      setGlobalError(String(error));
    } finally {
      setIsRunningRecompute(false);
    }
  }

  async function handleSaveSettings(draft: SettingsDraft) {
    setIsSavingSettings(true);
    setSettingsError("");

    try {
      await putJson<{
        settings: UserSettings;
        accounts: AccountDto[];
        feeProfiles: FeeProfileDto[];
        feeProfileBindings: FeeProfileBindingDto[];
      }>("/settings/full", {
        settings: {
          locale: draft.locale,
          costBasisMethod: draft.costBasisMethod,
          quotePollIntervalSeconds: draft.quotePollIntervalSeconds,
        },
        feeProfiles: draft.feeProfiles.map((profile) => {
          const payload = {
            name: profile.name,
            commissionRateBps: profile.commissionRateBps,
            commissionDiscountBps: profile.commissionDiscountBps,
            minCommissionNtd: profile.minCommissionNtd,
            commissionRoundingMode: profile.commissionRoundingMode,
            taxRoundingMode: profile.taxRoundingMode,
            stockSellTaxRateBps: profile.stockSellTaxRateBps,
            stockDayTradeTaxRateBps: profile.stockDayTradeTaxRateBps,
            etfSellTaxRateBps: profile.etfSellTaxRateBps,
            bondEtfSellTaxRateBps: profile.bondEtfSellTaxRateBps,
          };

          if (profile.id.startsWith("tmp-")) {
            return { ...payload, tempId: profile.id };
          }
          return { ...payload, id: profile.id };
        }),
        accounts: draft.accounts.map((account) => ({
          id: account.id,
          feeProfileRef: account.feeProfileId,
        })),
        feeProfileBindings: draft.feeProfileBindings.map((binding) => ({
          accountId: binding.accountId,
          symbol: binding.symbol,
          feeProfileRef: binding.feeProfileId,
        })),
      });

      await refresh();
      setDrawerOpen(false);
    } catch (error) {
      setSettingsError(String(error));
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <div className="min-h-screen">
      <TopBar
        userId={settings?.userId}
        onOpenSettings={() => setDrawerOpen(true)}
        productName={dict.topBar.productName}
        title={dict.topBar.title}
        titleTooltip={dict.topBar.titleTooltip}
        openSettingsLabel={dict.topBar.openSettingsLabel}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 rounded-2xl border border-line bg-surface px-5 py-4 shadow-card">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{dict.hero.eyebrow}</p>
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-3xl leading-none" data-testid="hero-title">
              {dict.hero.title}
            </h2>
            <TooltipInfo
              label={dict.hero.title}
              content={dict.tooltips.heroTitle}
              triggerTestId="tooltip-hero-title-trigger"
              contentTestId="tooltip-hero-title-content"
            />
          </div>
          <p className="mt-2 text-sm text-muted">{dict.hero.description}</p>
        </div>

        {globalError && (
          <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {dict.feedback.requestFailedPrefix}: {globalError}
          </p>
        )}

        {recomputeMessage && (
          <p
            className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            data-testid="recompute-status"
          >
            {recomputeMessage}
          </p>
        )}

        {isBootstrapping ? (
          <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">{dict.feedback.loadingDashboard}</p>
        ) : (
          <div className="stagger grid gap-6 md:grid-cols-2">
            <RecomputeCard settings={settings} pending={isRunningRecompute} onRecompute={handleRecompute} dict={dict} />
            <AddTransactionCard
              value={newTx}
              accountOptions={accounts.map((account) => ({ id: account.id, name: account.name }))}
              pending={isSubmittingTx}
              onChange={setNewTx}
              onSubmit={handleSubmitTransaction}
              dict={dict}
            />
            <div className="md:col-span-2">
              <HoldingsTable holdings={holdings} dict={dict} locale={locale} />
            </div>
          </div>
        )}
      </main>

      {integrityIssue && showIntegrityDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-5 shadow-2xl" data-testid="integrity-dialog">
            <div className="mb-3 flex items-start gap-2 text-rose-700">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="text-base font-semibold">{dict.dialogs.integrityTitle}</p>
                <p className="text-sm text-rose-600">{dict.dialogs.integrityDescription}</p>
              </div>
            </div>

            <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{integrityIssue.message}</p>

            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowIntegrityDialog(false)}>
                {dict.actions.dismiss}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowIntegrityDialog(false);
                  setDrawerOpen(true);
                }}
              >
                {dict.actions.openSettings}
              </Button>
            </div>
          </div>
        </div>
      )}

      <SettingsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        settings={settings}
        accounts={accounts}
        feeProfiles={profiles}
        feeProfileBindings={feeProfileBindings}
        isSaving={isSavingSettings}
        errorMessage={settingsError}
        onSave={handleSaveSettings}
        dict={dict}
      />
    </div>
  );
}
