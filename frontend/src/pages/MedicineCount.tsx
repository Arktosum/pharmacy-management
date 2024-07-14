import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import moment from "moment";
import { LogItem } from "../redux/logSlice";
import { isInMonth, regexUtil } from "../components/Utils";

export default function MedicineCount() {
  const [regexString, setregexString] = useState(".*");
  const [selectedDate, setselectedDate] = useState("");
  const dispatch = useAppDispatch();
  const currentDate = moment().format("YYYY-MM-DD");
  useEffect(() => {
    setselectedDate(currentDate);
  }, [currentDate, dispatch]);
  let LogData: LogItem[] = useAppSelector((state) => state.logs.data);
  LogData = LogData.filter((item) => isInMonth(selectedDate, item.id));

  const medicineCounts: { [key: string]: number } = {};
  for (const log of LogData) {
    if (log.type.toUpperCase() == "TRANSACTION") {
      const medicines = log.data.medicines;
      for (const medicine of medicines) {
        const name = medicine.name;
        const multiplier = medicine.multiplier;
        medicineCounts[name] = (medicineCounts[name] || 0) + multiplier;
      }
    }
  }

  let rowItems: [string, number][] = [];
  for (const name in medicineCounts) {
    if (regexUtil(regexString, name))
      rowItems.push([name, medicineCounts[name]]);
  }
  rowItems = rowItems.sort(
    (a: [string, number], b: [string, number]) => b[1] - a[1]
  );
  const rowElements = rowItems.map((item: [string, number]) => {
    const name = item[0];
    const count = item[1];
    return (
      <div key={name} className="grid grid-cols-2 w-full">
        <div className="text-green-300 w-full p-5">{name}</div>
        <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">
          {count}
        </div>
      </div>
    );
  });
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
      <h1 className="text-[2em] text-white text-bold text-center">
        Medicine Count (Monthly)
      </h1>
      <h1 className="text-[1.5em] text-white text-bold text-center">
        Month : {moment(selectedDate).format("MMM YY")}
      </h1>
      <div className="flex justify-evenly w-[50%]">
        <div className="flex justify-center items-center py-5 gap-5">
          <input
            type="text"
            value={regexString}
            onChange={(e) => {
              setregexString(e.target.value);
            }}
            className="py-1 rounded-sm bg-[#aae994] text-black px-2 font-bold text-[1.2em]"
          />
          <div
            onClick={() => {
              setregexString(".*");
            }}
            className="text-xl text-green-600 border-2 border-green-600 px-5 py-2 rounded-xl
          hover:bg-green-600 hover:text-black cursor-pointer duration-200"
          >
            Show Latest
          </div>
        </div>
        <input
          type="date"
          value={selectedDate}
          min={"2023-03-30"}
          max={currentDate}
          onChange={(e) => setselectedDate(e.target.value)}
          className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
        />
      </div>
      <div className="text-white flex flex-col text-center gap-5 p-5 h-[50vh] place-items-center overflow-y-auto">
        {rowElements}
      </div>
    </div>
  );
}
