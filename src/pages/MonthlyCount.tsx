import { useEffect, useState } from "react";
import { LogItem } from "../redux/logSlice";
import { useAppDispatch, useAppSelector } from "../hooks";
import moment from "moment";
import { isInMonth, isInYear } from "../components/Utils";

export default function Monthly() {
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
  const dailyTally: Record<string, number> = {};
  let monthlyCount = 0;
  for (const item of LogData) {
    const thisDate = moment(parseInt(item.id)).format("YYYY-MM-DD");
    for (const medicine of item.data.medicines) {
      dailyTally[thisDate] = (dailyTally[thisDate] || 0) + medicine.multiplier;
    }
  }
  const rowElements: JSX.Element[] = [];
  for (const date in dailyTally) {
    monthlyCount += dailyTally[date];
    rowElements.push(
      <div key={date} className="grid grid-cols-2 w-full">
        <div className="text-green-300 w-full p-5">
          {moment(date).format("DD-MM-YYYY")}
        </div>
        <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">
          {dailyTally[date]}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
      <h1 className="text-[3em] text-white text-bold text-center">
        Monthly Count
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
        className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
      />
      <div className="text-white flex flex-col text-center gap-5 p-5 h-[50vh] place-items-center overflow-y-auto">
        {rowElements}
      </div>
      <div className="text-white my-5">
        Monthly Total :
        <span className="text-[#ff00ff] text-[1.2em]">{monthlyCount}</span>
      </div>
    </div>
  );
}
