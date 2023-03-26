import React, { useEffect, useState } from 'react'
import { POST } from './Utils'
// "231772712377" : {
//     "patient_name" : "tarun",
//     "datetime" : "14-12-2002",
//     "medicine" : {
//         '1' : [30mlCount,multiplier,price]
//     }
// }
export default function Bills() {
  let [transactions,setTransactions] = useState({})
  useEffect(()=>{
    POST('/bills/read',{},(data)=>{
      setTransactions({...data});
    })
  },[])
  let transactionItems = []
  for (let id in transactions){
    transactionItems.push(<TransactionItem key={id} props={{item:transactions[id]}}/>)
  }
  return (
    <div className='h-[90vh] bg-black flex justify-start items-center flex-col'>
        <h2 className='text-6xl font-bold text-white py-10'>All Transactions</h2>
        <div className="grid grid-cols-2 gap-5 text-center">
          <div className="text-white">Date/Time of Transaction</div>
          <div className="text-white">Patient Name</div>
        </div>
        <div className='grid grid-cols-1'>
          {transactionItems}
        </div>
    </div>
  )
}

function TransactionItem(props){
  let {item} = props.props
  console.log(item)
  return (<>
    <div className="grid grid-cols-2 gap-5 text-center">
      <div className="text-white">{item.dateTime}</div>
      <div className="text-white">{item.patientName}</div>
    </div>
    </>)
}