import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  let [selected,setselected] = useState('home');
  return (
    <div className="h-[10vh] bg-slate-900 flex justify-between items-center p-5 border-b-cyan-600 border-2 border-slate-900">
        <Link to='/'><div onClick={()=>{setselected('home')}}
        className={`text-white text-[2em] text-bold hover:text-blue-500 duration-200 font-extrabold`}>Jaykay Homeo Clinic</div></Link>
        <Link to='/'><div onClick={()=>{setselected('home')}}
        className={`${selected=='home' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>Transaction</div></Link>
        <Link to='/daily'><div onClick={()=>{setselected('daily')}}
        className={`${selected=='daily' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>Total Datewise</div></Link>
        <Link to='/searchlog'><div onClick={()=>{setselected('searchlog')}}
        className={`${selected=='searchlog' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>Cum total asc</div></Link>
        <Link to='/log'><div onClick={()=>{setselected('log')}}
        className={`${selected=='log' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>Patient Log</div></Link>
        <Link to='/stock'><div onClick={()=>{setselected('stock')}}
        className={`${selected=='stock' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>Stock</div></Link>
        <Link to='/monthly'><div onClick={()=>{setselected('monthly')}}
        className={`${selected=='monthly' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>MT Datewise</div></Link>
        <Link to='/monthlyLog'><div onClick={()=>{setselected('monthlyLog')}}
        className={`${selected=='monthlyLog' ? 'text-green-300 animate-pulse' : 'text-white'} text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}>G Total Monthly</div></Link>
    </div>
  )
}
