export interface ChatMessage {
  id: number;
  clubId?: number;
  clubPublicId?: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  message: string;
  status: 'sending' | 'sent' | 'failed';
  isEdited: boolean;
  isUnsent?: boolean;
  replyToMessageId?: number;
  replyTo?: {
    id: number;
    message: string;
    userName: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface ChatPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
  pagination: ChatPagination;
}

export interface SendChatMessageRequest {
  message: string;
  replyToMessageId?: number;
}

export interface EditChatMessageRequest {
  message: string;
}

