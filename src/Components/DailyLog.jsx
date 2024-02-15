import React, { useEffect, useState } from 'react'
import { POST } from './Utils'
import 'handsontable/dist/handsontable.full.min.css';
import Handsontable from 'handsontable/base';
import { registerAllModules } from 'handsontable/registry';
import { HyperFormula } from 'hyperformula';
const hyperformulaInstance = HyperFormula.buildEmpty({
  // to use an external HyperFormula instance,
  // initialize it with the `'internal-use-in-handsontable'` license key
  licenseKey: 'internal-use-in-handsontable',
});
registerAllModules();
import { HotTable } from '@handsontable/react';
function milliToDate(milli){
  let date = new Date(milli).toLocaleString('in',{
    'year' : 'numeric',
    'month' : '2-digit',
    'day' : '2-digit'
  })
  return date
}
export default function DailyLog() {
  let todayDate = milliToDate(Date.now())
  let [day,month,year] = todayDate.split('/')
  let thisDate = `${year}-${month}-${day}`
  let [excelData,setexcelData] = useState([])
  let [dailyLog,setdailyLog] = useState([])
  let [selectedDate,setselectedDate] = useState(todayDate)
  let [receivedAmt,setreceivedAmt] = useState({})
  useEffect(()=>{
    POST('/api/excel/read',{},(db)=>{
      if(JSON.stringify(db) == "{}"){
        let arr = []
        for(let i=0; i<50; i++){
          arr.push(["",""]);
        }
        POST('/api/excel/add',{key:"data",value:arr})
      }
      setexcelData(db["data"])
    })
  },[])

  useEffect(()=>{
      POST('/api/logs/read',{},(db)=>{
        let data = []
        for(let date in db){
          let sDate = milliToDate(parseInt(date))
          if ((sDate == selectedDate) && (db[date].type == 'transaction')){
            db[date].date = date
            data.push(db[date])
          }
        }
        setdailyLog(data);
      })
  },[selectedDate])

  let grandMTtotal = 0
  let grandFeeTotal = 0
  let grandTotal = 0
  let rowData = dailyLog.map((item)=>{
    if(!(item.date in receivedAmt)){
      receivedAmt[item.date] = 0
      setreceivedAmt({...receivedAmt})
    }
    let mtTotal = 0
    for(let medicine of item.data.medicine){
      mtTotal += medicine.price * medicine.multiplier
    }
    grandMTtotal+=mtTotal
    grandFeeTotal+=item.data.consultFee
    grandTotal += item.data.consultFee + mtTotal
    let balance = receivedAmt[item.date] - (item.data.consultFee + mtTotal)
    return (<>
      <div key={item.date} className="grid grid-cols-6 gap-5  hover:bg-slate-700 duration-200 cursor-pointer text-center">
        <div className="text-yellow-300 text-[1em]">{item.data.patientName}</div>
        <div className="text-green-300 text-[1em]">{mtTotal}</div>
        <div className="text-yellow-300 text-[1em]">{item.data.consultFee}</div>
        <div className="text-green-300 text-[1em]">{item.data.consultFee + mtTotal}</div>
        <input type="text" className="text-black text-center font-bold text-[1.4em] bg-green-200 w-[50%] px-1 rounded-md" value={receivedAmt[item.date]} onChange={(e)=>{
          let val = e.target.value;
          if(val == "") val = 0
          val = parseInt(val);
          receivedAmt[item.date] = val
          setreceivedAmt({...receivedAmt});
          }}/>
        <span className='text-black font-bold text-[1.4em] bg-pink-200 text-center w-[50%] rounded-md'>{receivedAmt[item.date] == 0 ? 0 : balance}</span>
       </div>
    </>)
  })
  function updateExcel(change,source){
    if (source === 'loadData') {
      return; //don't save this change
    }
    if(change == null) return;
    for(let changes of change){
      let [x,y,from,to] = changes      
      excelData[x][y] = to;
    }

    let query = {
      key : 'data',
      value : [...excelData]
    }
    POST('/api/excel/add',query)
  }
  return (
    <div className="h-[90vh] bg-black flex">
     <div className='w-[20vw] h-full overflow-auto'>
      <HotTable
          data={excelData}
          rowHeaders={true}
          colHeaders={true}
          height="auto"
          className="custom-table"
          comments={true}
          stretchH="all"
          rowHeights={20}
          formulas={{
            engine: hyperformulaInstance
          }}
          cell={[{
            row: 40,
            col: 1,
            className: 'custom-cell',
          }, {
            row: 0,
            col: 0,
            className: 'custom-cell-2',
          },
          {
            row: 0,
            col: 1,
            className: 'custom-cell',
          }
          ]}
          manualRowResize={true}
          copyPaste={{
            copyColumnHeaders: true,
            copyColumnGroupHeaders: true,
            copyColumnHeadersOnly: true,
          }}
          contextMenu={true}
          afterChange={updateExcel}
          licenseKey="non-commercial-and-evaluation" // for non-commercial use only
        />
     </div>
      <div className='w-[80vw] h-full'>
        <input type="date" defaultValue={thisDate} min={"2023-03-30"} max={thisDate} onChange={(e)=>{
            let [y,m,d] = e.target.value.split('-')
            let selected = `${d}/${m}/${y}`
            setselectedDate(selected);
        }} className='my-2 px-5 py-2 rounded-xl text-[#ff00ff] bg-[#212121]'/>
        <div className="bg-slate-900 grid grid-cols-6 py-5 text-center">
            <div className="text-white">Name</div>
            <div className="text-white">MT Total</div>
            <div className="text-white">Fee</div>
            <div className="text-white">Grand Total</div>
            <div className="text-white">Received</div>
            <div className="text-white">Balance</div>
        </div>
        <div className='h-[60vh] overflow-y-auto'>
          {rowData}
        </div>
        <div className='grid grid-cols-6 my-10 bg-slate-900 py-2 p-2 text-center'>
          <div className='text-yellow-300 text-[1.2em]'>Total</div>
          <div className='text-orange-300 text-[1.2em]'>{grandMTtotal.toLocaleString('hi-in')}</div>
          <div className='text-orange-300 text-[1.2em]'>{grandFeeTotal.toLocaleString('hi-in')}</div>
          <div className='text-orange-300 text-[1.2em]'>{grandTotal.toLocaleString('hi-in')}</div>
        </div>
    </div>
    </div>
  )
}


