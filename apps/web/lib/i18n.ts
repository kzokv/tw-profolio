import type { LocaleCode } from "@tw-portfolio/shared-types";

export interface AppDictionary {
  topBar: {
    productName: string;
    title: string;
    titleTooltip: string;
    openSettingsLabel: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    titleTooltip: string;
    description: string;
  };
  feedback: {
    requestFailedPrefix: string;
    loadingDashboard: string;
    loadingSettings: string;
    noAccounts: string;
  };
  actions: {
    recomputeHistory: string;
    recomputing: string;
    submitTransaction: string;
    submitting: string;
    saveSettings: string;
    savingSettings: string;
    cancel: string;
    discardChanges: string;
    addProfile: string;
    addOverride: string;
    remove: string;
    keepEditing: string;
    closeWithoutSaving: string;
    openSettings: string;
    dismiss: string;
  };
  settings: {
    title: string;
    description: string;
    tabGeneral: string;
    tabFeeProfiles: string;
    localeLabel: string;
    costBasisLabel: string;
    quotePollLabel: string;
    localeOptionEnglish: string;
    localeOptionTraditionalChinese: string;
    quotePollUnit: string;
    validationQuotePoll: string;
    validationAtLeastOneProfile: string;
    validationProfileName: string;
    validationProfileNumbers: string;
    validationDiscount: string;
    validationAccountProfile: string;
    validationBindingSymbol: string;
    validationBindingAccount: string;
    validationBindingProfile: string;
    discardHint: string;
    discardedNotice: string;
    closeDrawerAriaLabel: string;
    costBasisGuideTitle: string;
    profileSectionTitle: string;
    profileSectionDescription: string;
    profileCardTitle: string;
    profileNameLabel: string;
    profileCommissionLabel: string;
    profileDiscountLabel: string;
    profileMinCommissionLabel: string;
    profileCommissionRoundLabel: string;
    profileTaxRoundLabel: string;
    profileStockTaxLabel: string;
    profileDayTradeTaxLabel: string;
    profileEtfTaxLabel: string;
    profileBondEtfTaxLabel: string;
    accountFallbackSectionTitle: string;
    accountFallbackSectionDescription: string;
    bindingSectionTitle: string;
    bindingSectionDescription: string;
    bindingEmptyState: string;
    closeWarning: string;
  };
  recompute: {
    title: string;
    description: string;
    localeTerm: string;
    costBasisTerm: string;
    quotePollTerm: string;
    fallbackConfirm: string;
  };
  transactions: {
    title: string;
    description: string;
    accountTerm: string;
    typeTerm: string;
    symbolTerm: string;
    quantityTerm: string;
    priceTerm: string;
    tradeDateTerm: string;
    dayTradeTerm: string;
    typeBuy: string;
    typeSell: string;
    dayTradeYes: string;
    dayTradeNo: string;
  };
  holdings: {
    title: string;
    description: string;
    entries: (count: number) => string;
    accountTerm: string;
    symbolTerm: string;
    quantityTerm: string;
    totalCostTerm: string;
  };
  feeProfiles: {
    title: string;
    description: string;
    idTerm: string;
    nameTerm: string;
    commissionBpsTerm: string;
    taxModeTerm: string;
  };
  dialogs: {
    integrityTitle: string;
    integrityDescription: string;
  };
  tooltips: {
    appTitle: string;
    heroTitle: string;
    settingsLocale: string;
    settingsCostBasis: string;
    settingsQuotePoll: string;
    fifoMethod: string;
    lifoMethod: string;
    recomputeTitle: string;
    recomputeLocale: string;
    recomputeCostBasis: string;
    recomputeQuotePoll: string;
    txAccount: string;
    txType: string;
    txSymbol: string;
    txQuantity: string;
    txPrice: string;
    txTradeDate: string;
    txDayTrade: string;
    holdingsAccount: string;
    holdingsSymbol: string;
    holdingsQuantity: string;
    holdingsTotalCost: string;
    feeProfileId: string;
    feeProfileName: string;
    feeProfileCommission: string;
    feeProfileTaxMode: string;
  };
}

function mapRecomputeStatus(locale: LocaleCode, status: string): string {
  const normalized = status.toUpperCase();
  if (locale === "zh-TW") {
    const map: Record<string, string> = {
      CONFIRMED: "已確認",
      PREVIEWED: "已預覽",
      APPLIED: "已套用",
      FAILED: "失敗",
    };
    return map[normalized] ?? status;
  }
  return status;
}

export function formatRecomputeMessage(locale: LocaleCode, status: string, itemsCount: number): string {
  const localizedStatus = mapRecomputeStatus(locale, status);
  if (locale === "zh-TW") {
    return `重算${localizedStatus}，共 ${itemsCount} 筆項目`;
  }
  return `Recompute ${localizedStatus}, items: ${itemsCount}`;
}

const en: AppDictionary = {
  topBar: {
    productName: "Taiwan Portfolio",
    title: "Market Ledger",
    titleTooltip: "Central workspace for portfolio state, trade history, and settings.",
    openSettingsLabel: "Open settings drawer",
  },
  hero: {
    eyebrow: "Operational Snapshot",
    title: "Taiwan Portfolio Control Room",
    titleTooltip: "Live command center for trades, holdings, and fee/tax settings.",
    description: "Manage trades, audit holdings, and tune settings from one streamlined workspace.",
  },
  feedback: {
    requestFailedPrefix: "Request failed",
    loadingDashboard: "Loading dashboard...",
    loadingSettings: "Loading settings...",
    noAccounts: "No account is available. Open settings to bind an account profile first.",
  },
  actions: {
    recomputeHistory: "Recompute History",
    recomputing: "Recomputing...",
    submitTransaction: "Submit Transaction",
    submitting: "Submitting...",
    saveSettings: "Save Settings",
    savingSettings: "Saving...",
    cancel: "Cancel",
    discardChanges: "Discard Changes",
    addProfile: "Add Profile",
    addOverride: "Add Override",
    remove: "Remove",
    keepEditing: "Keep Editing",
    closeWithoutSaving: "Close Without Saving",
    openSettings: "Open Settings",
    dismiss: "Dismiss",
  },
  settings: {
    title: "Settings",
    description: "Manage locale, cost basis, and fee profile strategy in one place.",
    tabGeneral: "General",
    tabFeeProfiles: "Fee Profiles",
    localeLabel: "Locale",
    costBasisLabel: "Cost Basis",
    quotePollLabel: "Quote Poll Interval",
    localeOptionEnglish: "English",
    localeOptionTraditionalChinese: "Traditional Chinese",
    quotePollUnit: "sec",
    validationQuotePoll: "Quote poll interval must be a positive integer.",
    validationAtLeastOneProfile: "At least one fee profile is required.",
    validationProfileName: "Each fee profile needs a name.",
    validationProfileNumbers: "Fee profile number fields must be non-negative integers.",
    validationDiscount: "Commission discount bps must be greater than zero.",
    validationAccountProfile: "Each account must bind to a valid fallback fee profile.",
    validationBindingSymbol: "Override symbol must be 1-16 uppercase letters or numbers.",
    validationBindingAccount: "Override entry references an unknown account.",
    validationBindingProfile: "Override entry references an unknown fee profile.",
    discardHint: "Unsaved edits can be reverted with Discard Changes.",
    discardedNotice: "Unsaved changes were discarded.",
    closeDrawerAriaLabel: "Close settings drawer",
    costBasisGuideTitle: "FIFO / LIFO details",
    profileSectionTitle: "Fee Profile Library",
    profileSectionDescription: "Create and tune multiple fee profiles. System IDs are generated automatically.",
    profileCardTitle: "Profile",
    profileNameLabel: "Name",
    profileCommissionLabel: "Commission Bps",
    profileDiscountLabel: "Discount Bps",
    profileMinCommissionLabel: "Min Commission (NTD)",
    profileCommissionRoundLabel: "Commission Rounding",
    profileTaxRoundLabel: "Tax Rounding",
    profileStockTaxLabel: "Stock Sell Tax Bps",
    profileDayTradeTaxLabel: "Day Trade Tax Bps",
    profileEtfTaxLabel: "ETF Sell Tax Bps",
    profileBondEtfTaxLabel: "Bond ETF Tax Bps",
    accountFallbackSectionTitle: "Account Fallback Profile",
    accountFallbackSectionDescription: "Each account must have a default profile used when no symbol override exists.",
    bindingSectionTitle: "Per-Security Overrides",
    bindingSectionDescription: "Route a specific symbol to a different profile. Otherwise fallback profile is used.",
    bindingEmptyState: "No overrides configured. Account fallback profile will be applied automatically.",
    closeWarning: "You have unsaved changes. Closing now will discard your edits.",
  },
  recompute: {
    title: "Portfolio Engine",
    description: "Run historical recomputation after rule changes or profile updates.",
    localeTerm: "Locale",
    costBasisTerm: "Cost Basis",
    quotePollTerm: "Quote Poll",
    fallbackConfirm:
      "Recompute now using per-security overrides first, then each account fallback profile for unmatched symbols?",
  },
  transactions: {
    title: "Record Transaction",
    description: "Enter trade details and append to your historical ledger.",
    accountTerm: "Account",
    typeTerm: "Type",
    symbolTerm: "Symbol",
    quantityTerm: "Quantity",
    priceTerm: "Price (NTD)",
    tradeDateTerm: "Trade Date",
    dayTradeTerm: "Day Trade",
    typeBuy: "BUY",
    typeSell: "SELL",
    dayTradeYes: "Yes",
    dayTradeNo: "No",
  },
  holdings: {
    title: "Holdings",
    description: "Aggregated quantity and total cost by account and symbol.",
    entries: (count) => `${count} entries`,
    accountTerm: "Account",
    symbolTerm: "Symbol",
    quantityTerm: "Quantity",
    totalCostTerm: "Total Cost",
  },
  feeProfiles: {
    title: "Fee Profiles",
    description: "Reference fee/tax configurations attached to broker accounts.",
    idTerm: "ID",
    nameTerm: "Name",
    commissionBpsTerm: "Commission Bps",
    taxModeTerm: "Tax Mode",
  },
  dialogs: {
    integrityTitle: "Configuration Issue Detected",
    integrityDescription: "One or more accounts are missing valid fee profile bindings.",
  },
  tooltips: {
    appTitle: "Use the avatar in the top-right to open settings drawer.",
    heroTitle: "Overview panel showing current actions and configuration context.",
    settingsLocale: "Switches all UI wording between English and Traditional Chinese.",
    settingsCostBasis:
      "Defines lot matching order for realized PnL and cost tracking. See FIFO/LIFO detail cards below.",
    settingsQuotePoll: "How frequently quote data is refreshed from providers.",
    fifoMethod:
      "FIFO (First In, First Out): when you sell, the oldest purchased lots are matched first. Useful for long-held lots and tax lots ordered by time.",
    lifoMethod:
      "LIFO (Last In, First Out): when you sell, the newest purchased lots are matched first. Useful for stress testing recent-position cost behavior.",
    recomputeTitle: "Reapplies portfolio calculations to historical transactions.",
    recomputeLocale: "Current UI language loaded from saved settings.",
    recomputeCostBasis: "Current lot matching method used for PnL and holdings.",
    recomputeQuotePoll: "Current quote polling frequency in seconds.",
    txAccount: "Broker account where this transaction should be recorded.",
    txType: "BUY increases lots; SELL reduces lots and realizes PnL.",
    txSymbol: "Taiwan stock or ETF ticker, for example 2330 or 0050.",
    txQuantity: "Share count for the trade; must be a positive integer.",
    txPrice: "Execution price per share in New Taiwan Dollar.",
    txTradeDate: "Trade settlement date used in portfolio history ordering.",
    txDayTrade: "Enable if buy and sell happen within the same day for tax rules.",
    holdingsAccount: "Broker account identifier where holdings are tracked.",
    holdingsSymbol: "Instrument ticker currently held in the account.",
    holdingsQuantity: "Open position size after historical transactions.",
    holdingsTotalCost: "Accumulated cost basis for remaining open quantity.",
    feeProfileId: "Stable profile ID referenced by accounts.",
    feeProfileName: "Human-readable broker fee profile name.",
    feeProfileCommission: "Commission rate in basis points before discounts/minimum.",
    feeProfileTaxMode: "Rounding strategy used when calculating taxes.",
  },
};

const zhTw: AppDictionary = {
  topBar: {
    productName: "台灣投資組合",
    title: "市場帳本",
    titleTooltip: "投資組合狀態、交易紀錄與設定的集中工作區。",
    openSettingsLabel: "開啟設定抽屜",
  },
  hero: {
    eyebrow: "營運概覽",
    title: "台灣投資組合控制台",
    titleTooltip: "交易、持倉與費稅設定的即時控制中心。",
    description: "在同一個工作區中管理交易、檢視持倉並調整設定。",
  },
  feedback: {
    requestFailedPrefix: "請求失敗",
    loadingDashboard: "儀表板載入中...",
    loadingSettings: "設定載入中...",
    noAccounts: "目前沒有可用帳戶，請先在設定中綁定帳戶預設費率。",
  },
  actions: {
    recomputeHistory: "重算歷史",
    recomputing: "重算中...",
    submitTransaction: "送出交易",
    submitting: "送出中...",
    saveSettings: "儲存設定",
    savingSettings: "儲存中...",
    cancel: "取消",
    discardChanges: "捨棄變更",
    addProfile: "新增設定檔",
    addOverride: "新增覆寫",
    remove: "移除",
    keepEditing: "繼續編輯",
    closeWithoutSaving: "直接關閉",
    openSettings: "開啟設定",
    dismiss: "關閉提示",
  },
  settings: {
    title: "設定",
    description: "在同一頁管理語系、成本法與費率策略。",
    tabGeneral: "一般",
    tabFeeProfiles: "費率設定",
    localeLabel: "語系",
    costBasisLabel: "成本計算",
    quotePollLabel: "報價更新間隔",
    localeOptionEnglish: "英文",
    localeOptionTraditionalChinese: "繁體中文",
    quotePollUnit: "秒",
    validationQuotePoll: "報價更新間隔必須為正整數。",
    validationAtLeastOneProfile: "至少需要保留一個費率設定檔。",
    validationProfileName: "每個費率設定檔都需要名稱。",
    validationProfileNumbers: "費率設定檔數值欄位必須是非負整數。",
    validationDiscount: "手續費折扣基點必須大於 0。",
    validationAccountProfile: "每個帳戶都必須綁定有效的預設備率設定檔。",
    validationBindingSymbol: "覆寫代號必須為 1-16 碼英數大寫。",
    validationBindingAccount: "覆寫資料包含不存在的帳戶。",
    validationBindingProfile: "覆寫資料包含不存在的費率設定檔。",
    discardHint: "若尚未儲存，可使用「捨棄變更」還原。",
    discardedNotice: "已捨棄未儲存的變更。",
    closeDrawerAriaLabel: "關閉設定抽屜",
    costBasisGuideTitle: "FIFO / LIFO 詳細說明",
    profileSectionTitle: "費率設定檔庫",
    profileSectionDescription: "可建立多個費率設定檔並調整細節。系統會自動產生 ID。",
    profileCardTitle: "設定檔",
    profileNameLabel: "名稱",
    profileCommissionLabel: "手續費基點",
    profileDiscountLabel: "折扣基點",
    profileMinCommissionLabel: "最低手續費（新台幣）",
    profileCommissionRoundLabel: "手續費進位",
    profileTaxRoundLabel: "稅額進位",
    profileStockTaxLabel: "股票賣出稅基點",
    profileDayTradeTaxLabel: "當沖稅基點",
    profileEtfTaxLabel: "ETF 賣出稅基點",
    profileBondEtfTaxLabel: "債券 ETF 稅基點",
    accountFallbackSectionTitle: "帳戶預設費率",
    accountFallbackSectionDescription: "每個帳戶都需指定預設費率，當代號未覆寫時會自動套用。",
    bindingSectionTitle: "單一證券覆寫",
    bindingSectionDescription: "可將特定代號改用其他費率；未覆寫時會回退到帳戶預設費率。",
    bindingEmptyState: "目前沒有覆寫設定，系統將自動使用帳戶預設費率。",
    closeWarning: "你有尚未儲存的變更，現在關閉會捨棄這些內容。",
  },
  recompute: {
    title: "投資組合引擎",
    description: "規則或費率調整後，可重新計算歷史結果。",
    localeTerm: "語系",
    costBasisTerm: "成本計算",
    quotePollTerm: "報價更新",
    fallbackConfirm: "是否立即重算？系統會先套用代號覆寫，找不到時再使用帳戶預設費率。",
  },
  transactions: {
    title: "新增交易",
    description: "輸入交易資訊並寫入歷史帳本。",
    accountTerm: "帳戶",
    typeTerm: "交易類型",
    symbolTerm: "代號",
    quantityTerm: "股數",
    priceTerm: "成交價（新台幣）",
    tradeDateTerm: "交易日期",
    dayTradeTerm: "當沖",
    typeBuy: "買進",
    typeSell: "賣出",
    dayTradeYes: "是",
    dayTradeNo: "否",
  },
  holdings: {
    title: "持倉",
    description: "依帳戶與代號彙整持股數量與總成本。",
    entries: (count) => `${count} 筆`,
    accountTerm: "帳戶",
    symbolTerm: "代號",
    quantityTerm: "股數",
    totalCostTerm: "總成本",
  },
  feeProfiles: {
    title: "費率設定檔",
    description: "檢視各券商帳戶套用的手續費與稅率規則。",
    idTerm: "編號",
    nameTerm: "名稱",
    commissionBpsTerm: "手續費基點",
    taxModeTerm: "稅額進位",
  },
  dialogs: {
    integrityTitle: "偵測到設定異常",
    integrityDescription: "有帳戶缺少有效費率設定綁定，請先修正後再進行交易。",
  },
  tooltips: {
    appTitle: "點右上角頭像可開啟設定抽屜。",
    heroTitle: "顯示目前操作與設定狀態的總覽區塊。",
    settingsLocale: "切換整個介面的語言（英文 / 繁體中文）。",
    settingsCostBasis: "決定庫存配對順序，會直接影響已實現損益與持倉成本。",
    settingsQuotePoll: "控制向報價來源抓取最新價格的頻率。",
    fifoMethod:
      "FIFO（先進先出）：賣出時先配對最早買入的庫存。通常反映較長持有部位，對歷史成本追蹤最直覺。",
    lifoMethod:
      "LIFO（後進先出）：賣出時先配對最新買入的庫存。適合分析近期加碼部位對損益與成本的影響。",
    recomputeTitle: "對歷史交易重新套用計算規則並回寫結果。",
    recomputeLocale: "目前介面語系，來自已儲存設定。",
    recomputeCostBasis: "目前使用的庫存配對方法。",
    recomputeQuotePoll: "目前報價更新頻率（秒）。",
    txAccount: "本筆交易將寫入的券商帳戶。",
    txType: "買進會增加庫存，賣出會減少庫存並計算已實現損益。",
    txSymbol: "台股或 ETF 代號，例如 2330、0050。",
    txQuantity: "本次交易的股數，需為正整數。",
    txPrice: "每股成交價格，單位為新台幣。",
    txTradeDate: "用於排序歷史與重算的交易日期。",
    txDayTrade: "若同日買賣請開啟，會套用當沖相關稅率。",
    holdingsAccount: "持倉所屬的券商帳戶識別碼。",
    holdingsSymbol: "目前仍持有部位的商品代號。",
    holdingsQuantity: "歷史交易後尚未平倉的數量。",
    holdingsTotalCost: "未平倉數量對應的總成本基礎。",
    feeProfileId: "供帳戶引用的固定費率設定檔編號。",
    feeProfileName: "費率設定檔的人類可讀名稱。",
    feeProfileCommission: "手續費率（基點），套用折扣與最低手續費前的基準值。",
    feeProfileTaxMode: "計算稅額時採用的進位/捨去規則。",
  },
};

export function getDictionary(locale: LocaleCode): AppDictionary {
  return locale === "zh-TW" ? zhTw : en;
}
