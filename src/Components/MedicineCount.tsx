import React, { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks';
import moment from 'moment';
import { LogItem, fetchLogs } from '../features/logSlice';
import { isInMonth } from './Utils';

export default function MedicineCount() {
    let [regexString,setregexString] = useState(".*")
    let [selectedDate,setselectedDate] = useState("");
    const dispatch = useAppDispatch();
    const currentDate = moment().format('YYYY-MM-DD');
    useEffect(()=>{
        setselectedDate(currentDate);
        dispatch(fetchLogs());
    },[])
    let LogData : LogItem[]  = useAppSelector((state) => state.logs.data)
    LogData = LogData.filter(item => isInMonth(selectedDate,item.id))
    
    let medicineCounts : { [key: string]: number } = {}
    for(let log of LogData){
        if(log.type.toUpperCase() == 'TRANSACTION'){
            let medicines = log.data.medicine
            for(let medicine of medicines){
                let name = medicine.name
                let multiplier = medicine.multiplier
                medicineCounts[name] = (medicineCounts[name] || 0) + multiplier;
            }
        }
    }
    let rowItems : any =  [];
    for(let name in medicineCounts){
        if(testRegex(name)) rowItems.push([name,medicineCounts[name]])
    }

    rowItems = rowItems.sort((a: any[],b: any[])=>b[1] - a[1])
    let rowElements = rowItems.map((item: any[])=>{
        let name = item[0]
        let count = item[1]
        return (
          <div key={name} className="flex">
            <div className="text-green-300 w-full p-5">{name}</div>
            <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">{count}</div>
          </div>
          )
    })


  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
        <h1 className='text-3xl text-white my-10'>Today is : {currentDate}</h1>
        <div className="flex justify-evenly w-[50%]">
        <div className='flex justify-center items-center py-5 gap-5'>
            <input type="text" value={regexString} onChange={(e)=>{
              setregexString(e.target.value);
            }}
            className='py-1 rounded-sm bg-[#aae994] text-black px-2 font-bold text-[1.2em]'/>
            <div onClick={()=>{
              setregexString(".*");
            }}
            className='text-xl text-green-600 border-2 border-green-600 px-5 py-2 rounded-xl
            hover:bg-green-600 hover:text-black cursor-pointer duration-200
            '>Show Latest</div>
          </div>

          <input type="date" value={selectedDate} min={"2023-03-30"} max={currentDate} onChange={(e)=>setselectedDate(e.target.value)} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        </div>
    
        <div className='text-white grid grid-cols-1 text-center gap-y-5 p-5 h-[50vh] place-items-center overflow-y-auto'>
            {rowElements}
        </div>

    </div>
  )
}
