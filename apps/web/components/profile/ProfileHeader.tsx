import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  firstWorkoutDate: string | null;
}

export function ProfileHeader({
  displayName,
  email,
  avatarUrl,
  firstWorkoutDate,
}: Props) {
  const initials = (displayName ?? email).charAt(0).toUpperCase();

  const trainingSince = firstWorkoutDate
    ? `Training since ${new Date(firstWorkoutDate + "T00:00:00").toLocaleString(
        "en-US",
        { month: "short", year: "numeric" },
      )}`
    : "No workouts logged yet.";

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-14 w-14 ring-1 ring-[#30363d] shrink-0">
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={displayName ?? email} />
        )}
        <AvatarFallback className="bg-[#161b22] text-[#e6edf3] font-mono text-lg">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-base font-semibold text-[#e6edf3] truncate">
          {displayName ?? email.split("@")[0]}
        </p>
        <p className="text-sm text-[#8b949e] truncate">{email}</p>
        <p className="font-mono text-xs text-[#8b949e] mt-0.5">
          {trainingSince}
        </p>
      </div>
    </div>
  );
}
