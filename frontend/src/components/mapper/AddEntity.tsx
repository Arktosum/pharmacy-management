import { useState, useMemo } from "react";
import { toast } from "react-toastify";

import Card from "./Card";
import { useGetMedicinesQuery, useAddMedicineMutation, useGetDiseasesQuery, useAddDiseaseMutation } from "../../api/api";

export function AddMedicine() {
  const [name, setName] = useState("");
  const trimmedLower = name.trim().toLowerCase();

  const { data: meds = [] } = useGetMedicinesQuery();
  const [addMedicine, { isLoading }] = useAddMedicineMutation();

  const matchingMeds = useMemo(() => {
    if (!trimmedLower) return [];
    return meds.filter((m) => m.name.toLowerCase().includes(trimmedLower));
  }, [meds, trimmedLower]);

  const hasExact = useMemo(
    () => matchingMeds.some((m) => m.name.toLowerCase() === trimmedLower),
    [matchingMeds, trimmedLower]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedLower || hasExact) return;
    try {
      await addMedicine({ name: name.trim() }).unwrap();
      toast.success("Medicine added");
      setName("");
    } catch {
      toast.error("Failed to add medicine");
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-3">Add Medicine</h3>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="input flex-1 w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-cyan-50"
            placeholder="e.g., Abroma Augusta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={isLoading || hasExact || !trimmedLower}
          >
            Add
          </button>
        </div>

        {hasExact && (
          <p className="text-red-600 text-sm font-medium">
            “{name.trim()}” already exists! Cannot add duplicate.
          </p>
        )}

        {/* Live Dropdown showing ALL matching medicines */}
        {matchingMeds.length > 0 && (
          <div className="mt-2 border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-slate-100 border-b text-xs text-slate-600 flex justify-between items-center font-medium">
              <span>Matching medicines ({matchingMeds.length}):</span>
              <span className="text-[11px] text-slate-500">Click to autofill</span>
            </div>
            <ul className="max-h-36 overflow-y-auto divide-y">
              {matchingMeds.map((m) => {
                const isExact = m.name.toLowerCase() === trimmedLower;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setName(m.name)}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition ${
                        isExact
                          ? "bg-red-50 text-red-700 font-semibold"
                          : "hover:bg-blue-50 text-slate-800"
                      }`}
                    >
                      <span className="truncate">{m.name}</span>
                      {isExact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                          Exact Match
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>
    </Card>
  );
}

export function Adddisease() {
  const [name, setName] = useState("");
  const trimmedLower = name.trim().toLowerCase();

  const { data: ills = [] } = useGetDiseasesQuery();
  const [adddisease, { isLoading }] = useAddDiseaseMutation();

  const matchingIlls = useMemo(() => {
    if (!trimmedLower) return [];
    return ills.filter((i) => i.name.toLowerCase().includes(trimmedLower));
  }, [ills, trimmedLower]);

  const hasExact = useMemo(
    () => matchingIlls.some((i) => i.name.toLowerCase() === trimmedLower),
    [matchingIlls, trimmedLower]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedLower || hasExact) return;

    try {
      await adddisease({ name: name.trim() }).unwrap();
      toast.success("Disease added");
      setName("");
    } catch {
      toast.error("Failed to add disease");
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold mb-3">Add Disease</h3>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="input flex-1 w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-cyan-50"
            placeholder="e.g., Migraine"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={isLoading || hasExact || !trimmedLower}
          >
            Add
          </button>
        </div>

        {hasExact && (
          <p className="text-red-600 text-sm font-medium">
            “{name.trim()}” already exists! Cannot add duplicate.
          </p>
        )}

        {/* Live Dropdown showing ALL matching diseases */}
        {matchingIlls.length > 0 && (
          <div className="mt-2 border rounded-lg bg-white overflow-hidden shadow-sm">
            <div className="px-3 py-1.5 bg-slate-100 border-b text-xs text-slate-600 flex justify-between items-center font-medium">
              <span>Matching diseases ({matchingIlls.length}):</span>
              <span className="text-[11px] text-slate-500">Click to autofill</span>
            </div>
            <ul className="max-h-36 overflow-y-auto divide-y">
              {matchingIlls.map((i) => {
                const isExact = i.name.toLowerCase() === trimmedLower;
                return (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setName(i.name)}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between transition ${
                        isExact
                          ? "bg-red-50 text-red-700 font-semibold"
                          : "hover:bg-blue-50 text-slate-800"
                      }`}
                    >
                      <span className="truncate">{i.name}</span>
                      {isExact && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                          Exact Match
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>
    </Card>
  );
}
