"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  resetAvatar,
  updateDiceBearAvatar,
  updateUploadedAvatar,
} from "@/app/account/actions";
import {
  DICEBEAR_COLLECTIONS,
  DEFAULT_DICEBEAR_COLLECTION_ID,
  createDiceBearDataUri,
} from "@/lib/avatar/dicebear";
import { getProfileAvatarSeed } from "@/lib/avatar/seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

type AvatarSettingsProps = {
  profileId: number;
  name: string;
  email: string;
  imageUrl?: string | null;
};

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read this image."));
    };
    reader.onerror = () => reject(new Error("Could not read this image."));
    reader.readAsDataURL(file);
  });
}

export function AvatarSettings({
  profileId,
  name,
  email,
  imageUrl,
}: AvatarSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(
    DEFAULT_DICEBEAR_COLLECTION_ID,
  );
  const [isPending, startTransition] = useTransition();
  const seed = getProfileAvatarSeed(profileId);
  const selectedPreview = useMemo(
    () => createDiceBearDataUri(seed, selectedCollectionId),
    [seed, selectedCollectionId],
  );

  function handleDiceBearSave(collectionId = selectedCollectionId) {
    startTransition(async () => {
      const result = await updateDiceBearAvatar({ collectionId });

      if (result.success) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  async function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.type.match(/^image\/(png|jpe?g|webp|gif)$/)) {
      toast.error("Upload a PNG, JPG, WebP, or GIF image.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Avatar upload must be 5 MB or smaller.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);

      startTransition(async () => {
        const result = await updateUploadedAvatar({ dataUrl });

        if (result.success) {
          toast.success(result.message);
          router.refresh();
          return;
        }

        toast.error(result.message);
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not read this image.",
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetAvatar();

      if (result.success) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="size-5" />
          Profile Avatar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <UserAvatar
            profileId={profileId}
            name={name}
            email={email}
            imageUrl={imageUrl}
            size="lg"
            className="size-16"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{name}</p>
            <p className="break-words text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="neutral"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <ImageUp className="size-4" />
              Upload
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => handleUpload(event.target.files?.[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-1">
            <Label>DiceBear collections</Label>
            <p className="text-xs text-muted-foreground">
              Choose one collection, then save it as your active avatar.
            </p>
          </div>
          <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border-2 border-border bg-background p-2 sm:grid-cols-2 lg:grid-cols-3">
            {DICEBEAR_COLLECTIONS.map((collection) => {
              const preview = createDiceBearDataUri(seed, collection.id);
              const isSelected = selectedCollectionId === collection.id;

              return (
                <button
                  key={collection.id}
                  type="button"
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg border-2 bg-card p-2 text-left text-xs transition-colors hover:bg-muted",
                    isSelected
                      ? "border-primary shadow-[var(--shadow-hard-sm)]"
                      : "border-border",
                  )}
                  onClick={() => setSelectedCollectionId(collection.id)}
                  onDoubleClick={() => handleDiceBearSave(collection.id)}
                  disabled={isPending}
                >
                  <span
                    aria-hidden
                    className="size-10 shrink-0 rounded-lg border-2 border-border bg-background bg-cover bg-center"
                    style={{ backgroundImage: `url("${preview}")` }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {collection.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border-2 border-border bg-muted/20 p-3 sm:flex-row sm:items-center">
          <span
            aria-hidden
            className="size-14 shrink-0 rounded-lg border-2 border-border bg-background bg-cover bg-center"
            style={{ backgroundImage: `url("${selectedPreview}")` }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Selected DiceBear avatar</p>
            <p className="text-xs text-muted-foreground">
              Save this collection to use it as your dashboard avatar.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleDiceBearSave()}
            disabled={isPending}
            className="shrink-0"
          >
            Save avatar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
