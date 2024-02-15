import React, { useEffect, useState } from 'react'
import { POST } from './Utils';
let todayDate = new Date().toLocaleString('in',{
  year : 'numeric',
  month : '2-digit',
  day :   '2-digit'
})
export default function Log() {
  let [stockData,setstockData] = useState({})
  let [fetchAll,setfetchAll] = useState(false);
  let [showModal,setshowModal] = useState(false);
  let [selectedItem,setselectedItem] = useState(null);
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
  function undoItem(item){
    POST('/api/stock/read',{},(db)=>{
      let stock = {
        key : item.id,
        value : {
          name : db[item.id].name,
          thirtyml : db[item.id].thirtyml+item.multiplier,
          hundredml : db[item.id].hundredml,
          price : db[item.id].price
        }
      }
      POST('/api/stock/add',stock);
    })
    let filtered = selectedItem.data.medicine.filter(x=>x.id != item.id)
    selectedItem.data.medicine = filtered
    let id  = selectedItem.id
    delete selectedItem.id
    let log = {
      key : id,
      value : {...selectedItem}
    }
    // Add to daily count
    
    POST('/api/daily/read',{},(db)=>{
      if(!(todayDate in db)){
        db[todayDate] = 0
      }
      let daily = {
        key : todayDate,
        value : db[todayDate] - item.multiplier
      }
      POST('/api/daily/add',daily);
    })
    
    if(filtered.length == 0){
      log = {
        key : id
      }
      POST('/api/logs/delete',log,()=>{
        setselectedItem(null);
        setshowModal(false);
        setfetchAll(prev=>!prev)
      });
    }
    else{
      POST('/api/logs/add',log,()=>{
        setselectedItem(null);
        setshowModal(false);
        setfetchAll(prev=>!prev)
      });
    }
  }
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
    if(item.type == 'transaction'){
      let itemCount = 0
      for(let med of item.data.medicine) itemCount+=med.multiplier
      infoString = `${item.data.patientName} || ${itemCount}`
    } 
    let jsxElement = (
      <div key={id} onClick={()=>{setselectedItem(item)}}
      className='grid grid-cols-3 hover:bg-[#252525] duration-200 rounded-md p-5 cursor-pointer text-center'>
          <div className='text-white text-md font-bold'><span className='text-yellow-400'>{date}</span>,<span>{time}</span></div>
          <div className='text-white text-md font-bold'>{item.type.toUpperCase()}</div>
          <div className='text-white text-md font-bold'>{infoString}</div>
      </div>
    )
    stockItems.push(jsxElement)
  }

  let infoItems = selectedItem ? selectedItem.data.medicine.map((item)=>{
    return (
      <div key={item.id}
      className='grid grid-cols-5 duration-200 h-[8%] rounded-md cursor-pointer place-items-center'>
         <div className='text-yellow-300 text-md font-bold'>{item.name}</div>
          <div className='text-pink-400 text-[1.2em] font-bold'>{item.thirtyml}</div>
          <div className='text-blue-400 text-[1.2em] font-bold'>{item.multiplier}</div>
          <div className='text-green-400 text-[1.2em] font-bold'>{item.price}</div>
          <div onClick={()=>{
              undoItem(item);
              }} className="text-red-600 uppercase px-5 m-5 border-2 border-red-600 rounded-xl hover:bg-red-600 duration-200 hover:text-black text-center cursor-pointer">undo</div>
           </div>
    )
  }) : []
  let feeTotal = 0
  let MTTotal = 0
  let itemCount = 0
  if(selectedItem){
    for(let item of selectedItem.data.medicine){
      MTTotal+=item.multiplier*item.price
      itemCount+=item.multiplier
    }
    feeTotal=selectedItem.data.consultFee
  }
  return (
    <div className="bg-black h-[90vh] flex flex-col">
      {/*---------------------------------------------------------- Logs ---------------------------------------------------------- */}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {setshowModal && selectedItem ? <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center">
        <div className="bg-gray-600 h-[75%] w-[75%] rounded-xl">
          <div className='grid grid-cols-5 bg-slate-900 place-items-center'>
              <div className='text-orange-400 uppercase text-sm font-bold'>Name</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>30ml</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>Multiplier</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>Price</div>
              <div onClick={()=>{
                setselectedItem(null);
                setshowModal(false);
                }} className="text-green-600 uppercase px-5 py-5 m-5 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-white text-center cursor-pointer">cancel</div>
              </div>
              <div className='h-[50vh] overflow-y-auto'>
                {infoItems}
              </div>
              <div className='grid grid-cols-5 place-items-center'>
                <div className='text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl'>Item Count: <span className='text-green-300 '>{itemCount}</span></div>
                <div className='text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl'>Fee Total: <span className='text-green-300'>{feeTotal}</span></div>
                <div className='text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl'>MT Total: <span className='text-green-300'>{MTTotal}</span></div>
                <div className='text-orange-300 font-bold text-[1.2em] bg-slate-950 p-5 rounded-xl'>Grand Total: <span className='text-green-300'>{feeTotal+MTTotal}</span></div>
                <div></div>
              </div>
          {}
            </div>
      </div> : <></>}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      <h1 className='text-[3em] text-white text-bold text-center'>Logs</h1>
        <div className='grid grid-cols-3 bg-slate-600 p-5 text-center'>
            <div className='text-white text-md font-bold'>DateTime</div>
            <div className='text-white text-md font-bold'>Type</div>
            <div className='text-white text-md font-bold'>Info</div>
        </div>
        <div className='h-[50vh] overflow-y-auto'>
            {stockItems}
          </div>

    </div>
     
  )
}
