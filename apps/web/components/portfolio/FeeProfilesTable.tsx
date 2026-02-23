import type { FeeProfileDto } from "@tw-portfolio/shared-types";
import type { AppDictionary } from "../../lib/i18n";
import { TooltipInfo } from "../ui/TooltipInfo";
import { Card } from "../ui/Card";

interface FeeProfilesTableProps {
  profiles: FeeProfileDto[];
  dict: AppDictionary;
}

export function FeeProfilesTable({ profiles, dict }: FeeProfilesTableProps) {
  return (
    <Card className="animate-fade-in-up overflow-hidden">
      <div className="mb-4">
        <h2 className="text-2xl">{dict.feeProfiles.title}</h2>
        <p className="mt-1 text-sm text-muted">{dict.feeProfiles.description}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface-soft text-xs tracking-[0.08em] text-muted">
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.feeProfiles.idTerm}
                  <TooltipInfo
                    label={dict.feeProfiles.idTerm}
                    content={dict.tooltips.feeProfileId}
                    triggerTestId="tooltip-fee-id-trigger"
                    contentTestId="tooltip-fee-id-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.feeProfiles.nameTerm}
                  <TooltipInfo
                    label={dict.feeProfiles.nameTerm}
                    content={dict.tooltips.feeProfileName}
                    triggerTestId="tooltip-fee-name-trigger"
                    contentTestId="tooltip-fee-name-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.feeProfiles.commissionBpsTerm}
                  <TooltipInfo
                    label={dict.feeProfiles.commissionBpsTerm}
                    content={dict.tooltips.feeProfileCommission}
                    triggerTestId="tooltip-fee-commission-trigger"
                    contentTestId="tooltip-fee-commission-content"
                  />
                </span>
              </th>
              <th className="px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-1">
                  {dict.feeProfiles.taxModeTerm}
                  <TooltipInfo
                    label={dict.feeProfiles.taxModeTerm}
                    content={dict.tooltips.feeProfileTaxMode}
                    triggerTestId="tooltip-fee-tax-mode-trigger"
                    contentTestId="tooltip-fee-tax-mode-content"
                  />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{profile.id}</td>
                <td className="px-3 py-2">{profile.name}</td>
                <td className="px-3 py-2">{profile.commissionRateBps}</td>
                <td className="px-3 py-2">{profile.taxRoundingMode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
