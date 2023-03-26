import React, { useEffect, useState } from 'react'
import { POST } from './Utils'
const HUNDRED_ML_THRESHOLD = 24
const THIRTY_ML_THRESHOLD = 20


export default function Stock() {
  let [stockTable,setStockTable] = useState([])
  let [filter,setFilter] = useState({order:'desc', filter:'thirtyml'})
  let [editRow,setShowEditModal] = useState(null)
  let [render,setRender] = useState(false)
  useEffect(()=>{
    let query = `SELECT * FROM MEDICINE_STOCK`
    POST('/query',{query},(data)=>{
      if(data.success){
        switch(filter.filter){
          case 'name':  data.data.sort((a,b)=>{
            if(filter.order == 'asc') return b.name - a.name;
            return a.name - b.name
          }); break;
          case 'hundredml':  data.data.sort((a,b)=>{
            if(filter.order == 'asc') return b.hundredml - a.hundredml;
            return a.hundredml - b.hundredml}); break;
          case 'thirtyml':  data.data.sort((a,b)=>{
            if(filter.order == 'asc') return b.thirtyml - a.thirtyml;
            return a.thirtyml - b.thirtyml}); break;
          case 'price':  data.data.sort((a,b)=>{
            if(filter.order == 'asc') return b.price - a.price;
            return a.price - b.price}); break;
        }
        setStockTable(data.data)
      }
      else{
        alert(data.err.code)
      }
    })
  },[render])
  
  return (
    <div className='h-[90vh] bg-black flex justify-center items-center relative'>
      {editRow == null ? <></> : <div className='absolute w-full h-full bg-[#000000bb]'>
        <EditModal props={{setRender,editRow,setShowEditModal}}/>
        </div>}
      <div className='h-full w-[50vw] border-r-green-600 border-black border-2'>{<MainStockTable props={{stockTable,setRender,setShowEditModal,setFilter}}/>}</div>
      <div className='h-full w-[50vw] border-l-green-600 border-black border-2'>{<EditStockTable props={{setShowEditModal}}/>}</div>
    </div>
  )
}
function EditModal(props){
  let {setRender,editRow,setShowEditModal} = props.props
  function updateStock(e){
    e.preventDefault();
    let formData = Object.fromEntries(new FormData(e.target));
    let query = `UPDATE MEDICINE_STOCK 
    SET name = '${formData.name}',thirtyml=${formData.thirtyml},hundredml=${formData.hundredml},price=${formData.price}
    WHERE id = ${editRow.id}
    `
    POST('/query', {query},(data)=>{
      if(data.success){
        setRender(prev=>!prev)
        alert(`Successfully updated ${formData.name} to database!`)
        setShowEditModal(null);
      }
      else{
        alert(data.err.code)
      }
      
    })
    e.target.reset()
  }
  return (<>
    <div className="w-full grid place-content-center h-full">
      <div className="bg-gray-600 rounded-xl">
        <form onSubmit={(e)=>{updateStock(e)}}className='grid grid-cols-2 place-content-center gap-5 p-20'>
          <label htmlFor="name" className="text-white">Medicine Name: </label>
          <input type="text" name="name" defaultValue={editRow.name} className='rounded-sm px-5'/>
          <label htmlFor="hundredml" className="text-white">100ml count: </label>
          <input type="number" name="hundredml" defaultValue={editRow.hundredml} className='rounded-sm px-5'/>
          <label htmlFor="thirtyml" className="text-white">30ml count: </label>
          <input type="number" name="thirtyml" defaultValue={editRow.thirtyml} className='rounded-sm px-5'/>
          <label htmlFor="price" className="text-white">Medicine Price</label>
          <input type="number" name="price" defaultValue={editRow.price} className='rounded-sm px-5'/>
          <div onClick={()=>{
            setShowEditModal(null);
          }}
          className='font-bold uppercase text-black px-4 py-2 bg-[#ff000046] rounded-xl 
          text-center hover:bg-[#ff0000] duration-200 cursor-pointer'>cancel</div>
          <button className='font-bold uppercase text-black px-4 py-2 bg-[#00ff0046] rounded-xl text-center hover:bg-[#00ff00] duration-200'>update</button>
        </form>
      </div>
    </div>
  </>)
}
function MainStockTable(props){
  let {stockTable,setRender,setShowEditModal,setFilter} = props.props

  function addStock(e){
    e.preventDefault();
    let formData = Object.fromEntries(new FormData(e.target));
    let query = `INSERT INTO MEDICINE_STOCK (name,hundredml,thirtyml) VALUES ('${formData.name.toUpperCase()}',0,0)` 
    POST('/query', {query},(data)=>{
      if(data.success){
        alert(`Successfully added ${formData.name} to database`)
        setRender(prev=>!prev)
      }
      else{
        alert(data.err.code)
      }
    })
    
    e.target.reset()
  }

  let stockTableElements = stockTable.map((row)=>{
    return <StockItem key={row.id} props={{row,setShowEditModal}}/>
  })
  return(<>
    <h1 className='text-5xl text-white text-center py-10'>Stock</h1>
      <form onSubmit={(e)=>{addStock(e)}} className='flex gap-10 justify-center items-center'>
        <label htmlFor="medicine-name" className="text-white">Medicine name</label>
        <input type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm"/>
        <button className='border-green-600 border-2 
        hover:bg-green-600 duration-200 text-green-600 px-5 py-2 rounded-xl font-bold hover:text-black'>ADD</button>
      </form>
      <div className="w-full flex justify-center gap-5 p-5">
      <label htmlFor="medicine-name" className="text-white">Sort By: </label>
      <select onChange={((e) => {
        setFilter((prev)=>{
          return {...prev,filter:e.target.value}
        })
        setRender(prev=>!prev)
      })} name="" id="">
        <option value="name">Name</option>
        <option value="hundredml">100 ml</option>
        <option value="thirtyml" selected>30 ml</option>
        <option value="price">Price</option>
      </select>
      <label htmlFor="medicine-name" className="text-white">Order By: </label>
      <select onChange={((e) => {
        setFilter((prev)=>{
          return {...prev,order:e.target.value}
        })
        setRender(prev=>!prev)
      })} name="" id="">
        <option value="asc">Ascending</option>
        <option value="desc" selected>Descending</option>
      </select>
      </div>
      <div className="w-full grid grid-cols-5 place-items-center p-5">
        <div className='text-white'>ID</div>
        <div className='text-white'>Medicine Name</div>
        <div className='text-white'>100 ml</div>
        <div className='text-white'>30 ml</div>
        <div className='text-white'>Price</div>
      </div>
    <div className="grid grid-cols-1 p-5 gap-5 place-items-center h-[40vh] overflow-y-auto">
      {stockTableElements}
    </div>
  </>)
}
function EditStockTable(props){
  let {setShowEditModal} = props.props
  let [stock,setStock] = useState([])
  function findStock(name) {
    if(name == ''){
      setStock([])
      return;
    }
    let query = `SELECT * FROM MEDICINE_STOCK WHERE name LIKE '${name}%' or name LIKE '%${name}%'`
    POST("/query",{query},(data)=>{
      if(data.success){
        setStock(data.data)
      }
      else{
        alert(data.err.code)
      } 
    })
  }
  let stockTableElements = stock.map((row)=>{
    return <StockItem key={row.id} props={{row,setShowEditModal}}/>
  })
  return(<>
      <h1 className='text-6xl text-white text-center py-10'>Edit</h1>
        <div className='flex gap-10 justify-center items-center'>
          <label htmlFor="medicine-name" className="text-white">Medicine name</label>
          <input onChange={(e)=>{findStock(e.target.value)}}
          type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm"/>
        </div>
        <div className="w-full grid grid-cols-5 place-items-center p-5">
          <div className='text-white'>ID</div>
          <div className='text-white'>Medicine Name</div>
          <div className='text-white'>100 ml</div>
          <div className='text-white'>30 ml</div>
          <div className='text-white'>Price</div>
        </div>
      <div className="grid grid-cols-1 p-5 gap-5 place-items-center h-[40vh] overflow-y-auto">
        {stockTableElements}
      </div>
    </>)
}
function StockItem(props){
  let {row,setShowEditModal} = props.props
  return (<>
  <div onClick={()=>{setShowEditModal(row)}}
  className="w-full grid grid-cols-5 place-items-center hover:bg-gray-600 duration-200 p-2 rounded-sm cursor-pointer">
    <div className="text-white text-sm">{row.id}</div>
    <div className="text-white text-sm">{row.name}</div>
    <div className={`text-sm ${row.hundredml < HUNDRED_ML_THRESHOLD ? 'text-red-600 font-bold' : 'text-white'}`}>{row.hundredml}</div>
    <div className={`text-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-red-600 font-bold' : 'text-white'}`}>{row.thirtyml}</div>
    <div className="text-white text-sm">₹ {row.price}</div>
  </div>
  </>)
}