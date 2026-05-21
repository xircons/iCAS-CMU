import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Plus, CheckCircle2, Loader2, AlertCircle, FileText, CheckSquare, X } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { CreateDocumentWizard } from "./smart-document/CreateDocumentWizard";
import { DocumentKanbanBoard } from "./smart-document/DocumentKanbanBoard";
import { DocumentDetailDialog } from "./smart-document/DocumentDetailDialog";
import { BulkActionsToolbar } from "./smart-document/BulkActionsToolbar";
import type { SmartDocument, CreateDocumentFormData, DocumentStatus } from "./smart-document/types";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { documentApi } from "../features/smart-document/api/documentApi";
import { useClubSafe } from "../contexts/ClubContext";
import { cn } from "./ui/utils";
import { AsyncBoundary, PageChrome, StatsCard } from "./shared";
import { useUser } from "../App";

interface BudgetManagementViewProps {
  user: User;
}

export function BudgetManagementView({ user }: BudgetManagementViewProps) {
  const { user: currentUser } = useUser();
  const { clubId: currentClubId, club, isLoading: clubContextLoading } = useClubSafe();
  const navigate = useNavigate();

  // Check if user is a leader/admin
  // Route uses club **public_id** (NanoID); memberships carry clubPublicId and/or numeric clubId.
  // For global route (no club context): admins can access, leaders cannot
  // For club route: match membership to public id or resolved club row (same pattern as ClubContext)
  const canAccess = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!currentClubId) return false;
    const membership = currentUser.memberships?.find((m) => {
      if (m.status !== 'approved') return false;
      if (m.clubPublicId && m.clubPublicId === currentClubId) return true;
      if (club?.id != null && String(m.clubId) === String(club.id)) return true;
      return false;
    });
    const isPresident =
      club?.presidentId != null && String(club.presidentId) === String(currentUser.id);
    return membership?.role === 'leader' || isPresident;
  }, [currentUser, currentClubId, club?.id, club?.presidentId]);

  // Redirect members/non-leaders to assignments page (only when in club context)
  useEffect(() => {
    if (!currentUser || !currentClubId || clubContextLoading) return;
    if (!canAccess) {
      toast.error('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้');
      navigate(`/club/${currentClubId}/assignments`, { replace: true });
    }
  }, [currentUser, currentClubId, canAccess, navigate, clubContextLoading]);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClub, setFilterClub] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [filterDueDate, setFilterDueDate] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");

  // Documents data from database
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SmartDocument | null>(null);
  const [selectedDocumentClubPublicId, setSelectedDocumentClubPublicId] = useState<string | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  // Selection state for bulk operations
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  /** Avoid full-page loading when the same fetch re-runs (e.g. route context resolving). */
  const lastDocumentsFetchKeyRef = useRef<string | null>(null);

  // Fetch clubs for filtering (all clubs for admin, leader clubs for leaders)
  useEffect(() => {
    fetchClubs();
  }, []);

  // Fetch documents when club context changes or when filter club changes
  useEffect(() => {
    if (clubs.length === 0) return; // Wait for clubs to load

    if (filterClub === "all" && currentUser?.role === "admin") {
      const fetchKey = `admin:all:${clubs.length}`;
      const silent = lastDocumentsFetchKeyRef.current === fetchKey;
      lastDocumentsFetchKeyRef.current = fetchKey;
      void fetchAllDocuments({ silent });
    } else {
      const clubIdToFetch = filterClub !== "all" ? filterClub : (currentClubId || clubs[0]?.publicId);
      if (clubIdToFetch) {
        const fetchKey = `club:${clubIdToFetch}`;
        const silent = lastDocumentsFetchKeyRef.current === fetchKey;
        lastDocumentsFetchKeyRef.current = fetchKey;
        void fetchDocuments(clubIdToFetch, { silent });
      }
    }
  }, [filterClub, currentClubId, clubs.length, currentUser?.role]);

  const fetchClubs = async () => {
    try {
      setIsLoadingClubs(true);
      let fetchedClubs: Club[] = [];
      
      // Admin can see all clubs, leaders see only their clubs
      if (currentUser?.role === "admin") {
        fetchedClubs = await clubApi.getAllClubs();
      } else {
        fetchedClubs = await clubApi.getLeaderClubs();
      }
      
      setClubs(fetchedClubs);
      
      // For admins: default to "all" to show all clubs' documents
      // For leaders: auto-select current club if in club context
      if (currentUser?.role === "admin") {
        setFilterClub("all");
      } else {
        // Auto-select current club if in club context
        if (currentClubId && fetchedClubs.find(c => c.publicId === currentClubId)) {
          setFilterClub(currentClubId);
        } else if (fetchedClubs.length === 1) {
          // Auto-select if only one club
          setFilterClub(fetchedClubs[0].publicId);
        }
      }
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      toast.error("ไม่สามารถโหลดข้อมูลชมรมได้");
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const fetchDocuments = async (clubId: string | number, opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setIsLoadingDocuments(true);
      const docs = await documentApi.getClubDocuments(clubId);
      // Convert date strings to proper format and compute overdue
      const processedDocs = docs.map((doc) => {
        const dueDate = new Date(doc.dueDate);
        const isOverdue = dueDate < new Date() && doc.status !== "Completed";
        return {
          ...doc,
          dueDate: doc.dueDate, // Already in YYYY-MM-DD format from backend
          isOverdue,
          clubPublicId: String(clubId),
        };
      });
      setDocuments(processedDocs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
    } finally {
      if (!silent) setIsLoadingDocuments(false);
    }
  };

  // Fetch documents from all clubs (admin only)
  const fetchAllDocuments = async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    try {
      if (!silent) setIsLoadingDocuments(true);
      // Fetch documents from all clubs in parallel
      const documentPromises = clubs.map(club => 
        documentApi.getClubDocuments(club.publicId).catch(err => {
          console.error(`Error fetching documents for club ${club.publicId}:`, err);
          return []; // Return empty array on error
        })
      );
      
      const allDocsArrays = await Promise.all(documentPromises);
      const allDocs = allDocsArrays.flatMap((docsForClub, index) => {
        const club = clubs[index];
        const publicId = club?.publicId ?? "";
        return (docsForClub as SmartDocument[]).map((doc) => ({
          ...doc,
          clubPublicId: publicId || doc.clubPublicId,
        }));
      });

      // Convert date strings to proper format and compute overdue
      const processedDocs = allDocs.map((doc) => {
        const dueDate = new Date(doc.dueDate);
        const isOverdue = dueDate < new Date() && doc.status !== "Completed";
        return {
          ...doc,
          dueDate: doc.dueDate,
          isOverdue,
        };
      });
      
      setDocuments(processedDocs);
    } catch (error: any) {
      console.error("Error fetching all documents:", error);
      toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
    } finally {
      if (!silent) setIsLoadingDocuments(false);
    }
  };

  // Compute overdue status for documents
  const documentsWithOverdue = useMemo(() => {
    return documents.map((doc) => {
      const dueDate = new Date(doc.dueDate);
      const isOverdue = dueDate < new Date() && doc.status !== "Completed";
      return { ...doc, isOverdue };
    });
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    let filtered = documentsWithOverdue;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(query) ||
          doc.description.toLowerCase().includes(query) ||
          doc.clubName.toLowerCase().includes(query)
      );
    }

    // Filter by club
    if (filterClub !== "all") {
      const selectedClub = clubs.find((c) => c.publicId === filterClub);
      if (selectedClub) {
        filtered = filtered.filter(
          (doc) => doc.clubPublicId === filterClub || doc.clubId === selectedClub.id,
        );
      }
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((doc) => doc.status === filterStatus);
    }

    // Filter by due date
    if (filterDueDate !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today);
      thisWeek.setDate(today.getDate() + 7);
      const thisMonth = new Date(today);
      thisMonth.setMonth(today.getMonth() + 1);

      filtered = filtered.filter((doc) => {
        const dueDate = new Date(doc.dueDate);
        switch (filterDueDate) {
          case "today":
            return dueDate.toDateString() === today.toDateString();
          case "this-week":
            return dueDate >= today && dueDate <= thisWeek;
          case "this-month":
            return dueDate >= today && dueDate <= thisMonth;
          case "overdue":
            return dueDate < today && doc.status !== "Completed";
          default:
            return true;
        }
      });
    }

    // Filter by assigned member
    if (filterMember !== "all") {
      const memberId = parseInt(filterMember);
      filtered = filtered.filter((doc) => doc.assignedMemberIds.includes(memberId));
    }

    return filtered;
  }, [documentsWithOverdue, searchQuery, filterClub, filterStatus, filterDueDate, filterMember]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = filteredDocuments.length;
    const completed = filteredDocuments.filter((d) => d.status === "Completed").length;
    const inProgress = filteredDocuments.filter((d) => d.status === "In Progress").length;
    const overdue = filteredDocuments.filter((d) => d.isOverdue).length;

    return { total, completed, inProgress, overdue };
  }, [filteredDocuments]);

  // Handle document creation
  const handleCreateDocument = async (formData: CreateDocumentFormData) => {
    try {
      const targetClubPublicId =
        clubs.find((c) => String(c.id) === String(formData.clubId))?.publicId ??
        (typeof formData.clubId === "string" ? formData.clubId : null);

      if (!targetClubPublicId) {
        throw new Error(
          `ไม่พบรหัสสาธารณะของชมรมสำหรับรหัสชมรม ${String(formData.clubId)} กรุณารีเฟรชหน้าแล้วลองใหม่`,
        );
      }

      await documentApi.createDocument(targetClubPublicId, formData);
      toast.success("สร้างเอกสารใหม่แล้ว", { id: "smartdoc-create" });

      try {
        if (filterClub === "all" && currentUser?.role === "admin") {
          await fetchAllDocuments({ silent: true });
        } else {
          const clubIdToFetch =
            filterClub !== "all"
              ? filterClub
              : currentClubId ||
                clubs.find((c) => String(c.id) === String(formData.clubId))?.publicId ||
                clubs[0]?.publicId;
          if (clubIdToFetch) {
            await fetchDocuments(clubIdToFetch, { silent: true });
          }
        }
      } catch (refreshErr) {
        console.error("Error refreshing documents after create:", refreshErr);
      }
    } catch (error: any) {
      console.error("Error creating document:", error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        "ไม่สามารถสร้างเอกสารได้";
      toast.error(message, { id: "smartdoc-create" });
      throw error;
    }
  };

  // Handle status change
  const handleStatusChange = async (documentId: number, newStatus: DocumentStatus) => {
    try {
      const doc = documents.find((d) => d.id === documentId);
      if (!doc) return;

      const clubPublicId =
        doc.clubPublicId ??
        clubs.find((c) => String(c.id) === String(doc.clubId))?.publicId ??
        currentClubId ??
        undefined;
      if (!clubPublicId) {
        toast.error("ไม่พบรหัสชมรมสำหรับเอกสารนี้");
        return;
      }

      await documentApi.updateDocumentStatus(clubPublicId, documentId, { status: newStatus });
      
      // Update local state
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId
            ? { ...d, status: newStatus, updatedAt: new Date().toISOString() }
            : d
        )
      );
      toast.success("อัปเดตสถานะเอกสารแล้ว");
    } catch (error: any) {
      console.error("Error updating document status:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถอัปเดตสถานะได้");
    }
  };

  // Refresh documents periodically to get updates from other users
  useEffect(() => {
    if (clubs.length === 0) return;
    
    const interval = setInterval(() => {
      if (filterClub === "all" && currentUser?.role === "admin") {
        void fetchAllDocuments({ silent: true });
      } else {
        const clubIdToFetch = filterClub !== "all" 
          ? filterClub
          : (currentClubId || clubs[0]?.publicId);
        
        if (clubIdToFetch) {
          void fetchDocuments(clubIdToFetch, { silent: true });
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [filterClub, currentClubId, clubs.length, currentUser?.role]);

  if (currentUser && currentClubId) {
    if (clubContextLoading && currentUser.role !== "admin") {
      return null;
    }
    if (!clubContextLoading && !canAccess) {
      return null;
    }
  }

  return (
    <PageChrome
      className={cn("w-full max-w-full min-w-0 overflow-x-hidden")}
      title="Smart Document"
      description="สร้างและจัดการเอกสารพร้อมการติดตามสถานะด้วย Kanban Board"
      actions={
        <div className="flex flex-wrap gap-2 justify-end">
          {currentUser?.role === "admin" && (
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              สร้างเอกสารใหม่
            </Button>
          )}
          {canAccess && (
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) {
                  setSelectedDocumentIds(new Set());
                }
              }}
            >
              {selectionMode ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  ยกเลิกการเลือก
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  เลือกหลายรายการ
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      {/* Bulk Actions Toolbar */}
      {selectionMode && (
        <BulkActionsToolbar
          selectedDocumentIds={selectedDocumentIds}
          documents={filteredDocuments}
          onSuccess={() => {
            // Refresh documents
            if (filterClub === "all" && currentUser?.role === "admin") {
              void fetchAllDocuments({ silent: true });
            } else {
              const clubIdToFetch = filterClub !== "all" ? filterClub : (currentClubId || clubs[0]?.publicId);
              if (clubIdToFetch) {
                void fetchDocuments(clubIdToFetch, { silent: true });
              }
            }
          }}
          onClearSelection={() => setSelectedDocumentIds(new Set())}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="ทั้งหมด"
          value={stats.total}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="เสร็จสมบูรณ์"
          value={stats.completed}
          valueClassName="text-green-600"
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        />
        <StatsCard
          title="กำลังดำเนินการ"
          value={stats.inProgress}
          valueClassName="text-blue-600"
          icon={<Loader2 className="h-4 w-4 text-blue-600" />}
        />
        <StatsCard
          title="เกินกำหนด"
          value={stats.overdue}
          valueClassName="text-red-600"
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
        />
      </div>
      <AsyncBoundary loading={isLoadingDocuments} loadingText="กำลังโหลดเอกสาร...">
        <DocumentKanbanBoard 
          documents={filteredDocuments} 
          onStatusChange={handleStatusChange}
          onDocumentUpdate={(updatedDoc) => {
            // Update the document in the documents list
            setDocuments((prev) =>
              prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
            );
          }}
          onCardOpen={(doc) => {
            const resolvedClubPublicId =
              doc.clubPublicId ??
              clubs.find((c) => String(c.id) === String(doc.clubId))?.publicId ??
              currentClubId ??
              null;
            setSelectedDocument(doc);
            setSelectedDocumentClubPublicId(resolvedClubPublicId);
            setIsDetailDialogOpen(true);
          }}
          selectedDocumentIds={selectedDocumentIds}
          onSelectChange={(documentId, selected) => {
            setSelectedDocumentIds(prev => {
              const newSet = new Set(prev);
              if (selected) {
                newSet.add(documentId);
              } else {
                newSet.delete(documentId);
              }
              return newSet;
            });
          }}
          selectionMode={selectionMode}
        />
      </AsyncBoundary>
      {/* Create Document Wizard */}
      <CreateDocumentWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSubmit={handleCreateDocument}
        preferredClubPublicId={filterClub !== "all" ? filterClub : currentClubId}
      />
      <DocumentDetailDialog
        document={selectedDocument}
        clubPublicId={selectedDocumentClubPublicId ?? undefined}
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setSelectedDocument(null);
            setSelectedDocumentClubPublicId(null);
          }
        }}
        onDocumentUpdate={(updatedDoc) => {
          setDocuments((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
          setSelectedDocument((prev) => (prev && prev.id === updatedDoc.id ? updatedDoc : prev));
        }}
        onDocumentArchived={(documentId) => {
          setDocuments((prev) => prev.filter((d) => d.id !== documentId));
          setSelectedDocument(null);
          setSelectedDocumentClubPublicId(null);
        }}
        onDocumentDeleted={(documentId) => {
          setDocuments((prev) => prev.filter((d) => d.id !== documentId));
          setSelectedDocument(null);
          setSelectedDocumentClubPublicId(null);
        }}
      />
    </PageChrome>
  );
}
