import { UserCircle2 } from "lucide-react";
import { Button } from "../ui/Button";

const AVATAR_COLORS = [
  "#2A6F97",
  "#9D4EDD",
  "#386641",
  "#9C6644",
  "#3A86FF",
  "#D35400",
  "#0E9F6E",
  "#8A1538",
];

function deriveAvatar(userId: string | undefined) {
  if (!userId) {
    return { initials: "U", color: AVATAR_COLORS[0] };
  }

  const cleaned = userId.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
  const segments = cleaned.split(/[\s_-]+/).filter(Boolean);

  let initials = "U";
  if (segments.length >= 2) {
    initials = `${segments[0][0]}${segments[1][0]}`.toUpperCase();
  } else if (segments.length === 1) {
    initials = segments[0].slice(0, 2).toUpperCase();
  }

  const hash = cleaned.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return { initials, color };
}

interface UserAvatarButtonProps {
  userId?: string;
  onOpenSettings: () => void;
  openSettingsLabel: string;
}

export function UserAvatarButton({ userId, onOpenSettings, openSettingsLabel }: UserAvatarButtonProps) {
  const avatar = deriveAvatar(userId);

  return (
    <Button
      variant="ghost"
      className="h-11 w-11 rounded-full border border-line p-0"
      onClick={onOpenSettings}
      aria-label={openSettingsLabel}
      data-testid="avatar-button"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: avatar.color }}
        aria-hidden="true"
      >
        {avatar.initials || <UserCircle2 className="h-4 w-4" />}
      </span>
    </Button>
  );
}
