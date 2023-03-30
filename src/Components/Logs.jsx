import React, { useEffect, useState } from 'react'
import { POST } from './Utils'
// "231772712377" : {
//     "patient_name" : "tarun",
//     "datetime" : "14-12-2002",
//     "medicine" : {
//         '1' : [30mlCount,multiplier,price]
//     }
// }
export default function Logs() {
  let [transactions,setTransactions] = useState({})
  useEffect(()=>{
    POST('/logs/read',{},(data)=>{
      setTransactions({...data});
    })
  },[])
  let transactionItems = []
  for (let id in transactions){
    transactionItems.push(<TransactionItem key={id} props={{item:transactions[id],id:id}}/>)
  }
  return (
    <div className='h-[90vh] bg-black flex justify-start items-center flex-col'>
        <h2 className='text-6xl font-bold text-white py-10'>All Transactions</h2>
        <div className="grid grid-cols-4 gap-5 text-center w-full">
          <div className="text-white">ID</div>
          <div className="text-white">Date/Time of Transaction</div>
          <div className="text-white">Type</div>
          <div className="text-white">Info</div>
        </div>
        <div className='grid grid-cols-1 gap-5 w-full h-[50vh] overflow-y-auto'>
          {transactionItems}
        </div>
    </div>
  )
}

function TransactionItem(props){
  let {item,id} = props.props
  let [date,Time] = item.datetime.split('T')
  let [time,rest] = Time.split('.')
  let getInfo = ()=>{
    if(item.type == 'transaction') return item.data.medicine.length + " items"
    if(item.type == 'added') return item.data.medicine.toUpperCase() 
    if(item.type == 'updated') return item.data.new.name
    if(item.type == 'deleted') return item.data.medicine.name
  }
  return (<>
    <div className="grid grid-cols-4 gap-5 text-center">
      <div className="text-white">{id}</div>
      <div className="text-white">{date} || {time}</div>
      <div className="text-white">{item.type}</div>
      <div className="text-white">{getInfo()}</div>
    </div>
    </>)
}