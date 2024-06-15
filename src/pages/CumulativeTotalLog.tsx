import { useState } from "react";
import { LogItem } from "../redux/logSlice";
import { useAppSelector } from "../hooks";
import moment from "moment";
import { regexUtil } from "../components/Utils";
import { deleteSVG } from "../assets/assets";

export default function SearchLog() {
  const [regexString, setregexString] = useState(".*");
  const [billItemList, setbillItemList] = useState<LogItem[] | []>([]);
  const [receivedAmt, setreceivedAmt] = useState(0);
  const [evalString, setevalString] = useState("");

  const [showModal, setshowModal] = useState(false);
  const [selectedItem, setselectedItem] = useState<LogItem | null>(null);

  const LogData: LogItem[] = useAppSelector((state) => state.logs.data);

  let stockItems = [];
  for (const item of LogData) {
    let infoString = "Something went wrong";
    const [date, time] = moment(parseInt(item.id))
      .format("DD-MM-YYYY HH:mm:ss")
      .split(" ");
    const ind = billItemList.findIndex((x) => x.id == item.id);
    if (ind != -1) continue;
    if (item.type.toUpperCase() == "TRANSACTION") {
      infoString = `${item.data.patientName} || ${item.data.medicines.length}`;
    }
    if (item.data.patientName == "") continue;
    const passRegex: boolean = regexUtil(regexString, item.data.patientName);
    if (!passRegex) continue;
    const jsxElement = (
      <div
        key={item.id}
        onClick={() => {
          // Add if item not already exists
          const index = billItemList.findIndex(
            (billItem) => billItem.id == item.id
          );
          if (index == -1) setbillItemList((prev) => [...prev, item]);
        }}
        className="grid grid-cols-2 hover:bg-[#252525] duration-200 rounded-md py-1 cursor-pointer text-center"
      >
        <div className="text-white text-md font-bold">
          <span className="text-yellow-400">{date}</span>,<span>{time}</span>
        </div>
        <div className="text-md font-bold text-green-300">{infoString}</div>
      </div>
    );
    stockItems.push(jsxElement);
  }
  stockItems = stockItems.slice(0, 100); // Show only best 100
  let grandFeeTotal = 0;
  let grandMTtotal = 0;

  const billItems = billItemList.map((item) => {
    grandFeeTotal += item.data.consultFee;
    grandMTtotal += item.data.MTtotal;
    return (
      <div
        key={item.id}
        onClick={() => {
          setselectedItem(item);
          setshowModal(true);
        }}
        className="grid grid-cols-5 place-items-center hover:bg-[#252525] duration-200 rounded-md px-5 py-0 cursor-pointer text-center"
      >
        <div className="text-yellow-300 text-sm text-center font-bold">
          {item.data.patientName}
        </div>
        <div className="text-green-400 text-[1.2em] font-bold">
          {item.data.MTtotal}
        </div>
        <div className="text-yellow-400  text-[1.3em] font-bold">
          {item.data.consultFee}
        </div>
        <div className="text-yellow-400  text-[1.3em] font-bold">
          {item.data.consultFee + item.data.MTtotal}
        </div>
        <div
          className="text-white text-[1.2em] font-bold"
          onClick={(e) => {
            e.stopPropagation();
            const newList = billItemList.filter((x) => x.id !== item.id);
            setbillItemList([...newList]);
          }}
        >
          {deleteSVG}
        </div>
      </div>
    );
  });
  function addevalString() {
    let sum = 0;
    const vals = evalString.split(" ");
    for (const v of vals) {
      const res = v == "" ? 0 : parseInt(v);
      sum += res;
    }
    return sum;
  }

  const infoItems = selectedItem
    ? selectedItem.data.medicines.map((item) => {
        return (
          <div
            key={item.id}
            className="grid grid-cols-5 duration-200 h-[8%] rounded-md cursor-pointer place-items-center"
          >
            <div className="text-yellow-300 text-md font-bold">{item.name}</div>
            <div className="text-blue-400 text-[1.2em] font-bold">
              {item.multiplier}
            </div>
            <div className="text-green-400 text-[1.2em] font-bold">
              {item.price}
            </div>
          </div>
        );
      })
    : [];

  let feeTotal = 0;
  let MTtotal = 0;
  let itemCount = 0;
  if (selectedItem) {
    feeTotal = selectedItem.data.consultFee;
    MTtotal = selectedItem.data.MTtotal;
    itemCount = selectedItem.data.itemCount;
  }

  return (
    <div className="bg-black h-[90vh] flex">
      {/*---------------------------------------------------------- Transaction ---------------------------------------------------------- */}
      {showModal && selectedItem ? (
        <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center">
          <div className="bg-gray-600 h-[75%] w-[75%] rounded-xl">
            <div className="grid grid-cols-5 bg-slate-900 place-items-center">
              <div className="text-orange-400 uppercase text-sm font-bold">
                Name
              </div>
              <div className="text-orange-400 uppercase text-sm font-bold">
                30ml
              </div>
              <div className="text-orange-400 uppercase text-sm font-bold">
                Multiplier
              </div>
              <div className="text-orange-400 uppercase text-sm font-bold">
                Price
              </div>
              <div
                onClick={() => {
                  setselectedItem(null);
                  setshowModal(false);
                }}
                className="text-green-600 uppercase px-5 py-5 m-5 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-white text-center cursor-pointer"
              >
                Cancel
              </div>
            </div>
            <div className="h-[50vh] overflow-y-auto">{infoItems}</div>
            <div className="grid grid-cols-5 place-items-center">
              <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
                Item Count: <span className="text-green-300 ">{itemCount}</span>
              </div>
              <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
                Fee Total: <span className="text-green-300">{feeTotal}</span>
              </div>
              <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
                MT Total: <span className="text-green-300">{MTtotal}</span>
              </div>
              <div className="text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl">
                Grand Total:{" "}
                <span className="text-green-300">{feeTotal + MTtotal}</span>
              </div>
              <div></div>
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}
      <div className="border-black w-[50vw] h-full">
        <h1 className="text-[3em] text-white text-bold text-center">
          Cumulative Total
        </h1>
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
            hover:bg-green-600 hover:text-black cursor-pointer duration-200
            "
          >
            Show Latest
          </div>
        </div>
        <div className="grid grid-cols-2 bg-slate-900 p-5 text-center">
          <div className="text-white text-md font-bold">DateTime</div>
          <div className="text-white text-md font-bold">Name</div>
        </div>
        <div className="h-[50vh] overflow-y-auto">{stockItems}</div>
      </div>
      <div className="border-2 border-l-green-600 border-black w-[50vw] h-full">
        {/*---------------------------------------------------------- LogSearch ---------------------------------------------------------- */}
        <h1 className="text-[3em] text-white text-bold text-center"></h1>
        <div className="grid grid-cols-5 bg-slate-900 p-5 text-center">
          <div className="text-white text-md font-bold">Name</div>
          <div className="text-white text-md font-bold">MT Total</div>
          <div className="text-white text-md font-bold">Fee</div>
          <div className="text-white text-md font-bold">Grand Total</div>
          <div className="text-white text-md font-bold"></div>
        </div>
        <div className="h-[60vh] overflow-y-auto">{billItems}</div>
        <div className="grid grid-cols-3  p-5 text-center">
          <div className="flex items-center justify-center text-center gap-5">
            <div className="text-white">Fee Total :</div>
            <div className="text-black font-bold text-[1.2em] bg-yellow-300 w-[50%] px-5 rounded-md">
              {grandFeeTotal}
            </div>
          </div>
          <div className="flex items-center justify-center text-center gap-5">
            <div className="text-white">MT Total </div>
            <div className="text-black font-bold text-[1.2em] bg-orange-300 w-[50%] px-5 rounded-md">
              {grandMTtotal}
            </div>
          </div>
          <div className="flex items-center justify-center text-center gap-5">
            <div className="text-white">Grand Total :</div>
            <div className="text-black font-bold text-[1.2em] bg-[#f886dd] w-[50%] px-5 rounded-md">
              {grandMTtotal + grandFeeTotal}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5 place-items-center">
          <div className="flex items-center justify-center text-center gap-5">
            <div className="text-white">GTotal</div>
            <div className="text-black font-bold text-[1.4em] bg-[#f886dd] w-[50%] px-5 rounded-md">
              {grandMTtotal + grandFeeTotal}
            </div>
          </div>
          <div className="flex items-center text-center gap-5">
            <span className="text-white">Received: </span>
            <input
              type="text"
              className="text-black text-center font-bold text-[1.4em] bg-green-300 w-[50%] px-1 rounded-md"
              value={receivedAmt}
              onChange={(e) => {
                const val = e.target.value;
                let res;
                if (val == "") res = 0;
                else res = parseInt(val);
                setreceivedAmt(res);
              }}
            />
          </div>
          <div className="flex items-center text-center gap-5">
            <span className="text-white">Balance </span>
            <span className="text-black font-bold text-[1.4em] bg-yellow-300 w-full  px-5 rounded-md">
              {receivedAmt - (grandMTtotal + grandFeeTotal)}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center text-center gap-5 m-5">
          <input
            className="bg-orange-300 py-1 rounded-xl text-[1.2em] px-2 font-bold"
            type="text"
            value={evalString}
            onChange={(e) => {
              setevalString(e.target.value);
            }}
          />
          <div className="text-black font-bold text-[1.4em] bg-yellow-300 px-5 rounded-md">
            {addevalString()}
          </div>
        </div>
      </div>
    </div>
  );
}
