"use client";
import { useState } from "react";
import { api } from "../lib/api";
export function useCvFile() {
  const [reading, setReading] = useState(false),
    [error, setError] = useState("");
  async function read(file: File) {
    setError("");
    setReading(true);
    try {
      if (file.size > 5_000_000) throw new Error("Choose a CV up to 5 MB.");
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["txt", "json", "pdf", "docx"].includes(extension ?? ""))
        throw new Error("Choose PDF, DOCX, TXT or JSON.");
      if (extension === "pdf" || extension === "docx") {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        const result = await api<{ content: string }>(
          "profile/extract",
          "POST",
          { name: file.name, base64: btoa(binary) },
        );
        return { content: result.content, kind: "text" as const };
      }
      return {
        content: await file.text(),
        kind: extension === "json" ? ("json" as const) : ("text" as const),
      };
    } catch (error) {
      setError((error as Error).message);
      return null;
    } finally {
      setReading(false);
    }
  }
  return { read, reading, error };
}
