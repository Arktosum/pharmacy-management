
import React, { useEffect, useState } from 'react'
import { POST } from './Utils'

function milliToDate(milli){
    let date = new Date(milli).toLocaleString('in',{
      'year' : 'numeric',
      'month' : '2-digit',
      'day' : '2-digit'
    })
    return date
  }
export default function MonthlyLog() {
    let todayDate = milliToDate(Date.now())
    let [day,month,year] = todayDate.split('/')
    let thisDate = `${year}-${month}-${day}`
    let [dailyCount,setdailyCount] = useState({})
    useEffect(()=>{
        POST('/api/logs/read',{},(data)=>{
            setdailyCount(data)
        })
    },[])
    let [selectedMonth,setSelectedMonth] = useState(month)
    let rowItem = {}
    for(let date in dailyCount) {
        let id = date
        date = milliToDate(parseInt(date))
        let [d,m,y] = date.split('/')
        if(m != selectedMonth || dailyCount[id].type != 'transaction') continue;
        let item = dailyCount[id]
        if (!(date in rowItem)){
            rowItem[date] = {
                MTtotal : 0,
                consultFee : 0,
                total : 0
            }
        }

        let mtTotal = 0
        for(let medicine of item.data.medicine){
            mtTotal += medicine.price * medicine.multiplier
        }
        let consultFee = item.data.consultFee
        let total = mtTotal + consultFee
        rowItem[date] = {
            MTtotal : rowItem[date].MTtotal + mtTotal,
            consultFee : rowItem[date].consultFee + consultFee,
            total : rowItem[date].total + total
        }
        
    }

    let MTGrand = 0
    let consultGrand = 0
    let totalGrand = 0

    let ROWS = []
    for(let date in rowItem){
       let item = rowItem[date]
       MTGrand += item.MTtotal
       consultGrand += item.consultFee
       totalGrand += item.total
       ROWS.push(
            <div key={item.date} className="bg-black grid grid-cols-4 gap-5 p-5 my-5">
              <div className="text-yellow-300 text-[1.2em]">{date}</div>
              <div className="text-orange-500 text-[1.2em]">{item.MTtotal}</div>
              <div className="text-green-500 text-[1.2em]">{item.consultFee}</div>
              <div className="text-pink-500 text-[1.2em]">{item.total}</div>
             </div>
          )
    }
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
        <h1 className='text-3xl text-white my-10'>Today is : {todayDate}</h1>
        <input type="date" defaultValue={thisDate} min={"2023-03-30"} max={thisDate} onChange={(e)=>{
            let [d,m,y] = e.target.value.split('-')
            setSelectedMonth(m);
        }} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        <div className='w-[80vw] overflow-y-auto h-[50vh]'>
            <div className="bg-slate-900 grid grid-cols-4 p-5">
                <div className="text-white">Name</div>
                <div className="text-white">MT Total</div>
                <div className="text-white">Fee</div>
                <div className="text-white">Grand Total</div>
            </div>
            {ROWS}
        </div>
        <div className="flex gap-10">
            <div className='text-white my-5'>MT Total : <span className='text-orange-500 text-[1.4em]'>{MTGrand}</span></div>
            <div className='text-white my-5'>Fee Total : <span className='text-orange-500 text-[1.4em]'>{consultGrand}</span></div>
            <div className='text-white my-5'>Grand Monthly Total : <span className='text-orange-500 text-[1.4em]'>{totalGrand}</span></div>
        </div>
   
    </div>
  )
}