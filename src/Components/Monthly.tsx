import  { useEffect, useState } from 'react'
import { fetchLogs, LogItem} from '../features/logSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import moment from 'moment';
import { isInMonth } from './Utils';

export default function Monthly() {
    let [selectedDate,setselectedDate] = useState("");
    const dispatch = useAppDispatch();
    const currentDate = moment().format('YYYY-MM-DD');
    useEffect(()=>{
        setselectedDate(currentDate);
        dispatch(fetchLogs());
    },[])
    let LogData : LogItem[]  = useAppSelector((state) => state.logs.data)
    LogData = LogData.filter(item => isInMonth(selectedDate,item.id))
    let dailyTally : { [key: string]: number } = {}
    let monthlyCount = 0
    for(let item of LogData) {
        const thisDate = moment(parseInt(item.id)).format('YYYY-MM-DD');
        let transactionCount = 0
        if(item.type == 'TRANSACTION'){
            for(let medicine of item.data.medicine){
                transactionCount += medicine.multiplier
            }
        }
        dailyTally[thisDate] = (dailyTally[thisDate] || 0) + 1;
        monthlyCount+= transactionCount
    }

    let rowElements = []
    for(let date in dailyTally){
        rowElements.push(<>
        <div className="text-green-300 w-full p-5">{date}</div>
        <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">{dailyTally[date]}</div>
        </>
        )
    }
       
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
      <input type="date" value={selectedDate} min={"2023-03-30"} max={currentDate} onChange={(e)=>setselectedDate(e.target.value)} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        <div className='text-white grid grid-cols-2 text-center gap-y-5 p-5 h-[50vh] place-items-center overflow-y-auto'>
            {rowElements}
        </div>
        <div className='text-white my-5'>Monthly Total : <span className='text-[#ff00ff] text-[1.2em]'>{monthlyCount}</span></div>
    </div>
  )
}