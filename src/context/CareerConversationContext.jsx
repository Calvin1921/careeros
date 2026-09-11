import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  careerConversationStorageKey,
  initialCareerMessages,
  legacyConversationStorageKeys,
  mergeConversationHistories,
} from "../lib/career-conversation";

const CareerConversationContext = createContext(null);

function readStoredConversation() {
  try {
    const current = JSON.parse(
      window.localStorage.getItem(careerConversationStorageKey),
    );
    if (Array.isArray(current) && current.length)
      return mergeConversationHistories([current]);
    const legacy = legacyConversationStorageKeys.map((key) => {
      try {
        return JSON.parse(window.localStorage.getItem(key)) || [];
      } catch {
        return [];
      }
    });
    const migrated = mergeConversationHistories(legacy);
    return migrated.length ? migrated : initialCareerMessages;
  } catch {
    return initialCareerMessages;
  }
}

export function CareerConversationProvider({ children }) {
  const [messages, setMessages] = useState(readStoredConversation);
  useEffect(() => {
    try {
      window.localStorage.setItem(
        careerConversationStorageKey,
        JSON.stringify(messages),
      );
    } catch {
      /* local persistence is optional */
    }
  }, [messages]);
  const appendMessage = useCallback((entry) => {
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random()}`,
        createdAt: new Date().toISOString(),
        kind: "chat",
        ...entry,
      },
    ]);
  }, []);
  return (
    <CareerConversationContext.Provider value={{ messages, appendMessage }}>
      {children}
    </CareerConversationContext.Provider>
  );
}

export function useCareerConversation() {
  const value = useContext(CareerConversationContext);
  if (!value)
    throw new Error(
      "useCareerConversation must be used inside CareerConversationProvider",
    );
  return value;
}
