import { useEffect, useState } from "react";
import { ORIGIN, isBetween, setState } from "../components/Utils";

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

function ExcelColumns({ excelData, setexcelData }) {
  function updateColumns(row, col, val) {
    excelData[row][col] = val;
    axios.post(ORIGIN + "/excels/", excelData).then((response) => {
      setexcelData(response.data);
    });
  }

  let sum1: number = 0;
  for (const item of excelData) {
    if (item[1] == "") continue;
    sum1 += parseInt(item[1]);
  }
  const numRows = 50;
  const rows0 = [
    <div
      key={-2}
      className="bg-red-300 border-gray-300 w-[15vw] border-[1px] font-extrabold"
    >
      Name
    </div>,
  ];
  const rows1 = [
    <div
      key={-1}
      className="bg-yellow-300 border-gray-300 w-[3.9vw] border-[0.5px] font-extrabold"
    >
      {sum1}
    </div>,
  ];
  for (let i = 0; i < numRows; i++) {
    rows0.push(
      <input
        key={i}
        className="bg-[#d2fafc] border-gray-300  w-[15vw] border-[0.5px] font-extrabold"
        onChange={(e) => {
          updateColumns(i, 0, e.target.value);
        }}
        value={excelData[i][0]}
      />
    );
  }

  for (let i = 0; i < numRows; i++) {
    rows1.push(
      <input
        key={i}
        className="bg-[#d2fafc] border-gray-300 w-[3.9vw] border-[0.5px] font-extrabold"
        onChange={(e) => {
          updateColumns(i, 1, e.target.value);
        }}
        value={excelData[i][1]}
      />
    );
  }

  return (
    <div className="flex w-full ">
      <div>{rows0}</div>
      <div>{rows1}</div>
    </div>
  );
}
export default function LogData() {
  const [excelData, setexcelData] = useState<[[string], [string]] | []>([]);
  const [selectedDate, setselectedDate] = useState("");
  const currentDate = moment().format("YYYY-MM-DD");
  const [selectedID, setSelectedID] = useState<Set<string>>(new Set());
  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<LogItem | null>(null);
  const [filteredLogData, setFilteredLogData] = useState<LogItem[]>([]);
  const dispatch = useAppDispatch();
  useEffect(() => {
    setselectedDate(currentDate);
    axios.get(ORIGIN + "/excels/").then((response) => {
      setexcelData(response.data);
    });
  }, [currentDate, dispatch]);

  const LogData: LogItem[] = useAppSelector((state) => state.logs.data);
  useEffect(() => {
    let new_data = LogData.filter((item) =>
      isBetween(selectedDate, selectedDate, item.id)
    );
    new_data = new_data.sort(
      (a: LogItem, b: LogItem) => parseInt(a.id) - parseInt(b.id)
    );
    setFilteredLogData(new_data);
  }, [LogData, selectedDate]);

  let grandMTtotal = 0;
  let grandFeeTotal = 0;
  let grandTotal = 0;

  const rowData = filteredLogData.map((item) => {
    let mtTotal = 0;
    for (const medicine of item.data.medicines) {
      mtTotal += medicine.price * medicine.multiplier;
    }
    const isConsidered = !selectedID.has(item.id);
    if (isConsidered) {
      // Only add if not present!
      grandMTtotal += mtTotal;
      grandFeeTotal += item.data.consultFee;
      grandTotal += item.data.consultFee + mtTotal;
    }
    return (
      <div
        key={item.id}
        className="grid grid-cols-5 gap-5 place-items-center hover:bg-slate-700 duration-200 cursor-pointer text-center"
        onClick={(e: React.MouseEvent<HTMLInputElement>) => {
          e.stopPropagation();
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
        <div
          className={`w-7 h-7 ${
            isConsidered ? "bg-[#bfefa7]" : "bg-[#e6a2d5]"
          }  rounded-sm`}
          onClick={(e: React.MouseEvent<HTMLInputElement>) => {
            e.stopPropagation();
            if (!isConsidered) {
              // Should be considered.
              setSelectedID((prev) => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            } else {
              // should not be considered.
              setSelectedID((prev) => new Set(prev).add(item.id));
            }
          }}
        />
      </div>
    );
  });
  return (
    <div className="h-[90vh] bg-black flex">
      <div className="w-[20vw] h-full overflow-y-auto borderize overflow-x-clip">
        {excelData.length > 0 && (
          <ExcelColumns excelData={excelData} setexcelData={setexcelData} />
        )}
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
        <div className="bg-slate-900 grid grid-cols-5 py-5 text-center">
          <div className="text-white">Name</div>
          <div className="text-white">MT Total</div>
          <div className="text-white">Fee</div>
          <div className="text-white">Grand Total</div>
          <div className="text-white">Select</div>
        </div>
        <div className="h-[60vh] overflow-y-auto flex flex-col gap-2">
          {rowData}
        </div>
        <div className="grid grid-cols-5 my-10 bg-slate-900 py-2 p-2 text-center">
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
