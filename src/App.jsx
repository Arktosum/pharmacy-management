import React from 'react'
import Stock from './Components/Stock'
import Navbar from './Components/Navbar'
import Transaction from './Components/Transaction'
import { Route, Routes } from 'react-router'
import './Components/Main.css'
import Logs from './Components/Logs'
import Monthly from './Components/Monthly'
export default function App() {
  return (
    <>
    <Navbar/>
    <Routes>
      <Route path="/stock" element={<Stock/>}></Route>
      <Route path="/" element={<Transaction/>}></Route>
      <Route path="/logs" element={<Logs/>}></Route>
      <Route path="/monthly" element={<Monthly/>}></Route>
    </Routes>
    </>
  )
}
