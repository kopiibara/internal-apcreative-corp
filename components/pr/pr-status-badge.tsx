import { Badge } from "@/components/ui/badge";
import {
  getPRCollaborationStatusLabel,
  getPRContactStatusLabel,
} from "@/lib/pr/pr-labels";
import type {
  PRCollaborationStatus,
  PRContactStatus,
} from "@/lib/pr/pr-constants";
import {
  getPRCollaborationStatusBadgeClassName,
  getPRContactStatusBadgeClassName,
} from "@/lib/pr/pr-status-styles";
import { cn } from "@/lib/utils";

type PRStatusBadgeProps = {
  size?: "default" | "sm";
  className?: string;
};

export function PRContactStatusBadge({
  status,
  size = "sm",
  className,
}: PRStatusBadgeProps & { status: PRContactStatus }) {
  return (
    <Badge
      variant="status"
      size={size}
      className={cn(
        "shadow-none",
        getPRContactStatusBadgeClassName(status),
        className,
      )}
    >
      {getPRContactStatusLabel(status)}
    </Badge>
  );
}

export function PRCollaborationStatusBadge({
  status,
  size = "sm",
  className,
}: PRStatusBadgeProps & { status: PRCollaborationStatus }) {
  return (
    <Badge
      variant="status"
      size={size}
      className={cn(
        "shadow-none",
        getPRCollaborationStatusBadgeClassName(status),
        className,
      )}
    >
      {getPRCollaborationStatusLabel(status)}
    </Badge>
  );
}
