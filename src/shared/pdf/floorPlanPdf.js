import { pdfjs } from "react-pdf";
import { getValidToken } from "../auth/authToken";

/** Keep in sync with BaseUrl default baseURL. */
export const API_MEDIA_BASE = (
  process.env.REACT_APP_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

/**
 * Turn a backend media path into an absolute URL the PDF viewer can fetch.
 */
export function resolveFloorPlanMediaUrl(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // Encode each segment so names like "2nd Floor_511.pdf" load reliably.
  const encodedPath = path
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(segment) : ""))
    .join("/");
  return `${API_MEDIA_BASE}${encodedPath}`;
}

let workerConfigured = false;

/** Configure pdf.js worker once (version-matched file in /public). */
export function configurePdfJsWorker() {
  if (workerConfigured) return;
  workerConfigured = true;
  const publicUrl = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  pdfjs.GlobalWorkerOptions.workerSrc = `${publicUrl}/pdf.worker.min.js`;
}

/**
 * react-pdf file descriptor with auth headers for protected floor-plan media.
 */
export function buildPdfDocumentFile(pdfUrl) {
  if (!pdfUrl) return null;
  const token = getValidToken();
  if (!token) return pdfUrl;
  return {
    url: pdfUrl,
    httpHeaders: { Authorization: `Bearer ${token}` },
  };
}
