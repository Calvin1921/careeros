export async function createPdf(cv) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 20;
  const line = (text, size = 10, bold = false, gap = 5) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const rows = doc.splitTextToSize(
      text.replace(/[–—]/g, "-").replace(/·/g, "|"),
      170,
    );
    for (const row of rows) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(row, 20, y);
      y += gap;
    }
    y += 2;
  };
  line(cv.name, 24, true, 10);
  line(cv.title, 12);
  line(
    [cv.location, cv.email, cv.phone, cv.linkedin].filter(Boolean).join(" | "),
  );
  line("PROFILE", 11, true);
  line(cv.summary);
  line("EXPERIENCE", 11, true);
  cv.experience.forEach((e) => {
    line(e.role + " | " + e.company, 11, true);
    line(e.dates, 9);
    e.bullets.forEach((b) => line("- " + b));
    y += 3;
  });
  if (cv.projects?.length) {
    line("SELECTED PROJECTS", 11, true);
    cv.projects.forEach((project) => {
      line(`${project.name} | ${project.year}`, 10, true);
      line(project.description);
    });
  }
  line("SKILLS", 11, true);
  line(cv.allSkills);
  line("EDUCATION", 11, true);
  line(cv.education);
  if (cv.certification) {
    line("CERTIFICATION", 11, true);
    line(cv.certification);
  }
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("CareerOS tailored draft - review before use.", 20, 289);
  }
  return doc.output("blob");
}
export async function createDocx(cv) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import(
    "docx"
  );
  const p = (text, heading) =>
    new Paragraph({ text, heading, spacing: { after: 140 } });
  const children = [
    p(cv.name, HeadingLevel.TITLE),
    p(cv.title),
    p(
      [cv.location, cv.email, cv.phone, cv.linkedin]
        .filter(Boolean)
        .join(" | "),
    ),
    p("PROFILE", HeadingLevel.HEADING_1),
    p(cv.summary),
    p("EXPERIENCE", HeadingLevel.HEADING_1),
  ];
  cv.experience.forEach((e) => {
    children.push(
      p(e.role + " · " + e.company, HeadingLevel.HEADING_2),
      p(e.dates),
    );
    e.bullets.forEach((b) =>
      children.push(
        new Paragraph({
          children: [new TextRun(b)],
          bullet: { level: 0 },
          spacing: { after: 100 },
        }),
      ),
    );
  });
  if (cv.projects?.length) {
    children.push(p("SELECTED PROJECTS", HeadingLevel.HEADING_1));
    cv.projects.forEach((project) =>
      children.push(
        p(`${project.name} · ${project.year}`, HeadingLevel.HEADING_2),
        p(project.description),
      ),
    );
  }
  children.push(
    p("SKILLS", HeadingLevel.HEADING_1),
    p(cv.allSkills),
    p("EDUCATION", HeadingLevel.HEADING_1),
    p(cv.education),
  );
  if (cv.certification)
    children.push(
      p("CERTIFICATION", HeadingLevel.HEADING_1),
      p(cv.certification),
    );
  children.push(p("CareerOS tailored draft - review before use."));
  return Packer.toBlob(new Document({ sections: [{ children }] }));
}
export async function downloadCv(cv, format, company = "Employer") {
  const blob = await (format === "PDF" ? createPdf(cv) : createDocx(cv));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    cv.name.replace(/[^a-zA-Z0-9]+/g, "_") +
    "_" +
    company.replace(/[^a-zA-Z0-9]+/g, "_") +
    "_tailored." +
    format.toLowerCase();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
