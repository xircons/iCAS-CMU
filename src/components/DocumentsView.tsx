import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, CheckCircle2, Loader2, AlertCircle, FileText, CheckSquare, X } from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";
import { CreateDocumentWizard } from "./smart-document/CreateDocumentWizard";
import { DocumentKanbanBoard } from "./smart-document/DocumentKanbanBoard";
import { BulkActionsToolbar } from "./smart-document/BulkActionsToolbar";
import type { SmartDocument, CreateDocumentFormData, DocumentStatus } from "./smart-document/types";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { documentApi } from "../features/smart-document/api/documentApi";
import { useClubSafe } from "../contexts/ClubContext";
import { useUser } from "../App";

interface BudgetManagementViewProps {
  user: User;
}

export function BudgetManagementView({ user }: BudgetManagementViewProps) {
  const { user: currentUser } = useUser();
  const { clubId: currentClubId, club } = useClubSafe();
  const navigate = useNavigate();
  
  // Check if user is a leader/admin
  // For global route (no club context): admins can access, leaders cannot
  // For club route: check if user is leader/admin of that club
  const canAccess = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Admins can always access
    if (!currentClubId) return false; // Leaders need club context
    const membership = currentUser.memberships?.find(m => 
      String(m.clubId) === String(currentClubId) && m.status === 'approved'
    );
    return membership?.role === 'leader' || club?.presidentId === parseInt(currentUser.id);
  }, [currentUser, currentClubId, club?.presidentId]);

  // Redirect members/non-leaders to assignments page (only when in club context)
  useEffect(() => {
    if (currentUser && currentClubId && !canAccess) {
      toast.error('เฉพาะหัวหน้าชมรมและผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้');
      navigate(`/club/${currentClubId}/assignments`, { replace: true });
      return;
    }
  }, [currentUser, currentClubId, canAccess, navigate]);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [clubs, setClubs] = useState<Club[]>([]);
  
  // Don't render if user cannot access (only check when in club context)
  if (currentUser && currentClubId && !canAccess) {
    return null;
  }
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClub, setFilterClub] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");
  const [filterDueDate, setFilterDueDate] = useState<string>("all");
  const [filterMember, setFilterMember] = useState<string>("all");

  // Documents data from database
  const [documents, setDocuments] = useState<SmartDocument[]>([]);
  
  // Selection state for bulk operations
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Fetch clubs for filtering (all clubs for admin, leader clubs for leaders)
  useEffect(() => {
    fetchClubs();
  }, []);

  // Fetch documents when club context changes or when filter club changes
  useEffect(() => {
    if (clubs.length === 0) return; // Wait for clubs to load
    
    if (filterClub === "all" && currentUser?.role === "admin") {
      // Admin viewing all clubs - fetch from all clubs (works for both global route and club route)
      fetchAllDocuments();
    } else {
      // Fetch from specific club
      const clubIdToFetch = filterClub !== "all" ? parseInt(filterClub) : (currentClubId || clubs[0]?.id);
      if (clubIdToFetch) {
        fetchDocuments(clubIdToFetch);
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
        if (currentClubId && fetchedClubs.find(c => c.id === currentClubId)) {
          setFilterClub(String(currentClubId));
        } else if (fetchedClubs.length === 1) {
          // Auto-select if only one club
          setFilterClub(String(fetchedClubs[0].id));
        }
      }
    } catch (error: any) {
      console.error("Error fetching clubs:", error);
      toast.error("ไม่สามารถโหลดข้อมูลชมรมได้");
    } finally {
      setIsLoadingClubs(false);
    }
  };

  const fetchDocuments = async (clubId: number) => {
    try {
      setIsLoadingDocuments(true);
      const docs = await documentApi.getClubDocuments(clubId);
      // Convert date strings to proper format and compute overdue
      const processedDocs = docs.map((doc) => {
        const dueDate = new Date(doc.dueDate);
        const isOverdue = dueDate < new Date() && doc.status !== "Completed";
        return {
          ...doc,
          dueDate: doc.dueDate, // Already in YYYY-MM-DD format from backend
          isOverdue,
        };
      });
      setDocuments(processedDocs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Fetch documents from all clubs (admin only)
  const fetchAllDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      // Fetch documents from all clubs in parallel
      const documentPromises = clubs.map(club => 
        documentApi.getClubDocuments(club.id).catch(err => {
          console.error(`Error fetching documents for club ${club.id}:`, err);
          return []; // Return empty array on error
        })
      );
      
      const allDocsArrays = await Promise.all(documentPromises);
      // Flatten all documents into a single array
      const allDocs = allDocsArrays.flat();
      
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
      setIsLoadingDocuments(false);
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
      const clubId = parseInt(filterClub);
      filtered = filtered.filter((doc) => doc.clubId === clubId);
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
      const newDocument = await documentApi.createDocument(formData.clubId, formData);
      
      // Compute overdue status
      const dueDate = new Date(newDocument.dueDate);
      const isOverdue = dueDate < new Date() && newDocument.status !== "Completed";
      
      // Refresh documents to show the new one
      if (filterClub === "all" && currentUser?.role === "admin") {
        // If viewing all clubs, refresh all documents
        fetchAllDocuments();
      } else if (filterClub === "all" || filterClub === String(formData.clubId)) {
        // Add new document to list if it matches current filter
        setDocuments((prev) => [{ ...newDocument, isOverdue }, ...prev]);
      } else {
        // Refresh the current club's documents to get the new document
        const clubIdToFetch = filterClub !== "all" ? parseInt(filterClub) : formData.clubId;
        if (clubIdToFetch) {
          fetchDocuments(clubIdToFetch);
        }
      }
      
      toast.success("สร้างเอกสารใหม่แล้ว");
    } catch (error: any) {
      console.error("Error creating document:", error);
      toast.error(error.response?.data?.message || "ไม่สามารถสร้างเอกสารได้");
    }
  };

  // Handle status change
  const handleStatusChange = async (documentId: number, newStatus: DocumentStatus) => {
    try {
      const doc = documents.find(d => d.id === documentId);
      if (!doc) return;

      await documentApi.updateDocumentStatus(doc.clubId, documentId, { status: newStatus });
      
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
        fetchAllDocuments();
      } else {
        const clubIdToFetch = filterClub !== "all" 
          ? parseInt(filterClub) 
          : (currentClubId || clubs[0]?.id);
        
        if (clubIdToFetch) {
          fetchDocuments(clubIdToFetch);
        }
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [filterClub, currentClubId, clubs.length, currentUser?.role]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="mb-2 text-xl md:text-2xl font-bold">Smart Document</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            สร้างและจัดการเอกสารพร้อมการติดตามสถานะด้วย Kanban Board
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Bulk Actions Toolbar */}
      {selectionMode && (
        <BulkActionsToolbar
          selectedDocumentIds={selectedDocumentIds}
          documents={filteredDocuments}
          onSuccess={() => {
            // Refresh documents
            if (filterClub === "all" && currentUser?.role === "admin") {
              fetchAllDocuments();
            } else {
              const clubIdToFetch = filterClub !== "all" ? parseInt(filterClub) : (currentClubId || clubs[0]?.id);
              if (clubIdToFetch) {
                fetchDocuments(clubIdToFetch);
              }
            }
          }}
          onClearSelection={() => setSelectedDocumentIds(new Set())}
        />
      )}

      {/* Summary Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ทั้งหมด</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">เสร็จสมบูรณ์</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">กำลังดำเนินการ</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">เกินกำหนด</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {isLoadingDocuments ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">กำลังโหลดเอกสาร...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DocumentKanbanBoard 
          documents={filteredDocuments} 
          onStatusChange={handleStatusChange}
          onDocumentUpdate={(updatedDoc) => {
            // Update the document in the documents list
            setDocuments((prev) =>
              prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
            );
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
      )}

      {/* Create Document Wizard */}
      <CreateDocumentWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSubmit={handleCreateDocument}
      />
    </div>
  );
}
