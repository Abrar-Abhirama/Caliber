import { useState } from "react";
import { api } from "../services/api.js";

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = async (question, assetContext) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.askQuestion(question, assetContext);
      setMessages((prev) => [
        ...prev,
        { role: "user", text: question },
        { role: "assistant", ...res.data },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, error, sendMessage };
}
