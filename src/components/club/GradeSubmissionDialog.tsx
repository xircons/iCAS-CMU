import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { assignmentApi, Assignment, AssignmentSubmission } from "../../features/assignment/api/assignmentApi";
import { Award, User, FileText, Info, AlertTriangle } from "lucide-react";

interface GradeSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment;
  submission: AssignmentSubmission;
  onSuccess: () => void;
}

export function GradeSubmissionDialog({ 
  open, 
  onOpenChange, 
  assignment, 
  submission,
  onSuccess 
}: GradeSubmissionDialogProps) {
  const { clubId } = useClub();
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [scoreError, setScoreError] = useState(false);

  useEffect(() => {
    if (open && submission) {
      // Pre-fill with existing grade if available
      setScore(submission.score !== undefined && submission.score !== null ? submission.score : undefined);
      setComment(submission.comment || "");
      setScoreError(false);
    }
  }, [open, submission]);

  const handleScoreChange = (value: number | undefined) => {
    setScore(value);
    
    // Real-time validation (red border only, no toast on every keystroke)
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

  const handleScoreBlur = () => {
    // Show toast only on blur if there's an error
    if (scoreError && assignment.maxScore !== null && assignment.maxScore !== undefined) {
      if (score !== undefined && score !== null) {
        const numScore = Number(score);
        if (!isNaN(numScore) && numScore > assignment.maxScore) {
          toast.error(`Score must be less than or equal to ${assignment.maxScore}`);
        } else if (!isNaN(numScore) && numScore < 0) {
          toast.error("Score must be greater than or equal to 0");
        }
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

    // Check if there's a score error
    if (scoreError) {
      toast.error("Please fix the score error before submitting");
      return;
    }

    try {
      setIsLoading(true);

      const gradeData: { score?: number; comment?: string } = {};
      
      if (score !== undefined && score !== null && assignment.maxScore !== null && assignment.maxScore !== undefined) {
        gradeData.score = Number(score);
      }
      
      if (comment.trim()) {
        gradeData.comment = comment.trim();
      }

      // Check if at least one field is provided
      if (gradeData.score === undefined && !gradeData.comment) {
        toast.error("Please provide at least a score or a comment");
        return;
      }
      
      // If no score and no comment, don't submit
      if (Object.keys(gradeData).length === 0) {
        toast.error("Please provide at least a score or a comment");
        return;
      }

      await assignmentApi.gradeSubmission(clubId, assignment.id, submission.id, gradeData);

      toast.success("Submission graded successfully!");
      
      // Reset form
      setScore(undefined);
      setComment("");
      
      onSuccess();
    } catch (error: any) {
      console.error("Error grading submission:", error);
      toast.error(error.response?.data?.message || "Failed to grade submission");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogDescription>
            Assign a score and provide feedback for this submission
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium mt-0.5">{submission.userFirstName} {submission.userLastName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium mt-0.5">{submission.userEmail}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Submitted:</span>
                  <p className="font-medium mt-0.5">
                    {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grading Form Card */}
          <Card>
            <div className="px-6 pt-6 pb-6 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4" />
                Grading
              </CardTitle>
            </div>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Score */}
                {assignment.maxScore !== null && assignment.maxScore !== undefined && (
                  <div>
                    <Label htmlFor="score">
                      Score
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="score"
                        type="number"
                        min="0"
                        max={assignment.maxScore}
                        step="1"
                        placeholder="0"
                        value={score ?? ""}
                        onChange={(e) => handleScoreChange(e.target.value ? Number(e.target.value) : undefined)}
                        onBlur={handleScoreBlur}
                        className={`w-24 ${
                          scoreError
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500"
                            : "border-input focus:border-ring focus:ring-2 focus:ring-ring"
                        }`}
                        style={scoreError ? { border: "2px solid #ef4444", borderColor: "#ef4444" } : undefined}
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
                  <Label htmlFor="comment">
                    Feedback / Comments (optional)
                  </Label>
                  <Textarea
                    id="comment"
                    placeholder="Provide feedback for the student..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={6}
                    className="mt-4 resize-y min-h-[150px] max-h-[250px]"
                  />
                </div>

                {/* Existing Grade Info */}
                {submission.gradedAt && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        <strong>Note:</strong> This submission has been graded before on{" "}
                        {new Date(submission.gradedAt).toLocaleDateString()}. 
                        Submitting will update the existing grade.
                      </span>
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Saving..." : submission.gradedAt ? "Update Grade" : "Submit Grade"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

