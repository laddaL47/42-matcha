import { Card, Code, Group, Stack, Text, Title } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export default function TestSocket() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [hello, setHello] = useState<string | null>(null);
  const [pong, setPong] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

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

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="xs">
        <Title order={3}>WS Test</Title>
        <Group>
          <Text fw={500}>Status:</Text>
          <Code>{status}</Code>
        </Group>
        <Group>
          <Text fw={500}>Hello:</Text>
          <Code>{hello ?? "-"}</Code>
        </Group>
        <Group>
          <Text fw={500}>Pong:</Text>
          <Code>{pong ? "received" : "-"}</Code>
        </Group>
        {errorMessage && (
          <Group>
            <Text fw={500} c="red">
              Error:
            </Text>
            <Code c="red">{errorMessage}</Code>
          </Group>
        )}
      </Stack>
    </Card>
  );
}
