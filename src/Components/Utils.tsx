import moment from "moment";
import { ToastOptions, Zoom } from "react-toastify";

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

export const toastOptions: ToastOptions<unknown> = {
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

export function regexUtil(regexPattern: string, testString: string) {
  if (regexPattern == "") return false;
  let regex;
  try {
    regex = new RegExp(regexPattern, "i");
  } catch {
    // alert("Invalid regex expression!!! " + regexPattern);
    return false;
  }
  if (regex) {
    return regex.test(testString);
  }
  return false;
}
