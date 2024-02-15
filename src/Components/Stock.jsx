import React, { useEffect, useState } from 'react'
import { POST } from './Utils'

export default function Stock() {
  let [stockData,setstockData] = useState([])
  let [regexString,setregexString] = useState("")
  let [addMedicineName,setaddMedicineName] = useState("")
  let [fetchAll,setfetchAll] = useState(false);
  let [showModal,setshowModal] = useState(false);
  let [selectedItem,setselectedItem] = useState(null);
  let [filter,setFilter] = useState({type:'thirtyml',order:'asc'})
  useEffect(()=>{
    POST('/api/stock/read',{},(db)=>{
      let arr =[]
      for(let id in db){
        db[id].id = id
        arr.push(db[id])
      }
      switch(filter.type){
        case 'name':  arr.sort((a,b)=>{
          if(filter.order == 'desc') return b.name.localeCompare(a.name);
          return a.name.localeCompare(b.name);
        }); break;
        case 'hundredml':  arr.sort((a,b)=>{
          if(filter.order == 'desc') return b.hundredml.localeCompare(a.hundredml);
          return a.hundredml.localeCompare(b.hundredml);
        }); break;
        case 'thirtyml':  arr.sort((a,b)=>{
          if(filter.order == 'desc') return b.thirtyml - a.thirtyml;
          return a.thirtyml - b.thirtyml}); break;
        case 'price':  arr.sort((a,b)=>{
          if(filter.order == 'desc') return b.price - a.price;
          return a.price - b.price}); break;
      }
      setstockData(arr);
    })
  },[fetchAll])
  function addStock(){
    let update = {
      key : Date.now(),
      value : {
        name : addMedicineName.toUpperCase(),
        thirtyml : 0,
        hundredml : 0,
        price : 0
      }
    };
    // Check if name is clear
    let uniqueName = true;
    for(let item of stockData){
      if (item.name == addMedicineName.toUpperCase()){
        uniqueName= false;
        break;
      }
    }
    if(!uniqueName){
      alert("Name already exists!");
      return;
    };
    POST('/api/stock/add',update,()=>{
      setaddMedicineName("")
      setfetchAll(prev=>!prev);
    })
  }
  function deleteStock(){
    let choice = prompt("Sure to delete? y/n");
    if(choice!='y') return;
    let update = {
      key : selectedItem.id
    };
    POST('/api/stock/delete',update,()=>{
      setfetchAll(prev=>!prev);
    })
  }
  function updateStock(e){
    e.preventDefault();
    let data = Object.fromEntries(new FormData(e.target));
    let payload = {
      key : selectedItem.id,
      value : {
        name : data.name.toUpperCase(),
        thirtyml : parseInt(data.thirtyml),
        hundredml : data.hundredml,
        price : parseInt(data.price)
      }
    }

    POST('/api/stock/add',payload,()=>{
      setshowModal(false);
      setselectedItem(null);
      setfetchAll(prev=>!prev);
    })
    e.target.reset()
  }
  
  let stockItems = []
  let editItems = []
  for(let item of stockData){
    let regex = new RegExp(regexString,'i')
    let jsxElement = (
      <div key={item.id} onClick={()=>{setselectedItem(item)}}
      className='grid grid-cols-4 hover:bg-[#252525] duration-200 rounded-md p-3 cursor-pointer text-center'>
         <div className='text-yellow-300 text-[0.9em] font-bold'>{item.name}</div>
          <div className={"text-[1.2em] font-bold duration-[1ms] "  + `${(item.thirtyml) > 15 ? 'text-green-300':'pulse-text'}`}>{item.thirtyml}</div>
          <div className='text-white text-[1.2em] font-bold'>{item.hundredml}</div>
          <div className='text-yellow-300 text-[1.2em] font-bold'>{item.price}</div>
      </div>
    )
    if(regex.test(item.name) && regexString!= "") editItems.push(jsxElement)
    stockItems.push(jsxElement)
  }

  return (
    <div className="bg-black h-[90vh] flex">
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {setshowModal && selectedItem ? <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center">
        <div className="bg-gray-600 h-[50%] w-[50%] p-5">
          <form className="grid grid-cols-2 gap-5 text-center" onSubmit={(e)=>{updateStock(e)}}>
            <div className="text-yellow-300 text-xl uppercase">Name </div>
            <input type="text" name="name" className="px-5 text-yellow-300 text-[1.2em] bg-black" defaultValue={selectedItem.name} required/>
            <div className="text-yellow-300 text-xl uppercase">30ml </div>
            <input type="number" name="thirtyml" className="px-5 text-yellow-300 text-[1.2em] no-arrow bg-black" defaultValue={selectedItem.thirtyml} required/>
            <div className="text-yellow-300 text-xl uppercase">100ml </div>
            <input type="text" name="hundredml" className="px-5 text-green-300 text-[1.2em] no-arrow bg-black" defaultValue={selectedItem.hundredml} required/>
            <div className="text-yellow-300 text-xl uppercase">Price </div>
            <input type="number" name="price" className="px-5 text-yellow-300 no-arrow text-[1.2em] bg-black" defaultValue={selectedItem.price} required/>
            <div onClick={()=>{
              deleteStock();
              setselectedItem(null);
              setshowModal(false);
            }} 
            className="text-red-600 uppercase px-5 py-2 border-2 border-red-600 rounded-xl hover:bg-red-600 duration-200 hover:text-black cursor-pointer">delete</div>
            <button className="text-green-600 uppercase px-5 py-2 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-black">update</button>
          </form>
          <div onClick={()=>{
            setselectedItem(null);
            setshowModal(false);
          }}
          className="text-black uppercase px-5 py-5 m-5 border-2 border-black rounded-xl hover:bg-black duration-200 hover:text-white text-center cursor-pointer">cancel</div>
        </div>
      </div> : <></>}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {/*---------------------------------------------------------- Add Stock ---------------------------------------------------------- */}
        <div className='border-2 border-r-green-600 border-black w-[50vw] h-full'>
            <h1 className='text-[1.5em] text-yellow-300 text-bold text-center uppercase'>Add Stock</h1>
            <div className='flex justify-center items-center py-5 gap-5'>
              <div className='text-white'>Medicine Name</div>
              <input type="text" value={addMedicineName} onChange={(e)=>{
                setaddMedicineName(e.target.value);
              }} className=' rounded-sm bg-[#aae994] text-black font-bold text-[1.2em]'/>
              <button onClick ={addStock}
              className="text-green-600 uppercase px-5 py-2 border-2 border-green-600 hover:bg-green-600 duration-200 rounded-xl hover:text-black">Add</button>
            </div>
            <div className='flex justify-center items-center gap-5'>
              <select name="" id="" onChange={(e)=>{
                setFilter({...filter,type:e.target.value})
                setfetchAll(prev=>!prev)
              }}>
                <option value='thirtyml'>30ml</option>
                <option value='name'>Name</option>
                <option value='hundredml'>100ml</option>
                <option value='price'>Price</option>
              </select>
              <select name="" id="" onChange={(e)=>{
                setFilter({...filter,order:e.target.value})
                setfetchAll(prev=>!prev)
              }}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div className='grid grid-cols-4 bg-slate-600 p-5'>
                <div className='text-white text-md font-bold'>Name</div>
                <div className='text-white text-md font-bold'>30ml</div>
                <div className='text-white text-md font-bold'>100ml</div>
                <div className='text-white text-md font-bold'>Price</div>
            </div>
            <div className='h-[50vh] overflow-y-auto'>
              {stockItems}
            </div>
        </div>
      {/*---------------------------------------------------------- Add Stock ---------------------------------------------------------- */}
      {/*---------------------------------------------------------- Edit Stock ---------------------------------------------------------- */}

        <div className='border-2 border-l-green-600 border-black w-[50vw] h-full'>
        <h1 className='text-[1.5em] text-yellow-300 text-bold text-center uppercase'>Edit</h1>
            <div className='flex justify-center items-center py-5'>
              <input type="text" value={regexString} onChange={(e)=>{
                setregexString(e.target.value);
              }} className=' rounded-sm bg-[#aae994] text-black  font-bold text-[1.2em]'/>
            </div>
            <div className='grid grid-cols-4 bg-slate-600 p-5'>
                <div className='text-white text-md font-bold'>Name</div>
                <div className='text-white text-md font-bold'>30ml</div>
                <div className='text-white text-md font-bold'>100ml</div>
                <div className='text-white text-md font-bold'>Price</div>
            </div>
            <div className='h-[50vh] overflow-y-auto'>
              {editItems}
            </div>
        </div>
      {/*---------------------------------------------------------- Edit Stock ---------------------------------------------------------- */}
    </div>
  )
}
