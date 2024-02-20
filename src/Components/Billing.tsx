import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks';
import { LogItem, addLogItem, fetchLogs } from '../features/logSlice';
import { StockItem, fetchStock, updateStockItems } from '../features/stockSlice';
import moment from 'moment';
import { isBetween, regexUtil } from './Utils';
import { Slide, ToastContainer, toast } from 'react-toastify';

let deleteSVG = <svg xmlns="http://www.w3.org/2000/svg" fill="rgb(237, 149, 151)" viewBox="0 0 24 24" strokeWidth={1.5} stroke="black" className="w-6 h-6">
<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>

function updateLocalStorage(billItemList : any[],patientName : string,consultFee : number){
  let initData = {
    'item-list' : billItemList,
    'patient-name' : patientName,
    'consult-fee' : consultFee
  }
  localStorage.setItem('bill-items',JSON.stringify(initData));
}
function clearlocalStorage(){
  updateLocalStorage([],"",0);
}
export default function Billing() {
  let [regexString,setregexString] = useState("")
  let [billItemList,setbillItemList] = useState<StockItem[] |[]>([])
  let [patientName,setpatientName] = useState("")
  let [consultFee,setconsultFee] = useState(0)
  let [evalString,setevalString] = useState("")
  let [receivedAmt,setreceivedAmt] = useState(0)

  let regexInput = useRef<HTMLInputElement>(null)
  // let [selectedDate,setselectedDate] = useState("");
  const dispatch = useAppDispatch();
  const currentDate = moment().format('YYYY-MM-DD');
  useEffect(()=>{
      // setselectedDate(currentDate);
    dispatch(fetchLogs());
    dispatch(fetchStock());
    let localStorageData = localStorage.getItem('bill-items')
    if(!localStorageData){
      updateLocalStorage(billItemList,patientName,consultFee);
      return;
    }
    let localData = JSON.parse(localStorageData)
    setbillItemList(localData['item-list'])
    setpatientName(localData['patient-name'])
    setconsultFee(localData['consult-fee'])

  },[])
  let LogData : LogItem[]  = useAppSelector((state) => state.logs.data)
  let StockData : StockItem[]  = useAppSelector((state) => state.stocks.data)
  let dailyCount = 0
  for(let logItem of LogData){
    if(isBetween(currentDate,currentDate,logItem.id)){
      for(let item of logItem.data.medicine){
        dailyCount+= item.multiplier
      }
    }
  }
  function handleTransaction(){
    if(billItemList.length == 0) return;
    let transactionItem  = {
      type : "TRANSACTION",
      data : {
        patientName,
        consultFee,
        medicine : []
      }
    } as LogItem
    for(let item of billItemList){
      transactionItem.data.medicine.push(item)
    }
    dispatch(addLogItem(transactionItem));
    dispatch(updateStockItems(transactionItem.data.medicine));
    localStorage.removeItem('bill-items');
    toast.success("Transaction success!", {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: 0,
      theme: "dark",
      transition: Slide,
    });
    setbillItemList([])
    setregexString("")
    setpatientName("");
    setconsultFee(0);
  }


  let editItems = StockData.map((item)=>{
    if(!(regexUtil(regexString,item.name))) return;
    return (
      <div key={item.id} onClick={()=>{
        let index = billItemList.findIndex((billItem)=>billItem.id == item.id);
        if(index != -1){
          toast.error("Item already in cart", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: 0,
            theme: "dark",
            transition: Slide,
          });
          return;
        };
        if(item.thirtyml == 0){
          toast.error("Cannot add Item! | Zero Left!", {
            position: "top-center",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: 0,
            theme: "dark",
            transition: Slide,
          });
          return;
        }
        let newItem = {...item,multiplier : 1} as StockItem
        setbillItemList(prev=>[...prev,newItem])
        updateLocalStorage([...billItemList,newItem],patientName,consultFee);
        setregexString("")
        if(regexInput && regexInput.current) regexInput.current.focus()
        }
      }
      className='grid grid-cols-4 hover:bg-[#252525] duration-200 rounded-md p-3 cursor-pointer text-center'>
         <div className='text-yellow-300 text-sm font-bold'>{item.name}</div>
          <div className={"text-[1.2em] font-bold duration-[1ms] "  + `${(item.thirtyml) > 15 ? 'text-green-300':'pulse-text'}`}>{item.thirtyml}</div>
          <div className='text-white text-[1.2em] font-bold'>{item.hundredml}</div>
          <div className={`text-yellow-300 text-[1.2em] font-bold`}>{item.price}</div>
      </div>
    )

  })
  let itemCount = 0
  let total = 0
  let billItems = billItemList.map((item)=>{
      if(!item.multiplier) return;
      itemCount+=item.multiplier
      total+=item.multiplier*item.price
      return (
        <div key={item.id} className="grid grid-cols-6 place-items-center hover:bg-[#252525] duration-200 rounded-md px-5 cursor-pointer text-center">
          <div className='text-yellow-300 text-sm text-center font-bold'>{item.name}</div>
          <div className={"text-[1.2em] font-bold duration-[1ms] "  + `${(item.thirtyml - item.multiplier) > 15 ? 'text-green-600':'pulse-text'}`}>{item.thirtyml-item.multiplier}</div>
          <input onChange={(e)=>{
            item.multiplier=parseInt(e.target.value);
            setbillItemList(prev=>[...prev]);
            updateLocalStorage(billItemList,patientName,consultFee);
          }}
          type="number" min="1" max={item.thirtyml} defaultValue={item.multiplier} 
          className="text-[1.2em]  bg-[#131313] rounded-xl text-yellow-300 text-center"/>
          <input onChange={(e)=>{
            item.price=parseInt(e.target.value);
            setbillItemList(prev=>[...prev]);
            updateLocalStorage(billItemList,patientName,consultFee);
          }}
          type="number" defaultValue={item.price} className={`text-[1.3em] bg-[#131313] rounded-xl font-bold text-center no-arrow w-[60%] " ${item.price != 0 ? 'text-green-300':'text-red-400'}`}/>
          <div className={`text-yellow-400 text-[1.3em] font-bold`}>{item.price*item.multiplier}</div>
          <div className='text-white text-[1.2em] font-bold' onClick={()=>{
            let newList = billItemList.filter(x=> x.id !== item.id)
            setbillItemList([...newList]);
            updateLocalStorage(newList,patientName,consultFee);
          }}>{deleteSVG}</div>
        </div>
      )
  })
  function addevalString(){ 
    if(evalString == "") return 0;
    let vals = evalString.replaceAll(" ","+")
    try{
      
      let finalValue = eval(vals).toFixed(2)
      let [decimal,fractional] = finalValue.split('.')
      if(fractional == '00') return decimal
      return finalValue
    }
    catch{
      return 0;
    }
  
  }
  return (
    <div className="bg-black h-[90vh] flex">
      {/*---------------------------------------------------------- Transaction ---------------------------------------------------------- */}
      <div className='border-black w-[50vw] h-full'>
        <h1 className='text-[3em] text-white text-bold text-center'>Transaction</h1>
          <div className='flex justify-center items-center py-5 gap-5'>
            <input ref={regexInput} type="text" value={regexString} onChange={(e)=>{
              setregexString(e.target.value);
            }}
            className='py-1 rounded-sm bg-[#aae994] text-black px-2 font-bold text-[1.2em]'/>
          <div onClick={handleTransaction}
          className={billItemList.length > 0 ? 
          `duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl pulse-red-green` 
          : 
          'duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl border-green-600 hover:bg-green-600 text-green-600 hover:text-black'}>update</div>
          <div className='text-white text-center'>Daily Count : <span className='text-[2em]  text-yellow-300 font-bold'>{dailyCount}</span></div>
          <div onClick={()=>{
            let choice = prompt("Sure to delete? y/n");
            if(choice!='y') return;
            clearlocalStorage();
            setbillItemList([])
            setpatientName("")
            setconsultFee(0)
          }} className='duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl border-red-600 hover:bg-red-600 text-red-600 hover:text-black'>cancel</div>
          </div>
          
          <div className='grid grid-cols-4 bg-slate-800 p-5 text-center'>
              <div className='text-white text-md font-bold'>Name</div>
              <div className='text-white text-md font-bold'>30 ml</div>
              <div className='text-white text-md font-bold'>100 ml</div>
              <div className='text-white text-md font-bold'>Price</div>
          </div>
          <div className='h-[50vh] overflow-y-auto'>
              {editItems}
          </div>
   
      </div>
      <div className='border-black w-[50vw] h-full'>
      {/*---------------------------------------------------------- Billing ---------------------------------------------------------- */}
        <h1 className='text-[3em] text-white text-bold text-center'>Billing</h1>
          <div className='grid grid-cols-6 bg-slate-800 p-5 text-center'>
              <div className='text-white text-md font-bold'>Name</div>
              <div className='text-white text-md font-bold'>Remaining</div>
              <div className='text-white text-md font-bold'>Multiplier</div>
              <div className='text-white text-md font-bold'>Price</div>
              <div className='text-white text-md font-bold'>Total</div>
              <div className='text-white text-md font-bold'></div>
          </div>
          <div className='h-[40vh] overflow-y-auto'>
              {billItems}
          </div>
          <div className="flex flex-col gap-5 m-5">
          <div className="grid grid-cols-3 gap-5">
            <div className='flex items-center text-center gap-5 '>
              <span className='text-white'>Patient Name: </span>
              <input autoComplete='new-password' type="text" className="bg-green-300 w-full text-black font-bold text-[1.4em] rounded-lg px-5" value={patientName} onChange={(e)=>{
              setpatientName(e.target.value);
              updateLocalStorage(billItemList,e.target.value,consultFee);
            }}/>
            </div>
            <div className="flex items-center text-center gap-5">
              <span className="text-white">Item Count : </span>
              <span className='text-black font-bold text-[1.4em] bg-[#ff8a1d] w-[25%] px-5 rounded-md'>{itemCount}</span>
            </div>
            <div className="flex items-center text-center gap-5 w-[75%]">
              <span className="text-white">Fee </span>
              <input type="number" min="0" value={consultFee} onChange={(e)=>{
                let val = e.target.value;
                let res
                if(val == "") res = 0
                else res = parseInt(val);
                updateLocalStorage(billItemList,patientName,res);
                setconsultFee(res);
                }}
                className='text-black no-arrow font-bold text-[1.4em] w-[75%] bg-blue-300 px-5 rounded-md'
                />
            </div>
          </div>
         
          <div className="grid grid-cols-4 gap-5">
            <div className="flex items-center text-center gap-5">
              <div className="text-white">MT Total</div>
              <div className='text-black font-bold text-[1.4em] bg-[#d8ff15] w-[50%] px-5 rounded-md'>{total}</div>
            </div>
            <div className="flex items-center text-center gap-5">
              <div className="text-white">GTotal</div>
              <div className='text-black font-bold text-[1.4em] bg-[#f886dd] w-[50%] px-5 rounded-md'>{total+consultFee}</div>
          </div>
            <div className='flex items-center text-center gap-5'>
              <span className='text-white'>Received: </span>
              <input type="text"  className="text-black text-center font-bold text-[1.4em] bg-green-300 w-full px-1 rounded-md" value={receivedAmt} onChange={(e)=>{
                let val = e.target.value;
                let res
                if(val == "") res = 0
                else res = parseInt(val);
                setreceivedAmt(res);
                }}/>
              </div>
              <div className="flex items-center text-center gap-5">
                <span className="text-white">Balance </span>
                <span className='text-black font-bold text-[1.4em] bg-yellow-300 w-full  px-5 rounded-md'>{receivedAmt - (total+consultFee)}</span>
            </div>
        </div>
        <div className='flex items-center text-center gap-5'>
              <input 
              className='bg-orange-300 py-1 rounded-xl text-[1.2em] px-2 font-bold'
              type="text" value={evalString} onChange={(e)=>{
                setevalString(e.target.value)
              }}/>
              <div className='text-black font-bold text-[1.4em] bg-yellow-300 px-5 rounded-md'>{addevalString()}</div>
        </div>
      </div>
    </div>
    <ToastContainer/>
    </div>
  )
}
