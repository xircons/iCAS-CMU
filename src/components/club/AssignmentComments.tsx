import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage, getDiceBearAvatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useClub } from "../../contexts/ClubContext";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { assignmentApi, AssignmentComment } from "../../features/assignment/api/assignmentApi";
import { MessageSquare, Send, Edit, Trash2, Reply, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface AssignmentCommentsProps {
  assignmentId: number;
}

export function AssignmentComments({ assignmentId }: AssignmentCommentsProps) {
  const { clubId } = useClub();
  const { user } = useAuth();
  const [comments, setComments] = useState<AssignmentComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clubId && assignmentId) {
      fetchComments();
    }
  }, [clubId, assignmentId]);

  // Note: WebSocket support for comments can be added later
  // For now, comments will refresh on manual actions

  const fetchComments = async () => {
    if (!clubId || !assignmentId) return;

    try {
      setIsLoading(true);
      const data = await assignmentApi.getAssignmentComments(clubId, assignmentId);
      setComments(data);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !assignmentId || !newComment.trim()) return;

    try {
      await assignmentApi.createComment(clubId, assignmentId, newComment.trim());
      setNewComment("");
      fetchComments();
      toast.success("Comment posted");
      // Scroll to bottom
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error: any) {
      console.error("Error creating comment:", error);
      toast.error(error.response?.data?.message || "Failed to post comment");
    }
  };

  const handleSubmitReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!clubId || !assignmentId || !replyText.trim()) return;

    try {
      await assignmentApi.createComment(clubId, assignmentId, replyText.trim(), parentId);
      setReplyText("");
      setReplyingTo(null);
      fetchComments();
      toast.success("Reply posted");
    } catch (error: any) {
      console.error("Error creating reply:", error);
      toast.error(error.response?.data?.message || "Failed to post reply");
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!clubId || !assignmentId || !editText.trim()) return;

    try {
      await assignmentApi.updateComment(clubId, assignmentId, commentId, editText.trim());
      setEditingCommentId(null);
      setEditText("");
      fetchComments();
      toast.success("Comment updated");
    } catch (error: any) {
      console.error("Error updating comment:", error);
      toast.error(error.response?.data?.message || "Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!clubId || !assignmentId) return;

    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      await assignmentApi.deleteComment(clubId, assignmentId, commentId);
      fetchComments();
      toast.success("Comment deleted");
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast.error(error.response?.data?.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const renderComment = (comment: AssignmentComment, isReply = false) => {
    const isOwner = user?.id === comment.userId;
    const isEditing = editingCommentId === comment.id;

    return (
      <div key={comment.id} className={isReply ? "ml-8 mt-3" : "mt-4"}>
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage
              src={
                getDiceBearAvatar(
                  `${comment.userFirstName || ""} ${comment.userLastName || ""}`
                )
              }
            />
            <AvatarFallback>
              {comment.userFirstName?.charAt(0) || ""}
              {comment.userLastName?.charAt(0) || ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {comment.userFirstName} {comment.userLastName}
                  </span>
                  {isOwner && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditText(comment.commentText);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditComment(comment.id)}
                    disabled={!editText.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCommentId(null);
                      setEditText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm mt-2 whitespace-pre-wrap break-words">
                  {comment.commentText}
                </p>
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                      setReplyText("");
                    }}
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
              </>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && !isReply && (
              <form
                onSubmit={(e) => handleSubmitReply(e, comment.id)}
                className="mt-3 space-y-2"
              >
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={!replyText.trim()}>
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Render Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-3">
                {comment.replies.map((reply) => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Discussion ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!newComment.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-xs text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {comments.map((comment) => renderComment(comment))}
            <div ref={commentsEndRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

