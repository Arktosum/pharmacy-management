import React, { useEffect, useState } from 'react'
import { POST } from './Utils'
const HUNDRED_ML_THRESHOLD = 5
const THIRTY_ML_THRESHOLD = 15


export default function Stock() {
  let [stockTable,setStockTable] = useState([])
  let [filter,setFilter] = useState({order:'desc', filter:'thirtyml'})
  let [editRow,setShowEditModal] = useState(null)
  let [render,setRender] = useState(false)
  useEffect(()=>{
    POST('/api/medicine/read',{},(data)=>{
      let DATA = []
      for(let id in data){
        data[id].id = id
        DATA.push(data[id])
      }
      switch(filter.filter){
        case 'name':  DATA.sort((a,b)=>{
          if(filter.order == 'desc') return b.name.localeCompare(a.name);
          return a.name.localeCompare(b.name);
        }); break;
        case 'hundredml':  DATA.sort((a,b)=>{
          if(filter.order == 'desc') return b.hundredml - a.hundredml;
          return a.hundredml - b.hundredml}); break;
        case 'thirtyml':  DATA.sort((a,b)=>{
          if(filter.order == 'desc') return b.thirtyml - a.thirtyml;
          return a.thirtyml - b.thirtyml}); break;
        case 'price':  DATA.sort((a,b)=>{
          if(filter.order == 'desc') return b.price - a.price;
          return a.price - b.price}); break;
      }
      setStockTable(DATA)
      }
    )
  },[render])
  
  return (
    <div className='h-[90vh] bg-black flex justify-center items-center relative'>
      {editRow == null ? <></> : <div className='absolute w-full h-full bg-[#000000bb]'>
        <EditModal props={{setRender,editRow,setShowEditModal}}/>
        </div>}
      <div className='h-full w-[50vw] border-r-green-600 border-black border-2'>{<MainStockTable props={{stockTable,setRender,setShowEditModal,setFilter}}/>}</div>
      <div className='h-full w-[50vw] border-l-green-600 border-black border-2'>{<EditStockTable props={{render,setShowEditModal}}/>}</div>
    </div>
  )
}
function EditModal(props){
  let {setRender,editRow,setShowEditModal} = props.props
  function deleteStock(){
    let randInt = Math.floor(Math.random()*100+1)
    let choice = prompt(`Type number to delete | ${randInt}`)
    if(choice != randInt) return;
    let query = {key:editRow.id};
    POST('/api/medicine/delete', query,(data)=>{
        alert("Successfully deleted item | " + editRow.name);
        setRender(prev=>!prev)
        let UNIXTimestamp = Date.now()
        let log = {
          key :UNIXTimestamp,
          value : {
            datetime : new Date(),
            type : 'deleted',
            data : {
              medicine : editRow
            }
          }
        }
        POST('/api/logs/add', log)
        setShowEditModal(null);
    })
  }
  function updateStock(e){
    e.preventDefault();
    let formData = Object.fromEntries(new FormData(e.target));
    if(formData.thirtyml == '') formData.thirtyml = 0
    if(formData.hundredml == '') formData.hundredml = 0
    if(formData.price == '') formData.price = 0
    let my_data  = {
      key : editRow.id,
      value : {
        name : formData.name,
        thirtyml : parseInt(formData.thirtyml),
        hundredml : parseInt(formData.hundredml),
        price: parseInt(formData.price)
      }
    }
    POST('/api/medicine/add',my_data,(data)=>{
      setShowEditModal(null);
      let UNIXTimestamp = Date.now()
      let log = {
        key : UNIXTimestamp,
        value : {
          datetime : new Date(),
          type : 'updated',
          data : {
            old : editRow,
            new : {
              id:editRow.id,
              name : formData.name,
              thirtyml:formData.thirtyml,
              hundredml:formData.hundredml,
              price : formData.price
            }
          }
        }
      }
      POST('/api/logs/add', log)
      setTimeout(()=>{
        setRender(prev=>!prev)
      },300)
    })
    e.target.reset()
  }
  return (<>
    <div className="w-full grid place-content-center h-full">
      <div className="bg-gray-600 rounded-xl">
        <form onSubmit={(e)=>{updateStock(e)}}className='grid grid-cols-2 place-content-center gap-5 p-20'>
          <label htmlFor="name" className="text-white">Medicine Name: </label>
          <input type="text" name="name" defaultValue={editRow.name} className='rounded-sm px-5' required/>
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
          <div onClick={()=>{
            deleteStock();
          }}
          className='cursor-pointer font-bold uppercase text-white px-4 py-2 bg-[#000000] rounded-xl text-center hover:bg-[#7a7a7a] duration-200'>delete</div>
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
    for(let item of stockTable){
      if(item.name == formData.name.toUpperCase()){
        alert("Item already exists!");
        return;
      }
    }
    let UNIXTimestamp = Date.now()
    let data = {
      key :UNIXTimestamp,
      value : {
        name : formData.name.toUpperCase(),
        hundredml : 0,
        thirtyml :0,
        price : 0
      }
    }
    POST('/api/medicine/add',data,()=>{
        alert("Successfully added | " + formData.name.toUpperCase())
        let UNIXTimestamp = Date.now()
        let log = {
          key : UNIXTimestamp,
          value : {
            datetime : new Date(),
            type : 'added',
            data : {
              medicine : formData.name
            }
        }
       }
        POST('/api/logs/add', log)
        setTimeout(()=>{
          setRender(prev=>!prev)
        },300)
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
        <input type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm" required/>
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
        <option value="thirtyml">30 ml</option>
        <option value="name">Name</option>
        <option value="hundredml">100 ml</option>
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
        <option value="desc">Descending</option>
      </select>
      </div>
      <div className="w-full grid grid-cols-4 place-items-center p-5 bg-slate-900">
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
  let {render,setShowEditModal} = props.props
  let [stock,setStock] = useState([])
  let [InputString, setInputString] = useState("")
  useEffect(()=>{
    setStock([])
  },[render])
  function findStock(name) {
    if(name == ''){
      setStock([])
      return;
    }
    let regex = new RegExp(name,'i')
    POST("/api/medicine/read",{},(data)=>{
      let FILTERED = []
      for(let key in data){
        data[key].id = key
        let name = data[key].name
        if(regex.test(name)){
          FILTERED.push(data[key])
        }
      }
      setStock(FILTERED)
    })
  }
  let stockTableElements = stock.map((row)=>{
    return <StockItem key={row.id} props={{row,setShowEditModal,setInputString}}/>
  })
  return(<>
      <h1 className='text-6xl text-white text-center py-10'>Edit</h1>
        <div className='flex gap-10 justify-center items-center'>
          <label htmlFor="medicine-name" className="text-white">Medicine name</label>
          <input value={InputString} onChange={(e)=>{
            setInputString(e.target.value)
            findStock(e.target.value)
          }}
          type="text" name='name' placeholder='Enter medicine name...' className="px-5 rounded-sm"/>
        </div>
        <div className="w-full grid grid-cols-4 place-items-center p-5 bg-slate-900 my-5">
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
  let {row,setShowEditModal,setInputString} = props.props
  return (<>
  <div onClick={()=>{
    setShowEditModal(row);
    setInputString("")
  }}
  className="w-full grid grid-cols-4 place-items-center hover:bg-[#181818] duration-200 p-2 rounded-sm cursor-pointer">
    <div className="text-yellow-300 text-md">{row.name}</div>
    <div className={`text-md bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.hundredml < HUNDRED_ML_THRESHOLD ? 'text-[#ff00ff] font-bold' : 'text-white'}`}>{row.hundredml}</div>
    <div className={`text-md bg-[#212121] w-[50%] h-full text-center inline-block rounded-sm ${row.thirtyml < THIRTY_ML_THRESHOLD ? 'text-[#ff00ff] font-bold' : 'text-white'}`}>{row.thirtyml}</div>
    <div className="text-green-400 text-md">₹ {row.price}</div>
  </div>
  </>)
}