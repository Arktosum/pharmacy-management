import React, { useEffect, useState } from 'react'
import { POST } from './Utils';

let deleteSVG = <svg xmlns="http://www.w3.org/2000/svg" fill="rgb(237, 149, 151)" viewBox="0 0 24 24" strokeWidth={1.5} stroke="black" className="w-6 h-6">
<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
</svg>

function milliToDate(milli){
  let date = new Date(milli).toLocaleString('in',{
    'year' : 'numeric',
    'month' : '2-digit',
    'day' : '2-digit'
  })
  return date
}

export default function SearchLog() {
  let [regexString,setregexString] = useState(".*")
  let [fetchAll,setfetchAll] = useState(false);
  let [stockData,setstockData] = useState({});
  let [billItemList,setbillItemList] = useState([])
  let [receivedAmt,setreceivedAmt] = useState(0)
  let [evalString,setevalString] = useState("")



  
  let todayDate = new Date().toLocaleString('in',{
    year : 'numeric',
    month : '2-digit',
    day :   '2-digit'
  })

  useEffect(()=>{
    POST('/api/logs/read',{},(db)=>{
      let data = []
      for(let date in db){
        db[date].id = date
        data.push(db[date])
      }
      data = data.sort((a,b)=> b.id - a.id)
      let DB = {}
      for(let date of data){
        let id = date.id
        delete date.id
        DB[id] = date
      }
      setstockData(DB);
    })
  },[fetchAll])

  let stockItems = []
  for(let id in stockData){
    let item = stockData[id]
    item.id = id
    let infoString = "Something went wrong"
    let [date,time] = new Date(parseInt(item.id)).toLocaleString('in',{
      year : 'numeric',
      month : '2-digit',
      day :   '2-digit',
      hour12 : false,
      hour : '2-digit',
      minute : '2-digit',
      'second' : '2-digit'
    }).replace('/','-').replace('/','-').split(',')
    if(item.type == 'transaction') infoString = `${item.data.patientName} || ${item.data.medicine.length}`
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
        if(!exists) {
          setbillItemList(prev=>[...prev,item])
        }
      }}
      className='grid grid-cols-2 hover:bg-[#252525] duration-200 rounded-md py-1 cursor-pointer text-center'>
          <div className='text-white text-md font-bold'><span className='text-yellow-400'>{date}</span>,<span>{time}</span></div>
          <div className='text-md font-bold text-green-300'>{infoString}</div>
      </div>
    )
    if(regex.test(item.data.patientName) && regexString!= "") stockItems.push(jsxElement)
  }

    let grandFeeTotal = 0
    let grandMTtotal = 0 

    let billItems = billItemList.map((item)=>{
      grandFeeTotal+= item.data.consultFee
      let mtTotal = 0
      for(let medicine of item.data.medicine){
        mtTotal += medicine.price*medicine.multiplier
      }
      grandMTtotal+=mtTotal
      return (
          <div key={item.id} className="grid grid-cols-5 place-items-center hover:bg-[#252525] duration-200 rounded-md px-5 py-0 cursor-pointer text-center">
            <div className='text-yellow-300 text-sm text-center font-bold'>{item.data.patientName}</div>
            <div className='text-green-400 text-[1.2em] font-bold'>{mtTotal}</div>
            <div className='text-yellow-400  text-[1.3em] font-bold'>{item.data.consultFee}</div>
            <div className='text-yellow-400  text-[1.3em] font-bold'>{item.data.consultFee + mtTotal}</div>
            <div className='text-white text-[1.2em] font-bold' onClick={()=>{
              let newList = billItemList.filter(x=> x.id !== item.id)
              setbillItemList([...newList]);
            }}>{deleteSVG}</div>
          </div>
        )
  })
   function addevalString(){
    let sum = 0
    let vals = evalString.split(" ")
    for(let v of vals){
      if (v == "") v = 0
      sum += parseInt(v);
    }
    return sum
  }
  return (
    <div className="bg-black h-[90vh] flex">
      {/*---------------------------------------------------------- Transaction ---------------------------------------------------------- */}
      <div className='border-2 border-r-green-600 border-black w-[50vw] h-full'>
        <h1 className='text-[3em] text-white text-bold text-center'>Search Log</h1>
          <div className='flex justify-center items-center py-5 gap-5'>
            <input type="text" value={regexString} onChange={(e)=>{
              setregexString(e.target.value);
              setfetchAll(prev=>!prev);
            }}
            className='py-1 rounded-sm bg-[#aae994] text-black px-2 font-bold text-[1.2em]'/>
            <div onClick={()=>{
              setregexString(".*");
              setfetchAll(prev=>!prev);
            }}
            className='text-xl text-green-600 border-2 border-green-600 px-5 py-2 rounded-xl
            hover:bg-green-600 hover:text-black cursor-pointer duration-200
            '>Show Latest</div>
          </div>
          <div className='grid grid-cols-2 bg-slate-600 p-5 text-center'>
              <div className='text-white text-md font-bold'>DateTime</div>
              <div className='text-white text-md font-bold'>Name</div>
          </div>
          <div className='h-[50vh] overflow-y-auto'>
              {stockItems}
          </div>
   
      </div>
      <div className='border-2 border-l-green-600 border-black w-[50vw] h-full'>
      {/*---------------------------------------------------------- LogSearch ---------------------------------------------------------- */}
        <h1 className='text-[3em] text-white text-bold text-center'></h1>
          <div className='grid grid-cols-5 bg-slate-600 p-5 text-center'>
              <div className='text-white text-md font-bold'>Name</div>
              <div className='text-white text-md font-bold'>MT Total</div>
              <div className='text-white text-md font-bold'>Fee</div>
              <div className='text-white text-md font-bold'>Grand Total</div>
              <div className='text-white text-md font-bold'></div>
          </div>
          <div className='h-[60vh] overflow-y-auto'>
              {billItems}
          </div>
          <div className='grid grid-cols-3  p-5 text-center'>
            <div className="flex items-center justify-center text-center gap-5">
                <div className="text-white">Fee Total :</div>
                <div className='text-black font-bold text-[1.2em] bg-yellow-300 w-[50%] px-5 rounded-md'>{grandFeeTotal}</div>
            </div>
            <div className="flex items-center justify-center text-center gap-5">
                <div className="text-white">MT Total </div>
                <div className='text-black font-bold text-[1.2em] bg-orange-300 w-[50%] px-5 rounded-md'>{grandMTtotal}</div>
            </div>
            <div className="flex items-center justify-center text-center gap-5">
                <div className="text-white">Grand Total :</div>
                <div className='text-black font-bold text-[1.2em] bg-[#f886dd] w-[50%] px-5 rounded-md'>{grandMTtotal+grandFeeTotal}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5 place-items-center">
            <div className="flex items-center justify-center text-center gap-5">
              <div className="text-white">GTotal</div>
              <div className='text-black font-bold text-[1.4em] bg-[#f886dd] w-[50%] px-5 rounded-md'>{grandMTtotal+grandFeeTotal}</div>
            </div>
            <div className='flex items-center text-center gap-5'>
              <span className='text-white'>Received: </span>
              <input type="text"  className="text-black text-center font-bold text-[1.4em] bg-green-300 w-[50%] px-1 rounded-md" value={receivedAmt} onChange={(e)=>{
                let val = e.target.value;
                if(val == "") val = 0
                val = parseInt(val);
                setreceivedAmt(parseInt(val));
                }}/>
              </div>
            <div className="flex items-center text-center gap-5">
                <span className="text-white">Balance </span>
                <span className='text-black font-bold text-[1.4em] bg-yellow-300 w-full  px-5 rounded-md'>{receivedAmt - (grandMTtotal+grandFeeTotal)}</span>
            </div>
          </div>
        <div className='flex items-center justify-center text-center gap-5 m-5'>
          <input 
          className='bg-orange-300 py-1 rounded-xl text-[1.2em] px-2 font-bold'
          type="text" value={evalString} onChange={(e)=>{
            setevalString(e.target.value)
          }}/>
          <div className='text-black font-bold text-[1.4em] bg-yellow-300 px-5 rounded-md'>{addevalString()}</div>
        </div>
    </div>
    </div>
  )
}
