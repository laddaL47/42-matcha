import {
  Avatar,
  Badge,
  Card,
  Container,
  Group,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ChatRoom } from "../../types";

// モックデータ（実際の実装ではAPIから取得）
const mockChatRooms: ChatRoom[] = [
  // マッチ後会話がないユーザー（一番上に表示）
  {
    id: "new_match_1",
    participants: [
      {
        id: "user3",
        username: "charlie",
        displayName: "Charlie Brown",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        isOnline: true,
        lastSeen: new Date(),
      },
    ],
    lastMessage: undefined, // 会話がない
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "new_match_2",
    participants: [
      {
        id: "user4",
        username: "diana",
        displayName: "Diana Prince",
        avatar:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 15), // 15分前
      },
    ],
    lastMessage: undefined, // 会話がない
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // 既存の会話があるユーザー
  {
    id: "1",
    participants: [
      {
        id: "user1",
        username: "alice",
        displayName: "Alice Johnson",
        avatar:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        isOnline: true,
        lastSeen: new Date(),
      },
    ],
    lastMessage: {
      id: "msg1",
      senderId: "user1",
      receiverId: "current_user",
      content: "Hey! How are you doing?",
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5分前
      isRead: false,
      messageType: "text",
    },
    unreadCount: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    participants: [
      {
        id: "user2",
        username: "bob",
        displayName: "Bob Smith",
        avatar:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        isOnline: false,
        lastSeen: new Date(Date.now() - 1000 * 60 * 30), // 30分前
      },
    ],
    lastMessage: {
      id: "msg2",
      senderId: "current_user",
      receiverId: "user2",
      content: "Thanks for the help!",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2時間前
      isRead: true,
      messageType: "text",
    },
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    participants: [
      {
        id: "user5",
        username: "eve",
        displayName: "Eve Wilson",
        avatar:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        isOnline: true,
        lastSeen: new Date(),
      },
    ],
    lastMessage: {
      id: "msg3",
      senderId: "user5",
      receiverId: "current_user",
      content: "Hello there!",
      timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10分前
      isRead: false,
      messageType: "text",
    },
    unreadCount: 7, // 5以上なので"7"ではなく"7+"と表示される
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const ChatMain = () => {
  const [chatRooms] = useState<ChatRoom[]>(mockChatRooms);
  const navigate = useNavigate();

  // チャットルームを並び替え：マッチ後会話がないユーザーを一番上に、その後は未読数順
  const sortedChatRooms = [...chatRooms].sort((a, b) => {
    // マッチ後会話がないユーザー（lastMessageがundefined）を最上位に
    if (!a.lastMessage && b.lastMessage) return -1;
    if (a.lastMessage && !b.lastMessage) return 1;
    if (!a.lastMessage && !b.lastMessage) return 0;

    // 既存の会話がある場合は未読数順
    return b.unreadCount - a.unreadCount;
  });

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "今";
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return `${Math.floor(diffInMinutes / 1440)}日前`;
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "今";
    if (diffInMinutes < 60) return `${diffInMinutes}分前`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}時間前`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Container
      size="sm"
      p="md"
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Stack gap="md" style={{ width: "100%", maxWidth: "500px" }}>
        {/* ヘッダー */}
        <div style={{ textAlign: "center", width: "100%" }}>
          <Title order={2}>チャット</Title>
        </div>

        {/* チャットルーム一覧 */}
        <ScrollArea h="calc(100vh - 150px)" style={{ width: "100%" }}>
          <Stack gap="xs">
            {sortedChatRooms.length === 0 ? (
              <Card p="xl" ta="center">
                <Text c="dimmed">チャットが見つかりません</Text>
              </Card>
            ) : (
              sortedChatRooms.map((room) => {
                const otherParticipant = room.participants[0]; // 相手のユーザー
                const hasNoMessages = !room.lastMessage; // マッチ後会話がないかどうか

                return (
                  <Card
                    key={room.id}
                    p="md"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/chat/${room.id}`)}
                  >
                    <Group justify="space-between" align="flex-start">
                      <Group gap="md" style={{ flex: 1 }}>
                        <div style={{ position: "relative" }}>
                          <Avatar src={otherParticipant.avatar} size="lg" radius="xl" />
                          {/* オンライン状態インジケーター */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 2,
                              right: 2,
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: otherParticipant.isOnline ? "#51cf66" : "#868e96",
                              border: "2px solid white",
                            }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Group justify="space-between" align="center" mb="xs">
                            <Text fw={500} size="sm" truncate>
                              {otherParticipant.displayName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {room.lastMessage
                                ? formatMessageTime(room.lastMessage.timestamp)
                                : ""}
                            </Text>
                          </Group>

                          <Group justify="space-between" align="center">
                            <Text size="sm" c="dimmed" truncate style={{ flex: 1 }}>
                              {hasNoMessages
                                ? "新しいマッチ！メッセージを送ってみましょう"
                                : room.lastMessage?.content}
                            </Text>
                            {room.unreadCount > 0 && (
                              <Badge size="sm" color="blue" variant="filled">
                                {room.unreadCount >= 5 ? "5+" : room.unreadCount}
                              </Badge>
                            )}
                          </Group>

                          <Text size="xs" c="dimmed" mt="xs">
                            {otherParticipant.isOnline ? (
                              <Group gap={4}>
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    backgroundColor: "#51cf66",
                                  }}
                                />
                                オンライン
                              </Group>
                            ) : (
                              `最終ログイン: ${formatLastSeen(otherParticipant.lastSeen || new Date())}`
                            )}
                          </Text>
                        </div>
                      </Group>
                    </Group>
                  </Card>
                );
              })
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Container>
  );
};

export default ChatMain;
