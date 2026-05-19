type ApprovalNotesCellProps = {
  notes: string | null
}

export function ApprovalNotesCell({ notes }: ApprovalNotesCellProps) {
  if (!notes) {
    return <span className="text-xs text-muted-foreground">No notes</span>
  }

  return <p className="max-w-xs text-xs text-muted-foreground">{notes}</p>
}
