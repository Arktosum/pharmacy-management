import moment from "moment";

export const ORIGIN = `http://localhost:3000`;
// export let ORIGIN = `https://pharmacy-database.blazingknightog.repl.co`

export function isInMonth(checkDate: string, current: string) {
  const currentMonth = moment(checkDate).month();
  const timestampMonth = moment(parseInt(current)).month();
  return currentMonth === timestampMonth;
}

export function isBetween(from: string, to: string, current: string) {
  const fromDateMoment = moment(from).startOf("day");
  const toDateMoment = moment(to).endOf("day");
  const timestampMoment = moment(parseInt(current));
  return timestampMoment.isBetween(fromDateMoment, toDateMoment, null, "[]");
}

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
