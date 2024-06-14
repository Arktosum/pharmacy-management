import { Route, Routes } from "react-router-dom";
import "./App.css";
import Billing from "./Components/Billing";
import Log from "./Components/PatientLog";
import Navbar from "./Components/Navbar";
import Stock from "./Components/Stock";
import DailyLog from "./Components/DailyLog";
import Monthly from "./Components/MonthlyCount";
import MonthlyLog from "./Components/MonthlyLog";
import SearchLog from "./Components/CumulativeTotalLog";
import MedicineCount from "./Components/MedicineCount";
import { useEffect } from "react";
import { useAppDispatch } from "./hooks";
import { fetchStock } from "./features/stockSlice";
import { fetchLogs } from "./features/logSlice";
import { ToastContainer } from "react-toastify";

function App() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchStock());
    dispatch(fetchLogs());
  }, [dispatch]);
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Billing />}></Route>
        <Route path="/stock" element={<Stock />}></Route>
        <Route path="/log" element={<Log />}></Route>
        <Route path="/daily" element={<DailyLog />}></Route>
        <Route path="/monthly" element={<Monthly />}></Route>
        <Route path="/monthlylog" element={<MonthlyLog />}></Route>
        <Route path="/searchlog" element={<SearchLog />}></Route>
        <Route path="/medicineCount" element={<MedicineCount />}></Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
