import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [selected, setselected] = useState("home");
  return (
    <div className="h-[10vh] bg-slate-900 flex justify-between items-center p-5 border-b-cyan-600 border-2 border-slate-900">
      <Link to="/">
        <div
          onClick={() => {
            setselected("home");
          }}
          className={`text-white text-[2em] text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Jaykay Homeo Clinic
        </div>
      </Link>
      <Link to="/">
        <div
          onClick={() => {
            setselected("home");
          }}
          className={`${
            selected == "home" ? "text-white animate-pulse" : "text-yellow-400"
          } text-xl text-bold hover:text-blue-500 duration-[10ms] font-extrabold`}
        >
          Trans
        </div>
      </Link>
      <Link to="/daily">
        <div
          onClick={() => {
            setselected("daily");
          }}
          className={`${
            selected == "daily" ? "text-white animate-pulse" : "text-blue-400"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Tot dat
        </div>
      </Link>
      <Link to="/searchlog">
        <div
          onClick={() => {
            setselected("searchlog");
          }}
          className={`${
            selected == "searchlog"
              ? "text-white animate-pulse"
              : "text-pink-300"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Cum tot
        </div>
      </Link>
      <Link to="/log">
        <div
          onClick={() => {
            setselected("log");
          }}
          className={`${
            selected == "log" ? "text-white animate-pulse" : "text-purple-500"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Pat log
        </div>
      </Link>
      <Link to="/stock">
        <div
          onClick={() => {
            setselected("stock");
          }}
          className={`${
            selected == "stock" ? "text-white animate-pulse" : "text-yellow-400"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Stock
        </div>
      </Link>
      <Link to="/monthly">
        <div
          onClick={() => {
            setselected("monthly");
          }}
          className={`${
            selected == "monthly" ? "text-white animate-pulse" : "text-blue-400"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          MT Dat wis
        </div>
      </Link>
      <Link to="/monthlyLog">
        <div
          onClick={() => {
            setselected("monthlyLog");
          }}
          className={`${
            selected == "monthlyLog"
              ? "text-white animate-pulse"
              : "text-pink-300"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          G Tot mon
        </div>
      </Link>
      <Link to="/medicineCount">
        <div
          onClick={() => {
            setselected("medicineCount");
          }}
          className={`${
            selected == "medicineCount"
              ? "text-white animate-pulse"
              : "text-purple-500"
          } text-xl text-bold hover:text-blue-500 duration-200 font-extrabold`}
        >
          Rx count
        </div>
      </Link>
    </div>
  );
}
