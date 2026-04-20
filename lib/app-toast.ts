/**
 * Global toast API (Sonner). Use for button/async feedback across the app.
 *
 * @example
 * import { toast } from "@/lib/app-toast";
 * toast.success("Saved");
 * toast.error("Something went wrong", { action: { label: "Retry", onClick: retry } });
 */
export { toast, type ExternalToast } from "sonner";
