import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { useClub } from "../../contexts/ClubContext";
import { useUser } from "../../App";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
}

export function ClubChatView() {
  const { club } = useClub();
  const { user } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      userId: "1",
      userName: "John Doe",
      message: "Hello everyone! Welcome to the club chat.",
      timestamp: new Date(),
    },
    {
      id: "2",
      userId: "2",
      userName: "Jane Smith",
      message: "Thanks! Excited to be here.",
      timestamp: new Date(),
    },
  ]);

  const handleSendMessage = () => {
    if (!message.trim() || !user) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userAvatar: user.avatar,
      message: message.trim(),
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-xl md:text-2xl">Chat</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {club?.name} - Club discussions and messaging
        </p>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>Club Chat</CardTitle>
          <CardDescription>Communicate with club members</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.userId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.userAvatar} />
                      <AvatarFallback>
                        {msg.userName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isOwnMessage ? "text-right" : ""}`}>
                      <div className={`inline-block max-w-[70%] ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-lg p-3`}>
                        <p className="text-sm font-medium mb-1">{msg.userName}</p>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

