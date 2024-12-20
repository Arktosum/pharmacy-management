import moment from "moment";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { LogItem } from "../redux/logSlice";
import { isInMonth, isInYear } from "../components/Utils";

export default function MonthlyLog() {
  const [selectedDate, setselectedDate] = useState("");
  const dispatch = useAppDispatch();
  const currentDate = moment().format("YYYY-MM-DD");
  useEffect(() => {
    setselectedDate(currentDate);
  }, [currentDate, dispatch]);

  let LogData: LogItem[] = useAppSelector((state) => state.logs.data);
  LogData = LogData.filter(
    (item) =>
      isInMonth(selectedDate, item.id) && isInYear(selectedDate, item.id)
  );
  LogData = LogData.sort(
    (a: LogItem, b: LogItem) => parseInt(a.id) - parseInt(b.id)
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowItem: any = {};
  for (const item of LogData) {
    if (item.type.toUpperCase() != "TRANSACTION") continue;
    const thisDate = moment(parseInt(item.id)).format("YYYY-MM-DD");
    if (!(thisDate in rowItem)) {
      rowItem[thisDate] = {
        MTtotal: 0,
        consultFee: 0,
        total: 0,
      };
    }
    const consultFee = item.data.consultFee;
    const MTtotal = item.data.MTtotal;
    rowItem[thisDate] = {
      MTtotal: rowItem[thisDate].MTtotal + MTtotal,
      consultFee: rowItem[thisDate].consultFee + consultFee,
      total: rowItem[thisDate].total + MTtotal + consultFee,
    };
  }

  let MTGrand = 0;
  let consultGrand = 0;
  let totalGrand = 0;

  const ROWS = [];
  for (const date in rowItem) {
    const item = rowItem[date];
    MTGrand += item.MTtotal;
    consultGrand += item.consultFee;
    totalGrand += item.total;
    ROWS.push(
      <div key={date} className="bg-black grid grid-cols-4 gap-5 p-5 my-5">
        <div className="text-yellow-300 text-[1.2em]">
          {moment(date).format("DD-MM-YYYY")}
        </div>
        <div className="text-orange-500 text-[1.2em]">{item.MTtotal.toLocaleString("hi-in")}</div>
        <div className="text-green-500 text-[1.2em]">{item.consultFee.toLocaleString("hi-in")}</div>
        <div className="text-pink-500 text-[1.2em]">{item.total.toLocaleString("hi-in")}</div>
      </div>
    );
  }
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
      <h1 className="text-[3em] text-white text-bold text-center">
        Monthly Log
      </h1>
      <h1 className="text-[1.5em] text-white text-bold text-center">
        Month : {moment(selectedDate).format("MMM YY")}
      </h1>
      <input
        type="date"
        value={selectedDate}
        min={"2023-03-30"}
        max={currentDate}
        onChange={(e) => setselectedDate(e.target.value)}
        className="my-2 px-5 py-2 rounded-xl text-[#00ff00] bg-[#212121]"
      />
      <div className="w-[80vw] overflow-y-auto h-[50vh]">
        <div className="bg-slate-900 grid grid-cols-4 p-5">
          <div className="text-white">Name</div>
          <div className="text-white">MT Total</div>
          <div className="text-white">Fee</div>
          <div className="text-white">Grand Total</div>
        </div>
        {ROWS}
      </div>
      <div className="flex gap-10">
        <div className="text-white my-5">
          MT Total :
          <span className="text-orange-500 text-[1.4em]">{MTGrand.toLocaleString("hi-in")}</span>
        </div>
        <div className="text-white my-5">
          Fee Total :
          <span className="text-orange-500 text-[1.4em]">{consultGrand.toLocaleString("hi-in")}</span>
        </div>
        <div className="text-white my-5">
          Grand Monthly Total :
          <span className="text-orange-500 text-[1.4em]">{totalGrand.toLocaleString("hi-in")}</span>
        </div>
      </div>
    </div>
  );
}
