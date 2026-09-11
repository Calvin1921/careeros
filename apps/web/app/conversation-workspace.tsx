"use client";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "../ui/styles.css";
import "../ui/foundation.css";
const Workspace = dynamic(() => import("../ui/AppCommandCenter").then(m => m.AppCommandCenter), { ssr: false });
export function ConversationWorkspace() {
 const [client] = useState(() => new QueryClient());
 return <QueryClientProvider client={client}><Workspace /></QueryClientProvider>;
}
