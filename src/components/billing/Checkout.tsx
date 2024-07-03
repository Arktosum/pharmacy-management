import { useState } from "react";
import { BillingStateType, setState, updateLocalStorage } from "../Utils";
import { BillItem } from "./BillItem";
interface CheckoutProps {
  billingState: BillingStateType;
  setbillingState: setState<BillingStateType>;
  enableTransaction: boolean;
}
export function Checkout({ props }: { props: CheckoutProps }) {
  const { billingState, setbillingState } = props;
  const [evalString, setevalString] = useState("");
  const [receivedAmt, setreceivedAmt] = useState(0);

  function addevalString() {
    if (evalString == "") return 0;
    const vals = evalString.replaceAll(" ", "+");
    try {
      const finalValue = eval(vals).toFixed(2);
      const [decimal, fractional] = finalValue.split(".");
      if (fractional == "00") return decimal;
      return finalValue;
    } catch {
      return 0;
    }
  }

  let itemCount = 0;
  let total = 0;
  const billItems = billingState.itemList.map((item) => {
    itemCount += item.multiplier;
    total += item.multiplier * item.price;
    return (
      <BillItem
        props={{
          billingState,
          item,
          setbillingState,
        }}
        key={item.id}
      />
    );
  });
  const Gtotal = total + billingState.consultFee;
  const change = Gtotal % 100;
  const hasChange =
    change == 20 || change == 40 || change == 70 || change == 90;
  return (
    <div className="border-black w-[50vw] h-full">
      <h1 className="text-[3em] text-white text-bold text-center">Checkout</h1>
      <div className="grid grid-cols-6 bg-slate-900 p-5 text-center">
        <div className="text-white text-md font-bold">Name</div>
        <div className="text-white text-md font-bold">Remaining</div>
        <div className="text-white text-md font-bold">Multiplier</div>
        <div className="text-white text-md font-bold">Price</div>
        <div className="text-white text-md font-bold">Total</div>
        <div className="text-white text-md font-bold"></div>
      </div>
      <div className="h-[40vh] overflow-y-auto">{billItems}</div>
      <div className="flex flex-col gap-5 m-5">
        <div className="grid grid-cols-3 gap-5">
          <div className="flex items-center text-center gap-5 ">
            <span className="text-white">Patient Name: </span>
            <input
              type="text"
              className="bg-green-300 w-full text-black font-bold text-[1.4em] rounded-lg px-5"
              value={billingState.patientName}
              onChange={(e) => {
                billingState.patientName = e.target.value;
                setbillingState({ ...billingState });
                updateLocalStorage(billingState);
              }}
            />
          </div>
          <div className="flex items-center text-center gap-5">
            <span className="text-white">Item Count : </span>
            <span className="text-black font-bold text-[1.4em] bg-[#ff8a1d] w-[25%] px-5 rounded-md">
              {itemCount}
            </span>
          </div>
          <div className="flex items-center text-center gap-5 w-[75%]">
            <span className="text-white">Fee </span>
            <input
              type="number"
              min="0"
              value={billingState.consultFee}
              onChange={(e) => {
                const val = e.target.value;
                let res;
                if (val == "") res = 0;
                else res = parseInt(val);

                const consultFee = res;
                billingState.consultFee = consultFee;
                setbillingState({ ...billingState });
                updateLocalStorage(billingState);
              }}
              className="text-black no-arrow font-bold text-[1.4em] w-[75%] bg-blue-300 px-5 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-5">
          <div className="flex items-center text-center gap-5">
            <div className="text-white">MT Total</div>
            <div className="text-black font-bold text-[1.4em] bg-[#d8ff15] w-[50%] px-5 rounded-md">
              {total}
            </div>
          </div>
          <div className="flex items-center text-center gap-5">
            <div className="text-white">GTotal</div>
            <div className="text-black font-bold text-[1.4em] bg-[#f886dd] w-[50%] px-5 rounded-md">
              {total + billingState.consultFee}
            </div>
          </div>
          <div className="flex items-center text-center gap-5">
            <span className="text-white">Received: </span>
            <input
              type="text"
              className="text-black text-center font-bold text-[1.4em] bg-green-300 w-full px-1 rounded-md"
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
              {receivedAmt - (total + billingState.consultFee)}
            </span>
          </div>
        </div>
        <div className="flex items-center text-center gap-5">
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
          <div className="text-white flex">Rounded</div>
          <div
            className={`text-black font-bold text-[1.2em] ${
              hasChange ? "fade-out-in" : ""
            } bg-[#f886dd] text-center px-5 rounded-md`}
          >
            {hasChange ? Gtotal + 10 : Gtotal}
          </div>
        </div>
      </div>
    </div>
  );
}
