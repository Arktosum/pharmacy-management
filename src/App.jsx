import React from 'react'
import Stock from './Components/Stock'
import Navbar from './Components/Navbar'
import Transaction from './Components/Transaction'
import { Route, Routes } from 'react-router'
import './Components/Main.css'
import Bills from './Components/Bills'
export default function App() {
  return (
    <>
    <Navbar/>
    <Routes>
      <Route path="/" element={<Stock/>}></Route>
      <Route path="/transaction" element={<Transaction/>}></Route>
      <Route path="/bills" element={<Bills/>}></Route>
    </Routes>
    </>
  )
}
