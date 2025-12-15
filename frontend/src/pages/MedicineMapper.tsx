import { Adddisease, AddMedicine } from "../components/mapper/AddEntity";
import IntersectionFinder from "../components/mapper/IntersectionFinder";
import Linker from "../components/mapper/Linker";
import Search from "../components/mapper/Search";

export default function MedicineMapper() {
  return (
    <main className="h-[90vh] mx-auto px-4 py-6 grid gap-4 overflow-y-scroll">
      <section className="grid md:grid-cols-2 gap-4">
        <AddMedicine />
        <Adddisease />
      </section>
      <Linker />
      <Search />
      <IntersectionFinder />
    </main>
  );
}
