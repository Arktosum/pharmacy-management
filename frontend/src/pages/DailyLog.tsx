import { useEffect, useState } from "react";
import { ORIGIN, isBetween, setState } from "../components/Utils";
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
import {
  deleteLogItem,
  LogItem,
  StockLog,
  updateLogItem,
} from "../redux/logSlice";
import moment from "moment";
import { updateStockCount } from "../redux/stockSlice";

export default function LogData() {
  const [excelData, setexcelData] = useState<[[string], [string]] | []>([]);
  const [selectedDate, setselectedDate] = useState("");
  const currentDate = moment().format("YYYY-MM-DD");

  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<LogItem | null>(null);

  const dispatch = useAppDispatch();
  useEffect(() => {
    setselectedDate(currentDate);
    axios.get(ORIGIN + "/excels/").then((response) => {
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
    for (const medicine of item.data.medicines) {
      mtTotal += medicine.price * medicine.multiplier;
    }
    grandMTtotal += mtTotal;
    grandFeeTotal += item.data.consultFee;
    grandTotal += item.data.consultFee + mtTotal;
    return (
      <div
        key={item.id}
        className="grid grid-cols-4 gap-5  hover:bg-slate-700 duration-200 cursor-pointer text-center"
        onClick={() => {
          setselectedItem(item);
          setshowModal(true);
        }}
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
  async function updateExcel(changes: any, source: string) {
    if (source === "loadData") return;
    if (changes == null) return;

    for (const change of changes) {
      const [x, y, , to] = change;
      excelData[x][y] = to;
    }
    const response = await axios.post(ORIGIN + "/excels/", [...excelData]);
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
      {showModal && selectedItem && (
        <Modal
          selectedItem={selectedItem}
          setselectedItem={setselectedItem}
          setshowModal={setshowModal}
        />
      )}
      <div className="w-[80vw] h-full">
        <input
          type="date"
          value={selectedDate}
          min={"2023-03-30"}
          max={currentDate}
          onChange={(e) => setselectedDate(e.target.value)}
          className="my-2 px-5 py-2 rounded-xl text-[#00ff00] bg-[#212121]"
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

interface ModalProps {
  selectedItem: LogItem;
  setselectedItem: setState<LogItem | null>;
  setshowModal: setState<boolean>;
}

function Modal({ selectedItem, setselectedItem, setshowModal }: ModalProps) {
  let feeTotal = 0;
  let MTTotal = 0;
  let itemCount = 0;
  MTTotal = selectedItem.data.MTtotal;
  itemCount = selectedItem.data.itemCount;
  feeTotal = selectedItem.data.consultFee;

  const dispatch = useAppDispatch();

  function undoItem(logItem: LogItem, stockItem: StockLog) {
    const choice = prompt("Sure to undo? (y/n)");
    if (choice && choice.toLowerCase() !== "y") return;
    dispatch(updateStockCount({ items: [stockItem], type: "UNDO" })); // use UpdateMany since it re-uses code.

    const newlogItem = {
      ...logItem,
      data: {
        ...logItem.data, // Patient name doesn't change
        itemCount: logItem.data.itemCount - stockItem.multiplier,
        MTtotal: logItem.data.MTtotal - stockItem.price * stockItem.multiplier,
        medicines: logItem.data.medicines.filter(
          (item) => item.id != stockItem.id
        ),
      },
    };
    if (newlogItem.data.medicines.length == 0) {
      dispatch(deleteLogItem(newlogItem));
    } else {
      dispatch(updateLogItem(newlogItem));
    }
    setselectedItem(null);
    setshowModal(false);
  }
  const infoItems = selectedItem
    ? selectedItem.data.medicines.map((item: StockLog) => {
        return (
          <ModalInfoItem
            undoItem={undoItem}
            item={item}
            selectedItem={selectedItem}
          />
        );
      })
    : [];

  return (
    <>
      <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center">
        <div className="bg-gray-800 h-[75%] w-[75%] rounded-lg">
          <div className="grid grid-cols-4 bg-slate-900 place-items-center rounded-lg text-xl">
            <div className="text-orange-400 uppercase text-md font-bold">
              Name
            </div>
            <div className="text-orange-400 uppercase text-md font-bold">
              Multiplier
            </div>
            <div className="text-orange-400 uppercase text-md font-bold">
              Price
            </div>
            <div
              onClick={() => {
                setselectedItem(null);
                setshowModal(false);
              }}
              className="text-green-600  uppercase px-5 py-5 m-5 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-white text-center cursor-pointer"
            >
              Cancel
            </div>
          </div>
          <div className="h-[50vh] overflow-y-auto flex flex-col gap-5">
            {infoItems}
          </div>
          <div className="grid grid-cols-4 place-items-center">
            <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
              Item Count: <span className="text-green-300 ">{itemCount}</span>
            </div>
            <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
              Fee Total: <span className="text-green-300">{feeTotal}</span>
            </div>
            <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
              MT Total: <span className="text-green-300">{MTTotal}</span>
            </div>
            <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
              Grand Total:{" "}
              <span className="text-green-300">{feeTotal + MTTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface ModalInfoItemProps {
  item: StockLog;
  selectedItem: LogItem;
  undoItem: (logItem: LogItem, stockItem: StockLog) => void;
}
function ModalInfoItem({ item, selectedItem, undoItem }: ModalInfoItemProps) {
  return (
    <>
      <div
        key={item.id}
        className="grid grid-cols-4 duration-200 h-[8%] rounded-md cursor-pointer place-items-center"
      >
        <div className="text-yellow-300 text-md font-bold">{item.name}</div>
        <div className="text-blue-400 text-[1.2em] font-bold">
          {item.multiplier}
        </div>
        <div className="text-green-400 text-[1.2em] font-bold">
          {item.price}
        </div>
        <div
          onClick={() => {
            undoItem(selectedItem, item);
          }}
          className="text-red-600 uppercase px-5 py-2 border-2 border-red-600 rounded-xl hover:bg-red-600 duration-200 hover:text-black text-center cursor-pointer"
        >
          undo
        </div>
      </div>
    </>
  );
}
