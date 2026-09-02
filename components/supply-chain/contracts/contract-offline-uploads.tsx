"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp } from "lucide-react";

import {
  ccDate,
  ccInputMd,
  ccInputSm,
  ccLabel,
} from "@/components/shared/field-controls";
import { contractFileSizeError, contractFileTypeError } from "@/lib/contract-file-upload-policy";
import type { Language } from "@/lib/i18n";
import type { ContractFileUploadEntry } from "@/lib/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type Props = {
  uploads: ContractFileUploadEntry[];
  language: Language;
};

export function ContractOfflineUploads({ uploads, language }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "Offline contract files" : "线下合同归档",
    subtitle: en
      ? "Upload Word/Excel/PDF contracts created outside Foretracker. PO is required; multiple files per PO are allowed (max 5 MB each)."
      : "上传采购员在 Word/Excel 中制作的合同（PDF 亦可）。必填 PO；同一 PO 可上传多个文件（单个不超过 5 MB）。",
    po: "PO",
    sku: "SKU",
    supplier: en ? "Supplier" : "供应商",
    signedDate: en ? "Signed date" : "签署日",
    remark: en ? "Remark" : "备注",
    file: en ? "Contract file" : "合同文件",
    upload: en ? "Upload" : "上传",
    uploading: en ? "Uploading…" : "上传中…",
    filterPo: en ? "Filter PO" : "筛选 PO",
    allPo: en ? "All POs" : "全部 PO",
    fileName: en ? "File" : "文件",
    size: en ? "Size" : "大小",
    uploadedBy: en ? "Uploaded by" : "上传人",
    uploadedAt: en ? "Uploaded at" : "上传时间",
    download: en ? "Download" : "下载",
    empty: en ? "No offline contract files yet." : "暂无线下合同文件。",
    allowedTypes: contractFileTypeError(language),
    maxSize: contractFileSizeError(language),
  };

  const [poNumber, setPoNumber] = useState("");
  const [sku, setSku] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [remark, setRemark] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filterPo, setFilterPo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const poOptions = useMemo(() => {
    const set = new Set(uploads.map((u) => u.poNumber));
    if (poNumber.trim()) set.add(poNumber.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [uploads, poNumber]);

  const filtered = useMemo(() => {
    const q = filterPo.trim().toLowerCase();
    if (!q) return uploads;
    return uploads.filter((u) => u.poNumber.toLowerCase().includes(q));
  }, [uploads, filterPo]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!poNumber.trim()) {
      setMessage(en ? "PO number is required." : "请填写 PO 号。");
      return;
    }
    if (!file) {
      setMessage(en ? "Choose a file." : "请选择文件。");
      return;
    }
    setLoading(true);
    setMessage("");
    const fd = new FormData();
    fd.set("poNumber", poNumber.trim());
    fd.set("sku", sku.trim());
    fd.set("supplierName", supplierName.trim());
    fd.set("remark", remark.trim());
    if (signedDate) fd.set("signedDate", signedDate);
    fd.set("file", file);
    const res = await fetch("/api/contract-file-uploads", { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Upload failed." : "上传失败。"));
      return;
    }
    setFile(null);
    setRemark("");
    const input = document.getElementById("contract-offline-file") as HTMLInputElement | null;
    if (input) input.value = "";
    setMessage(en ? "Uploaded." : "已上传。");
    router.refresh();
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
      <details className="mt-1 text-sm text-app-muted">
        <summary className="cursor-pointer select-none font-medium text-foreground/80">
          {en ? "How it works" : "说明"}
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        <p className="mt-2 text-xs">{t.allowedTypes}</p>
        <p className="text-xs">{t.maxSize}</p>
      </details>

      <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onSubmit}>
        <label className="shrink-0">
          <span className={ccLabel}>{t.po} *</span>
          <input
            className={ccInputSm}
            value={poNumber}
            onChange={(e) => setPoNumber(e.target.value)}
            required
            list="contract-offline-po-list"
            placeholder="POE202605150001"
          />
          <datalist id="contract-offline-po-list">
            {poOptions.map((po) => (
              <option key={po} value={po} />
            ))}
          </datalist>
        </label>
        <label className="shrink-0">
          <span className={ccLabel}>{t.sku}</span>
          <input className={ccInputSm} value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} />
        </label>
        <label className="shrink-0">
          <span className={ccLabel}>{t.supplier}</span>
          <input className={ccInputMd} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </label>
        <label className="shrink-0">
          <span className={ccLabel}>{t.signedDate}</span>
          <input type="date" className={ccDate} value={signedDate} onChange={(e) => setSignedDate(e.target.value)} />
        </label>
        <label className="shrink-0">
          <span className={ccLabel}>{t.remark}</span>
          <input className={ccInputMd} value={remark} onChange={(e) => setRemark(e.target.value)} />
        </label>
        <label className="min-w-[12rem] shrink-0">
          <span className={ccLabel}>{t.file} *</span>
          <input
            id="contract-offline-file"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-0 block w-full max-w-xs text-sm text-foreground/85 file:mr-2 file:rounded-lg file:border file:border-app-border file:bg-white file:px-2 file:py-1 file:text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-app-accent bg-app-accent-soft px-3.5 py-2 text-sm font-semibold text-app-accent shadow-sm transition hover:bg-app-accent/10 disabled:opacity-50"
        >
          <FileUp size={16} strokeWidth={2} />
          {loading ? t.uploading : t.upload}
        </button>
      </form>
      {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}

      <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-2">
        <label className="shrink-0">
          <span className={ccLabel}>{t.filterPo}</span>
          <input
            className={ccInputSm}
            value={filterPo}
            onChange={(e) => setFilterPo(e.target.value)}
            placeholder={t.allPo}
            list="contract-offline-filter-po"
          />
          <datalist id="contract-offline-filter-po">
            {poOptions.map((po) => (
              <option key={`f-${po}`} value={po} />
            ))}
          </datalist>
        </label>
        <span className="text-xs text-app-muted">
          {filtered.length} {en ? "file(s)" : "个文件"}
        </span>
      </div>

      <div className="app-table-shell mt-3 overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-app-border/80 text-left text-app-muted">
              <th className="px-2 py-2">PO</th>
              <th className="px-2 py-2">SKU</th>
              <th className="px-2 py-2">{t.supplier}</th>
              <th className="px-2 py-2">{t.fileName}</th>
              <th className="px-2 py-2">{t.size}</th>
              <th className="px-2 py-2">{t.uploadedBy}</th>
              <th className="px-2 py-2">{t.uploadedAt}</th>
              <th className="px-2 py-2">{t.download}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-app-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-app-border/50">
                  <td className="whitespace-nowrap px-2 py-2 font-medium">{row.poNumber}</td>
                  <td className="whitespace-nowrap px-2 py-2">{row.sku || "—"}</td>
                  <td className="max-w-[10rem] truncate px-2 py-2" title={row.supplierName || undefined}>
                    {row.supplierName || "—"}
                  </td>
                  <td className="max-w-[14rem] truncate px-2 py-2" title={row.fileName}>
                    {row.fileName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-app-muted">
                    {formatFileSize(row.fileSize)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">{row.uploadedBy}</td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-app-muted">
                    {row.createdAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-2 py-2">
                    <a
                      href={`/api/contract-file-uploads/${encodeURIComponent(row.id)}/download`}
                      className="inline-flex items-center gap-1 rounded-md border border-app-border px-2 py-1 text-xs font-medium text-app-accent hover:bg-app-accent-soft"
                    >
                      <Download size={14} strokeWidth={1.75} />
                      {t.download}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
