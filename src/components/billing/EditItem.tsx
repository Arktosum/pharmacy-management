import { toast } from "react-toastify";
import { StockItem } from "../../redux/stockSlice";
import { BillingStateType, setState, updateLocalStorage } from "../Utils";

interface EditItemProps {
  billingState: BillingStateType;
  item: StockItem;
  setbillingState: setState<BillingStateType>;
  setregexString: setState<string>;
  regexInput: React.RefObject<HTMLInputElement>;
}

export function EditItem({ props }: { props: EditItemProps }) {
  const { billingState, item, setbillingState, setregexString, regexInput } =
    props;
  return (
    <div
      onClick={() => {
        if (item.count == 0) {
          toast.error("Cannot add Item! | Zero Left!");
          return;
        }
        const newItem = { ...item, multiplier: 1 };
        billingState.itemList = [...billingState.itemList, newItem];
        updateLocalStorage(billingState);
        setbillingState({ ...billingState });
        setregexString("");
        if (regexInput && regexInput.current) regexInput.current.focus();
      }}
      className="grid grid-cols-4 hover:bg-[#252525] duration-200 rounded-md p-3 cursor-pointer text-center"
    >
      <div className="text-yellow-300 text-sm font-bold">{item.name}</div>
      <div
        className={
          "text-[1.2em] font-bold duration-[1ms] " +
          `${item.count > 15 ? "text-green-300" : "pulse-text"}`
        }
      >
        {item.count}
      </div>
      <div className="text-white text-[1.2em] font-bold">{item.remarks}</div>
      <div className={`text-yellow-300 text-[1.2em] font-bold`}>
        {item.price}
      </div>
    </div>
  );
}
