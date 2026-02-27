"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AccountDto, FeeProfileBindingDto, FeeProfileDto, UserSettings } from "@tw-portfolio/shared-types";
import type { AppDictionary } from "../../lib/i18n";
import { Button } from "../ui/Button";
import { TooltipInfo } from "../ui/TooltipInfo";

export interface SettingsDraft {
  locale: UserSettings["locale"];
  costBasisMethod: UserSettings["costBasisMethod"];
  quotePollIntervalSeconds: number;
  feeProfiles: FeeProfileDto[];
  accounts: Array<{ id: string; feeProfileId: string }>;
  feeProfileBindings: FeeProfileBindingDto[];
}

type SettingsTab = "general" | "fees";

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: UserSettings | null;
  accounts: AccountDto[];
  feeProfiles: FeeProfileDto[];
  feeProfileBindings: FeeProfileBindingDto[];
  isSaving: boolean;
  errorMessage: string;
  onSave: (draft: SettingsDraft) => Promise<void>;
  dict: AppDictionary;
}

function cloneDraft(input: SettingsDraft): SettingsDraft {
  return {
    locale: input.locale,
    costBasisMethod: input.costBasisMethod,
    quotePollIntervalSeconds: input.quotePollIntervalSeconds,
    feeProfiles: input.feeProfiles.map((profile) => ({ ...profile })),
    accounts: input.accounts.map((account) => ({ ...account })),
    feeProfileBindings: input.feeProfileBindings.map((binding) => ({ ...binding })),
  };
}

function serializeDraft(input: SettingsDraft): string {
  const sortedProfiles = [...input.feeProfiles].sort((a, b) => a.id.localeCompare(b.id));
  const sortedAccounts = [...input.accounts].sort((a, b) => a.id.localeCompare(b.id));
  const sortedBindings = [...input.feeProfileBindings].sort((a, b) =>
    `${a.accountId}:${a.symbol}`.localeCompare(`${b.accountId}:${b.symbol}`),
  );

  return JSON.stringify({
    ...input,
    feeProfiles: sortedProfiles,
    accounts: sortedAccounts,
    feeProfileBindings: sortedBindings,
  });
}

function buildInitialDraft(
  settings: UserSettings,
  accounts: AccountDto[],
  feeProfiles: FeeProfileDto[],
  feeProfileBindings: FeeProfileBindingDto[],
): SettingsDraft {
  return {
    locale: settings.locale,
    costBasisMethod: settings.costBasisMethod,
    quotePollIntervalSeconds: settings.quotePollIntervalSeconds,
    feeProfiles: feeProfiles.map((profile) => ({ ...profile })),
    accounts: accounts.map((account) => ({ id: account.id, feeProfileId: account.feeProfileId })),
    feeProfileBindings: feeProfileBindings.map((binding) => ({
      accountId: binding.accountId,
      symbol: binding.symbol,
      feeProfileId: binding.feeProfileId,
    })),
  };
}

function createDraftProfile(seed: number): FeeProfileDto {
  return {
    id: `tmp-${seed}`,
    name: "New Fee Profile",
    commissionRateBps: 14,
    commissionDiscountBps: 10000,
    minCommissionNtd: 20,
    commissionRoundingMode: "FLOOR",
    taxRoundingMode: "FLOOR",
    stockSellTaxRateBps: 30,
    stockDayTradeTaxRateBps: 15,
    etfSellTaxRateBps: 10,
    bondEtfSellTaxRateBps: 0,
  };
}

export function SettingsDrawer({
  open,
  onOpenChange,
  settings,
  accounts,
  feeProfiles,
  feeProfileBindings,
  isSaving,
  errorMessage,
  onSave,
  dict,
}: SettingsDrawerProps) {
  const [tab, setTab] = useState<SettingsTab>("general");
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [baseline, setBaseline] = useState<SettingsDraft | null>(null);
  const [quotePollInterval, setQuotePollInterval] = useState("10");
  const [validationError, setValidationError] = useState("");
  const [discardNotice, setDiscardNotice] = useState("");
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  useEffect(() => {
    if (!open || !settings) return;

    const initial = buildInitialDraft(settings, accounts, feeProfiles, feeProfileBindings);
    setDraft(cloneDraft(initial));
    setBaseline(cloneDraft(initial));
    setQuotePollInterval(String(initial.quotePollIntervalSeconds));
    setValidationError("");
    setDiscardNotice("");
    setShowCloseWarning(false);
    setTab("general");
  }, [accounts, feeProfileBindings, feeProfiles, open, settings]);

  const isDirty = useMemo(() => {
    if (!draft || !baseline) return false;

    const withQuoteDraft = { ...draft, quotePollIntervalSeconds: Number(quotePollInterval) };
    return serializeDraft(withQuoteDraft) !== serializeDraft(baseline);
  }, [baseline, draft, quotePollInterval]);

  function resetToBaseline() {
    if (!baseline) return;
    setDraft(cloneDraft(baseline));
    setQuotePollInterval(String(baseline.quotePollIntervalSeconds));
    setValidationError("");
    setDiscardNotice(dict.settings.discardedNotice);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    if (isDirty) {
      setShowCloseWarning(true);
      return;
    }

    onOpenChange(false);
  }

  function updateProfileField<K extends keyof FeeProfileDto>(profileId: string, key: K, value: FeeProfileDto[K]) {
    if (!draft) return;
    setDraft({
      ...draft,
      feeProfiles: draft.feeProfiles.map((profile) => (profile.id === profileId ? { ...profile, [key]: value } : profile)),
    });
  }

  function updateAccountProfile(accountId: string, feeProfileId: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      accounts: draft.accounts.map((account) => (account.id === accountId ? { ...account, feeProfileId } : account)),
    });
  }

  function addBinding() {
    if (!draft || draft.accounts.length === 0 || draft.feeProfiles.length === 0) return;
    const defaultAccount = draft.accounts[0];
    const defaultProfile = draft.feeProfiles[0];

    setDraft({
      ...draft,
      feeProfileBindings: [
        ...draft.feeProfileBindings,
        {
          accountId: defaultAccount.id,
          symbol: "2330",
          feeProfileId: defaultProfile.id,
        },
      ],
    });
  }

  function updateBinding(index: number, patch: Partial<FeeProfileBindingDto>) {
    if (!draft) return;
    const nextBindings = [...draft.feeProfileBindings];
    nextBindings[index] = {
      ...nextBindings[index],
      ...patch,
    };

    setDraft({ ...draft, feeProfileBindings: nextBindings });
  }

  function removeBinding(index: number) {
    if (!draft) return;
    const nextBindings = draft.feeProfileBindings.filter((_, idx) => idx !== index);
    setDraft({ ...draft, feeProfileBindings: nextBindings });
  }

  function addProfile() {
    if (!draft) return;
    const next = createDraftProfile(Date.now());
    setDraft({
      ...draft,
      feeProfiles: [...draft.feeProfiles, next],
    });
  }

  function removeProfile(profileId: string) {
    if (!draft) return;
    if (draft.feeProfiles.length <= 1) {
      setValidationError(dict.settings.validationAtLeastOneProfile);
      return;
    }

    const remainingProfiles = draft.feeProfiles.filter((profile) => profile.id !== profileId);
    const fallbackProfile = remainingProfiles[0]?.id;

    setDraft({
      ...draft,
      feeProfiles: remainingProfiles,
      accounts: draft.accounts.map((account) => ({
        ...account,
        feeProfileId: account.feeProfileId === profileId ? fallbackProfile : account.feeProfileId,
      })),
      feeProfileBindings: draft.feeProfileBindings
        .filter((binding) => binding.feeProfileId !== profileId)
        .map((binding) => ({ ...binding })),
    });
  }

  function validateDraft(nextDraft: SettingsDraft, nextQuotePollInterval: string): string {
    const parsedQuotePoll = Number(nextQuotePollInterval);
    if (!Number.isInteger(parsedQuotePoll) || parsedQuotePoll <= 0) {
      return dict.settings.validationQuotePoll;
    }

    if (nextDraft.feeProfiles.length === 0) {
      return dict.settings.validationAtLeastOneProfile;
    }

    const ids = new Set(nextDraft.feeProfiles.map((profile) => profile.id));
    for (const profile of nextDraft.feeProfiles) {
      if (!profile.name.trim()) return dict.settings.validationProfileName;

      const numericValues = [
        profile.commissionRateBps,
        profile.commissionDiscountBps,
        profile.minCommissionNtd,
        profile.stockSellTaxRateBps,
        profile.stockDayTradeTaxRateBps,
        profile.etfSellTaxRateBps,
        profile.bondEtfSellTaxRateBps,
      ];

      if (numericValues.some((value) => !Number.isInteger(value) || value < 0)) {
        return dict.settings.validationProfileNumbers;
      }

      if (profile.commissionDiscountBps <= 0) {
        return dict.settings.validationDiscount;
      }
    }

    for (const account of nextDraft.accounts) {
      if (!ids.has(account.feeProfileId)) {
        return dict.settings.validationAccountProfile;
      }
    }

    for (const binding of nextDraft.feeProfileBindings) {
      if (!/^[A-Z0-9]{1,16}$/.test(binding.symbol)) {
        return dict.settings.validationBindingSymbol;
      }
      if (!nextDraft.accounts.some((account) => account.id === binding.accountId)) {
        return dict.settings.validationBindingAccount;
      }
      if (!ids.has(binding.feeProfileId)) {
        return dict.settings.validationBindingProfile;
      }
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const nextDraft: SettingsDraft = {
      ...draft,
      quotePollIntervalSeconds: Number(quotePollInterval),
      feeProfileBindings: draft.feeProfileBindings.map((binding) => ({
        ...binding,
        symbol: binding.symbol.trim().toUpperCase(),
      })),
    };

    const validation = validateDraft(nextDraft, quotePollInterval);
    if (validation) {
      setValidationError(validation);
      return;
    }

    setValidationError("");
    setDiscardNotice("");
    await onSave(nextDraft);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[#281f14]/35 backdrop-blur-sm data-[state=open]:animate-fade-in-up" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-line bg-surface p-4 shadow-2xl focus:outline-none sm:p-6"
          data-testid="settings-drawer"
        >
          <div className="mb-5 flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Dialog.Title className="text-2xl text-ink">{dict.settings.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">{dict.settings.description}</Dialog.Description>
            </div>
            <Button variant="ghost" size="sm" aria-label={dict.settings.closeDrawerAriaLabel} onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!draft ? (
            <p className="text-sm text-muted">{dict.feedback.loadingSettings}</p>
          ) : (
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="mb-4 flex gap-2">
                <Button
                  type="button"
                  variant={tab === "general" ? "default" : "secondary"}
                  onClick={() => setTab("general")}
                  data-testid="settings-tab-general"
                >
                  {dict.settings.tabGeneral}
                </Button>
                <Button
                  type="button"
                  variant={tab === "fees" ? "default" : "secondary"}
                  onClick={() => setTab("fees")}
                  data-testid="settings-tab-fees"
                >
                  {dict.settings.tabFeeProfiles}
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-5 overflow-y-auto pr-1" data-testid="settings-content-scroll">
                {tab === "general" && (
                  <>
                    <label className="block space-y-1">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        {dict.settings.localeLabel}
                        <TooltipInfo
                          label={dict.settings.localeLabel}
                          content={dict.tooltips.settingsLocale}
                          triggerTestId="tooltip-settings-locale-trigger"
                          contentTestId="tooltip-settings-locale-content"
                        />
                      </span>
                      <select
                        value={draft.locale}
                        onChange={(event) => setDraft({ ...draft, locale: event.target.value as UserSettings["locale"] })}
                        className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3 text-sm"
                        data-testid="settings-locale-select"
                      >
                        <option value="en">{dict.settings.localeOptionEnglish}</option>
                        <option value="zh-TW">{dict.settings.localeOptionTraditionalChinese}</option>
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        {dict.settings.costBasisLabel}
                        <TooltipInfo
                          label={dict.settings.costBasisLabel}
                          content={dict.tooltips.settingsCostBasis}
                          triggerTestId="tooltip-settings-cost-basis-trigger"
                          contentTestId="tooltip-settings-cost-basis-content"
                        />
                      </span>
                      <select
                        value={draft.costBasisMethod}
                        onChange={(event) =>
                          setDraft({ ...draft, costBasisMethod: event.target.value as UserSettings["costBasisMethod"] })
                        }
                        className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3 text-sm"
                        data-testid="settings-cost-basis-select"
                      >
                        <option value="FIFO">FIFO</option>
                        <option value="LIFO">LIFO</option>
                      </select>
                    </label>

                    <div className="grid gap-2 rounded-md border border-line bg-surface-soft p-3 text-xs text-muted">
                      <p className="font-semibold text-ink">{dict.settings.costBasisGuideTitle}</p>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">FIFO</span>
                        <TooltipInfo
                          label="FIFO"
                          content={dict.tooltips.fifoMethod}
                          triggerTestId="tooltip-fifo-trigger"
                          contentTestId="tooltip-fifo-content"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">LIFO</span>
                        <TooltipInfo
                          label="LIFO"
                          content={dict.tooltips.lifoMethod}
                          triggerTestId="tooltip-lifo-trigger"
                          contentTestId="tooltip-lifo-content"
                        />
                      </div>
                    </div>

                    <label className="block space-y-1">
                      <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        {dict.settings.quotePollLabel} ({dict.settings.quotePollUnit})
                        <TooltipInfo
                          label={dict.settings.quotePollLabel}
                          content={dict.tooltips.settingsQuotePoll}
                          triggerTestId="tooltip-settings-quote-poll-trigger"
                          contentTestId="tooltip-settings-quote-poll-content"
                        />
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={quotePollInterval}
                        onChange={(event) => setQuotePollInterval(event.target.value)}
                        className="h-10 w-full rounded-md border border-line bg-[#fffaf1] px-3 text-sm"
                        data-testid="settings-quote-poll-input"
                      />
                    </label>
                  </>
                )}

                {tab === "fees" && (
                  <>
                    <section className="space-y-3 rounded-xl border border-line bg-surface-soft p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg text-ink">{dict.settings.profileSectionTitle}</h3>
                          <p className="text-xs text-muted">{dict.settings.profileSectionDescription}</p>
                        </div>
                        <Button type="button" size="sm" onClick={addProfile} data-testid="settings-add-profile-button">
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {dict.actions.addProfile}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {draft.feeProfiles.map((profile, index) => (
                          <article key={profile.id} className="rounded-lg border border-line bg-surface p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-semibold text-ink">
                                {dict.settings.profileCardTitle} {index + 1}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProfile(profile.id)}
                                data-testid={`settings-remove-profile-${index}`}
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                {dict.actions.remove}
                              </Button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileNameLabel}
                                <input
                                  value={profile.name}
                                  onChange={(event) => updateProfileField(profile.id, "name", event.target.value)}
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileCommissionLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.commissionRateBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "commissionRateBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileDiscountLabel}
                                <input
                                  type="number"
                                  min={1}
                                  value={profile.commissionDiscountBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "commissionDiscountBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileMinCommissionLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.minCommissionNtd}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "minCommissionNtd", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileCommissionRoundLabel}
                                <select
                                  value={profile.commissionRoundingMode}
                                  onChange={(event) =>
                                    updateProfileField(
                                      profile.id,
                                      "commissionRoundingMode",
                                      event.target.value as FeeProfileDto["commissionRoundingMode"],
                                    )
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                >
                                  <option value="FLOOR">FLOOR</option>
                                  <option value="ROUND">ROUND</option>
                                  <option value="CEIL">CEIL</option>
                                </select>
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileTaxRoundLabel}
                                <select
                                  value={profile.taxRoundingMode}
                                  onChange={(event) =>
                                    updateProfileField(
                                      profile.id,
                                      "taxRoundingMode",
                                      event.target.value as FeeProfileDto["taxRoundingMode"],
                                    )
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                >
                                  <option value="FLOOR">FLOOR</option>
                                  <option value="ROUND">ROUND</option>
                                  <option value="CEIL">CEIL</option>
                                </select>
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileStockTaxLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.stockSellTaxRateBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "stockSellTaxRateBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileDayTradeTaxLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.stockDayTradeTaxRateBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "stockDayTradeTaxRateBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileEtfTaxLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.etfSellTaxRateBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "etfSellTaxRateBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>

                              <label className="space-y-1 text-xs text-muted">
                                {dict.settings.profileBondEtfTaxLabel}
                                <input
                                  type="number"
                                  min={0}
                                  value={profile.bondEtfSellTaxRateBps}
                                  onChange={(event) =>
                                    updateProfileField(profile.id, "bondEtfSellTaxRateBps", Number(event.target.value) || 0)
                                  }
                                  className="h-9 w-full rounded-md border border-line bg-[#fffaf1] px-2 text-sm text-ink"
                                />
                              </label>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="space-y-3 rounded-xl border border-line bg-surface-soft p-4">
                      <h3 className="text-lg text-ink">{dict.settings.accountFallbackSectionTitle}</h3>
                      <p className="text-xs text-muted">{dict.settings.accountFallbackSectionDescription}</p>

                      <div className="space-y-2">
                        {accounts.map((account) => {
                          const draftAccount = draft.accounts.find((item) => item.id === account.id);
                          return (
                            <div key={account.id} className="grid gap-2 rounded-md border border-line bg-surface p-2 text-sm md:grid-cols-[1fr_220px]">
                              <div>
                                <p className="font-medium text-ink">{account.name}</p>
                                <p className="text-xs text-muted">{account.id}</p>
                              </div>
                              <select
                                value={draftAccount?.feeProfileId ?? ""}
                                onChange={(event) => updateAccountProfile(account.id, event.target.value)}
                                className="h-9 rounded-md border border-line bg-[#fffaf1] px-2 text-sm"
                                data-testid={`settings-account-profile-${account.id}`}
                              >
                                {draft.feeProfiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="space-y-3 rounded-xl border border-line bg-surface-soft p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg text-ink">{dict.settings.bindingSectionTitle}</h3>
                          <p className="text-xs text-muted">{dict.settings.bindingSectionDescription}</p>
                        </div>
                        <Button type="button" size="sm" variant="secondary" onClick={addBinding} data-testid="settings-add-binding-button">
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          {dict.actions.addOverride}
                        </Button>
                      </div>

                      {draft.feeProfileBindings.length === 0 ? (
                        <p className="rounded-md border border-dashed border-line bg-surface px-3 py-2 text-xs text-muted">
                          {dict.settings.bindingEmptyState}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {draft.feeProfileBindings.map((binding, idx) => (
                            <div key={`${binding.accountId}-${binding.symbol}-${idx}`} className="grid gap-2 rounded-md border border-line bg-surface p-2 md:grid-cols-[1fr_120px_1fr_auto]">
                              <select
                                value={binding.accountId}
                                onChange={(event) => updateBinding(idx, { accountId: event.target.value })}
                                className="h-9 rounded-md border border-line bg-[#fffaf1] px-2 text-sm"
                              >
                                {accounts.map((account) => (
                                  <option key={account.id} value={account.id}>
                                    {account.name} ({account.id})
                                  </option>
                                ))}
                              </select>

                              <input
                                value={binding.symbol}
                                onChange={(event) => updateBinding(idx, { symbol: event.target.value.toUpperCase() })}
                                className="h-9 rounded-md border border-line bg-[#fffaf1] px-2 text-sm"
                                maxLength={16}
                                placeholder="2330"
                              />

                              <select
                                value={binding.feeProfileId}
                                onChange={(event) => updateBinding(idx, { feeProfileId: event.target.value })}
                                className="h-9 rounded-md border border-line bg-[#fffaf1] px-2 text-sm"
                              >
                                {draft.feeProfiles.map((profile) => (
                                  <option key={profile.id} value={profile.id}>
                                    {profile.name}
                                  </option>
                                ))}
                              </select>

                              <Button type="button" variant="ghost" size="sm" onClick={() => removeBinding(idx)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                )}
                </div>
              </div>

              <div className="mt-4 shrink-0 space-y-3 border-t border-line pt-4">
                {showCloseWarning && (
                  <div
                    className="rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900"
                    data-testid="settings-close-warning"
                  >
                    <div className="mb-2 flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <p>{dict.settings.closeWarning}</p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowCloseWarning(false)}>
                        {dict.actions.keepEditing}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCloseWarning(false);
                          onOpenChange(false);
                        }}
                      >
                        {dict.actions.closeWithoutSaving}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="rounded-md border border-line bg-surface-soft px-3 py-2 text-xs text-muted">{dict.settings.discardHint}</p>

                {discardNotice && (
                  <p
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                    data-testid="settings-discard-notice"
                  >
                    {discardNotice}
                  </p>
                )}

                {(validationError || errorMessage) && (
                  <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {validationError || errorMessage}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSaving || !isDirty}
                    onClick={resetToBaseline}
                    data-testid="settings-discard-button"
                  >
                    {dict.actions.discardChanges}
                  </Button>
                  <Button type="button" variant="secondary" disabled={isSaving} onClick={() => handleOpenChange(false)}>
                    {dict.actions.cancel}
                  </Button>
                  <Button type="submit" disabled={isSaving || !isDirty} data-testid="settings-save-button">
                    {isSaving ? dict.actions.savingSettings : dict.actions.saveSettings}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
