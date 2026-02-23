import { TooltipInfo } from "../ui/TooltipInfo";
import { UserAvatarButton } from "../profile/UserAvatarButton";

interface TopBarProps {
  userId?: string;
  onOpenSettings: () => void;
  productName: string;
  title: string;
  titleTooltip: string;
  openSettingsLabel: string;
}

export function TopBar({
  userId,
  onOpenSettings,
  productName,
  title,
  titleTooltip,
  openSettingsLabel,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-line/80 bg-[#f8f1e5]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted">{productName}</p>
          <div className="mt-1 flex items-center gap-2">
            <h1 className="text-2xl leading-none text-ink md:text-3xl" data-testid="topbar-title">
              {title}
            </h1>
            <TooltipInfo
              label={title}
              content={titleTooltip}
              triggerTestId="tooltip-app-title-trigger"
              contentTestId="tooltip-app-title-content"
            />
          </div>
        </div>
        <UserAvatarButton userId={userId} onOpenSettings={onOpenSettings} openSettingsLabel={openSettingsLabel} />
      </div>
    </header>
  );
}
