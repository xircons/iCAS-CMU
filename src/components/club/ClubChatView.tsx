import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { cn } from "../ui/utils";
import { PageHeader } from "../shared";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSquare, Send, Loader2, Edit, Trash2, MoreVertical, Reply, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useClub } from "../../contexts/ClubContext";
import { useUser } from "../../App";
import { useWebSocket } from "../../contexts/WebSocketContext";
import { chatApi } from "../../features/club/api/chatApi";
import type { ChatMessage } from "../../features/club/types/chat";
import { toast } from "sonner";
import { formatChatTimestamp, groupMessagesByDate } from "../../utils/dateGrouping";
import { DateHeader } from "./DateHeader";
import { TypingIndicator } from "./TypingIndicator";
import { useChatCache } from "../../hooks/useChatCache";
import styles from "./ClubChatView.module.css";

export function ClubChatView() {
  const { club } = useClub();
  const { user } = useUser();
  const { socket, subscribe, emit, isConnected } = useWebSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [joinedChatRooms, setJoinedChatRooms] = useState<Set<string>>(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const pendingMessagesRef = useRef<Map<number, ChatMessage>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const { getCachedMessages, setCachedMessages, clearCache } = useChatCache();
  const [typingUsers, setTypingUsers] = useState<Map<number, { userId: number; userName: string; timeout: number }>>(new Map());
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  // Check if user is a leader/admin
  const isLeader = useMemo(() => {
    if (!user || !club?.id) return false;
    if (user.role === "admin") return true;
    const membership = user.memberships?.find(
      (m) =>
        ((m.clubPublicId && m.clubPublicId === club.publicId) || m.clubId === club.id) &&
        m.status === "approved"
    );
    return membership?.role === "leader" || club.presidentId === parseInt(user.id);
  }, [user, club?.id, club?.presidentId]);

  // Group messages by date for display
  const messageGroups = useMemo(() => {
    return groupMessagesByDate(messages);
  }, [messages]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Check if user is at bottom of messages
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100; // 100px from bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(isNearBottom);
  }, []);

  // Load messages
  const loadMessages = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!club?.id) return;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          // Try to load from cache first
          const cached = getCachedMessages(club.publicId);
          if (cached && cached.length > 0) {
            setMessages(cached);
            setIsLoading(false);
            setTimeout(() => scrollToBottom(), 100);
          }
        }

        const response = await chatApi.getChatMessages(club.publicId, page, 50);
        
        if (append) {
          // Prepend older messages
          setMessages((prev) => {
            const merged = [...response.messages, ...prev];
            // Update cache with merged messages
            setCachedMessages(club.publicId, merged);
            return merged;
          });
        } else {
          // Replace messages
          setMessages(response.messages);
          // Update cache
          setCachedMessages(club.publicId, response.messages);
        }

        setHasMore(response.pagination.page < response.pagination.totalPages);
        setCurrentPage(response.pagination.page);

        // Scroll to bottom only if not loading more (i.e., initial load)
        if (!append) {
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error: any) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load messages. Please try again.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [club?.id, scrollToBottom, getCachedMessages, setCachedMessages]
  );

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMore && club?.id) {
      loadMessages(currentPage + 1, true);
    }
  }, [isLoadingMore, hasMore, currentPage, club?.id, loadMessages]);

  // Join chat room
  const joinChatRoom = useCallback(
    (clubId: string) => {
      if (socket && socket.connected && !joinedChatRooms.has(clubId)) {
        emit("join-club-chat", clubId);
        setJoinedChatRooms((prev) => new Set(prev).add(clubId));
      }
    },
    [socket, emit, joinedChatRooms]
  );

  // Leave chat room
  const leaveChatRoom = useCallback(
    (clubId: string) => {
      if (socket && socket.connected && joinedChatRooms.has(clubId)) {
        emit("leave-club-chat", clubId);
        setJoinedChatRooms((prev) => {
          const newSet = new Set(prev);
          newSet.delete(clubId);
          return newSet;
        });
      }
    },
    [socket, emit, joinedChatRooms]
  );

  // Handle WebSocket reconnection
  useEffect(() => {
    if (isConnected && socket) {
      // Rejoin all previously joined chat rooms
      joinedChatRooms.forEach((clubId) => {
        emit("join-club-chat", clubId);
      });
    }
  }, [isConnected, socket, emit, joinedChatRooms]);

  // Load messages and join chat room when club changes
  useEffect(() => {
    if (club?.publicId) {
      loadMessages(1, false);
      joinChatRoom(club.publicId);
    }

    return () => {
      if (club?.publicId) {
        leaveChatRoom(club.publicId);
        // Clear typing users when leaving
        setTypingUsers(new Map());
      }
    };
  }, [club?.publicId, loadMessages, joinChatRoom, leaveChatRoom]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!club?.publicId) return;

    const unsubscribeNewMessage = subscribe("club-chat-message", (data: ChatMessage) => {
      // Only add if it's for this club
      if (data.clubPublicId !== club.publicId) return;

      setMessages((prev) => {
        // Check if message already exists (using current state, not stale closure)
        const exists = prev.find((m) => m.id === data.id);
        if (exists) return prev;

        // If it's our own message, check if we have a pending optimistic message
        // and replace it instead of adding a new one
        if (user?.id && data.userId === Number(user.id)) {
          // Find optimistic message (temporary ID) that matches this real message
          // by checking if we have a pending message with similar content
          const optimisticIndex = prev.findIndex(
            (m) => m.userId === data.userId && 
                   m.status === "sending" && 
                   m.message === data.message &&
                   Math.abs(m.createdAt.getTime() - new Date(data.createdAt).getTime()) < 5000 // within 5 seconds
          );

          if (optimisticIndex !== -1) {
            // Replace optimistic message with real one
            const updated = [...prev];
            updated[optimisticIndex] = { ...data, createdAt: new Date(data.createdAt) };
            return updated;
          }
        }

        // Add new message
        const updated = [...prev, { ...data, createdAt: new Date(data.createdAt) }];
        // Update cache
        if (club?.publicId) {
          setCachedMessages(club.publicId, updated);
        }
        return updated;
      });
      
      // Update pending message status if exists
      const pendingMsg = pendingMessagesRef.current.get(data.id);
      if (pendingMsg) {
        pendingMessagesRef.current.delete(data.id);
      }

      // Scroll to bottom if user is at bottom
      if (isAtBottom) {
        setTimeout(() => scrollToBottom(), 100);
      }
    });

    const unsubscribeMessageUpdated = subscribe("club-chat-message-updated", (data: ChatMessage) => {
      if (data.clubPublicId === club.publicId) {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === data.id
              ? { ...data, createdAt: new Date(data.createdAt) }
              : msg
          );
          // Update cache
          if (club?.publicId) {
            setCachedMessages(club.publicId, updated);
          }
          return updated;
        });
      }
    });

    const unsubscribeMessageDeleted = subscribe("club-chat-message-deleted", (data: {
      messageId: number;
      clubPublicId: string;
    }) => {
      if (data.clubPublicId === club.publicId) {
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== data.messageId);
          // Update cache
          if (club?.publicId) {
            setCachedMessages(club.publicId, filtered);
          }
          return filtered;
        });
      }
    });

    const unsubscribeMessageDeletedForSender = subscribe("club-chat-message-deleted-for-sender", (data: {
      messageId: number;
      clubPublicId: string;
    }) => {
      if (data.clubPublicId === club.publicId) {
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== data.messageId);
          // Update cache
          if (club?.publicId) {
            setCachedMessages(club.publicId, filtered);
          }
          return filtered;
        });
      }
    });

    // Subscribe to typing indicators
    const unsubscribeUserTyping = subscribe("user-typing", (data: { clubPublicId: string; userId: number; userName: string }) => {
      if (data.clubPublicId !== club.publicId || data.userId === Number(user?.id)) return;

      setTypingUsers((prev) => {
        const updated = new Map(prev);
        // Clear existing timeout for this user
        const existing = updated.get(data.userId);
        if (existing?.timeout) {
          clearTimeout(existing.timeout);
        }
        // Set new timeout to remove typing indicator after 3 seconds
        const timeout = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const updated = new Map(prev);
            updated.delete(data.userId);
            return updated;
          });
        }, 3000);
        updated.set(data.userId, { userId: data.userId, userName: data.userName, timeout });
        return updated;
      });
    });

    const unsubscribeUserStoppedTyping = subscribe("user-stopped-typing", (data: { clubPublicId: string; userId: number }) => {
      if (data.clubPublicId !== club.publicId || data.userId === Number(user?.id)) return;

      setTypingUsers((prev) => {
        const updated = new Map(prev);
        const existing = updated.get(data.userId);
        if (existing?.timeout) {
          clearTimeout(existing.timeout);
        }
        updated.delete(data.userId);
        return updated;
      });
    });

    const unsubscribeMessageUnsent = subscribe("club-chat-message-unsent", (data: ChatMessage) => {
      if (data.clubPublicId === club.publicId) {
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === data.id
              ? { ...data, createdAt: new Date(data.createdAt) }
              : msg
          );
          // Update cache
          if (club?.publicId) {
            setCachedMessages(club.publicId, updated);
          }
          return updated;
        });
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeMessageUpdated();
      unsubscribeMessageDeleted();
      unsubscribeMessageDeletedForSender();
      unsubscribeMessageUnsent();
      unsubscribeUserTyping();
      unsubscribeUserStoppedTyping();
    };
  }, [club?.publicId, subscribe, isAtBottom, scrollToBottom, user?.id, setCachedMessages]);

  // Handle scroll for pagination (debounced)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let scrollTimeout: number | null = null;
    const handleScroll = () => {
      // Debounce scroll events
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(() => {
        checkIfAtBottom();
        
        // Load more when scrolling near top
        if (container.scrollTop < 100 && hasMore && !isLoadingMore) {
          loadMoreMessages();
        }
      }, 100); // 100ms debounce
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [hasMore, isLoadingMore, loadMoreMessages, checkIfAtBottom]);

  // Send message
  const handleSendMessage = async () => {
    if (!message.trim() || !user || !club?.publicId || isSending) return;

    const messageText = message.trim();
    const replyToId = replyingToMessage?.id;
    setMessage("");
    setReplyingToMessage(null); // Clear reply state after sending

    // Create optimistic message
    const optimisticMessage: ChatMessage = {
      id: Date.now(), // Temporary ID
      clubPublicId: club.publicId,
      userId: Number(user.id),
      userName: `${user.firstName} ${user.lastName}`,
      userAvatar: user.avatar,
      message: messageText,
      status: "sending",
      isEdited: false,
      replyToMessageId: replyToId,
      replyTo: replyingToMessage ? {
        id: replyingToMessage.id,
        message: replyingToMessage.message,
        userName: replyingToMessage.userName,
      } : undefined,
      createdAt: new Date(),
    };

    // Add optimistic message
    setMessages((prev) => [...prev, optimisticMessage]);
    pendingMessagesRef.current.set(optimisticMessage.id, optimisticMessage);
    
    // Scroll to bottom
    setTimeout(() => scrollToBottom(), 100);

    setIsSending(true);

    try {
      const sentMessage = await chatApi.sendChatMessage(club.publicId, { 
        message: messageText,
        replyToMessageId: replyToId,
      });
      
      // Replace optimistic message with real message
      setMessages((prev) => {
        // Check if message was already added via WebSocket
        const alreadyExists = prev.find((m) => m.id === sentMessage.id);
        if (alreadyExists) {
          // Remove optimistic message if it still exists
          return prev.filter((msg) => msg.id !== optimisticMessage.id);
        }
        
        // Replace optimistic message with real one
        return prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? { ...sentMessage, status: "sent" as const }
            : msg
        );
      });

      pendingMessagesRef.current.delete(optimisticMessage.id);
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      // Update message status to failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id ? { ...msg, status: "failed" as const } : msg
        )
      );

      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      // Stop typing indicator
      if (club?.id && socket) {
        emit("user-stopped-typing", { clubPublicId: club.publicId });
      }
    }
  };

  // Handle typing indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    if (!club?.id || !socket || !isConnected) return;

    const now = Date.now();
    // Debounce typing indicator (emit every 1 second)
    if (now - lastTypingEmitRef.current > 1000) {
      emit("user-typing", { clubPublicId: club.publicId });
      lastTypingEmitRef.current = now;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      if (club?.id && socket) {
        emit("user-stopped-typing", { clubPublicId: club.publicId });
      }
    }, 2000);
  };

  const handleRetryFailedMessage = async (messageId: number) => {
    const failedMessage = messages.find((m) => m.id === messageId && m.status === "failed");
    if (!failedMessage || !club?.id) return;

    // Update status to sending
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, status: "sending" as const } : msg
      )
    );

    try {
      const sentMessage = await chatApi.sendChatMessage(club.publicId, {
        message: failedMessage.message,
      });
      
      // Replace with new message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...sentMessage, status: "sent" as const } : msg
        )
      );
    } catch (error: any) {
      console.error("Error retrying message:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: "failed" as const } : msg
        )
      );
      toast.error("Failed to send message. Please try again.");
    }
  };

  // Handle edit message
  const handleEditMessage = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditMessageText(msg.message);
  };

  // Handle save edited message
  const handleSaveEdit = async () => {
    if (!editingMessageId || !club?.id || !editMessageText.trim()) return;

    try {
      setIsEditing(true);
      const updatedMessage = await chatApi.editChatMessage(club.publicId, editingMessageId, {
        message: editMessageText.trim(),
      });

      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === editingMessageId ? { ...updatedMessage, createdAt: new Date(updatedMessage.createdAt) } : msg
        );
        // Update cache
        if (club?.id) {
          setCachedMessages(club.publicId, updated);
        }
        return updated;
      });

      setEditingMessageId(null);
      setEditMessageText("");
      toast.success("Message updated");
    } catch (error: any) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message");
    } finally {
      setIsEditing(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditMessageText("");
  };

  // Handle delete message for self
  const handleDeleteForSelf = async (msg: ChatMessage) => {
    if (!club?.id) return;

    try {
      await chatApi.deleteChatMessage(club.publicId, msg.id, false);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== msg.id);
        // Update cache
        if (club?.id) {
          setCachedMessages(club.publicId, filtered);
        }
        return filtered;
      });
      toast.success("Message deleted");
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  // Handle delete message for everyone
  const handleDeleteForEveryone = (msg: ChatMessage) => {
    setMessageToDelete(msg);
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete for everyone
  const handleConfirmDelete = async () => {
    if (!messageToDelete || !club?.id) return;

    try {
      await chatApi.deleteChatMessage(club.publicId, messageToDelete.id, true);
      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== messageToDelete.id);
        // Update cache
        if (club?.id) {
          setCachedMessages(club.publicId, filtered);
        }
        return filtered;
      });
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
      toast.success("Message deleted for everyone");
    } catch (error: any) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
      setDeleteDialogOpen(false);
      setMessageToDelete(null);
    }
  };

  // Handle unsend message
  const handleUnsendMessage = async (msg: ChatMessage) => {
    if (!club?.id) return;

    try {
      const unsentMessage = await chatApi.unsendChatMessage(club.publicId, msg.id);
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === msg.id
            ? { ...unsentMessage, createdAt: new Date(unsentMessage.createdAt) }
            : m
        );
        // Update cache
        if (club?.id) {
          setCachedMessages(club.publicId, updated);
        }
        return updated;
      });
      toast.success("Message unsent");
    } catch (error: any) {
      console.error("Error unsending message:", error);
      toast.error(error.response?.data?.message || "Failed to unsend message");
    }
  };

  // Check if user can edit message
  const canEditMessage = (msg: ChatMessage): boolean => {
    if (!user) return false;
    if (msg.isUnsent) return false; // Cannot edit unsent messages
    return msg.userId === Number(user.id);
  };

  // Check if user can delete message for themselves (own messages)
  const canDeleteForSelf = (msg: ChatMessage): boolean => {
    if (!user) return false;
    return msg.userId === Number(user.id); // Can delete own messages
  };

  // Check if user can delete message for everyone (leaders only)
  const canDeleteForEveryone = (msg: ChatMessage): boolean => {
    if (!user) return false;
    return isLeader; // Only leaders can delete for everyone
  };

  // Check if user can unsend message
  const canUnsendMessage = (msg: ChatMessage): boolean => {
    if (!user) return false;
    if (msg.isUnsent) return false; // Already unsent
    return msg.userId === Number(user.id); // Only own messages
  };

  // Handle reply to message
  const handleReplyMessage = (msg: ChatMessage) => {
    setReplyingToMessage(msg);
    // Focus on input field
    setTimeout(() => {
      const input = document.querySelector(`.${styles.messageInput}`) as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  // Handle cancel reply
  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };


  return (
    <div
      className={cn(
        "club-view-shell flex flex-col w-full min-h-0 gap-4",
        styles.chatContainer,
      )}
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div>
        <PageHeader
          title="Chat"
          description={`${club?.name} - Club discussions and messaging`}
        />
        {!isConnected && (
          <p className={styles.reconnectingWarning}>⚠️ Reconnecting...</p>
        )}
      </div>

      {/* Chat Messages */}
      <Card className={styles.chatCard}>
        <CardContent className={styles.chatCardContent}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.sendingSpinner} style={{ height: '2rem', width: '2rem' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div>
                <MessageSquare className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>No messages yet</p>
                <p className={styles.emptyStateSubtext}>Start the conversation!</p>
              </div>
            </div>
          ) : (
            <>
              {isLoadingMore && (
                <div className={styles.loadingMore}>
                  Loading more messages...
                </div>
              )}
              <div
                ref={messagesContainerRef}
                className={styles.messagesContainer}
                onScroll={checkIfAtBottom}
              >
                {messageGroups.map((group) => (
                  <React.Fragment key={group.key}>
                    <DateHeader label={group.label} />
                    {group.messages.map((msg) => {
                      const isOwnMessage = user?.id ? msg.userId === Number(user.id) : false;
                      const isMessageEditing = editingMessageId === msg.id;
                      const canEdit = canEditMessage(msg);
                      const canDeleteSelf = canDeleteForSelf(msg);
                      const canDeleteEveryone = canDeleteForEveryone(msg);
                      const canUnsend = canUnsendMessage(msg);
                      // Show menu button if user can perform any action (own messages or leader on any message)
                      const showMenuButton = isOwnMessage 
                        ? (canEdit || canDeleteSelf || canDeleteEveryone || canUnsend)
                        : canDeleteEveryone; // Leaders can delete any message
                      
                return (
                  <div
                    key={msg.id}
                          className={`${styles.messageRow} ${
                            isOwnMessage ? styles.messageRowOutgoing : styles.messageRowIncoming
                          }`}
                  >
                          {!isOwnMessage && (
                            <Avatar className={styles.avatar}>
                      <AvatarImage src={msg.userAvatar} />
                      <AvatarFallback>
                                {msg.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                          )}
                          {isOwnMessage && showMenuButton && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={styles.messageMenuButton}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={() => handleReplyMessage(msg)}>
                                  <Reply className="h-4 w-4 mr-2" />
                                  Reply
                                </DropdownMenuItem>
                                {canEdit && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditMessage(msg)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canUnsend && (
                                  <>
                                    {canEdit && <DropdownMenuSeparator />}
                                    <DropdownMenuItem onClick={() => handleUnsendMessage(msg)}>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Unsend
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canDeleteSelf && (
                                  <>
                                    {(canEdit || canUnsend) && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => handleDeleteForSelf(msg)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {canDeleteEveryone && (
                                  <>
                                    {(canEdit || canUnsend || canDeleteSelf) && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => handleDeleteForEveryone(msg)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete for everyone
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <div className={styles.messageWrapper}>
                                {isMessageEditing ? (
                                  <div className={styles.editContainer}>
                                    <Textarea
                                      value={editMessageText}
                                      onChange={(e) => setEditMessageText(e.target.value)}
                                      className={styles.editInput}
                                      rows={3}
                                      autoFocus
                                    />
                                    <div className={styles.editActions}>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                        disabled={isEditing}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={isEditing || !editMessageText.trim()}
                                      >
                                        {isEditing ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          "Save"
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`${styles.messageBubble} ${
                                      isOwnMessage
                                        ? styles.messageBubbleOutgoing
                                        : styles.messageBubbleIncoming
                                    }`}
                                  >
                                    {msg.replyTo && (
                                      <div className={styles.replyPreview}>
                                        <div className={styles.replyIndicator}></div>
                                        <div className={styles.replyContent}>
                                          <p className={styles.replyUserName}>{msg.replyTo.userName}</p>
                                          <p className={styles.replyMessage}>
                                            {msg.replyTo.message.length > 50 
                                              ? msg.replyTo.message.substring(0, 50) + '...' 
                                              : msg.replyTo.message}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                    {msg.userName && (
                                      <p className={styles.senderName}>{msg.userName}</p>
                                    )}
                                    <p className={`${styles.messageText} ${msg.isUnsent ? styles.unsentMessage : ''}`}>
                                      {msg.isUnsent ? 'unsent' : msg.message}
                                    </p>
                                    <div className={styles.messageFooter}>
                                      <p className={styles.messageTimestamp}>
                                        {formatChatTimestamp(msg.createdAt)}
                                      </p>
                                      {msg.isEdited && (
                                        <span className={styles.editedLabel}>(edited)</span>
                                      )}
                                      {isOwnMessage && msg.status === "sending" && (
                                        <Loader2 className={styles.sendingSpinner} />
                                      )}
                                      {isOwnMessage && msg.status === "failed" && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className={styles.retryButton}
                                          onClick={() => handleRetryFailedMessage(msg.id)}
                                        >
                                          Retry
                                        </Button>
                                      )}
                      </div>
                    </div>
                                )}
                              </div>
                              {!isOwnMessage && showMenuButton && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={styles.messageMenuButton}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleReplyMessage(msg)}>
                                      <Reply className="h-4 w-4 mr-2" />
                                      Reply
                                    </DropdownMenuItem>
                                    {canDeleteEveryone && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => handleDeleteForEveryone(msg)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete for everyone
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              {isOwnMessage && (
                                <Avatar className={styles.avatar}>
                                  <AvatarImage src={msg.userAvatar} />
                                  <AvatarFallback>
                                    {msg.userName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                  </div>
                );
              })}
                  </React.Fragment>
                ))}
                <div ref={messagesEndRef} />
            </div>
            </>
          )}

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <TypingIndicator
              users={Array.from(typingUsers.values()).map((u) => ({
                userId: u.userId,
                userName: u.userName,
              }))}
            />
          )}

          {/* Reply Input Preview */}
          {replyingToMessage && (
            <div className={styles.replyInputPreview}>
              <div className={styles.replyPreviewContent}>
                <Reply className={styles.replyIcon} />
                <div className={styles.replyPreviewText}>
                  <p className={styles.replyPreviewUserName}>Replying to {replyingToMessage.userName}</p>
                  <p className={styles.replyPreviewMessage}>
                    {replyingToMessage.message.length > 60 
                      ? replyingToMessage.message.substring(0, 60) + '...' 
                      : replyingToMessage.message}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={styles.cancelReplyButton}
                onClick={handleCancelReply}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Message Input */}
          <div className={styles.inputContainer}>
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              className={styles.messageInput}
              disabled={isSending || !isConnected}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending || !isConnected}
              className={styles.sendButton}
            >
              {isSending ? (
                <Loader2 className={styles.sendingSpinner} style={{ height: '1rem', width: '1rem' }} />
              ) : (
                <Send style={{ height: '1rem', width: '1rem' }} />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
