import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  fetchDailyCount,
  StockLog,
  TransactionLog,
  LogItem,
  addLogItem,
} from "../../redux/logSlice";
import { StockItem, updateStockCount } from "../../redux/stockSlice";
import {
  BillingStateType,
  setState,
  regexUtil,
  BILLING_STATE_INITIAL,
  clearlocalStorage,
  updateLocalStorage,
  toastSuccessoptions,
  toastErroroptions,
} from "../Utils";
import { EditItem } from "./EditItem";

interface TransactionProps {
  billingState: BillingStateType;
  setbillingState: setState<BillingStateType>;
  enableTransaction: boolean;
  setreceivedAmt: setState<number>;
  receivedAmt: number;
}

export function Transaction({ props }: { props: TransactionProps }) {
  const { billingState, setbillingState, enableTransaction, setreceivedAmt } =
    props;
  const [dailyCount, setdailyCount] = useState(0);
  const [regexString, setregexString] = useState("");
  const regexInput = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchDailyCount()).then((action) => {
      setdailyCount(action.payload);
    });
  }, [dispatch]);
  const StockData: StockItem[] = useAppSelector((state) => state.stocks.data);
  const editItems = StockData.map((item) => {
    if (!regexUtil(regexString, item.name)) return;
    // const index = billingState.itemList.findIndex(
    //   (billItem) => billItem.id == item.id
    // );
    // if (index != -1) return; // Item already in cart.
    return (
      <EditItem
        props={{
          billingState,
          item,
          setbillingState,
          setregexString,
          regexInput,
        }}
        key={item.id}
      />
    );
  });
  function handleTransaction() {
    if (billingState.itemList.length == 0) {
      toast.error("Bill Item List is empty!", toastErroroptions);
      return;
    }
    if (billingState.patientName == "") {
      toast.error("Patient name is empty!", toastErroroptions);
      return;
    }

    const transactionLog = {
      patientName: billingState.patientName,
      consultFee: billingState.consultFee,
      MTtotal: 0,
      itemCount: 0,
      medicines: [] as StockLog[],
    } as TransactionLog;
    const transactionItem = {
      type: "TRANSACTION",
      id: Date.now().toString(),
      data: transactionLog,
    } as LogItem;

    for (const item of billingState.itemList) {
      const stockLog = {
        id: item.id,
        name: item.name,
        price: item.price,
        multiplier: item.multiplier,
      } as StockLog;
      transactionItem.data.medicines.push(stockLog);
      transactionItem.data.MTtotal += item.multiplier * item.price;
      transactionItem.data.itemCount += item.multiplier;

      const isExceedingStock = item.count - item.multiplier < 0;
      if (isExceedingStock) {
        toast.error(`Stock Item ${item.name} is negative!`, toastErroroptions);
        return;
      }
    }

    dispatch(addLogItem(transactionItem)).then(() => {
      dispatch(fetchDailyCount()).then((action) => {
        setdailyCount(action.payload);
      });
    });
    dispatch(
      updateStockCount({
        items: transactionItem.data.medicines,
        type: "REMOVE",
      })
    );
    updateLocalStorage(BILLING_STATE_INITIAL);
    toast.success("Transaction success!", toastSuccessoptions);
    setbillingState({ ...BILLING_STATE_INITIAL });
    setreceivedAmt(0);
    setregexString("");
  }
  return (
    <div className="border-black w-[50vw] h-full">
      <h1 className="text-[3em] text-white text-bold text-center">
        Transaction
      </h1>
      <div className="flex justify-center items-center py-5 gap-5">
        <input
          ref={regexInput}
          type="text"
          value={regexString}
          onChange={(e) => {
            setregexString(e.target.value);
          }}
          className="py-1 rounded-sm bg-[#aae994] text-black px-2 font-bold text-[1.2em]"
        />
        <div
          onClick={handleTransaction}
          className={
            enableTransaction
              ? `duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl pulse-red-green`
              : "duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl border-green-600 hover:bg-green-600 text-green-600 hover:text-black"
          }
        >
          update
        </div>
        <div className="text-white text-center">
          Daily Count :
          <span className="text-[2em]  text-yellow-300 font-bold">
            {dailyCount}
          </span>
        </div>
        <div
          onClick={() => {
            const choice = prompt("Sure to delete? y/n");
            if (choice != "y") return;
            clearlocalStorage();
            setbillingState(BILLING_STATE_INITIAL);
          }}
          className="duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl border-red-600 hover:bg-red-600 text-red-600 hover:text-black"
        >
          cancel
        </div>
      </div>

      <div className="grid grid-cols-4 bg-slate-900 p-5 text-center">
        <div className="text-white text-md font-bold">Name</div>
        <div className="text-white text-md font-bold">30 ml</div>
        <div className="text-white text-md font-bold">100 ml</div>
        <div className="text-white text-md font-bold">Price</div>
      </div>
      <div className="h-[50vh] overflow-y-auto">{editItems}</div>
    </div>
  );
}
