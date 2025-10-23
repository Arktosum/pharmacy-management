import { Route, Routes } from "react-router-dom";
import "./App.css";
import Billing from "./pages/Billing";
import Log from "./pages/PatientLog";
import Navbar from "./pages/Navbar";
import Stock from "./pages/Stock";
import DailyLog from "./pages/DailyLog";
import Monthly from "./pages/MonthlyCount";
import MonthlyLog from "./pages/MonthlyLog";
import SearchLog from "./pages/CumulativeTotalLog";
import MedicineCount from "./pages/MedicineCount";
import { useEffect } from "react";
import { useAppDispatch } from "./hooks";
import { fetchStock } from "./redux/stockSlice";
import { fetchLogs } from "./redux/logSlice";
import { ToastContainer } from "react-toastify";
import MedicineMapper from "./pages/MedicineMapper";

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
        <Route path="/medicineMapper" element={<MedicineMapper />}></Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
