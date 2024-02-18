import { useEffect, useState } from 'react'
import { LogItem, fetchLogs } from '../features/logSlice';
import { useAppSelector, useAppDispatch } from '../hooks';
import { StockItem } from '../features/stockSlice';
import moment from 'moment';
import { isBetween } from './Utils';


export default function Log() {
  let [showModal,setshowModal] = useState(false);
  let [selectedItem,setselectedItem] = useState<LogItem|null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const LogData : LogItem[]  = useAppSelector((state) => state.logs.data)
  const dispatch = useAppDispatch()

  useEffect(()=>{
    const currentDate = moment().format('YYYY-MM-DD');
    setFromDate(currentDate);
    setToDate(currentDate);
    dispatch(fetchLogs());
  },[])
  
  let logElements = LogData.map((item)=>{
    if(!isBetween(fromDate,toDate,item.id)) return;
    let id = item.id;
    let infoString = "Something went wrong"
    let [date,time] = moment(parseInt(id)).format("DD-MM-YYYY HH:mm:ss").split(" ")
    if(item.type.toUpperCase() == "TRANSACTION"){
      let itemCount = 0
      for(let med of item.data.medicine) itemCount+=med.multiplier
      infoString = `${item.data.patientName} || ${itemCount}`
    } 
    return (
      <div key={id} onClick={()=>{
        setselectedItem(item);
        setshowModal(true);
      }}
      className='grid grid-cols-3 hover:bg-[#252525] duration-200 rounded-md p-5 cursor-pointer text-center'>
          <div className='text-white text-md font-bold'><span className='text-yellow-400'>{date}</span>,<span>{time}</span></div>
          <div className='text-white text-md font-bold'>{item.type.toUpperCase()}</div>
          <div className='text-white text-md font-bold'>{infoString}</div>
      </div>
    )
  })
    
  function undoItem(item : StockItem) {

  }

  let infoItems = selectedItem ? selectedItem.data.medicine.map((item : StockItem)=>{
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
      {showModal && selectedItem ? <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center">
        <div className="bg-gray-600 h-[75%] w-[75%] rounded-xl">
          <div className='grid grid-cols-5 bg-slate-900 place-items-center'>
              <div className='text-orange-400 uppercase text-sm font-bold'>Name</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>30ml</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>Multiplier</div>
              <div className='text-orange-400 uppercase text-sm font-bold'>Price</div>
              <div onClick={()=>{
                setselectedItem(null);
                setshowModal(false);
                }} className="text-green-600 uppercase px-5 py-5 m-5 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-white text-center cursor-pointer">Cancel</div>
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
      <div className='flex justify-between text-white'>
        <label>From Date:</label>
        <input type="date" value={fromDate} onChange={(e)=>setFromDate(e.target.value)} className='text-black'/>
        <label>To Date:</label>
        <input type="date" value={toDate} onChange={(e)=>setToDate(e.target.value)} className='text-black'/>
      </div>
        <div className='grid grid-cols-3 bg-slate-600 p-5 text-center'>
            <div className='text-white text-md font-bold'>DateTime</div>
            <div className='text-white text-md font-bold'>Type</div>
            <div className='text-white text-md font-bold'>Info</div>
        </div>
        <div className='h-[50vh] overflow-y-auto'>
            {logElements}
          </div>

    </div>
     
  )
}
