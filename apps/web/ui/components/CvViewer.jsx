import { useState } from "react";
import {
  Minus,
  Plus,
  CornersOut,
  CornersIn,
  ImageSquare,
  CaretDown,
} from "@phosphor-icons/react";
export function CvViewer({ cv }) {
  const [zoom, setZoom] = useState(100),
    [expanded, setExpanded] = useState(false),
    [paperTone, setPaperTone] = useState(false);
  return (
    <section
      className={"viewer " + (expanded ? "expanded" : "")}
      aria-label="CV document preview"
    >
      <div className="viewer-tools">
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(80, zoom - 10))}
          disabled={zoom === 80}
        >
          <Minus size={18} />
        </button>
        <button aria-label="Reset zoom" onClick={() => setZoom(100)}>
          {zoom}% <CaretDown size={13} />
        </button>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(120, zoom + 10))}
          disabled={zoom === 120}
        >
          <Plus size={18} />
        </button>
        <span className="toolbar-spacer" />
        <button
          aria-label="Toggle paper tone"
          aria-pressed={paperTone}
          onClick={() => setPaperTone(!paperTone)}
        >
          <ImageSquare size={21} />
        </button>
        <button
          aria-label={expanded ? "Exit expanded view" : "Expand CV preview"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <CornersIn size={21} /> : <CornersOut size={21} />}
        </button>
      </div>
      <article
        className={"cv-paper " + (paperTone ? "paper-warm" : "")}
        style={{ "--zoom": zoom / 100 }}
      >
        <h1>{cv.name}</h1>
        <p className="cv-title">{cv.title}</p>
        <p>
          {[cv.location, cv.email, cv.phone, cv.linkedin]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <section className="cv-section">
          <h2>Profile</h2>
          <p>{cv.summary}</p>
        </section>
        <section className="cv-section">
          <h2>Experience</h2>
          {cv.experience.map((e) => (
            <div className="cv-job" key={e.company}>
              <div className="cv-job-heading">
                <h3>
                  {e.role} · {e.company}
                </h3>
                <span>{e.dates}</span>
              </div>
              <ul>
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        {cv.projects?.length > 0 && (
          <section className="cv-section">
            <h2>Selected projects</h2>
            {cv.projects.map((project) => (
              <div className="cv-job" key={project.name}>
                <div className="cv-job-heading">
                  <h3>{project.name}</h3>
                  <span>{project.year}</span>
                </div>
                <p>{project.description}</p>
              </div>
            ))}
          </section>
        )}
        <section className="cv-section">
          <h2>Skills</h2>
          <p>{cv.allSkills}</p>
        </section>
        <section className="cv-section">
          <h2>Education</h2>
          <p>{cv.education}</p>
        </section>
        {cv.certification && (
          <section className="cv-section">
            <h2>Certification</h2>
            <p>{cv.certification}</p>
          </section>
        )}
        <p className="sample-foot">Tailored draft · review before use</p>
      </article>
    </section>
  );
}
