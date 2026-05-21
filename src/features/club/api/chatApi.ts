import api from '../../../config/api';
import type { ChatMessage, ChatMessagesResponse, SendChatMessageRequest, EditChatMessageRequest } from '../types/chat';

export const chatApi = {
  // Get chat messages with pagination
  getChatMessages: async (
    clubId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ChatMessagesResponse> => {
    const response = await api.get(`/clubs/${clubId}/chat/messages`, {
      params: { page, limit },
    });
    return {
      messages: response.data.messages.map((msg: any) => ({
        ...msg,
        createdAt: new Date(msg.createdAt),
        updatedAt: msg.updatedAt ? new Date(msg.updatedAt) : undefined,
        deletedAt: msg.deletedAt ? new Date(msg.deletedAt) : undefined,
      })),
      pagination: response.data.pagination,
    };
  },

  // Send a chat message
  sendChatMessage: async (
    clubId: string,
    request: SendChatMessageRequest
  ): Promise<ChatMessage> => {
    const response = await api.post(`/clubs/${clubId}/chat/messages`, request);
    return {
      ...response.data.message,
      createdAt: new Date(response.data.message.createdAt),
      updatedAt: response.data.message.updatedAt
        ? new Date(response.data.message.updatedAt)
        : undefined,
    };
  },

  // Edit a chat message
  editChatMessage: async (
    clubId: string,
    messageId: number,
    request: EditChatMessageRequest
  ): Promise<ChatMessage> => {
    const response = await api.patch(
      `/clubs/${clubId}/chat/messages/${messageId}`,
      request
    );
    return {
      ...response.data.message,
      createdAt: new Date(response.data.message.createdAt),
      updatedAt: response.data.message.updatedAt
        ? new Date(response.data.message.updatedAt)
        : undefined,
    };
  },

  // Delete a chat message
  deleteChatMessage: async (clubId: string, messageId: number, forEveryone: boolean = false): Promise<void> => {
    await api.delete(`/clubs/${clubId}/chat/messages/${messageId}`, {
      params: { forEveryone: forEveryone.toString() },
    });
  },

  // Unsend a chat message
  unsendChatMessage: async (clubId: string, messageId: number): Promise<ChatMessage> => {
    const response = await api.post(`/clubs/${clubId}/chat/messages/${messageId}/unsend`);
    return {
      ...response.data.message,
      createdAt: new Date(response.data.message.createdAt),
      updatedAt: response.data.message.updatedAt
        ? new Date(response.data.message.updatedAt)
        : undefined,
    };
  },
};

