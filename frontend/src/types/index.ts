// TypeScript型定義のエクスポート

// ユーザー関連の型
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

// メッセージ関連の型
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType: "text" | "image" | "file";
}

// チャットルーム関連の型
export interface ChatRoom {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// WebSocket関連の型
export interface SocketMessage {
  type: "message" | "typing" | "read" | "online" | "offline";
  data: any;
}

// API関連の型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
