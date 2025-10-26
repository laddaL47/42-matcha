import {
  ActionIcon,
  Avatar,
  Container,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Message, User } from "../../types";

// モックデータ
const mockUser: User = {
  id: "user1",
  username: "alice",
  displayName: "Alice Johnson",
  avatar:
    "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
  isOnline: true,
  lastSeen: new Date(),
};

const mockMessages: Message[] = [
  {
    id: "1",
    senderId: "user1",
    receiverId: "current_user",
    content: "こんにちは！元気ですか？",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true,
    messageType: "text",
  },
  {
    id: "2",
    senderId: "current_user",
    receiverId: "user1",
    content: "こんにちは！元気です、ありがとう！",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1),
    isRead: true,
    messageType: "text",
  },
  {
    id: "3",
    senderId: "user1",
    receiverId: "current_user",
    content: "今日は天気がいいですね。散歩に行きましたか？",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
    messageType: "text",
  },
];

const ChatRoom = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // メッセージ送信
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg: Message = {
        id: Date.now().toString(),
        senderId: "current_user",
        receiverId: mockUser.id,
        content: newMessage.trim(),
        timestamp: new Date(),
        isRead: false,
        messageType: "text",
      };

      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    }
  };

  // キー入力処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // メッセージが変更されたときにスクロールを最下部に移動
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  });

  const formatMessageTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container
      size="sm"
      p={0}
      h="calc(100vh - 70px)"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* ヘッダー */}
      <Paper p="md" withBorder radius={0}>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ActionIcon variant="subtle" onClick={() => navigate("/chat")}>
              <IconArrowLeft size={20} />
            </ActionIcon>

            <Avatar src={mockUser.avatar} size="md" radius="xl" />

            <div>
              <Text fw={500}>{mockUser.displayName}</Text>
            </div>
          </Group>
        </Group>
      </Paper>

      {/* メッセージエリア */}
      <ScrollArea ref={scrollAreaRef} style={{ flex: 1 }} p="md">
        <Stack gap="md">
          {messages.map((message) => {
            const isOwnMessage = message.senderId === "current_user";

            return (
              <Group
                key={message.id}
                justify={isOwnMessage ? "flex-end" : "flex-start"}
                align="flex-end"
              >
                <Paper
                  p="sm"
                  radius="md"
                  style={{
                    maxWidth: "70%",
                    backgroundColor: isOwnMessage ? "#228be6" : "#f8f9fa",
                    color: isOwnMessage ? "white" : "black",
                  }}
                >
                  <Text size="sm">{message.content}</Text>
                  <Text size="xs" c={isOwnMessage ? "rgba(255,255,255,0.7)" : "dimmed"} mt="xs">
                    {formatMessageTime(message.timestamp)}
                  </Text>
                </Paper>
              </Group>
            );
          })}
        </Stack>
      </ScrollArea>

      {/* メッセージ入力エリア */}
      <Paper p="md" withBorder radius={0}>
        <Group gap="sm" align="flex-end">
          <TextInput
            placeholder="メッセージを入力..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <ActionIcon
            size="lg"
            color="blue"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </Paper>
    </Container>
  );
};

export default ChatRoom;
