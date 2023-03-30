import React, { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  let [selected,setSelected] = useState('stock') // Apply later
  return (
    <div className='h-[10vh] bg-slate-900 flex justify-between items-center p-5 border-b-cyan-600 border-2 border-slate-900'>
      <Link to="/"><div className='text-white text-3xl font-bold'>Jaykay Homeo Clinic</div></Link>
      <div className='flex gap-10'>
        <Link to='/'><div className='text-white text-2xl font-bold hover:text-cyan-600 duration-200 cursor-pointer'>Stock</div></Link>
        <Link to='/transaction'><div className='text-white text-2xl font-bold hover:text-cyan-600 duration-200 cursor-pointer'>Transaction</div></Link>
        <Link to='/logs'><div className='text-white text-2xl font-bold hover:text-cyan-600 duration-200 cursor-pointer'>Logs</div></Link>
      </div>
    </div>
  )
}
