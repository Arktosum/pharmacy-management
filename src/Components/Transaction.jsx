import React, { useEffect, useState } from 'react'
import { POST } from './Utils';

const HUNDRED_ML_THRESHOLD = 5
const THIRTY_ML_THRESHOLD = 15

export default function Transaction() {
  let [selectedItems,setselectedItems] = useState([])
  let [patientName,setpatientName] = useState("")
  let [consultFee,setconsultFee] = useState(0)
  
  return (
    <div className='h-[90vh] bg-black'>
      <div className='w-full h-full flex'>
        <div className='w-[50vw]'><StockSelect props={{setselectedItems,selectedItems,patientName,setpatientName,consultFee,setconsultFee}}/></div>
        <div className='w-[50vw] border-l-green-600 border-2 border-black'><TransactBill props={{selectedItems,setselectedItems,setpatientName,patientName,consultFee, setconsultFee}}/></div>
      </div>
    </div>
  )
}

function StockSelect(props){
  let [stock,setStock] = useState([])
  let {setselectedItems,selectedItems,patientName,setpatientName,consultFee,setconsultFee} = props.props
  let [dailyCount,setDailyCount] = useState(0)
  
  useEffect(()=>{
    let thisDate = new Date().toLocaleDateString('in',{
      year  : 'numeric',
      month : '2-digit',
      day : '2-digit'
    })
    POST('/api/daily/read',{},(data)=>{
      setDailyCount(data[thisDate])
    })
  },[selectedItems])
  function findStock(name) {
    if(name == ''){
      setStock([])
      return;
    }
    let regex = new RegExp(name,'i')
    POST("/api/medicine/read",{},(data)=>{
      let FILTERED = []
      for(let key in data){
        data[key].id = key
        let name = data[key].name
        if(regex.test(name)){
          FILTERED.push(data[key])
        }
      }
      setStock(FILTERED)
    })
  }
  let stockTableElements = stock.map((row)=>{
    return <StockItem key={row.id} props={{row,setselectedItems}}/>
  })
  console.log(consultFee);
  function handleTransaction(){
    if(selectedItems.length == 0){
      alert("Please select an item to transact");
      return;
    }
    let processedCount = 0
    let processedItems = []
    for(let item of selectedItems){
      let diff = item.thirtyml - item.multiplier
      if(diff < 0) continue // User entered wrong input!;
      
      let data = {
        key : item.id,
        value : {
          name: item.name,
          thirtyml: diff,
          hundredml: item.hundredml,
          price: item.price
        }
      }
      processedItems.push(item);
      POST('/api/medicine/add',data,)
      processedCount+=item.multiplier
    }
    if(patientName == "") patientName = "No Name"
    if(processedCount>0){
      let log = {
        key : Date.now(),
        value : {
          datetime : new Date().toISOString(),
          type : "transaction",
          consultFee : consultFee,
          patientName : patientName,
          data : {medicine:processedItems}
        }
      }
      log[Date.now()] = 
      POST('/api/logs/add',log);
    }
    let todayDate = new Date().toLocaleDateString('en-in',{
      year : 'numeric',
      month : '2-digit',
      day : '2-digit'
    });
    POST('/api/daily/read',{},(db)=>{
      let count
      if (todayDate in db){
        count = db[todayDate]+processedCount;
      }
      else{
        count = processedCount
      }
      let query = {
        key : todayDate,
        value : count
      }
      POST('/api/daily/add',query,(success)=>{
        setselectedItems([])
        setpatientName("")
        setconsultFee(0)
      })
    })
  }
  return(<>
      <div className="flex justify-center items-center gap-10">
        <h1 className='text-6xl text-white text-center py-10 uppercase' >on hand</h1>
        <div>
          <button onClick={handleTransaction} className="border-green-600 border-2 
            hover:bg-green-600 duration-200 text-green-600 px-5 py-2 rounded-xl font-bold hover:text-black uppercase">update</button>

        </div>
        <div className="text-md  text-center inline-block rounded-sm text-white">Daily count: <span className='text-[#ffff00] text-[2em] bg-[#212121] w-[50%] h-full px-5 rounded-md'>{dailyCount}</span></div>
      </div>
     
        <div className='flex gap-10 justify-center items-center'>
          <label htmlFor="medicine-name" className="text-white">Medicine name</label>
          <input onChange={(e)=>{findStock(e.target.value)}}
          type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm"/>
        </div>
        <div className="w-full grid grid-cols-4 place-items-center p-5 bg-slate-900 my-5">
          <div className='text-white'>Medicine Name</div>
          <div className='text-white'>100 ml</div>
          <div className='text-white'>30 ml</div>
          <div className='text-white'>Price</div>
        </div>
      <div className="grid grid-cols-1 p-5 gap-5 place-items-center h-[40vh] overflow-y-auto">
        {stockTableElements}
      </div>
    </>)
}
function StockItem(props){
  let {row,setselectedItems} = props.props
  return (<>
  <div onClick={()=>{setselectedItems((prev)=>{
    if(row.thirtyml == 0){
      alert("Cannot add this item to transact!");
      return [...prev];
    }
    // Check if id already in list
    let exists = false;
    for(let i = 0; i < prev.length; i++) {
      if(prev[i].id == row.id){
        exists = true;
        break;
      }
    }
    if(!exists) return [...prev,{...row,multiplier:1}]
    return [...prev]
  })}}
  className="w-full grid grid-cols-4 place-items-center hover:bg-gray-600 duration-200 p-2 rounded-sm cursor-pointer">
    <div className="text-yellow-300 text-md">{row.name}</div>
    <div className={`text-md bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.hundredml < HUNDRED_ML_THRESHOLD ? 'text-[#ff00ff] font-bold' : 'text-white'}`}>{row.hundredml}</div>
    <div className={`text-md  bg-[#212121] w-[50%] text-[1.2em] h-full text-center inline-block rounded-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-[#ff00ff] font-bold' : 'text-white'}`}>{row.thirtyml}</div>
    <div className="text-green-500 text-md">₹ {row.price}</div>
  </div>
  </>)
}
function TransactBill(props){
  let {selectedItems,setselectedItems,patientName,setpatientName,consultFee,setconsultFee} = props.props
  let selectedItemElements = selectedItems.map((row)=>{
    return <TransactItem key={row.id} props={{row,setselectedItems}}/>
  })
  let total = 0
  let itemCount = 0
  for(let item of selectedItems){
    total += item.price*item.multiplier
    itemCount += item.multiplier
  }
  
  return (<>
    <div>
        <h1 className='text-5xl text-white text-center py-5'>Billing</h1>
        <div className="w-full grid grid-cols-6 place-items-center p-5 bg-slate-900">
            <div className='text-white'>Name</div>
            <div className='text-white'>Remaining</div>
            <div className='text-white'>Multiplier</div>
            <div className='text-white'>Price</div>
            <div className='text-white'>Amount</div>
        </div>
        <div className="w-full grid grid-cols-1 place-items-center p-5 h-[40vh] overflow-y-scroll">
          {selectedItemElements}
        </div>
        <div className="w-full flex flex-col justify-center items-center">
          <div className="flex justify-center items-center py-5 gap-x-5">
            <div className="text-md  text-center inline-block rounded-sm text-white">
              <span className="text-white">Item Count : </span>
              <span className='text-black  font-bold text-[2em] bg-[#ff8a1d] w-[50%] h-full px-5 rounded-md'>{itemCount}</span>
            </div>
            <div className='text-md'>
               <span className="text-white">Fee : </span>
              <input type="number" min="0" value={consultFee} onChange={(e)=>{
                let val = e.target.value;
                if(val == "") val = 0
                val = parseInt(val);
                setconsultFee(val);
              }} className='ml-2 appearance-none bg-blue-300 text-[2em] font-bold text-black w-[50%] ring-2  rounded-lg px-5' required/>
            </div>
          </div>
          <div className='text-white'>
            <span>Patient Name: </span>
            <input type="text"  className="ml-2 bg-green-500  text-black font-bold text-[1.7em] ring-2 ring-black rounded-lg px-5" value={patientName} onChange={(e)=>{
            setpatientName(e.target.value);
          }}/>
          </div>
          <div className="text-md  text-center inline-block rounded-sm text-white py-2">
              <span className="text-white">Grand Total : </span>
              <span className='text-black  font-bold text-[2em] bg-[#d8ff15] w-[50%] h-full px-5 rounded-md'>{total+consultFee}</span>
            </div>
        </div>
    </div>
  </>)
}


let deleteSVG = <svg xmlns="http://www.w3.org/2000/svg" fill="red" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>

function TransactItem(props){
  let {row,setselectedItems} = props.props
  function updateMultiplier(multiplier){
    setselectedItems((prev)=>{
      for(let item of prev){
        if(item.id == row.id){
          item.multiplier = multiplier
          break;
        }
      }
      return [...prev]
    })
  }
  function updatePrice(price){
    setselectedItems((prev)=>{
      for(let item of prev){
        if(item.id == row.id){
          item.price = price
          break;
        }
      }
      return [...prev]
    })
  }
  function removeItem(){
    setselectedItems((prev)=>{
      return prev.filter(a=>a.id != row.id)
    })
  }
  return (<>
  <div className="w-full grid grid-cols-6 place-items-center hover:bg-gray-600 duration-200 p-2 rounded-sm cursor-pointer" >
    <div className="text-yellow-300 text-md">{row.name}</div>
    <div className={`text-md bg-[#212121] text-[1.2em] w-[50%] h-full text-center inline-block rounded-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-[#ff00ff] font-bold' : 'text-white'}`}>{row.thirtyml-row.multiplier}</div>
    <div className={`text-[1.2em] text-yellow-300`}>
      <input type="number" className='w-[100px] px-2 text-center bg-[#212121] rounded-md' min="1" max={row.thirtyml} value={row.multiplier} onChange={(e)=>{updateMultiplier(parseInt(e.target.value))}}/>
    </div>
    <div className={`text-[1.2em] text-yellow-300`}>
      <input type="number" className='w-[100px] px-2 text-center bg-[#212121] rounded-md' min="1" value={row.price} onChange={(e)=>{updatePrice(parseInt(e.target.value))}}/>
    </div>
    <div className="text-md text-green-500">₹ {row.price*row.multiplier}</div>
    <div className='w-5 h-5 rounded-full grid place-content-center hover:scale-125 duration-200' onClick={removeItem}>{deleteSVG}</div>
  </div>
  </>)
}