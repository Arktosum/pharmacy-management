import moment from "moment";
import { ToastOptions, Zoom } from "react-toastify";
import { StockLog } from "../redux/logSlice";

export const ORIGIN = `http://localhost:3000/api`;
// export let ORIGIN = `https://pharmacy-database.blazingknightog.repl.co/api`

export function isInMonth(date: string, current: string) {
  const currentMonth = moment(date).month();
  const timestampMonth = moment(parseInt(current)).month();
  return currentMonth === timestampMonth;
}

export function isInYear(date: string, current: string) {
  const currentYear = moment(date).year();
  const timestampYear = moment(parseInt(current)).year();
  return currentYear === timestampYear;
}

export function isBetween(from: string, to: string, current: string) {
  const fromDateMoment = moment(from).startOf("day");
  const toDateMoment = moment(to).endOf("day");
  const timestampMoment = moment(parseInt(current));
  return timestampMoment.isBetween(fromDateMoment, toDateMoment, null, "[]");
}

export type setState<T> = React.Dispatch<React.SetStateAction<T>>;

export const toastSuccessoptions: ToastOptions<unknown> = {
  position: "top-center",
  autoClose: 300,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  progress: 0,
  theme: "dark",
  transition: Zoom,
};
export const toastErroroptions: ToastOptions<unknown> = {
  position: "top-center",
  autoClose: 0,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: false,
  progress: 0,
  theme: "dark",
  transition: Zoom,
};
/**
 * Safe, powerful Regex-enabled search utility.
 * Supports:
 * - Substring matching (e.g. "bell" -> matches "Belladonna")
 * - OR expressions (e.g. "bell|arnica" or "bell | arnica" -> matches either)
 * - Wildcards & Quantifiers (e.g. "calc.*carb" or "*cillin")
 * - Anchors (e.g. "^acid" for starting with, "phos$" for ending with)
 * - Character classes (e.g. "b[ae]ll")
 * - Groupings (e.g. "(calc|kali).*phos")
 * - Mid-typing fault tolerance (auto-closes unclosed parens, strips trailing pipes, falls back on invalid syntax)
 */
export function matchesSearch(query: string, text: string): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  let trimmed = query.trim();

  // Strip trailing pipes so typing 'bell|' continues matching 'bell' instead of matching everything
  trimmed = trimmed.replace(/\|+\s*$/, "");
  if (!trimmed) return true;

  // Track boundary wildcard and anchor status before transformations
  const startsWithWildcard = trimmed.startsWith("*");
  const hasStartAnchor = trimmed.startsWith("^");
  const hasEndAnchor = trimmed.endsWith("$");

  // Anchoring rule: By default, search terms act like prefix matches '^query*'
  // (e.g. 'dia' acts like '^dia*', 'er*it*ng' acts like '^er.*it.*ng')
  // - Anchors to start (^) unless user explicitly typed a leading '*' (e.g. '*cillin' or '*dia') or '^'
  // - Does NOT anchor to end ($) unless user explicitly typed an end anchor '$'
  const shouldAnchorStart = !startsWithWildcard && !hasStartAnchor;
  const shouldAnchorEnd = hasEndAnchor;

  // Transform glob wildcards into regex wildcards:
  // - Any '*' not preceded by '.' or '\' becomes '.*' (e.g. 'er*it*ng' -> 'er.*it.*ng', '*cillin' -> '.*cillin')
  // - Multiple consecutive asterisks '***' are collapsed to a single '.*'
  let transformed = trimmed.replace(/\*+/g, "*").replace(/(?<![.\\\\])\*/g, ".*");

  // - Any '?' not preceded by '.', '\', '(', '*', '+' becomes '.' (single char wildcard)
  transformed = transformed.replace(/(?<![.\\\\(*+?])\?/g, ".");

  // Normalize whitespace around OR pipe: 'bell | arnica' -> 'bell|arnica'
  transformed = transformed.replace(/\s*\|\s*/g, "|");

  // Auto-close unclosed '(' if user is mid-typing a group
  const openParens = (transformed.match(/\(/g) || []).length;
  const closeParens = (transformed.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    transformed += ")".repeat(openParens - closeParens);
  }

  // Exact phrase match if explicitly enclosed in quotes: "eruption itching"
  if (transformed.startsWith('"') && transformed.endsWith('"') && transformed.length >= 2) {
    transformed = transformed.slice(1, -1);
  } else if (!transformed.includes("|")) {
    // Normalize multi-spaces to \s+ so "eruption  itching" matches "eruption itching"
    transformed = transformed.replace(/\s+/g, "\\s+");
  }

  // Apply default anchors
  if (shouldAnchorStart || shouldAnchorEnd) {
    if (transformed.includes("|")) {
      transformed = (shouldAnchorStart ? "^(?:" : "(?:") + transformed + (shouldAnchorEnd ? ")$" : ")");
    } else {
      if (shouldAnchorStart && !transformed.startsWith("^")) {
        transformed = "^" + transformed;
      }
      if (shouldAnchorEnd && !transformed.endsWith("$")) {
        transformed = transformed + "$";
      }
    }
  }

  try {
    const rx = new RegExp(transformed, "i");
    return rx.test(text);
  } catch {
    // If complex invalid regex while typing, clean special chars and do safe word/substring check
    const fallback = query.trim().replace(/[-[\]{}()+*?.,\\^$|#\s]/g, " ").toLowerCase();
    const cleanTokens = fallback.split(/\s+/).filter(Boolean);
    if (cleanTokens.length > 0) {
      const lowerText = text.toLowerCase();
      return cleanTokens.every((tok) => lowerText.includes(tok));
    }
    return text.toLowerCase().includes(query.trim().toLowerCase());
  }
}

export function regexUtil(regexPattern: string, testString: string) {
  if (!regexPattern || regexPattern.trim() === "") return false;
  return matchesSearch(regexPattern, testString);
}

export interface BillingStateType {
  itemList: StockLog[];
  patientName: string;
  consultFee: number;
}
export const BILLING_STATE_INITIAL = {
  itemList: [],
  patientName: "",
  consultFee: 0,
};
export function updateLocalStorage(billingState: BillingStateType) {
  localStorage.setItem("bill-items", JSON.stringify(billingState));
}
export function clearlocalStorage() {
  updateLocalStorage(BILLING_STATE_INITIAL);
}