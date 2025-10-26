import { Button, Card, Code, Group, Stack, Text, Title } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useSocket } from "../../hooks/useSocket";

export default function TestSocket() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [hello, setHello] = useState<string | null>(null);
  const [pong, setPong] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 新しいuseSocketフックを使用
  const { isConnected, onlineUsers, sendMessage, markAsRead, sendTyping } = useSocket();

  useEffect(() => {
    setStatus("connecting");
    const socket = io({
      path: "/ws",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("connect_error", (err) => {
      console.error("connect_error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Connection failed");
    });

    socket.on("hello", (payload: unknown) => {
      setHello(JSON.stringify(payload));
      socket.emit("ping");
    });

    socket.on("pong", () => {
      setPong(true);
    });

    return () => {
      socket.close();
    };
  }, []);

  const testSendMessage = () => {
    sendMessage({
      senderId: "test_user",
      receiverId: "other_user",
      content: "テストメッセージ",
      messageType: "text",
    });
  };

  const testMarkAsRead = () => {
    markAsRead("test_message_id");
  };

  const testTyping = () => {
    sendTyping(true);
    setTimeout(() => sendTyping(false), 2000);
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Title order={3}>WebSocket テスト</Title>

        {/* 基本接続状態 */}
        <Group>
          <Text fw={500}>接続状態:</Text>
          <Code>{status}</Code>
        </Group>

        <Group>
          <Text fw={500}>Hello:</Text>
          <Code>{hello ?? "-"}</Code>
        </Group>

        <Group>
          <Text fw={500}>Pong:</Text>
          <Code>{pong ? "受信済み" : "-"}</Code>
        </Group>

        {errorMessage && (
          <Group>
            <Text fw={500} c="red">
              エラー:
            </Text>
            <Code c="red">{errorMessage}</Code>
          </Group>
        )}

        {/* 新しいチャット機能のテスト */}
        <Title order={4} mt="md">
          チャット機能テスト
        </Title>

        <Group>
          <Text fw={500}>チャット接続:</Text>
          <Code>{isConnected ? "接続中" : "切断"}</Code>
        </Group>

        <Group>
          <Text fw={500}>オンラインユーザー:</Text>
          <Code>{Array.from(onlineUsers).join(", ") || "なし"}</Code>
        </Group>

        <Group gap="sm" mt="md">
          <Button size="sm" onClick={testSendMessage} disabled={!isConnected}>
            メッセージ送信テスト
          </Button>
          <Button size="sm" onClick={testMarkAsRead} disabled={!isConnected}>
            既読マークテスト
          </Button>
          <Button size="sm" onClick={testTyping} disabled={!isConnected}>
            タイピングテスト
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
