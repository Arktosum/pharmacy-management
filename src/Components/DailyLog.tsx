import { useEffect, useState } from "react";
import { ORIGIN, isBetween } from "./Utils";
import "handsontable/dist/handsontable.full.min.css";
import { registerAllModules } from "handsontable/registry";
import { HyperFormula } from "hyperformula";

const hyperformulaInstance = HyperFormula.buildEmpty({
  licenseKey: "internal-use-in-handsontable",
});

registerAllModules();
import { HotTable } from "@handsontable/react";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../hooks";
import { LogItem, fetchLogs } from "../features/logSlice";
import moment from "moment";

export default function LogData() {
  const [excelData, setexcelData] = useState<[[string], [string]] | []>([]);
  const [selectedDate, setselectedDate] = useState("");
  const currentDate = moment().format("YYYY-MM-DD");

  const dispatch = useAppDispatch();
  useEffect(() => {
    setselectedDate(currentDate);
    dispatch(fetchLogs());
    axios.get(ORIGIN + "/api/excels/").then((response) => {
      setexcelData(response.data);
    });
  }, [currentDate, dispatch]);
  let LogData: LogItem[] = useAppSelector((state) => state.logs.data);
  LogData = LogData.filter((item) =>
    isBetween(selectedDate, selectedDate, item.id)
  );
  LogData = LogData.sort(
    (a: LogItem, b: LogItem) => parseInt(a.id) - parseInt(b.id)
  );

  let grandMTtotal = 0;
  let grandFeeTotal = 0;
  let grandTotal = 0;

  const rowData = LogData.map((item) => {
    let mtTotal = 0;
    for (const medicine of item.data.medicine) {
      mtTotal += medicine.price * medicine.multiplier;
    }
    grandMTtotal += mtTotal;
    grandFeeTotal += item.data.consultFee;
    grandTotal += item.data.consultFee + mtTotal;
    return (
      <div
        key={item.id}
        className="grid grid-cols-4 gap-5  hover:bg-slate-700 duration-200 cursor-pointer text-center"
      >
        <div className="text-yellow-300 text-[1em]">
          {item.data.patientName}
        </div>
        <div className="text-green-300 text-[1em]">{mtTotal}</div>
        <div className="text-yellow-300 text-[1em]">{item.data.consultFee}</div>
        <div className="text-green-300 text-[1em]">
          {item.data.consultFee + mtTotal}
        </div>
      </div>
    );
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function updateExcel(change: any, source: string) {
    if (source === "loadData") return;
    if (change == null) return;

    for (const changes of change) {
      const [x, y, , to] = changes;
      excelData[x][y] = to;
    }
    const response = await axios.post(ORIGIN + "/api/excels/", [...excelData]);
    setexcelData(response.data);
  }
  return (
    <div className="h-[90vh] bg-black flex">
      <div className="w-[25vw] h-full overflow-auto">
        <HotTable
          data={excelData}
          rowHeaders={true}
          colHeaders={true}
          height="auto"
          className="custom-table"
          comments={true}
          stretchH="all"
          rowHeights={20}
          formulas={{
            engine: hyperformulaInstance,
          }}
          cell={[
            {
              row: 40,
              col: 1,
              className: "custom-cell",
            },
            {
              row: 0,
              col: 0,
              className: "custom-cell-2",
            },
            {
              row: 0,
              col: 1,
              className: "custom-cell",
            },
          ]}
          manualRowResize={true}
          manualColumnResize={true}
          copyPaste={{
            copyColumnHeaders: true,
            copyColumnGroupHeaders: true,
            copyColumnHeadersOnly: true,
          }}
          contextMenu={true}
          afterChange={updateExcel}
          licenseKey="non-commercial-and-evaluation" // for non-commercial use only
        />
      </div>
      <div className="w-[80vw] h-full">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setselectedDate(e.target.value)}
          className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
        />
        <div className="bg-slate-900 grid grid-cols-4 py-5 text-center">
          <div className="text-white">Name</div>
          <div className="text-white">MT Total</div>
          <div className="text-white">Fee</div>
          <div className="text-white">Grand Total</div>
        </div>
        <div className="h-[60vh] overflow-y-auto">{rowData}</div>
        <div className="grid grid-cols-4 my-10 bg-slate-900 py-2 p-2 text-center">
          <div className="text-yellow-300 text-[1.2em]">Total</div>
          <div className="text-orange-300 text-[1.2em]">
            {grandMTtotal.toLocaleString("hi-in")}
          </div>
          <div className="text-orange-300 text-[1.2em]">
            {grandFeeTotal.toLocaleString("hi-in")}
          </div>
          <div className="text-orange-300 text-[1.2em]">
            {grandTotal.toLocaleString("hi-in")}
          </div>
        </div>
      </div>
    </div>
  );
}
