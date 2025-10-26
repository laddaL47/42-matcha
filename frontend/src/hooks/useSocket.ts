import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Message, SocketMessage, User } from "../types";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (message: Omit<Message, "id" | "timestamp" | "isRead">) => void;
  markAsRead: (messageId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  onlineUsers: Set<string>;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      path: "/ws",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
    });

    // オンライン状態の管理
    socket.on("user_online", (userId: string) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on("user_offline", (userId: string) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    });

    socket.on("online_users", (users: string[]) => {
      setOnlineUsers(new Set(users));
    });

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (message: Omit<Message, "id" | "timestamp" | "isRead">) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("send_message", message);
    }
  };

  const markAsRead = (messageId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("mark_read", messageId);
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", isTyping);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    markAsRead,
    sendTyping,
    onlineUsers,
  };
};
