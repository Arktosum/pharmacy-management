import { PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren {
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white text-slate-900 rounded-2xl shadow p-5 border border-slate-100 min-w-0 max-w-full ${className}`}
    >
      {children}
    </div>
  );
}
