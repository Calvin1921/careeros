import { parentPort, workerData } from "node:worker_threads";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";
async function extract() {
  const buffer = Buffer.from(workerData.bytes);
  if (workerData.kind === "pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  return (await mammoth.extractRawText({ buffer })).value;
}
extract()
  .then((content) => parentPort?.postMessage({ content }))
  .catch(() =>
    parentPort?.postMessage({
      error:
        "Could not extract this CV. Try an unencrypted document or paste its text.",
    }),
  );
