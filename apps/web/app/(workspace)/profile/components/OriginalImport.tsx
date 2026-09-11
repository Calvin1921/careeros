"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Workspace } from "../types";
import styles from "../profile.module.css";
export function OriginalImport({
  item,
}: {
  item: Workspace["imports"][number];
}) {
  const [show, setShow] = useState(false);
  const original = useQuery({
    queryKey: ["profile", "import", item.id],
    queryFn: () => api<{ original_text: string }>(`profile/imports/${item.id}`),
    enabled: show,
  });
  return (
    <article>
      <strong>{item.filename ?? "Pasted text"}</strong>
      <small>{new Date(item.createdAt).toLocaleString()}</small>
      <p>{original.data?.original_text ?? item.preview}</p>
      {!show && (
        <button className={styles.secondary} onClick={() => setShow(true)}>
          View complete original
        </button>
      )}
      {original.isLoading && <small>Loading original…</small>}
      {original.error && (
        <small className={styles.inlineError}>{original.error.message}</small>
      )}
    </article>
  );
}
