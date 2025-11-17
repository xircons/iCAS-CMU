import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, Assignment } from "../../features/assignment/api/assignmentApi";
import { Award, AlertTriangle, Info } from "lucide-react";

interface BulkGradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  submissionIds: number[];
  onSuccess: () => void;
}

export function BulkGradeDialog({
  open,
  onOpenChange,
  assignment,
  submissionIds,
  onSuccess,
}: BulkGradeDialogProps) {
  const { clubId } = useClub();
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [scoreError, setScoreError] = useState(false);

  const handleScoreChange = (value: number | undefined) => {
    setScore(value);
    
    if (assignment.maxScore !== null && assignment.maxScore !== undefined) {
      if (value !== undefined && value !== null) {
        const numScore = Number(value);
        if (!isNaN(numScore) && (numScore > assignment.maxScore || numScore < 0)) {
          setScoreError(true);
        } else {
          setScoreError(false);
        }
      } else {
        setScoreError(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clubId) {
      toast.error("Club not found");
      return;
    }

    // Validate score if assignment has max_score
    if (assignment.maxScore !== null && assignment.maxScore !== undefined) {
      if (score !== undefined && score !== null) {
        const numScore = Number(score);
        if (isNaN(numScore)) {
          toast.error("Score must be a number");
          setScoreError(true);
          return;
        }
        if (numScore < 0 || numScore > assignment.maxScore) {
          toast.error(`Score must be between 0 and ${assignment.maxScore}`);
          setScoreError(true);
          return;
        }
      }
    }

    // Check if at least one field is provided
    if (score === undefined && !comment.trim()) {
      toast.error("Please provide at least a score or a comment");
      return;
    }

    try {
      setIsLoading(true);

      // Grade each submission individually
      const gradePromises = submissionIds.map((submissionId) => {
        const gradeData: { score?: number; comment?: string } = {};
        
        if (score !== undefined && score !== null && assignment.maxScore !== null && assignment.maxScore !== undefined) {
          gradeData.score = Number(score);
        }
        
        if (comment.trim()) {
          gradeData.comment = comment.trim();
        }

        return assignmentApi.gradeSubmission(clubId, assignment.id, submissionId, gradeData);
      });

      await Promise.all(gradePromises);

      toast.success(`Successfully graded ${submissionIds.length} submission(s)!`);
      
      // Reset form
      setScore(undefined);
      setComment("");
      setScoreError(false);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error bulk grading submissions:", error);
      toast.error(error.response?.data?.message || "Failed to grade submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setScore(undefined);
    setComment("");
    setScoreError(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Grade Submissions</DialogTitle>
          <DialogDescription>
            Apply the same score and/or comment to {submissionIds.length} selected submission(s)
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This will update {submissionIds.length} submission(s). Existing grades will be overwritten.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Score */}
          {assignment.maxScore !== null && assignment.maxScore !== undefined && (
            <div>
              <Label htmlFor="bulk-score">
                Score (applied to all selected)
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="bulk-score"
                  type="number"
                  min="0"
                  max={assignment.maxScore}
                  step="1"
                  placeholder="0"
                  value={score ?? ""}
                  onChange={(e) => handleScoreChange(e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-24 ${
                    scoreError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
                <span className="text-muted-foreground">/ {assignment.maxScore}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Leave empty to only provide feedback without a score
              </p>
            </div>
          )}

          {/* Comment/Feedback */}
          <div>
            <Label htmlFor="bulk-comment">
              Feedback / Comments (applied to all selected, optional)
            </Label>
            <Textarea
              id="bulk-comment"
              placeholder="Provide feedback for all selected students..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="mt-1 resize-y min-h-[150px] max-h-[250px]"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || scoreError} className="flex-1">
              {isLoading ? "Grading..." : `Grade ${submissionIds.length} Submission(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

