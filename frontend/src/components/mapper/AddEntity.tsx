import { useState, useMemo } from "react";
import { toast } from "react-toastify";

import Card from "./Card";
import { useGetMedicinesQuery, useAddMedicineMutation, useGetDiseasesQuery, useAddDiseaseMutation } from "../../api/api";

export function AddMedicine() {
  const [name, setName] = useState("");
  const trimmedLower = name.trim().toLowerCase();

  const { data: meds = [] } = useGetMedicinesQuery();
  const [addMedicine, { isLoading }] = useAddMedicineMutation();

  const hasExact = useMemo(
    () => meds.some((m) => m.name.toLowerCase() === trimmedLower),
    [meds, trimmedLower]
  );

  const topMatch = useMemo(() => {
    if (!trimmedLower || hasExact) return null;
    return (
      meds.find((m) => m.name.toLowerCase().includes(trimmedLower))?.name ??
      null
    );
  }, [meds, trimmedLower, hasExact]);

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
            className="input flex-1 w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-cyan-100"
            placeholder="e.g., Abroma Augusta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn bg-blue-500 hover:bg-blue-700 text-white px-5 py-2 rounded-sm text-sm"
            disabled={isLoading || hasExact}
          >
            Add
          </button>
        </div>
        {hasExact && (
          <p className="text-red-600 text-sm">
            “{name.trim()}” already exists!
          </p>
        )}
        {!hasExact && topMatch && (
          <p className="text-yellow-700 text-sm">
            “{topMatch}” already exists!
          </p>
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

  // Exact match check
  const hasExact = useMemo(
    () => ills.some((i) => i.name.toLowerCase() === trimmedLower),
    [ills, trimmedLower]
  );

  // Find first substring match (top suggestion)
  const topMatch = useMemo(() => {
    if (!trimmedLower || hasExact) return null;
    return (
      ills.find((i) => i.name.toLowerCase().includes(trimmedLower))?.name ??
      null
    );
  }, [ills, trimmedLower, hasExact]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedLower || hasExact) return;

    try {
      await adddisease({ name: name.trim() }).unwrap();
      toast.success("disease added");
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
            className="input flex-1 w-full px-3 py-2 border rounded focus:ring focus:ring-blue-200 bg-cyan-100"
            placeholder="e.g., Migraine"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="submit"
            className="btn bg-blue-500 hover:bg-blue-700 text-white px-5 py-2 rounded-sm text-sm"
            disabled={isLoading || hasExact}
          >
            Add
          </button>
        </div>
        {hasExact && (
          <p className="text-red-600 text-sm">
            “{name.trim()}” already exists!
          </p>
        )}
        {!hasExact && topMatch && (
          <p className="text-yellow-700 text-sm">
            “{topMatch}” already exists!
          </p>
        )}
      </form>
    </Card>
  );
}
