import { useEffect, useState } from "react";
import {
  LogItem,
  StockLog,
  deleteLogItem,
  updateLogItem,
} from "../redux/logSlice";
import { useAppSelector, useAppDispatch } from "../hooks";
import { updateStockCount } from "../redux/stockSlice";
import moment from "moment";
import { isBetween } from "../components/Utils";

export default function Log() {
  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<LogItem | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, settoDate] = useState("");
  const [patientName, setpatientName] = useState("");
  const LogData: LogItem[] = useAppSelector((state) => state.logs.data);
  const dispatch = useAppDispatch();
  const currentDate = moment().format("YYYY-MM-DD");

  useEffect(() => {
    setFromDate(currentDate);
    settoDate(currentDate);
  }, [currentDate, dispatch]);

  const filterLog = LogData.filter((item) =>
    isBetween(fromDate, toDate, item.id)
  );
  const logElements = filterLog.map((item) => {
    const regex = new RegExp(patientName);
    const search = regex.test(item.data.patientName);
    if (patientName != "" && !search) return;
    const id = item.id;
    let infoString = "Something went wrong";
    const [date, time] = moment(parseInt(id))
      .format("DD-MM-YYYY HH:mm:ss")
      .split(" ");
    if (item.type.toUpperCase() == "TRANSACTION") {
      const itemCount = item.data.itemCount;
      infoString = `${item.data.patientName} || ${itemCount}`;
    }
    return (
      <div
        key={id}
        onClick={() => {
          setselectedItem(item);
          setshowModal(true);
        }}
        className="grid grid-cols-3 hover:bg-[#252525] duration-200 rounded-md p-5 cursor-pointer text-center"
      >
        <div className="text-white text-md font-bold">
          <span className="text-yellow-400">{date}</span>,<span>{time}</span>
        </div>
        <div className="text-white text-md font-bold">
          {item.type.toUpperCase()}
        </div>
        <div className="text-white text-md font-bold">{infoString}</div>
      </div>
    );
  });

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
    ? selectedItem.data.medicines.map((item) => {
        return (
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
        );
      })
    : [];

  let feeTotal = 0;
  let MTTotal = 0;
  let itemCount = 0;
  if (selectedItem) {
    (MTTotal = selectedItem.data.MTtotal),
      (itemCount = selectedItem.data.itemCount),
      (feeTotal = selectedItem.data.consultFee);
  }
  return (
    <div className="bg-black h-[90vh] flex flex-col">
      {/*---------------------------------------------------------- Logs ---------------------------------------------------------- */}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {showModal && selectedItem ? (
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
      ) : (
        <></>
      )}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      <h1 className="text-[3em] text-white text-bold text-center">
        Patient Logs
      </h1>
      <div className="flex justify-around text-white">
        <div className="flex gap-5 items-center">
          <label>From Date:</label>
          <input
            type="date"
            value={fromDate}
            min={"2023-03-30"}
            max={currentDate}
            onChange={(e) => {
              setFromDate(e.target.value);
            }}
            className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
          />
        </div>
        <div className="flex gap-5 items-center">
          <label>To Date:</label>
          <input
            type="date"
            value={toDate}
            min={"2023-03-30"}
            max={currentDate}
            onChange={(e) => {
              settoDate(e.target.value);
            }}
            className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
          />
        </div>
        <div className="flex gap-5 items-center">
          <label>Search Patient: </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => {
              setpatientName(e.target.value);
            }}
            className="my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 bg-slate-900 p-5 text-center">
        <div className="text-white text-md font-bold">DateTime</div>
        <div className="text-white text-md font-bold">Type</div>
        <div className="text-white text-md font-bold">Info</div>
      </div>
      <div className="h-[50vh] overflow-y-auto">{logElements}</div>
    </div>
  );
}
