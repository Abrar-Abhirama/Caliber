import { useEffect, useState } from "react";
import { api } from "../services/api.js";

const STORAGE_KEY = "plant-hub-conversations";

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useChat() {
  const [conversations, setConversations] = useState(loadConversations);
  const [activeId, setActiveId] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // Storage full or unavailable: history just won't persist.
    }
  }, [conversations]);

  const appendMessage = (id, message) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, message] } : c))
    );

  // `fresh` starts a new conversation (used by "Ask in Chat" from the Reliability dashboard).
  const sendMessage = async (question, assetContext, model, { fresh = false } = {}) => {
    const text = question.trim();
    if (!text || pendingId) return;

    let id = fresh ? null : activeId;
    if (!id) {
      id = makeId();
      setConversations((prev) => [
        { id, title: text.slice(0, 60), messages: [], createdAt: Date.now() },
        ...prev,
      ]);
      setActiveId(id);
    }

    appendMessage(id, { role: "user", text });
    setPendingId(id);
    try {
      const res = await api.askQuestion(text, assetContext, model);
      appendMessage(id, { role: "assistant", ...res.data });
    } catch (err) {
      appendMessage(id, {
        role: "assistant",
        error: true,
        answer: err.message || "Something went wrong. Please try again.",
      });
    } finally {
      setPendingId(null);
    }
  };

  const deleteChat = (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  };

  // Pins live on the message itself, so they persist with the conversation in localStorage.
  const togglePinIn = (convId, index) =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m, i) => (i === index ? { ...m, pinned: !m.pinned } : m)) }
          : c
      )
    );

  const togglePin = (index) => togglePinIn(activeId, index);

  const togglePinChat = (id) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));

  // Every pinned message across chats, newest chat first.
  const pinned = conversations.flatMap((c) =>
    c.messages.map((m, index) => ({ convId: c.id, index, message: m })).filter((p) => p.message.pinned)
  );

  const active = conversations.find((c) => c.id === activeId);

  return {
    conversations,
    activeId,
    messages: active?.messages ?? [],
    loading: pendingId !== null && pendingId === activeId,
    busy: pendingId !== null,
    sendMessage,
    newChat: () => setActiveId(null),
    selectChat: setActiveId,
    deleteChat,
    togglePin,
    togglePinIn,
    togglePinChat,
    pinned,
    clearAll: () => {
      setConversations([]);
      setActiveId(null);
    },
  };
}
