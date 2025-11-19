import React, { memo } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Calendar, Users, GripVertical, AlertCircle, Building2 } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { format } from "date-fns";
import type { SmartDocument, Priority } from "./types";
import { cn } from "../ui/utils";

interface DocumentCardProps {
  document: SmartDocument;
  onDragStart: (e: React.DragEvent, document: SmartDocument) => void;
  isSelected?: boolean;
  onSelectChange?: (documentId: number, selected: boolean) => void;
  selectionMode?: boolean;
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

export const DocumentCard = memo(function DocumentCard({ document, onDragStart, isSelected = false, onSelectChange, selectionMode = false }: DocumentCardProps) {
  const dueDate = new Date(document.dueDate);
  const isOverdue = document.isOverdue || (dueDate < new Date() && document.status !== "Completed");
  
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
        "p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all duration-200 w-full max-w-full min-w-0",
        isOverdue && "border-red-500 border-2",
        hasNeedsRevision && "border-red-500 border-2 bg-red-50/30",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      draggable={!selectionMode}
      onDragStart={(e) => !selectionMode && onDragStart(e, document)}
      onClick={(e) => {
        if (selectionMode && onSelectChange) {
          e.stopPropagation();
          handleCheckboxChange(!isSelected);
        }
      }}
      onTouchStart={(e) => {
        // Add touch feedback
        if (selectionMode) {
          e.currentTarget.classList.add('active:scale-95');
        }
      }}
      style={{ touchAction: selectionMode ? 'manipulation' : 'none' }}
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
            ครบกำหนด: {format(dueDate, "d MMM yyyy")}
          </span>
        </div>

        {document.assignedMembers.length > 0 && (
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex -space-x-2 flex-1 min-w-0">
              {document.assignedMembers.slice(0, 3).map((member) => (
                <Avatar key={member.userId} className="h-6 w-6 sm:h-7 sm:w-7 border-2 border-background flex-shrink-0">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-xs">
                    {getDiceBearAvatar(`${member.firstName} ${member.lastName}`)}
                  </AvatarFallback>
                </Avatar>
              ))}
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
    </Card>
  );
});

