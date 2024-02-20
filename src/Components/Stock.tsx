import { useEffect, useState } from 'react'

import { useAppSelector, useAppDispatch } from '../hooks'
import { StockItem, addStockItem, deleteStockItem, fetchStock, updateStockItem } from '../features/stockSlice'


export default function Stock() {


  let [regexString,setregexString] = useState("")
  let [addMedicineName,setaddMedicineName] = useState("")
  let [showModal,setshowModal] = useState(false);
  let [selectedItem,setselectedItem] = useState<StockItem | null>(null);
  let [filter,setFilter] = useState({type:'thirtyml',order:'asc'})

  const stockData : StockItem[]  = useAppSelector((state) => state.stocks.data)
  const dispatch = useAppDispatch()

  useEffect(()=>{
    dispatch(fetchStock());
  },[])
  function resetModal(){
    setshowModal(false);
    setselectedItem(null);
  }
  // console.log(stockData)
  function addStock(){
    if(addMedicineName == "") return;
    dispatch(addStockItem(addMedicineName))
    setaddMedicineName("")
  }
  function updateStock(e: any ){
    if(!selectedItem) return;
    e.preventDefault();
    let data  : any = Object.fromEntries(new FormData(e.target));
    let payload : StockItem= {
        name : data.name.toUpperCase(),
        thirtyml : parseInt(data.thirtyml),
        hundredml : data.hundredml,
        price : parseInt(data.price),
        id  : selectedItem.id
    }
    dispatch(updateStockItem(payload))
    e.target.reset();
    resetModal();
  }
  function deleteStock(){
    if(!selectedItem) return;
    dispatch(deleteStockItem(selectedItem))
    resetModal();
  }
 
  let rowElements = []
  for(let item of stockData){
    let regex = new RegExp(regexString,'i')
    let jsxElement = (
      <div key={item.id} onClick={()=>{setselectedItem(item); setshowModal(true)}}
      className='grid grid-cols-4 text-md hover:bg-[#252525] duration-200 rounded-md p-5 cursor-pointer text-center'>
         <div className='text-yellow-300 text-md font-bold'>{item.name}</div>
          <div className={"text-md font-bold duration-[1ms] "  + `${(item.thirtyml) > 15 ? 'text-green-300':'pulse-text'}`}>{item.thirtyml}</div>
          <div className='text-white text-md font-bold'>{item.hundredml}</div>
          <div className='text-yellow-300 text-md font-bold'>{item.price}</div>
      </div>
    )
    if(regex.test(item.name) && regexString!= "") rowElements.push(jsxElement)
  }

  return (
    <div className="bg-black h-[90vh] flex">
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {showModal && selectedItem ? <div className="w-full h-full bg-[#000000a0] absolute flex justify-center items-center z-10">
        <div className="bg-gray-800 w-[50%] p-5 rounded-xl border-gray-600 border-2">
          <form className="grid grid-cols-2 gap-5 text-center" onSubmit={(e)=>{updateStock(e)}}>
            <div className="text-yellow-300 text-xl uppercase">Name </div>
            <input type="text" name="name" className="px-5 py-2 text-yellow-300 text-[1.2em] bg-black" defaultValue={selectedItem.name} required/>
            <div className="text-yellow-300 text-xl uppercase">30ml </div>
            <input type="number" name="thirtyml" className="px-5 py-2 text-yellow-300 text-[1.2em] no-arrow bg-black" defaultValue={selectedItem.thirtyml} required/>
            <div className="text-yellow-300 text-xl uppercase">100ml </div>
            <input type="text" name="hundredml" className="px-5 py-2 text-green-300 text-[1.2em] no-arrow bg-black" defaultValue={selectedItem.hundredml} required/>
            <div className="text-yellow-300 text-xl uppercase">Price </div>
            <input type="number" name="price" className="px-5 py-2 text-yellow-300 no-arrow text-[1.2em] bg-black" defaultValue={selectedItem.price} required/>
            <div onClick={()=>{
              deleteStock();
            }} 
            className="text-red-600 uppercase px-5 py-2 border-2 border-red-600 rounded-xl hover:bg-red-600 duration-200 hover:text-black cursor-pointer">delete</div>
            <button className="text-green-600 uppercase px-5 py-2 border-2 border-green-600 rounded-xl hover:bg-green-600 duration-200 hover:text-black">update</button>
          </form>
          <div onClick={resetModal}
          className="text-black uppercase px-5 py-5 m-5 border-2 border-black rounded-xl hover:bg-black duration-200 hover:text-white text-center cursor-pointer">cancel</div>
        </div>
      </div> : <></>}
      {/*---------------------------------------------------------- InfoModal ---------------------------------------------------------- */}
      {/*---------------------------------------------------------- Edit Stock ---------------------------------------------------------- */}
        <div className='border-black w-full h-full'>
        <h1 className='text-[2.5em] text-yellow-300 font-bold text-center uppercase'>Stock</h1>
        <div className='flex items-center py-5 gap-5 justify-evenly'>
          <div className='flex gap-5 justify-evenly items-center'>
            <div className='text-white font-bold'>Add medicine</div>
            <input type="text" value={addMedicineName} onChange={(e)=>{
              setaddMedicineName(e.target.value);
            }} className=' rounded-sm bg-[#aae994] text-black font-bold text-[1.2em]'/>
            <button onClick ={addStock}
            className="text-green-600 uppercase px-5 py-2 border-2 border-green-600 hover:bg-green-600 duration-200 rounded-xl hover:text-black">Add</button>
          </div>
         <div className="flex justify-evenly gap-5">
          <div className='text-white font-bold'>Search : </div>
          <input type="text" value={regexString} onChange={(e)=>{
              setregexString(e.target.value);
            }} className=' rounded-sm bg-[#aae994] text-black  font-bold text-[1.2em]'/>
            <select name="" id="" onChange={(e)=>{
              setFilter({...filter,type:e.target.value})
            }}>
              <option value='thirtyml'>30ml</option>
              <option value='name'>Name</option>
              <option value='hundredml'>100ml</option>
              <option value='price'>Price</option>
            </select>
            <select name="" id="" onChange={(e)=>{
              setFilter({...filter,order:e.target.value})
            }}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
         </div>
         
        </div>
        <div className='grid grid-cols-4 bg-slate-800 p-5 text-center'>
            <div className='text-white text-lg font-bold'>Name</div>
            <div className='text-white text-lg font-bold'>30ml</div>
            <div className='text-white text-lg font-bold'>100ml</div>
            <div className='text-white text-lg font-bold'>Price</div>
        </div>
        <div className='h-[50vh] overflow-y-auto'>
          {rowElements}
        </div>
    </div>
      {/*---------------------------------------------------------- Edit Stock ---------------------------------------------------------- */}
    </div>
  )
}
