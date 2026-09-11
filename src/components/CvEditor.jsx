import { Check, X } from "@phosphor-icons/react";
import { useDialog } from "../hooks/useDialog";

export function CvEditor({ cv, onChange, onClose }) {
  const dialogRef = useDialog(true, onClose);
  const update = (field, value) => onChange({ ...cv, [field]: value });

  return (
    <section
      ref={dialogRef}
      className="editor"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-title"
    >
      <div className="panel-head">
        <h2 id="edit-title">Edit your tailored CV</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Close editor"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      <p className="muted">
        Changes update the preview and both export formats.
      </p>
      <label htmlFor="cv-professional-title">
        Professional title
        <input
          id="cv-professional-title"
          value={cv?.title || ""}
          onChange={(event) => update("title", event.target.value)}
        />
      </label>
      <label htmlFor="cv-profile-summary">
        Profile summary
        <textarea
          id="cv-profile-summary"
          value={cv?.summary || ""}
          onChange={(event) => update("summary", event.target.value)}
        />
      </label>
      <button className="primary" type="button" onClick={onClose}>
        <Check size={18} /> Done editing
      </button>
      <p className="fine">
        Prototype edits stay in memory and reset when the page reloads.
      </p>
    </section>
  );
}
