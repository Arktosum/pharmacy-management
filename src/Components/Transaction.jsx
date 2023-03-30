import React, { useEffect, useState } from 'react'
import { POST } from './Utils';

const HUNDRED_ML_THRESHOLD = 5
const THIRTY_ML_THRESHOLD = 15

export default function Transaction() {
  let [selectedItems,setselectedItems] = useState([])
  return (
    <div className='h-[90vh] bg-black'>
      <div className='w-full h-full flex'>
        <div className='w-[50vw]'><StockSelect props={{setselectedItems,selectedItems}}/></div>
        <div className='w-[50vw] border-l-green-600 border-2 border-black'><TransactBill props={{selectedItems,setselectedItems}}/></div>
      </div>
    </div>
  )
}

function StockSelect(props){
  let [stock,setStock] = useState([])
  let {setselectedItems,selectedItems} = props.props
  let [dailyCount,setDailyCount] = useState(0)
  
  useEffect(()=>{
    let thisDate = new Date().toLocaleDateString('in',{
      year  : 'numeric',
      month : '2-digit',
      day : '2-digit'
    })
    POST('/daily_count/read',{},(data)=>{
      setDailyCount(data[thisDate])
    })
  },[selectedItems])

  function findStock(name) {
    if(name == ''){
      setStock([])
      return;
    }
    let query = `SELECT * FROM MEDICINE_STOCK WHERE name LIKE '${name}%' or name LIKE '%${name}%'`
    POST("/query",{query},(data)=>{
      if(data.success){
        setStock(data.data)
      }
      else{
        alert(data.err.code)
      } 
    })
  }
  let stockTableElements = stock.map((row)=>{
    return <StockItem key={row.id} props={{row,setselectedItems}}/>
  })
  function handleTransaction(){
    
    let count = 0
    for (let item of selectedItems){
      count+= item.multiplier
      let remainingStock = item.thirtyml - item.multiplier
      if(remainingStock < 0){
        alert("Stock went to zero!");
        continue;
      }
      let query = `UPDATE MEDICINE_STOCK 
      SET thirtyml=${remainingStock}
      WHERE id = ${item.id}
      `
      POST('/query',{query})
    }
    let thisDate = new Date().toLocaleDateString('in',{
      year  : 'numeric',
      month : '2-digit',
      day : '2-digit'
    })
    let daily_ = {}
    daily_[thisDate] = count
    POST('/daily_count/create',daily_)
    let UNIXTimestamp = Date.now()
    let log = {}
    log[UNIXTimestamp] = {
      datetime : new Date(),
      type : 'transaction',
      data : {
        medicine : selectedItems
      }
    }
    POST('/logs/create', log)
    setselectedItems([]);
    setStock([])
  }
  return(<>
      <div className="flex justify-center items-center gap-10">
        <h1 className='text-6xl text-white text-center py-10 uppercase' >on hand</h1>
        <div>
          <button onClick={handleTransaction} className="border-green-600 border-2 
            hover:bg-green-600 duration-200 text-green-600 px-5 py-2 rounded-xl font-bold hover:text-black uppercase">update</button>
        </div>
        <div className="text-white text-md">Daily count: {dailyCount}</div>
      </div>
     
        <div className='flex gap-10 justify-center items-center'>
          <label htmlFor="medicine-name" className="text-white">Medicine name</label>
          <input onChange={(e)=>{findStock(e.target.value)}}
          type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm"/>
        </div>
        <div className="w-full grid grid-cols-5 place-items-center p-5">
          <div className='text-white'>ID</div>
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
  className="w-full grid grid-cols-5 place-items-center hover:bg-gray-600 duration-200 p-2 rounded-sm cursor-pointer">
    <div className="text-blue-600 text-md">{row.id}</div>
    <div className="text-yellow-300 text-md">{row.name}</div>
    <div className={`text-md bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.hundredml < HUNDRED_ML_THRESHOLD ? 'text-red-600 font-bold' : 'text-white'}`}>{row.hundredml}</div>
    <div className={`text-md  bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-red-600 font-bold' : 'text-white'}`}>{row.thirtyml}</div>
    <div className="text-green-500 text-md">₹ {row.price}</div>
  </div>
  </>)
}
function TransactBill(props){
  let {selectedItems,setselectedItems} = props.props
  
  let selectedItemElements = selectedItems.map((row)=>{
    return <TransactItem key={row.id} props={{row,setselectedItems}}/>
  })
  let grandTotal = 0
  let itemCount = 0
  for(let item of selectedItems){
    grandTotal += item.price*item.multiplier
    itemCount += item.multiplier
  }
  
  return (<>
    <div>
        <h1 className='text-5xl text-white text-center py-10'>Billing</h1>
        <div className="w-full grid grid-cols-6 place-items-center p-5">
            <div className='text-white'>ID</div>
            <div className='text-white'>Medicine Name</div>
            <div className='text-white'>30 ml</div>
            <div className='text-white'>Multiplier</div>
            <div className='text-white'>Price</div>
        </div>
        <div className="w-full grid grid-cols-1 place-items-center p-5 h-[40vh] overflow-y-scroll">
          {selectedItemElements}
        </div>
        <div className='p-5 flex flex-col justify-center items-center'>
          <div className='text-white'>Item Count: {itemCount}</div>
          <div className='text-white'>Final Amount: ₹ {grandTotal}</div>
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
  function removeItem(){
    setselectedItems((prev)=>{
      return prev.filter(a=>a.id != row.id)
    })
  }
  return (<>
  <div className="w-full grid grid-cols-6 place-items-center hover:bg-gray-600 duration-200 p-2 rounded-sm cursor-pointer" >
    <div className="text-blue-600 text-md">{row.id}</div>
    <div className="text-yellow-300 text-md">{row.name}</div>
    <div className={`text-md bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-red-600 font-bold' : 'text-white'}`}>{row.thirtyml-row.multiplier}</div>
    <div className={`text-md`}>
      <input type="number" className='w-10 px-2 text-center' min="1" max={row.thirtyml} value={row.multiplier} onChange={(e)=>{updateMultiplier(parseInt(e.target.value))}}/>
    </div>
    <div className="text-md text-green-500">₹ {row.price*row.multiplier}</div>
    <div className='w-5 h-5 rounded-full grid place-content-center hover:scale-125 duration-200' onClick={removeItem}>{deleteSVG}</div>
  </div>
  </>)
}