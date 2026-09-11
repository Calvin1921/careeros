import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { Worker } from "node:worker_threads";
import { join } from "node:path";
@Controller("profile")
export class CvExtractionController {
  @Post("extract") async extract(
    @Body() body: { name?: unknown; base64?: unknown },
  ) {
    if (
      typeof body?.name !== "string" ||
      typeof body.base64 !== "string" ||
      body.base64.length > 7_000_000
    )
      throw new BadRequestException("Choose a PDF or DOCX up to 5 MB.");
    const kind = body.name.toLowerCase().endsWith(".pdf")
      ? "pdf"
      : body.name.toLowerCase().endsWith(".docx")
        ? "docx"
        : null;
    const bytes = Buffer.from(body.base64, "base64");
    if (
      !kind ||
      bytes.length > 5_000_000 ||
      !bytes.length ||
      (kind === "pdf"
        ? !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
        : !bytes.subarray(0, 2).equals(Buffer.from("PK")))
    )
      throw new BadRequestException("Choose a valid PDF or DOCX up to 5 MB.");
    const content = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(join(__dirname, "cv-extraction.worker.js"), {
        workerData: { bytes, kind },
        resourceLimits: { maxOldGenerationSizeMb: 128 },
      });
      let finished = false;
      const finish = (error?: string, value?: string) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        void worker.terminate();
        error ? reject(new BadRequestException(error)) : resolve(value!);
      };
      const timer = setTimeout(
        () => finish("Extraction took too long. Paste your CV text instead."),
        15000,
      );
      worker.once("message", (message) =>
        finish(message.error, message.content),
      );
      worker.once("error", () =>
        finish("Could not read this document. Paste your CV text instead."),
      );
      worker.once("exit", () => {
        if (!finished) finish("The document could not be extracted.");
      });
    });
    if (!content.trim())
      throw new BadRequestException(
        "No text found. For a scanned-image CV, paste its text instead.",
      );
    if (content.length > 90000)
      throw new BadRequestException(
        "This document is too long. Use a shorter CV.",
      );
    return { content };
  }
}
