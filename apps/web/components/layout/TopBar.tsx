import { TooltipInfo } from "../ui/TooltipInfo";
import { UserAvatarButton } from "../profile/UserAvatarButton";

interface TopBarProps {
  userId?: string;
  onOpenSettings: () => void;
  productName: string;
  title: string;
  titleTooltip: string;
  openSettingsLabel: string;
  /** When true, show skeleton (title area + avatar + pill). Used on first visit only; background refresh keeps static content. */
  skeleton?: boolean;
}

export function TopBar({
  userId,
  onOpenSettings,
  productName,
  title,
  titleTooltip,
  openSettingsLabel,
  skeleton = false,
}: TopBarProps) {
  if (skeleton) {
    return (
      <header className="sticky top-0 z-10 border-b border-line/80 bg-surface-soft/90 backdrop-blur" aria-hidden="true" role="banner">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div>
            <div className="skeleton-line h-3 w-24 rounded" />
            <div className="skeleton-line skeleton-line--delay mt-2 h-8 w-48 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton-line h-11 w-11 shrink-0 rounded-full" />
            <div className="skeleton-line h-10 w-24 rounded-lg" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-10 border-b border-line/80 bg-surface-soft/90 backdrop-blur" role="banner">
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
