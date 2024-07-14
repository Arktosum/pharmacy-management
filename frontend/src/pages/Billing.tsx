import { useEffect, useState } from "react";
import { Checkout } from "../components/billing/Checkout";
import { Transaction } from "../components/billing/Transaction";
import {
  BillingStateType,
  BILLING_STATE_INITIAL,
  updateLocalStorage,
} from "../components/Utils";

export default function Billing() {
  const [billingState, setbillingState] = useState<BillingStateType>(BILLING_STATE_INITIAL);
  const enableTransaction = billingState.patientName != "" && billingState.itemList.length > 0;

  useEffect(() => {
    const localStorageData = localStorage.getItem("bill-items");
    if (!localStorageData) {
      updateLocalStorage(billingState);
      return;
    }
    const localData = JSON.parse(localStorageData) as BillingStateType;
    setbillingState(localData);
  }, []);

  return (
    <div className="bg-black h-[90vh] flex">
      <Transaction props={{ billingState, setbillingState, enableTransaction }}/>
      <Checkout props={{ billingState, setbillingState, enableTransaction }} />
    </div>
  );
}
