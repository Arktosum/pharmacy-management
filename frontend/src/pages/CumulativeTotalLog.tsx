import { useState, useMemo } from "react";
import { LogItem } from "../redux/logSlice";
import { useAppSelector } from "../hooks";
import moment from "moment";
import { regexUtil } from "../components/Utils";
import {
  Search,
  RotateCcw,
  Check,
  Trash2,
  X,
  Receipt,
  FileSpreadsheet,
  User,
} from "lucide-react";

export default function SearchLog() {
  const [regexString, setregexString] = useState(".*");
  const [billItemList, setbillItemList] = useState<LogItem[]>([]);
  const [receivedAmt, setreceivedAmt] = useState<number | "">(0);
  const [evalString, setevalString] = useState("");

  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<LogItem | null>(null);

  const LogData: LogItem[] = useAppSelector((state) => state.logs.data);

  // Set of selected log IDs for O(1) membership check & gray-out state
  const selectedIdSet = useMemo(
    () => new Set(billItemList.map((item) => item.id)),
    [billItemList]
  );

  // Filter logs and take top 100
  const stockItems = useMemo(() => {
    const list: {
      item: LogItem;
      date: string;
      time: string;
      patientName: string;
      itemCount: number;
    }[] = [];

    for (const item of LogData) {
      if (!item.data.patientName || item.data.patientName.trim() === "") continue;
      const passRegex = regexUtil(regexString, item.data.patientName);
      if (!passRegex) continue;

      const [date, time] = moment(parseInt(item.id))
        .format("DD-MM-YYYY HH:mm:ss")
        .split(" ");

      list.push({
        item,
        date,
        time,
        patientName: item.data.patientName,
        itemCount: item.data.itemCount || 0,
      });

      if (list.length >= 100) break;
    }
    return list;
  }, [LogData, regexString]);

  // Aggregate stats across selected items
  let grandFeeTotal = 0;
  let grandMTtotal = 0;
  let grandItemCount = 0;

  for (const item of billItemList) {
    grandFeeTotal += item.data.consultFee || 0;
    grandMTtotal += item.data.MTtotal || 0;
    grandItemCount += item.data.itemCount || 0;
  }
  const grandTotal = grandMTtotal + grandFeeTotal;
  const numReceived = typeof receivedAmt === "number" ? receivedAmt : 0;
  const balance = numReceived - grandTotal;

  function addevalString() {
    let sum = 0;
    const vals = evalString.split(" ");
    for (const v of vals) {
      const res = v === "" ? 0 : parseInt(v);
      if (!isNaN(res)) sum += res;
    }
    return sum;
  }

  // Selected item breakdown modal data
  let modalFeeTotal = 0;
  let modalMTtotal = 0;
  let modalItemCount = 0;
  if (selectedItem) {
    modalFeeTotal = selectedItem.data.consultFee || 0;
    modalMTtotal = selectedItem.data.MTtotal || 0;
    modalItemCount = selectedItem.data.itemCount || 0;
  }

  return (
    <div className="bg-slate-950 min-h-[90vh] h-[90vh] flex flex-col md:flex-row text-slate-100 select-none overflow-hidden">
      {/* -------------------- DETAIL MODAL -------------------- */}
      {showModal && selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-center items-center p-4"
          onClick={() => {
            setselectedItem(null);
            setshowModal(false);
          }}
        >
          <div
            className="bg-slate-900 border border-slate-700/80 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    {selectedItem.data.patientName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {moment(parseInt(selectedItem.id)).format(
                      "DD MMMM YYYY • hh:mm:ss A"
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setselectedItem(null);
                  setshowModal(false);
                }}
                className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Medicine List */}
            <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-12 text-sm font-bold uppercase tracking-wider text-rose-400">
              <div className="col-span-6">Medicine Name</div>
              <div className="col-span-3 text-center">Multiplier</div>
              <div className="col-span-3 text-right">Price</div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-slate-800/60 max-h-[45vh]">
              {selectedItem.data.medicines?.map((med) => (
                <div
                  key={med.id}
                  className="grid grid-cols-12 py-2 items-center font-bold"
                >
                  <div className="col-span-6 font-bold text-yellow-300 text-sm uppercase">
                    {med.name}
                  </div>
                  <div className="col-span-3 text-center font-bold text-cyan-400 text-sm">
                    {med.multiplier}
                  </div>
                  <div className="col-span-3 text-right font-bold text-emerald-400 text-sm">
                    {med.price}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Summary Footer */}
            <div className="bg-slate-950 border-t border-slate-800 p-3 grid grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                <span className="block text-xs uppercase text-slate-300 font-bold mb-0.5">
                  Item Count
                </span>
                <span className="text-xl font-black text-blue-400">
                  {modalItemCount}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                <span className="block text-xs uppercase text-slate-300 font-bold mb-0.5">
                  Fee
                </span>
                <span className="text-xl font-black text-amber-400">
                  {modalFeeTotal}
                </span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
                <span className="block text-xs uppercase text-slate-300 font-bold mb-0.5">
                  MT Total
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {modalMTtotal}
                </span>
              </div>
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                <span className="block text-xs uppercase text-emerald-300 font-bold mb-0.5">
                  Grand Total
                </span>
                <span className="text-xl font-black text-emerald-300">
                  {modalFeeTotal + modalMTtotal}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- LEFT COLUMN: LOG SEARCH & SELECTION -------------------- */}
      <div className="w-full md:w-[32%] xl:w-[28%] flex flex-col h-full border-r border-slate-800/80 bg-slate-950/40">
        {/* Header & Title */}
        <div className="p-4 sm:p-5 border-b border-slate-800/70 shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <Receipt className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-white tracking-wide">
                Cumulative Total
              </h1>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Showing top {stockItems.length}
            </div>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={regexString}
                onChange={(e) => setregexString(e.target.value)}
                placeholder="Search patient..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/80 transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setregexString(".*")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 transition shrink-0 active:scale-95"
              title="Reset query to show latest logs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show Latest</span>
            </button>
          </div>
        </div>

        {/* Table Column Headers */}
        <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 text-sm font-bold uppercase tracking-wider text-rose-400 shrink-0">
          <div className="col-span-5">Date & Time</div>
          <div className="col-span-5">Patient Name</div>
          <div className="col-span-2 text-right">Items</div>
        </div>

        {/* Scrollable List of Logs */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
          {stockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
              <Search className="w-8 h-8 opacity-40" />
              <span>No matching patients found</span>
            </div>
          ) : (
            stockItems.map(({ item, date, time, patientName, itemCount }) => {
              const isSelected = selectedIdSet.has(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isSelected) {
                      // Already selected -> remove it on click as toggle
                      setbillItemList((prev) =>
                        prev.filter((x) => x.id !== item.id)
                      );
                      return;
                    }
                    setbillItemList((prev) => [...prev, item]);
                  }}
                  className={`grid grid-cols-12 items-center px-3 py-2 rounded-xl cursor-pointer transition border ${
                    isSelected
                      ? "bg-slate-900/40 border-slate-800/60 opacity-45 cursor-pointer hover:opacity-65"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-200"
                  }`}
                >
                  <div className="col-span-5 font-mono text-slate-400 flex flex-col font-bold">
                    <span className={isSelected ? "text-slate-500" : "text-amber-400/90 font-bold text-xs"}>
                      {date}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">{time}</span>
                  </div>

                  <div className="col-span-5 flex items-center gap-2 overflow-hidden pr-2">
                    <span
                      className={`truncate text-sm font-bold uppercase ${
                        isSelected
                          ? "line-through text-slate-500"
                          : "text-yellow-300"
                      }`}
                    >
                      {patientName}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        <Check className="w-3 h-3" /> Added
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-black ${
                        isSelected
                          ? "bg-slate-800 text-slate-500"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {itemCount}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* -------------------- RIGHT COLUMN: SELECTED BILLS & TOTALS -------------------- */}
      <div className="w-full md:w-[68%] xl:w-[72%] flex flex-col h-full bg-slate-950/80 overflow-hidden">
        {/* Section Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Selected Patient Bills
              </h2>
              <span className="text-xs text-slate-400">
                {billItemList.length} {billItemList.length === 1 ? "bill" : "bills"} selected
              </span>
            </div>
          </div>

          {billItemList.length > 0 && (
            <button
              type="button"
              onClick={() => setbillItemList([])}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg border border-rose-500/20 transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>

        {/* Selected Items Table Header */}
        <div className="grid grid-cols-10 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-sm font-bold uppercase tracking-wider text-rose-400 shrink-0 text-center">
          <div className="col-span-2 text-left">Name</div>
          <div className="col-span-2">MT Total</div>
          <div className="col-span-2">MT Fee</div>
          <div className="col-span-2">MT Count</div>
          <div className="col-span-2">Grand Total</div>
        </div>

        {/* Selected Items Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1">
          {billItemList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
              <Receipt className="w-8 h-8 opacity-40" />
              <span>Click on any patient on the left to add to total</span>
            </div>
          ) : (
            billItemList.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setselectedItem(item);
                  setshowModal(true);
                }}
                className="grid grid-cols-10 items-center px-4 py-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl duration-150 cursor-pointer text-center group font-bold"
              >
                <div className="col-span-2 text-left font-bold text-yellow-300 text-sm uppercase truncate pr-2">
                  <span className="truncate">{item.data.patientName}</span>
                </div>
                <div className="col-span-2 font-bold text-emerald-400 text-base">
                  {item.data.MTtotal || 0}
                </div>
                <div className="col-span-2 font-bold text-amber-400 text-base">
                  {item.data.consultFee || 0}
                </div>
                <div className="col-span-2 font-black text-blue-400 text-lg">
                  {item.data.itemCount || 0}
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2 font-bold text-emerald-300 text-base">
                  <span>{(item.data.consultFee || 0) + (item.data.MTtotal || 0)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setbillItemList((prev) =>
                        prev.filter((x) => x.id !== item.id)
                      );
                    }}
                    className="p-1 rounded-lg text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition active:scale-95 ml-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* -------------------- STATS & TOTALS DOCK -------------------- */}
        <div className="p-4 bg-slate-900 border-t border-slate-800/90 shrink-0 flex flex-col gap-4">
          {/* Top Row: Grand Items Count, MT Total, Grand Total, Received, Balance */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60">
              <span className="text-white text-base font-bold pl-1">Item Count</span>
              <span className="text-black font-bold text-[1.4em] bg-[#ff8a1d] px-3 py-0.5 rounded-md">
                {grandItemCount}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60">
              <span className="text-white text-base font-bold pl-1">MT Total</span>
              <span className="text-black font-bold text-[1.4em] bg-[#d8ff15] px-3 py-0.5 rounded-md">
                {grandMTtotal}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60">
              <span className="text-white text-base font-bold pl-1">GTotal</span>
              <span className="text-black font-bold text-[1.4em] bg-[#f886dd] px-3 py-0.5 rounded-md">
                {grandTotal}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60">
              <span className="text-white text-base font-bold pl-1">Received:</span>
              <input
                type="number"
                min="0"
                className={`text-black text-center font-bold text-[1.4em] ${
                  numReceived > 0 ? "pulse-red-green" : "bg-green-300"
                } w-24 py-0.5 rounded-md focus:outline-none`}
                value={receivedAmt}
                onChange={(e) => {
                  const val = e.target.value;
                  setreceivedAmt(val === "" ? "" : Number(val));
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800/60">
              <span className="text-white text-base font-bold pl-1">Balance</span>
              <span className="text-black font-bold text-[1.4em] bg-yellow-300 px-3 py-0.5 rounded-md">
                {balance}
              </span>
            </div>
          </div>

          {/* Quick Evaluator Strip matching Checkout bottom style */}
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="e.g. 50 100 250"
              value={evalString}
              onChange={(e) => setevalString(e.target.value)}
              className="bg-orange-300 py-1.5 rounded-xl text-[1.2em] px-4 font-bold text-black placeholder:text-orange-950/60 placeholder:font-semibold focus:outline-none w-80 sm:w-96"
            />
            <div className="text-black font-bold text-[1.4em] bg-yellow-300 px-5 py-0.5 rounded-md">
              {addevalString()}
            </div>
            <div className="text-white text-base font-bold flex">Rounded</div>
            <div className="text-black font-bold text-[1.2em] bg-[#f886dd] text-center px-5 py-0.5 rounded-md">
              {grandTotal % 100 === 20 ||
              grandTotal % 100 === 40 ||
              grandTotal % 100 === 70 ||
              grandTotal % 100 === 90
                ? grandTotal + 10
                : grandTotal}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
