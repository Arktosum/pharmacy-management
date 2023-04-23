import React, { useEffect, useState } from 'react'
import { POST } from './Utils'

export default function Monthly() {
    let todayDate = new Date().toLocaleString('in',{
        'year' : 'numeric',
        'month' : '2-digit',
        'day' : '2-digit'
    })
    let [day,month,year] = todayDate.split('/')
    let thisDate = `${year}-${month}-${day}`
    let [dailyCount,setdailyCount] = useState({})
    useEffect(()=>{
        POST('/api/daily/read',{},(data)=>{
            setdailyCount(data)
        })
    },[])
    let [selectedMonth,setSelectedMonth] = useState(month)
    let rowItem = []
    let monthlyCount = 0
    for(let date in dailyCount) {
        let [d,m,y] = date.split('/')
        if(m != selectedMonth) continue;
        monthlyCount+=dailyCount[date]
        rowItem.push(<>
            <div className="text-green-300 w-full p-5">{date}</div>
            <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">{dailyCount[date]}</div>
            </>
        )
    }
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
        <h1 className='text-3xl text-white my-10'>Today is : {todayDate}</h1>
        <input type="date" defaultValue={thisDate} min={"2023-03-30"} max={thisDate} onChange={(e)=>{
            let [d,m,y] = e.target.value.split('-')
            setSelectedMonth(m);
        }} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        <div className='text-white grid grid-cols-2 text-center gap-y-5 p-5 h-[50vh] place-items-center overflow-y-auto'>
            {rowItem}
        </div>
        <div className='text-white my-5'>Monthly Total : <span className='text-[#ff00ff] text-[1.2em]'>{monthlyCount}</span></div>
    </div>
  )
}
