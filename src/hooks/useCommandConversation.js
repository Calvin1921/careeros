import { useEffect, useRef, useState } from "react";
import { routeCareerCommand } from "../lib/command-routing";
import { readApi } from "../lib/live-api";
import { priorApplicationFromText } from "../lib/agent-actions";
import { useCareerConversation } from "../context/CareerConversationContext";

export function useCommandConversation({
  context,
  onScan,
  onSchedule,
  onNavigate,
  onAgentAction,
  opportunities = [],
}) {
  const [value, setValue] = useState("");
  const { messages, appendMessage } = useCareerConversation();
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [agentStatus, setAgentStatus] = useState("ready");
  const inputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  function append(role, text, kind = "chat") {
    appendMessage({ role, text, kind });
  }
  async function send(raw = value) {
    const text = String(raw || "").trim();
    if (!text || thinking) return;
    append("user", text);
    const result = routeCareerCommand(text, {
      hasJob: Boolean(context.job),
      page: context.page,
    });
    setValue("");
    if (result.handled) {
      if (result.action === "scan") onScan();
      if (result.action === "schedule") onSchedule();
      if (result.action === "profile") onNavigate("profile");
      if (result.action === "opportunities") onNavigate("opportunities");
      window.setTimeout(() => append("assistant", result.reply), 120);
      return;
    }
    setThinking(true);
    setAgentStatus("working");
    try {
      const response = await readApi("/assistant/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CareerOS-Action": "assistant",
        },
        body: JSON.stringify({
          message: text,
          messages: messages.slice(-16),
          context: { page: context.page, jobId: context.job?.id || "" },
          opportunities,
        }),
      });
      const mutations = (response.actions || []).filter(
        (action) => action.type !== "none",
      );
      const applied = mutations.map((action) => onAgentAction?.(action));
      append(
        "assistant",
        mutations.length && !applied.some(Boolean)
          ? "I understood the update, but I couldn’t safely match it to an opportunity. Open the role or name the company and role before I change its record."
          : response.reply,
      );
      setAgentStatus("connected");
    } catch {
      const prior = priorApplicationFromText(text, opportunities);
      if (prior) {
        onAgentAction?.({
          type: "flag_prior_application",
          opportunityId: prior.id,
          company: prior.company,
          note: `You said you applied to ${prior.company} before. Confirm whether this listing is the same role.`,
        });
        append(
          "assistant",
          `I flagged ${prior.company} as a possible prior application so it won’t be treated as a clean new lead. Open the role to confirm whether it is the same position.`,
        );
      } else
        append(
          "assistant",
          "I couldn’t reach the CareerOS reasoning service. Your message is still saved here, and I did not change any application data.",
        );
      setAgentStatus("unavailable");
    } finally {
      setThinking(false);
    }
  }
  function listen() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      append(
        "assistant",
        "Voice input is unavailable in this browser. You can type here instead.",
      );
      inputRef.current?.focus();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-HK";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
    };
    recognition.onerror = () =>
      append(
        "assistant",
        "I couldn’t hear that clearly. Try again or type your message.",
      );
    recognition.onend = () => setListening(false);
    recognition.start();
  }
  return {
    value,
    setValue,
    messages,
    send,
    listen,
    listening,
    thinking,
    agentStatus,
    inputRef,
    endRef,
  };
}
