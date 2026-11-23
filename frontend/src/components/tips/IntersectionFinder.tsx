import {
  useGetDiseasesQuery,
  useGetLinksQuery,
  useGetMedicinesQuery,
} from "../../api/tipsApi";
import RemedyFilterFinder from "../shared/RemedyFilterFinder";

interface IntersectionFinderProps {
  onSelectMedicine?: (medicineId: string) => void;
}

export default function IntersectionFinder({
  onSelectMedicine,
}: IntersectionFinderProps = {}): JSX.Element {
  const { data: allMeds = [] } = useGetMedicinesQuery();
  const { data: allDiseases = [] } = useGetDiseasesQuery();
  const { data: allLinks = [] } = useGetLinksQuery();

  return (
    <RemedyFilterFinder
      allMeds={allMeds}
      allDiseases={allDiseases}
      allLinks={allLinks}
      onSelectMedicine={onSelectMedicine}
      storageKey="tips_remedy_filter"
    />
  );
}
