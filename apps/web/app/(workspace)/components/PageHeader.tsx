import type { ReactNode } from "react";
export function PageHeader({
  title,
  description,
  action,
  context,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  context?: ReactNode;
}) {
  return (
    <header className="heading page-header">
      <div>
        {context && <div className="page-context">{context}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}
