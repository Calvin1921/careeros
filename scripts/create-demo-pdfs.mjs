import { jsPDF } from "jspdf";
import fs from "node:fs";
import { candidate } from "../src/data/candidate.js";
for (const focus of ["Frontend", "Fullstack", "AI"])
  for (const industry of ["Crypto", "Finance", "Startup"]) {
    const doc = new jsPDF();
    let y = 22;
    doc.setFontSize(20);
    doc.text("Demo Candidate", 20, y);
    y += 10;
    doc.setFontSize(11);
    doc.text("FICTIONAL DEMONSTRATION PROFILE", 20, y);
    y += 8;
    doc.text(focus + " / " + industry + " resume example", 20, y);
    y += 8;
    for (const text of [
      candidate.title,
      candidate.location,
      candidate.email,
      "",
      candidate.summary,
      "",
      ...candidate.experience.flatMap((e) => [
        e.role + " | " + e.company,
        e.dates,
        ...e.bullets,
        "",
      ]),
      candidate.allSkills,
    ]) {
      const lines = doc.splitTextToSize(text, 170);
      if (y + lines.length * 6 > 275) {
        doc.addPage();
        y = 22;
      }
      doc.text(lines, 20, y);
      y += Math.max(1, lines.length) * 6;
    }
    const dir = `public/resumes/ats/${focus}/${industry}`;
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      dir + "/Demo_Candidate_Resume.pdf",
      Buffer.from(doc.output("arraybuffer")),
    );
  }
console.log("Created nine fictional ATS resume variants.");
