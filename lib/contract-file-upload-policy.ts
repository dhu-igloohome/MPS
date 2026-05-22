/** Offline procurement contract file uploads (Word / Excel / PDF). */

export const CONTRACT_FILE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx"]);

const EXTENSION_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function contractFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0) return "";
  return fileName.slice(dot).toLowerCase();
}

export function isAllowedContractFileName(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(contractFileExtension(fileName));
}

export function resolveContractFileMimeType(fileName: string, reportedMime: string): string {
  const ext = contractFileExtension(fileName);
  const fromExt = ext ? EXTENSION_MIME[ext] : "";
  if (fromExt) return fromExt;
  const m = reportedMime.trim().toLowerCase();
  if (m && m !== "application/octet-stream") return m;
  return "application/octet-stream";
}

export function contractFileTypeError(language: "en" | "zh"): string {
  return language === "en"
    ? "Allowed file types: PDF, Word (.doc/.docx), Excel (.xls/.xlsx)."
    : "仅支持 PDF、Word（.doc/.docx）、Excel（.xls/.xlsx）。";
}

export function contractFileSizeError(language: "en" | "zh"): string {
  return language === "en" ? "Each file must be 5 MB or smaller." : "单个文件不能超过 5 MB。";
}
