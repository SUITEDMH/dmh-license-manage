export const PRODUCT_NAMES: Record<string, string> = {
  recorder: "Recorder",
  cash_sheeter: "Cash Sheeter",
  inventory: "Inventory",
  suite: "Suite DMH",
};

export const LICENSE_TYPES: Record<string, string> = {
  trial: "Essai (7j)",
  subscription: "Abonnement (30j)",
  perpetual: "Perpétuel",
};

export function formatDateTime(isoString?: string | null) {
  if (!isoString) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function formatDate(isoString?: string | null) {
  if (!isoString) return "Jamais";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(isoString));
}
