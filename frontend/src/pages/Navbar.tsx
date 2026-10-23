import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const getInitialTab = () => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path === "/daily") return "daily";
    if (path === "/searchlog") return "searchlog";
    if (path === "/log") return "log";
    if (path === "/stock") return "stock";
    if (path === "/monthly") return "monthly";
    if (path === "/monthlyLog") return "monthlyLog";
    if (path === "/medicineCount") return "medicineCount";
    if (path === "/medicineMapper") return "medicineMapper";
    if (path === "/tips" || path === "/tipsMapper") return "tips";
    return "home";
  };

  const [selected, setselected] = useState(getInitialTab);

  return (
    <div className="h-[10vh] bg-slate-900 flex justify-between items-center px-3 sm:px-4 xl:px-6 gap-2 sm:gap-3 border-b-cyan-600 border-b-2 border-slate-900 overflow-x-hidden w-full max-w-full select-none">
      <Link to="/" className="shrink-0 mr-1 sm:mr-2">
        <div
          onClick={() => {
            setselected("home");
          }}
          className="text-white text-lg sm:text-xl xl:text-2xl font-extrabold hover:text-blue-500 duration-200 whitespace-nowrap"
        >
          Jaykay Homeo Clinic
        </div>
      </Link>

      <Link to="/" className="shrink-0">
        <div
          onClick={() => {
            setselected("home");
          }}
          className={`${
            selected == "home" ? "text-white animate-pulse" : "text-yellow-400"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-[10ms] font-extrabold whitespace-nowrap`}
        >
          Trans
        </div>
      </Link>

      <Link to="/daily" className="shrink-0">
        <div
          onClick={() => {
            setselected("daily");
          }}
          className={`${
            selected == "daily" ? "text-white animate-pulse" : "text-blue-400"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Tot dat
        </div>
      </Link>

      <Link to="/searchlog" className="shrink-0">
        <div
          onClick={() => {
            setselected("searchlog");
          }}
          className={`${
            selected == "searchlog"
              ? "text-white animate-pulse"
              : "text-pink-300"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Cum tot
        </div>
      </Link>

      <Link to="/log" className="shrink-0">
        <div
          onClick={() => {
            setselected("log");
          }}
          className={`${
            selected == "log" ? "text-white animate-pulse" : "text-purple-500"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Pat log
        </div>
      </Link>

      <Link to="/stock" className="shrink-0">
        <div
          onClick={() => {
            setselected("stock");
          }}
          className={`${
            selected == "stock" ? "text-white animate-pulse" : "text-yellow-400"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Stock
        </div>
      </Link>

      <Link to="/monthly" className="shrink-0">
        <div
          onClick={() => {
            setselected("monthly");
          }}
          className={`${
            selected == "monthly" ? "text-white animate-pulse" : "text-blue-400"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          MT Dat wis
        </div>
      </Link>

      <Link to="/monthlyLog" className="shrink-0">
        <div
          onClick={() => {
            setselected("monthlyLog");
          }}
          className={`${
            selected == "monthlyLog"
              ? "text-white animate-pulse"
              : "text-pink-300"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          G Tot mon
        </div>
      </Link>

      <Link to="/medicineCount" className="shrink-0">
        <div
          onClick={() => {
            setselected("medicineCount");
          }}
          className={`${
            selected == "medicineCount"
              ? "text-white animate-pulse"
              : "text-purple-500"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Rx count
        </div>
      </Link>

      <Link to="/medicineMapper" className="shrink-0">
        <div
          onClick={() => {
            setselected("medicineMapper");
          }}
          className={`${
            selected == "medicineMapper"
              ? "text-white animate-pulse"
              : "text-green-500"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Mapper
        </div>
      </Link>

      <Link to="/tips" className="shrink-0">
        <div
          onClick={() => {
            setselected("tips");
          }}
          className={`${
            selected == "tips"
              ? "text-white animate-pulse"
              : "text-emerald-400"
          } text-sm sm:text-base xl:text-xl hover:text-blue-500 duration-200 font-extrabold whitespace-nowrap`}
        >
          Tips
        </div>
      </Link>
    </div>
  );
}
