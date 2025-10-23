import { PropsWithChildren } from "react";

export default function Card({ children }: PropsWithChildren) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-slate-100">
      {children}
    </div>
  );
}
