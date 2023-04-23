import React, { useEffect, useState } from "react";
import { POST } from "./Utils";
const HUNDRED_ML_THRESHOLD = 5;
const THIRTY_ML_THRESHOLD = 15;
const LIMIT = 200;
export default function Logs() {
  let [transactions, setTransactions] = useState([]);
  let [showInfoModal, setshowInfoModal] = useState(false);
  let [selectedItem, setselectedItem] = useState(null);
  useEffect(() => {
    POST("/api/logs/read", {}, (data) => {
      let transactions = [];
      for (let log_id in data) {
        data[log_id].log_id = log_id;
        transactions.push(data[log_id]);
      }
      transactions = transactions.sort((a, b) => b.log_id - a.log_id);
      if (transactions.length > LIMIT)
        transactions = transactions.splice(0, LIMIT);
      setTransactions(transactions);
    });
  }, [showInfoModal]);
  let transactionItems = transactions.map((item) => {
    return (
      <TransactionItem
        key={item.log_id}
        props={{ item, setshowInfoModal, setselectedItem }}
      />
    );
  });
  return (
    <div className="h-[90vh] bg-black flex justify-start items-center flex-col relative">
      {showInfoModal ? (
        <InfoModal props={{ selectedItem, setshowInfoModal }} />
      ) : (
        <></>
      )}
      <h2 className="text-6xl font-bold text-white py-10">All Transactions</h2>
      <div className="w-full grid grid-cols-3 place-items-center p-5 bg-gray-700 px-10">
        <div className="text-white">Date/Time of Transaction</div>
        <div className="text-white">Type</div>
        <div className="text-white">Info</div>
      </div>
      <div className="grid grid-cols-1 gap-5 w-full h-[50vh] text-center overflow-y-auto p-5">
        {transactionItems}
      </div>
    </div>
  );
}

function TransactionItem(props) {
  let { item, setshowInfoModal, setselectedItem } = props.props;
  let datetime = new Date(item.datetime).toLocaleString('en-in',{
    'weekday' : 'short',
    'year' :'2-digit',
    'month' : '2-digit',
    'day' : '2-digit',
    'hour' : '2-digit',
    'minute' : '2-digit',
    'second' : '2-digit',
    'hourCycle' : 'h24'
  })
  let showcasename;
  try {
    if (item.type == "transaction") {
      showcasename = item.patientName;
    } else if (item.type == "updated") {
      showcasename = item.data.new.name;
    } else if (item.type == "added") {
      showcasename = item.data.medicine;
    }
  } catch (err) {
    showcasename = "something went wrong";
  }
  return (
    <>
      <div
        onClick={() => {
          if(item.type != "transaction" && item.type != "updated") return;
          setselectedItem(item);
          setshowInfoModal(true);
        }}
        className="w-full grid grid-cols-3 place-items-center p-5 bg-[#272727] rounded-md px-10 hover:bg-[#444444] cursor-pointer"
      >
        <div className="text-white">{datetime}</div>
        <div className="text-white uppercase">{item.type}</div>
        <div className="text-white uppercase">{showcasename}</div>
      </div>
    </>
  );
}

function InfoModal(props) {
  let { selectedItem, setshowInfoModal } = props.props;
  let item = selectedItem;
  let row = [];
  if (item.type == "transaction") {
    row = selectedItem.data.medicine.map((item) => {
      return (
        <div
          key={item.id}
          onClick={() => {}}
          className="w-full grid grid-cols-5 place-items-center p-5 bg-[#272727] rounded-md px-10 hover:bg-[#444444]"
        >
          <div className="uppercase text-yellow-500">{item.name}</div>
          <div className="uppercase text-yellow-500">{item.thirtyml}</div>
          <div className="uppercase text-yellow-500">{item.multiplier}</div>
          <div className="uppercase text-yellow-500">{item.thirtyml-item.multiplier}</div>
          <div
            className="px-5 cursor-pointer py-2 rounded-xl uppercase text-white-600 duration-200 border-red-600 border-2 hover:bg-red-600 hover:text-black text-red-600"
            onClick={() => {
              undoOne(item);
              setTimeout(() => {
                setshowInfoModal(false);
              }, 500);
            }}
          >
            Undo
          </div>
        </div>
      );
    });
  }
  if (item.type == "updated") {
    
      return (
        <div className="bg-[#000000b8] w-full h-full fixed">
        <div className="m-20 bg-slate-600 h-full rounded-lg">
          <div className="w-full grid grid-cols-5 place-items-center p-5 bg-slate-900 px-10">
            <div className="uppercase text-white">Name</div>
            <div className="uppercase text-white">30 ml</div>
            <div className="uppercase text-white">100 ml</div>
            <div className="uppercase text-white">Price</div>
            {/* <div
              className="px-5 cursor-pointer py-2 rounded-xl uppercase text-white-600 duration-200 border-red-600 border-2 hover:bg-red-600 hover:text-black text-red-600"
              onClick={() => undoAll()}
            >
              Undo All
            </div> */}
            <div
              className="px-5 cursor-pointer py-2 rounded-xl uppercase text-white-600 duration-200 border-green-600 border-2 hover:bg-green-600 hover:text-black text-green-600"
              onClick={() => setshowInfoModal(false)}
            >
              Go back
            </div>
          </div>
          <div className="w-full grid grid-cols-1 gap-2 place-items-center p-5 rounded-md px-10">
            <div className="w-full grid grid-cols-5 place-items-center p-5 rounded-md px-10 bg-[#272727] hover:bg-[#444444]">
              {/* <div className="uppercase text-green-500">Old Data</div> */}
              <div className="uppercase text-green-500">{item.data.old.name}</div>
              <div className="uppercase text-green-500">{item.data.old.thirtyml}</div>
              <div className="uppercase text-green-500">{item.data.old.hundredml}</div>
              <div className="uppercase text-green-500">{item.data.old.price}</div>
            </div>
            <div className="w-full grid grid-cols-5 place-items-center p-5  rounded-md px-10  bg-[#272727] hover:bg-[#444444]">
              {/* <div className="uppercase text-yellow-500">New Data</div> */}
              <div className="uppercase text-yellow-500">{item.data.new.name}</div>
              <div className="uppercase text-yellow-500">{item.data.new.thirtyml}</div>
              <div className="uppercase text-yellow-500">{item.data.new.hundredml}</div>
              <div className="uppercase text-yellow-500">{item.data.new.price}</div>
            </div>
            

        </div>
        </div>
      </div>

      );
    }
  
  function undoOne(deleteRow) {
    let todayDate = new Date().toLocaleString('in',{
      'year' : 'numeric',
      'month' : '2-digit',
      'day' : '2-digit'
     })
     // Update main db
     // Update daily count
     // Update log
    POST('/api/daily/read',{},(db)=>{
      let query = {
        key : todayDate,
        value : db[todayDate] - deleteRow.multiplier
      }
      POST('/api/daily/add',query);
    })
    POST('/api/medicine/read',{},(db)=>{
      let query = {
        key : deleteRow.id,
        value : {
          name: db[deleteRow.id].name,
          thirtyml: db[deleteRow.id].thirtyml + deleteRow.multiplier,
          hundredml: db[deleteRow.id].hundredml,
          price: db[deleteRow.id].price
        }
      }
      POST('/api/medicine/add',query);
    })
    let updatedList = selectedItem.data.medicine.filter(x=> x.id != deleteRow.id);

    if(updatedList.length == 0){
      let data = {
        key : selectedItem.log_id
      }
      POST('/api/logs/delete',data)
    }
    else{
      let data = {
        key : selectedItem.log_id,
        value : {
          type : 'transaction',
          datetime : selectedItem.datetime,
          data : {
            medicine : updatedList
          }
        }
      }
      POST('/api/logs/add',data);
    }
    setTimeout(() => {
      setshowInfoModal(false);
    }, 500);
  }
  function undoAll() {

    setTimeout(() => {
      setshowInfoModal(false);
    }, 500);
  }

  return (
    <>
      <div className="bg-[#000000b8] w-full h-full fixed">
        <div className="m-20 bg-slate-600 h-full rounded-lg">
          <div className="w-full grid grid-cols-5 place-items-center p-5 bg-slate-900 px-10">
            <div className="text-white">Name</div>
            <div className="text-white">Original</div>
            <div className="text-white">Multiplier</div>
            <div className="text-white">Updated</div>
            {/* <div
              className="px-5 cursor-pointer py-2 rounded-xl uppercase text-white-600 duration-200 border-red-600 border-2 hover:bg-red-600 hover:text-black text-red-600"
              onClick={() => undoAll()}
            >
              Undo All
            </div> */}
            <div
              className="px-5 cursor-pointer py-2 rounded-xl uppercase text-white-600 duration-200 border-green-600 border-2 hover:bg-green-600 hover:text-black text-green-600"
              onClick={() => setshowInfoModal(false)}
            >
              Go back
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 w-full h-[50vh] text-center overflow-y-auto p-5">
            {row}
          </div>
        </div>
      </div>
    </>
  );
}
