import React, { useEffect, useRef, useState } from 'react'
import { POST } from './Utils';

let deleteSVG = <svg xmlns="http://www.w3.org/2000/svg" fill="rgb(237, 149, 151)" viewBox="0 0 24 24" strokeWidth={1.5} stroke="black" className="w-6 h-6">
<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>

function updateLocalStorage(billItemList,patientName,consultFee){
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
  let [fetchAll,setfetchAll] = useState(false);
  let [stockData,setstockData] = useState({});
  let [billItemList,setbillItemList] = useState([])
  let [dailyCount,setdailyCount] = useState(0)
  let [patientName,setpatientName] = useState("")
  let [consultFee,setconsultFee] = useState(0)
  let [evalString,setevalString] = useState("")
  let [receivedAmt,setreceivedAmt] = useState(0)
  let regexInput = useRef()
  let todayDate = new Date().toLocaleString('in',{
    year : 'numeric',
    month : '2-digit',
    day :   '2-digit'
  })
  useEffect(()=>{
    POST('/api/stock/read',{},(db)=>{
      setstockData(db);
    })
    POST('/api/daily/read',{},(db)=>{
      if(todayDate in db) setdailyCount(db[todayDate])
    })
    let localData = JSON.parse(localStorage.getItem('bill-items'))
    
    if(localData == null) {
      updateLocalStorage(billItemList,patientName,consultFee);
      return;
    }
    setbillItemList(localData['item-list'])
    setpatientName(localData['patient-name'])
    setconsultFee(localData['consult-fee'])
  },[fetchAll])
  function sendRequest(payload,i){
    setTimeout(()=>{
      POST('/api/stock/add',payload);
    },i*200)
  }
  function handleTransaction(){
    if(billItemList.length == 0) return;
    // No -ve errors
    let process = []
    let itemCount = 0
    let i = 1
    for(let item of billItemList){
      let diff = item.thirtyml - item.multiplier
      if(diff < 0 ) continue;
      let payload = {
        key : item.id,
        value : {
          name : item.name,
          thirtyml : diff,
          hundredml : item.hundredml,
          price : item.price
        }
      }
      itemCount+=item.multiplier
      sendRequest({...payload},i)
      i++
      process.push(item);
    }
    // Add to daily count
    
    POST('/api/daily/read',{},(db)=>{
      if(!(todayDate in db)){
        db[todayDate] = 0
      }
      let daily = {
        key : todayDate,
        value : db[todayDate] + itemCount
      }
      POST('/api/daily/add',daily,()=>{
        setdailyCount(db[todayDate] + itemCount);
      });
    })
    
    let payload = {
      key : Date.now(),
      value : {
        type : "transaction",
        data : {
          patientName : patientName,
          consultFee : consultFee,
          medicine : process
        }
      }
    }
    POST('/api/logs/add',payload,()=>{
      localStorage.removeItem('bill-items')
      setbillItemList([])
      setregexString("")
      setpatientName("");
      setconsultFee(0);
      setfetchAll(prev=>!prev)
    });
  }
  let editItems = []
  
  for(let id in stockData){
    let item = stockData[id]
    item.id = id
    let regex
    try{
      regex = new RegExp(regexString,'i')
    }
    catch{
      alert("Invalid regex expression!!!",regexString);
      setregexString("")
    }
    let jsxElement = (
      <div key={id} onClick={()=>{
        // Add if item not already exists
        let exists = false;
        for(let billItem of billItemList){
          if(billItem.id == id){
            exists = true;
            break;
          }
        }
        if(exists){
          alert("Item already in cart");
        }
        if(!exists) {
          item.multiplier = 1  // Initial multiplier
          if(item.thirtyml == 0){
            alert("Cannot add Item! | Zero Left!");
            return;
          }
          updateLocalStorage([...billItemList,item],patientName,consultFee);
          setbillItemList(prev=>[...prev,item])
          setregexString("")
          regexInput.current.focus()
        }
      }}
      className='grid grid-cols-4 hover:bg-[#252525] duration-200 rounded-md p-3 cursor-pointer text-center'>
         <div className='text-yellow-300 text-sm font-bold'>{item.name}</div>
          <div className={"text-[1.2em] font-bold duration-[1ms] "  + `${(item.thirtyml) > 15 ? 'text-green-300':'pulse-text'}`}>{item.thirtyml}</div>
          <div className='text-white text-[1.2em] font-bold'>{item.hundredml}</div>
          <div className={`text-yellow-300 text-[1.2em] font-bold`}>{item.price}</div>
      </div>
    )
    if(regex.test(item.name) && regexString!= "") editItems.push(jsxElement)
  }
  let itemCount = 0
  let total = 0
  let billItems = billItemList.map((item)=>{
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
      <div className='border-2 border-r-green-600 border-black w-[50vw] h-full'>
        <h1 className='text-[3em] text-white text-bold text-center'>Transaction</h1>
          <div className='flex justify-center items-center py-5 gap-5'>
            <input ref={regexInput} type="text" value={regexString} onChange={(e)=>{
              setregexString(e.target.value);
              setfetchAll(prev=>!prev);
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
            clearlocalStorage()
            setfetchAll(prev=>!prev)
          }} className='duration-200 cursor-pointer uppercase border-2 px-5 py-2 rounded-xl border-red-600 hover:bg-red-600 text-red-600 hover:text-black'>cancel</div>
          </div>
          
          <div className='grid grid-cols-4 bg-slate-600 p-5 text-center'>
              <div className='text-white text-md font-bold'>Name</div>
              <div className='text-white text-md font-bold'>30 ml</div>
              <div className='text-white text-md font-bold'>100 ml</div>
              <div className='text-white text-md font-bold'>Price</div>
          </div>
          <div className='h-[50vh] overflow-y-auto'>
              {editItems}
          </div>
   
      </div>
      <div className='border-2 border-l-green-600 border-black w-[50vw] h-full'>
      {/*---------------------------------------------------------- Billing ---------------------------------------------------------- */}
        <h1 className='text-[3em] text-white text-bold text-center'>Billing</h1>
          <div className='grid grid-cols-6 bg-slate-600 p-5 text-center'>
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
                if(val == "") val = 0
                val = parseInt(val);
                updateLocalStorage(billItemList,patientName,val);
                setconsultFee(val);
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
                if(val == "") val = 0
                val = parseInt(val);
                setreceivedAmt(parseInt(val));
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
    </div>
  )
}
