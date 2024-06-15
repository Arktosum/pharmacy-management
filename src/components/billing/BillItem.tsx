import { deleteSVG } from "../../assets/assets";
import { StockLog } from "../../redux/logSlice";
import { BillingStateType, setState, updateLocalStorage } from "../Utils";

interface BillItemProps {
  billingState: BillingStateType;
  item: StockLog;
  setbillingState: setState<BillingStateType>;
}

export function BillItem({ props }: { props: BillItemProps }) {
  const { billingState, item, setbillingState } = props;
  return (
    <div className="grid grid-cols-6 place-items-center hover:bg-[#252525] duration-200 rounded-md px-5 cursor-pointer text-center">
      <div className="text-yellow-300 text-sm text-center font-bold">
        {item.name}
      </div>
      <div
        className={
          "text-[1.2em] font-bold duration-[1ms] " +
          `${
            item.count - item.multiplier > 15 ? "text-green-600" : "pulse-text"
          }`
        }
      >
        {item.count - item.multiplier}
      </div>
      <input
        onChange={(e) => {
          if (e.target.value == "") {
            item.multiplier = 0;
          } else {
            item.multiplier = parseInt(e.target.value);
          }
          // Remove all where multiplier is less than zero from billItemsList
          const newList = billingState.itemList.filter(
            (item) => item.multiplier > 0
          );
          billingState.itemList = newList;
          updateLocalStorage(billingState);
          setbillingState({ ...billingState });
        }}
        type="number"
        min="1"
        max={item.count}
        defaultValue={item.multiplier}
        className="text-[1.2em]  bg-[#131313] rounded-xl text-yellow-300 text-center"
      />
      <input
        onChange={(e) => {
          item.price = parseInt(e.target.value);
          updateLocalStorage({ ...billingState });
          setbillingState({ ...billingState });
        }}
        type="number"
        defaultValue={item.price}
        className={`text-[1.3em] bg-[#131313] rounded-xl font-bold text-center no-arrow w-[60%] " ${
          item.price != 0 ? "text-green-300" : "text-red-400"
        }`}
      />
      <div className={`text-yellow-400 text-[1.3em] font-bold`}>
        {item.price * item.multiplier}
      </div>
      <div
        className="text-white text-[1.2em] font-bold"
        onClick={() => {
          const newList = billingState.itemList.filter((x) => x.id !== item.id);
          billingState.itemList = newList;
          updateLocalStorage(billingState);
          setbillingState({ ...billingState });
        }}
      >
        {deleteSVG}
      </div>
    </div>
  );
}
