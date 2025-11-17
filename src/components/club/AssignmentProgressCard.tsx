import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Badge } from "../ui/badge";
import { Users, CheckCircle, Clock, Award, TrendingUp } from "lucide-react";

interface AssignmentProgressCardProps {
  totalMembers: number;
  submittedCount: number;
  gradedCount: number;
  averageScore?: number;
  maxScore?: number;
  lateCount?: number;
}

export function AssignmentProgressCard({
  totalMembers,
  submittedCount,
  gradedCount,
  averageScore,
  maxScore,
  lateCount = 0,
}: AssignmentProgressCardProps) {
  const submissionRate = totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0;
  const gradingRate = submittedCount > 0 ? (gradedCount / submittedCount) * 100 : 0;
  const notSubmittedCount = totalMembers - submittedCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Progress Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Submission Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Submissions</span>
            </div>
            <span className="text-muted-foreground">
              {submittedCount} / {totalMembers}
            </span>
          </div>
          <Progress value={submissionRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{submissionRate.toFixed(1)}% completed</span>
            {notSubmittedCount > 0 && (
              <span>{notSubmittedCount} not submitted</span>
            )}
          </div>
        </div>

        {/* Grading Progress */}
        {submittedCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Graded</span>
              </div>
              <span className="text-muted-foreground">
                {gradedCount} / {submittedCount}
              </span>
            </div>
            <Progress value={gradingRate} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{gradingRate.toFixed(1)}% graded</span>
              {submittedCount - gradedCount > 0 && (
                <span>{submittedCount - gradedCount} pending</span>
              )}
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>On Time</span>
            </div>
            <div className="text-lg font-semibold">
              {submittedCount - (lateCount || 0)}
            </div>
          </div>
          {lateCount > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 text-orange-500" />
                <span>Late</span>
              </div>
              <div className="text-lg font-semibold text-orange-600">
                {lateCount}
              </div>
            </div>
          )}
          {averageScore !== undefined && maxScore !== undefined && (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Award className="h-3 w-3" />
                  <span>Average</span>
                </div>
                <div className="text-lg font-semibold">
                  {averageScore.toFixed(1)}
                  {maxScore && <span className="text-sm text-muted-foreground">/{maxScore}</span>}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Rate</span>
                </div>
                <div className="text-lg font-semibold">
                  {maxScore > 0 ? ((averageScore / maxScore) * 100).toFixed(1) : 0}%
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

