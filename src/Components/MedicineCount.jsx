import React, { useEffect, useState } from 'react'
import { POST } from './Utils'

export default function MedicineCount() {
    let todayDate = new Date().toLocaleString('in',{
        'year' : 'numeric',
        'month' : '2-digit',
        'day' : '2-digit'
    })
    let [day,month,year] = todayDate.split('/')
    let thisDate = `${year}-${month}-${day}`
    let [logData,setlogData] = useState([])
    let [selectedMonth,setselectedMonth] = useState(month)
    let [regexString,setregexString] = useState(".*")

    useEffect(()=>{
        POST('/api/logs/read',{},(logData)=>{
            let data = []
            for(let log in logData){
                let thisDate = new Date(parseInt(log)).toLocaleString('in',{
                    'year' : 'numeric',
                    'month' : '2-digit',
                    'day' : '2-digit'
                })
                let [day,month,year] = thisDate.split('/')
                if(month != selectedMonth) continue;
                data.push([log,logData[log]])
            }
            setlogData(data)
        })
    },[selectedMonth])
    

    let medicineCounts = {}
    for(let log of logData){
        let logStamp = log[0]
        let logDB = log[1]
        if(logDB.type == 'transaction'){
            let medicines = logDB.data.medicine
            for(let medicine of medicines){
                let name = medicine.name
                let multiplier = medicine.multiplier
                if(!(name in medicineCounts)) medicineCounts[name] = 0
                medicineCounts[name] += multiplier
            }
        }
    }
    let rowItems = [];
    for(let name in medicineCounts){
        if(testRegex(name)) rowItems.push([name,medicineCounts[name]])
    }

    rowItems = rowItems.sort((a,b)=>b[1] - a[1])
    let rowElements = rowItems.map((item)=>{
        let name = item[0]
        let count = item[1]
        return (<>
            <div className="text-green-300 w-full p-5">{name}</div>
            <div className="text-yellow-300 text-[1.2em] w-full bg-[#212121] rounded-md p-5">{count}</div>
            </>
          )
    })

    function testRegex(searchText){
        let regex
        try{
          regex = new RegExp(regexString,'i')
        }
        catch{
          alert("Invalid regex expression!!!",regexString);
          setregexString("")
        }
        return regex.test(searchText) && regexString!= ""
    }

  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
        <h1 className='text-3xl text-white my-10'>Today is : {todayDate}</h1>
        <div className="flex justify-evenly w-[50%]">
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

        <input type="date" defaultValue={thisDate} min={"2023-03-30"} max={thisDate} onChange={(e)=>{
            let [d,m,y] = e.target.value.split('-')
            setselectedMonth(m);
        }} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        </div>
    
        <div className='text-white grid grid-cols-2 text-center gap-y-5 p-5 h-[50vh] place-items-center overflow-y-auto'>
            {rowElements}
        </div>

    </div>
  )
}
