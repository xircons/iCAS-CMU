import React, { memo } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Calendar, Users, GripVertical, AlertCircle, Building2, Loader2 } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { format, isValid } from "date-fns";
import type { SmartDocument, Priority } from "./types";
import { cn } from "../ui/utils";

interface DocumentCardProps {
  document: SmartDocument;
  onDragStart: (e: React.DragEvent, document: SmartDocument) => void;
  onOpen?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  onSelectChange?: (documentId: number, selected: boolean) => void;
  selectionMode?: boolean;
  /** True while PATCH status is in flight after a Kanban move */
  isStatusUpdating?: boolean;
  /** When true, card cannot be dragged (e.g. another card is saving) */
  dragDisabled?: boolean;
}

const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case "High":
      return "bg-red-100 text-red-700 hover:bg-red-100";
    case "Medium":
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
    case "Low":
      return "bg-green-100 text-green-700 hover:bg-green-100";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-100";
  }
};

const getPriorityLabel = (priority: Priority): string => {
  switch (priority) {
    case "High":
      return "สูง";
    case "Medium":
      return "ปานกลาง";
    case "Low":
      return "ต่ำ";
    default:
      return priority;
  }
};

const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    Report: "รายงาน",
    Checklist: "รายการตรวจสอบ",
    "Request Form": "แบบฟอร์มคำขอ",
    Contract: "สัญญา",
    Letter: "จดหมาย",
    Other: "อื่นๆ",
  };
  return labels[type] || type;
};

export const DocumentCard = memo(function DocumentCard({
  document,
  onDragStart,
  onOpen,
  isSelected = false,
  onSelectChange,
  selectionMode = false,
  isStatusUpdating = false,
  dragDisabled = false,
}: DocumentCardProps) {
  const dueDate = new Date(document.dueDate);
  const hasValidDueDate = isValid(dueDate);
  const isOverdue = hasValidDueDate && (document.isOverdue || (dueDate < new Date() && document.status !== "Completed"));
  const dueDateLabel = hasValidDueDate ? format(dueDate, "d MMM yyyy") : "ไม่ระบุวันครบกำหนด";
  
  // Check if any member needs revision
  const hasNeedsRevision = document.assignedMembers?.some(
    m => m.submissionStatus === 'Needs Revision'
  ) || false;

  const handleCheckboxChange = (checked: boolean) => {
    if (onSelectChange) {
      onSelectChange(document.id, checked);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-3 sm:p-4 cursor-pointer hover:shadow-md transition-[box-shadow,transform,opacity] duration-200 w-full max-w-full min-w-0",
        isStatusUpdating && "isolate",
        isOverdue && "border-red-500 border-2",
        hasNeedsRevision && "border-red-500 border-2 bg-red-50/30",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isStatusUpdating && "cursor-wait shadow-lg ring-2 ring-primary/45 ring-offset-2 scale-[1.01]"
      )}
      draggable={!selectionMode && !dragDisabled && !isStatusUpdating}
      onDragStart={(e) => {
        if (!selectionMode && !dragDisabled && !isStatusUpdating) onDragStart(e, document);
      }}
      onClick={(e) => {
        if (selectionMode && onSelectChange) {
          e.stopPropagation();
          handleCheckboxChange(!isSelected);
          return;
        }
        onOpen?.(e);
      }}
      onTouchStart={(e) => {
        // Add touch feedback
        if (selectionMode) {
          e.currentTarget.classList.add('active:scale-95');
        }
      }}
      style={{ touchAction: selectionMode ? 'manipulation' : 'none' }}
    >
      <div
        className={cn(
          "min-w-0 transition-opacity duration-200",
          isStatusUpdating && "pointer-events-none invisible select-none",
        )}
        aria-hidden={isStatusUpdating || undefined}
      >
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        {selectionMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 min-w-[44px] min-h-[44px] touch-manipulation"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2 break-words">{document.title}</h4>
          <div className="flex flex-wrap gap-1 mb-2">
            <Badge className={getPriorityColor(document.priority)} variant="outline">
              {getPriorityLabel(document.priority)}
            </Badge>
            <Badge variant="outline">{getTypeLabel(document.type)}</Badge>
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100" variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                เกินกำหนด
              </Badge>
            )}
            {hasNeedsRevision && (
              <Badge className="bg-red-100 text-red-700 hover:bg-red-100" variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                ต้องแก้ไข
              </Badge>
            )}
          </div>
        </div>
        {!selectionMode && (
          <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center" />
        )}
      </div>

      <div className="space-y-2">
        {document.clubName && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate min-w-0">{document.clubName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className={cn(isOverdue && "text-red-600 font-medium", "truncate")}>
            ครบกำหนด: {dueDateLabel}
          </span>
        </div>

        {document.assignedMembers.length > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex -space-x-2 flex-1 min-w-0">
              {document.assignedMembers.slice(0, 3).map((member, idx) => {
                const displayName =
                  [member.firstName, member.lastName].filter((s) => s && String(s).trim()).join(" ").trim() ||
                  `สมาชิก #${Number.isFinite(member.userId) && member.userId > 0 ? member.userId : idx + 1}`;
                const seed =
                  displayName ||
                  (Number.isFinite(member.userId) && member.userId > 0 ? `user-${member.userId}` : `m-${idx}`);
                return (
                <Avatar key={`${document.id}-av-${idx}-${member.userId}`} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background flex-shrink-0">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-xs">
                    {getDiceBearAvatar(seed)}
                  </AvatarFallback>
                </Avatar>
                );
              })}
              {document.assignedMembers.length > 3 && (
                <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium flex-shrink-0">
                  +{document.assignedMembers.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
              {document.assignedMembers.length} คน
            </span>
          </div>
        )}
      </div>
      </div>
      {isStatusUpdating ? (
        <div
          className="absolute inset-0 z-20 flex min-h-[11rem] items-center justify-center p-2 sm:p-3 bg-card sm:min-h-[12rem]"
          role="status"
          aria-live="polite"
        >
          <div className="flex w-full max-w-[260px] flex-col items-stretch gap-3 rounded-xl border border-primary/20 bg-background px-4 py-4 text-center shadow-md sm:px-5 sm:py-5">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 ring-2 ring-primary/20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" strokeWidth={2.25} aria-hidden />
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight">กำลังบันทึกสถานะ</p>
              <p className="text-xs text-muted-foreground leading-relaxed px-0.5">
                ระบบกำลังย้ายการ์ดไปคอลัมน์ใหม่ โปรดรอสักครู่
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full w-[38%] rounded-full bg-primary document-card-saving-bar"
                aria-hidden
              />
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
});

