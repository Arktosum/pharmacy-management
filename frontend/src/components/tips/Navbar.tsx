// src/components/Navbar.tsx
import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold">Medicine Reference</h1>
            <p className="text-sm text-slate-600">
              Add medicines & diseases, link them, and search either way.
            </p>
          </div>
        </header>
        <NavLink to="/" className="text-xl font-bold">
          Home
        </NavLink>
      </div>
    </nav>
  );
}
