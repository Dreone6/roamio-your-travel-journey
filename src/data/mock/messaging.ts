import type { Conversation, Message, MessageRequest } from "../types";
import { MOCK_USERS } from "./users";

const u = (i: number) => MOCK_USERS[i];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "c-001", type: "direct", title: null, encryptionMode: "standard", vanishAfterSeconds: null,
    createdBy: "u-001", lastMessageAt: new Date(Date.now() - 15 * 60000).toISOString(),
    lastMessagePreview: "Can't wait for the Amalfi trip! 🍝",
    participants: [
      { id: "cp-1", conversationId: "c-001", userId: "u-001", userName: u(0).name, userAvatar: u(0).avatarUrl, role: "owner", muted: false, lastReadAt: new Date().toISOString() },
      { id: "cp-2", conversationId: "c-001", userId: "u-002", userName: u(1).name, userAvatar: u(1).avatarUrl, role: "member", muted: false, lastReadAt: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
    unreadCount: 0,
  },
  {
    id: "c-002", type: "direct", title: null, encryptionMode: "private", vanishAfterSeconds: null,
    createdBy: "u-004", lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastMessagePreview: "🔒 Encrypted message",
    participants: [
      { id: "cp-3", conversationId: "c-002", userId: "u-001", userName: u(0).name, userAvatar: u(0).avatarUrl, role: "member", muted: false, lastReadAt: new Date(Date.now() - 3 * 3600000).toISOString() },
      { id: "cp-4", conversationId: "c-002", userId: "u-004", userName: u(3).name, userAvatar: u(3).avatarUrl, role: "owner", muted: false, lastReadAt: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
    unreadCount: 2,
  },
  {
    id: "c-003", type: "group", title: "Tokyo Crew 🗼", encryptionMode: "standard", vanishAfterSeconds: null,
    createdBy: "u-001", lastMessageAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    lastMessagePreview: "Who's free for TeamLab?",
    participants: [
      { id: "cp-5", conversationId: "c-003", userId: "u-001", userName: u(0).name, userAvatar: u(0).avatarUrl, role: "owner", muted: false, lastReadAt: new Date().toISOString() },
      { id: "cp-6", conversationId: "c-003", userId: "u-005", userName: u(4).name, userAvatar: u(4).avatarUrl, role: "member", muted: false, lastReadAt: null },
      { id: "cp-7", conversationId: "c-003", userId: "u-003", userName: u(2).name, userAvatar: u(2).avatarUrl, role: "member", muted: false, lastReadAt: null },
    ],
    unreadCount: 3,
  },
  {
    id: "c-004", type: "direct", title: null, encryptionMode: "vanish", vanishAfterSeconds: 300,
    createdBy: "u-003", lastMessageAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    lastMessagePreview: "⏱ Vanish mode",
    participants: [
      { id: "cp-8", conversationId: "c-004", userId: "u-001", userName: u(0).name, userAvatar: u(0).avatarUrl, role: "member", muted: false, lastReadAt: null },
      { id: "cp-9", conversationId: "c-004", userId: "u-003", userName: u(2).name, userAvatar: u(2).avatarUrl, role: "owner", muted: false, lastReadAt: null },
    ],
    unreadCount: 0,
  },
];

export const MOCK_MESSAGES: Record<string, Message[]> = {
  "c-001": [
    { id: "msg-1", conversationId: "c-001", senderId: "u-002", senderName: u(1).name, senderAvatar: u(1).avatarUrl, content: "Hey! Have you booked flights for Italy yet?", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-001", "u-002"], reactions: [], createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
    { id: "msg-2", conversationId: "c-001", senderId: "u-001", senderName: u(0).name, senderAvatar: u(0).avatarUrl, content: "Not yet! Looking at August 1st departures", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-001", "u-002"], reactions: [{ id: "r-1", messageId: "msg-2", userId: "u-002", emoji: "👍" }], createdAt: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: "msg-3", conversationId: "c-001", senderId: "u-002", senderName: u(1).name, senderAvatar: u(1).avatarUrl, content: "Can't wait for the Amalfi trip! 🍝", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-001", "u-002"], reactions: [], createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  ],
  "c-002": [
    { id: "msg-4", conversationId: "c-002", senderId: "u-004", senderName: u(3).name, senderAvatar: u(3).avatarUrl, content: "I found an amazing secret beach 🏖️", messageType: "text", mediaUrl: null, metadata: {}, encrypted: true, expiresAt: null, readBy: ["u-004"], reactions: [], createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
    { id: "msg-5", conversationId: "c-002", senderId: "u-004", senderName: u(3).name, senderAvatar: u(3).avatarUrl, content: null, messageType: "location", mediaUrl: null, metadata: { lat: 40.63, lng: 14.60, label: "Hidden Cove" }, encrypted: true, expiresAt: null, readBy: ["u-004"], reactions: [], createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  ],
  "c-003": [
    { id: "msg-6", conversationId: "c-003", senderId: "u-005", senderName: u(4).name, senderAvatar: u(4).avatarUrl, content: "TeamLab is incredible, you guys have to come", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-005"], reactions: [], createdAt: new Date(Date.now() - 6 * 3600000).toISOString() },
    { id: "msg-7", conversationId: "c-003", senderId: "u-003", senderName: u(2).name, senderAvatar: u(2).avatarUrl, content: "I'm in! When?", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-003"], reactions: [], createdAt: new Date(Date.now() - 5.5 * 3600000).toISOString() },
    { id: "msg-8", conversationId: "c-003", senderId: "u-005", senderName: u(4).name, senderAvatar: u(4).avatarUrl, content: "Who's free for TeamLab?", messageType: "text", mediaUrl: null, metadata: {}, encrypted: false, expiresAt: null, readBy: ["u-005"], reactions: [], createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  ],
};

export const MOCK_MESSAGE_REQUESTS: MessageRequest[] = [
  { id: "mr-1", conversationId: "c-new-1", fromUserId: "u-006", fromUserName: "Lina Park", fromUserAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces", preview: "Hey! Saw your Iceland photos 😍", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
];
