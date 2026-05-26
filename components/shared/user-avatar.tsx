"use client";

import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createDiceBearDataUri } from "@/lib/avatar/dicebear";
import { resolveAvatarSeed } from "@/lib/avatar/seed";
import { cn, getInitialsFromName } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 text-[10px]",
  md: "size-10 text-[10px]",
  lg: "size-12 text-xs",
} as const;

export type UserAvatarProps = {
  profileId?: number;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
};

export function UserAvatar({
  profileId,
  name,
  imageUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const seed = useMemo(
    () => resolveAvatarSeed(profileId, name),
    [profileId, name],
  );

  const diceBearSrc = useMemo(() => {
    try {
      return createDiceBearDataUri(seed);
    } catch {
      return null;
    }
  }, [seed]);

  const showUploaded = Boolean(imageUrl) && failedSrc !== imageUrl;
  const showDiceBear =
    !showUploaded && Boolean(diceBearSrc) && failedSrc !== diceBearSrc;
  const imageSrc = showUploaded ? imageUrl! : showDiceBear ? diceBearSrc! : null;
  const initials = getInitialsFromName(name);
  const alt = name?.trim() || "User avatar";

  return (
    <Avatar
      className={cn(
        "shrink-0 overflow-hidden rounded-lg border-2 border-border",
        sizeClasses[size],
        className,
      )}
    >
      {imageSrc ? (
        <AvatarImage
          src={imageSrc}
          alt={alt}
          onError={() => setFailedSrc(imageSrc)}
        />
      ) : null}
      <AvatarFallback className="rounded-lg bg-secondary-background font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
