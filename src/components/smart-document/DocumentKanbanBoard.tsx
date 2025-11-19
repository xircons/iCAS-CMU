import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Clock, CheckCircle2, Loader2, ClipboardList } from "lucide-react";
import { DocumentCard } from "./DocumentCard";
import type { SmartDocument, KanbanColumn, DocumentStatus } from "./types";
import { cn } from "../ui/utils";
import { useClubSafe } from "../../contexts/ClubContext";

interface DocumentKanbanBoardProps {
  documents: SmartDocument[];
  onStatusChange: (documentId: number, newStatus: DocumentStatus) => void;
  onDocumentUpdate?: (document: SmartDocument) => void;
  selectedDocumentIds?: Set<number>;
  onSelectChange?: (documentId: number, selected: boolean) => void;
  selectionMode?: boolean;
}

export function DocumentKanbanBoard({ documents, onStatusChange, onDocumentUpdate, selectedDocumentIds = new Set(), onSelectChange, selectionMode = false }: DocumentKanbanBoardProps) {
  const navigate = useNavigate();
  const { clubId } = useClubSafe();
  const [draggedDocument, setDraggedDocument] = useState<SmartDocument | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumn | null>(null);

  const getColumnForStatus = (status: DocumentStatus): KanbanColumn => {
    switch (status) {
      case "Open":
        return "Open";
      case "In Progress":
        return "In Progress";
      case "Completed":
        return "Completed";
      default:
        return "Open";
    }
  };

  const getStatusForColumn = (column: KanbanColumn): DocumentStatus => {
    switch (column) {
      case "Open":
        return "Open";
      case "In Progress":
        return "In Progress";
      case "Completed":
        return "Completed";
    }
  };

  const getDocumentsForColumn = (column: KanbanColumn): SmartDocument[] => {
    return documents.filter((doc) => getColumnForStatus(doc.status) === column);
  };

  const handleDragStart = (e: React.DragEvent, document: SmartDocument) => {
    setDraggedDocument(document);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(document.id));
  };

  const handleCardClick = (e: React.MouseEvent, document: SmartDocument) => {
    // Don't navigate if we're currently dragging or just finished dragging
    if (draggedDocument) {
      return;
    }
    // Use document's clubId if available, otherwise use context clubId
    const targetClubId = document.clubId || clubId;
    if (targetClubId) {
      // Pass state to indicate we came from main assignments (not from club context)
      navigate(`/club/${targetClubId}/smartdoc/${document.id}`, {
        state: { fromClub: !!clubId }
      });
    }
  };

  const handleDragOver = (e: React.DragEvent, column: KanbanColumn) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(column);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumn: KanbanColumn) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedDocument) return;

    const newStatus = getStatusForColumn(targetColumn);
    const currentColumn = getColumnForStatus(draggedDocument.status);

    // Only update if dropped in a different column
    if (currentColumn !== targetColumn) {
      onStatusChange(draggedDocument.id, newStatus);
    }

    // Clear dragged document after a short delay to prevent click event
    setTimeout(() => {
      setDraggedDocument(null);
    }, 100);
  };

  const renderKanbanColumn = (column: KanbanColumn, title: string, icon: React.ReactNode) => {
    const columnDocuments = getDocumentsForColumn(column);
    const columnColor =
      column === "Open"
        ? "border-yellow-300 bg-white dark:bg-gray-900"
        : column === "In Progress"
        ? "border-blue-300 bg-white dark:bg-gray-900"
        : "border-green-300 bg-white dark:bg-gray-900";

    const isDragOver = dragOverColumn === column;
    const dragOverClass = isDragOver
      ? "ring-4 ring-blue-500 ring-offset-2 bg-blue-100/30 border-blue-400"
      : "";
    const showPlaceholder =
      isDragOver && draggedDocument && getColumnForStatus(draggedDocument.status) !== column;

    return (
      <div className="flex flex-col h-full min-h-[400px] md:min-h-[600px] w-full max-w-full">
        <Card
          className={cn(
            `${columnColor} border-2 ${dragOverClass} transition-all duration-200 gap-2 w-full max-w-full`
          )}
          onDragOver={(e) => handleDragOver(e, column)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column)}
        >
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <CardTitle className="text-base">{title}</CardTitle>
              </div>
              <Badge variant="secondary" className="ml-2">
                {columnDocuments.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className={cn(
            "space-y-3 p-2 sm:p-3 min-h-[300px] md:min-h-[500px] pt-2 w-full max-w-full",
            isDragOver && draggedDocument && getColumnForStatus(draggedDocument.status) !== column && "bg-blue-50/30"
          )}>
            {showPlaceholder && (
              <div className="border-2 border-dashed border-blue-500 bg-blue-100/60 rounded-lg p-10 md:p-16 mb-3 min-h-[150px] flex items-center justify-center">
                <p className="text-sm text-blue-700 font-semibold text-center">
                  วางที่นี่เพื่อย้ายเอกสาร
                </p>
              </div>
            )}
            {columnDocuments.length === 0 && !showPlaceholder ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>ไม่มีเอกสาร</p>
              </div>
            ) : (
              columnDocuments.map((document) => {
                const isDragging = draggedDocument?.id === document.id;
                return (
                  <div
                    key={document.id}
                    className={cn(
                      isDragging && "opacity-20 scale-90"
                    )}
                    onClick={(e) => handleCardClick(e, document)}
                  >
                    <DocumentCard 
                      document={document} 
                      onDragStart={handleDragStart}
                      isSelected={selectedDocumentIds.has(document.id)}
                      onSelectChange={onSelectChange}
                      selectionMode={selectionMode}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-[280px] md:min-w-0">
        {renderKanbanColumn(
          "Open",
          "เปิด",
          <Clock className="h-4 w-4 text-yellow-600" />
        )}
        {renderKanbanColumn(
          "In Progress",
          "กำลังดำเนินการ",
          <Loader2 className="h-4 w-4 text-blue-600" />
        )}
        {renderKanbanColumn(
          "Completed",
          "เสร็จสมบูรณ์",
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
      </div>
    </div>
  );
}

