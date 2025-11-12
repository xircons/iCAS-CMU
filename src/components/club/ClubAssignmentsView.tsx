import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { 
  ClipboardList, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";

type AssignmentStatus = "pending" | "in-progress" | "completed" | "overdue";

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: AssignmentStatus;
  createdAt: string;
  createdBy: string;
  notes?: string;
  submittedAt?: string;
}

export function ClubAssignmentsView() {
  const { club, clubId } = useClub();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // TODO: Replace with actual API call when assignments API is available
  // Example: const assignments = await assignmentApi.getClubAssignments(clubId);
  // Mock assignments data - replace with actual API call
  const assignments: Assignment[] = [
    {
      id: "1",
      title: "Club Event Planning",
      description: "Plan the upcoming club event for next month",
      deadline: "2025-12-15",
      status: "pending",
      createdAt: "2025-11-01",
      createdBy: "Club Leader",
    },
    {
      id: "2",
      title: "Member Recruitment Drive",
      description: "Organize recruitment activities for new members",
      deadline: "2025-11-30",
      status: "in-progress",
      createdAt: "2025-10-25",
      createdBy: "Club Leader",
    },
  ];

  const filteredAssignments = assignments.filter((assignment) =>
    assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    assignment.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "in-progress":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const handleSubmitAssignment = () => {
    if (!submissionNotes.trim()) {
      toast.error("Please add submission notes");
      return;
    }
    toast.success("Assignment submitted successfully!");
    setIsSubmitDialogOpen(false);
    setSubmissionNotes("");
    setSelectedAssignment(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Assignments</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {club?.name} - View and manage your assignments
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assignments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground">No assignments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment) => (
            <Card key={assignment.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{assignment.title}</CardTitle>
                    <CardDescription className="mt-1">
                      Created by {assignment.createdBy} • {new Date(assignment.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(assignment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{assignment.description}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Deadline: {new Date(assignment.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAssignment(assignment)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  {assignment.status !== "completed" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setIsSubmitDialogOpen(true);
                      }}
                    >
                      Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignment Detail Dialog */}
      <Dialog open={!!selectedAssignment && !isSubmitDialogOpen} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAssignment.title}</DialogTitle>
                <DialogDescription>
                  Created by {selectedAssignment.createdBy} • {new Date(selectedAssignment.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAssignment.status)}</div>
                </div>
                <div>
                  <Label>Description</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedAssignment.description}</p>
                </div>
                <div>
                  <Label>Deadline</Label>
                  <p className="mt-1 text-sm">{new Date(selectedAssignment.deadline).toLocaleDateString()}</p>
                </div>
                {selectedAssignment.notes && (
                  <div>
                    <Label>Notes</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedAssignment.notes}</p>
                  </div>
                )}
                {selectedAssignment.status !== "completed" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsSubmitDialogOpen(true);
                    }}
                  >
                    Submit Assignment
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              Add notes or comments for your submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="submission-notes">Submission Notes</Label>
              <Textarea
                id="submission-notes"
                placeholder="Add your submission notes here..."
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                className="mt-1"
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsSubmitDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitAssignment}>
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

