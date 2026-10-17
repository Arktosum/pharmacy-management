import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Plus,
  Eye,
  Sparkles,
} from "lucide-react";
import {
  useGetMedicinesQuery,
  useGetDiseasesQuery,
  useGetLinksQuery,
} from "../../api/api";
import GraphMultiSearch, { SelectedEntity } from "./GraphMultiSearch";
import GraphInspectorDrawer, { InspectedNode } from "./GraphInspectorDrawer";
import AddEntityModal from "./AddEntityModal";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "medicine" | "disease";
  radius: number;
  degreeCount: number;
  isOrphan: boolean;
  isIntersecting: boolean;
  isDirectSelection: boolean;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
  isIntersectingLink?: boolean;
}

export default function GraphExplorer() {
  const { data: medicines = [], isLoading: loadingMeds } = useGetMedicinesQuery();
  const { data: diseases = [], isLoading: loadingDiseases } = useGetDiseasesQuery();
  const { data: links = [], isLoading: loadingLinks } = useGetLinksQuery();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const applyHighlightRef = useRef<((node: InspectedNode | null) => void) | null>(null);

  // UI State
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);
  const [degree, setDegree] = useState<1 | 2 | 3>(1);
  const [orphanFilter, setOrphanFilter] = useState<"none" | "meds" | "diseases" | "all">("none");
  const [isIntersectingOnly, setIsIntersectingOnly] = useState(false);
  const [showLabels, setShowLabels] = useState(true);

  // Inspector State
  const [inspectedNode, setInspectedNode] = useState<InspectedNode | null>(null);
  const inspectedNodeRef = useRef<InspectedNode | null>(null);
  inspectedNodeRef.current = inspectedNode;
  const [inspectorHistory, setInspectorHistory] = useState<InspectedNode[]>([]);

  // Add Entity Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Compute Degree Counts & Orphans
  const { medDegrees, illDegrees, orphanMedCount, orphanDiseaseCount } = useMemo(() => {
    const medDegMap = new Map<string, number>();
    const illDegMap = new Map<string, number>();

    medicines.forEach((m) => medDegMap.set(m.id, 0));
    diseases.forEach((d) => illDegMap.set(d.id, 0));

    links.forEach((l) => {
      medDegMap.set(l.medicineId, (medDegMap.get(l.medicineId) || 0) + 1);
      illDegMap.set(l.diseaseId, (illDegMap.get(l.diseaseId) || 0) + 1);
    });

    let orphanMeds = 0;
    medDegMap.forEach((cnt) => {
      if (cnt === 0) orphanMeds++;
    });

    let orphanIlls = 0;
    illDegMap.forEach((cnt) => {
      if (cnt === 0) orphanIlls++;
    });

    return {
      medDegrees: medDegMap,
      illDegrees: illDegMap,
      orphanMedCount: orphanMeds,
      orphanDiseaseCount: orphanIlls,
    };
  }, [medicines, diseases, links]);

  // Compute Selected Subsets
  const selectedMedicines = useMemo(
    () => selectedEntities.filter((e) => e.type === "medicine"),
    [selectedEntities]
  );
  const selectedDiseases = useMemo(
    () => selectedEntities.filter((e) => e.type === "disease"),
    [selectedEntities]
  );

  // Generalized Intersection Engine (handles M medicines & N diseases)
  const intersectionSummary = useMemo(() => {
    const numMeds = selectedMedicines.length;
    const numDiseases = selectedDiseases.length;

    if (selectedEntities.length < 2) {
      return {
        hasIntersection: false,
        title: "",
        description: "",
        commonRemedyIds: new Set<string>(),
        commonIndicationIds: new Set<string>(),
        directMatchCount: 0,
        intersectingNodeIds: new Set<string>(),
        intersectingLinkIds: new Set<string>(),
      };
    }

    // 1. Common Remedies: Medicines connected to ALL selected diseases (when >= 2 diseases)
    let commonRemedyIds = new Set<string>();
    if (numDiseases >= 2) {
      const diseaseToMeds = new Map<string, Set<string>>();
      links.forEach((l) => {
        if (!diseaseToMeds.has(l.diseaseId)) diseaseToMeds.set(l.diseaseId, new Set());
        diseaseToMeds.get(l.diseaseId)!.add(l.medicineId);
      });

      let common = new Set<string>(diseaseToMeds.get(selectedDiseases[0].id) || []);
      for (let i = 1; i < numDiseases; i++) {
        const nextMeds = diseaseToMeds.get(selectedDiseases[i].id) || new Set();
        common = new Set([...common].filter((mId) => nextMeds.has(mId)));
      }
      commonRemedyIds = common;
    }

    // 2. Common Indications: Diseases connected to ALL selected medicines (when >= 2 medicines)
    let commonIndicationIds = new Set<string>();
    if (numMeds >= 2) {
      const medToDiseases = new Map<string, Set<string>>();
      links.forEach((l) => {
        if (!medToDiseases.has(l.medicineId)) medToDiseases.set(l.medicineId, new Set());
        medToDiseases.get(l.medicineId)!.add(l.diseaseId);
      });

      let common = new Set<string>(medToDiseases.get(selectedMedicines[0].id) || []);
      for (let i = 1; i < numMeds; i++) {
        const nextDiseases = medToDiseases.get(selectedMedicines[i].id) || new Set();
        common = new Set([...common].filter((dId) => nextDiseases.has(dId)));
      }
      commonIndicationIds = common;
    }

    // 3. Direct Matches between selected medicines and selected diseases
    const selMedIdSet = new Set(selectedMedicines.map((m) => m.id));
    const selDiseaseIdSet = new Set(selectedDiseases.map((d) => d.id));
    const directMatchLinks = links.filter(
      (l) => selMedIdSet.has(l.medicineId) && selDiseaseIdSet.has(l.diseaseId)
    );

    const directMatchMedIds = new Set(directMatchLinks.map((l) => l.medicineId));
    const directMatchDiseaseIds = new Set(directMatchLinks.map((l) => l.diseaseId));

    // Combined intersecting node IDs
    const intersectingNodeIds = new Set<string>([
      ...commonRemedyIds,
      ...commonIndicationIds,
      ...directMatchMedIds,
      ...directMatchDiseaseIds,
    ]);

    // Intersecting link IDs
    const intersectingLinkIds = new Set<string>();
    directMatchLinks.forEach((l) => intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`));

    links.forEach((l) => {
      if (commonRemedyIds.has(l.medicineId) && selDiseaseIdSet.has(l.diseaseId)) {
        intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`);
      }
      if (commonIndicationIds.has(l.diseaseId) && selMedIdSet.has(l.medicineId)) {
        intersectingLinkIds.add(`${l.medicineId}-${l.diseaseId}`);
      }
    });

    let title = "";
    let description = "";

    if (numDiseases >= 2 && numMeds === 0) {
      title = `${commonRemedyIds.size} Common Remedy${commonRemedyIds.size === 1 ? "" : "ies"}`;
      description = commonRemedyIds.size > 0
        ? `Treats ALL ${numDiseases} selected diseases`
        : `No single medicine treats all ${numDiseases} selected diseases`;
    } else if (numMeds >= 2 && numDiseases === 0) {
      title = `${commonIndicationIds.size} Common Indication${commonIndicationIds.size === 1 ? "" : "s"}`;
      description = commonIndicationIds.size > 0
        ? `Treated by ALL ${numMeds} selected medicines`
        : `No single disease is treated by all ${numMeds} selected medicines`;
    } else if (numMeds >= 1 && numDiseases >= 1) {
      title = `${directMatchLinks.length} Direct Match${directMatchLinks.length === 1 ? "" : "es"}`;
      const extras: string[] = [];
      if (commonRemedyIds.size > 0) extras.push(`${commonRemedyIds.size} remedies treat all ${numDiseases} diseases`);
      if (commonIndicationIds.size > 0) extras.push(`${commonIndicationIds.size} conditions treated by all ${numMeds} meds`);
      description = extras.length > 0 ? extras.join(" • ") : `Connections between ${numMeds} medicines & ${numDiseases} diseases`;
    }

    const hasIntersection =
      commonRemedyIds.size > 0 || commonIndicationIds.size > 0 || directMatchLinks.length > 0;

    return {
      hasIntersection,
      title,
      description,
      commonRemedyIds,
      commonIndicationIds,
      directMatchCount: directMatchLinks.length,
      intersectingNodeIds,
      intersectingLinkIds,
    };
  }, [selectedMedicines, selectedDiseases, selectedEntities, links]);

  // Filter Pipeline: Build Active Nodes & Links
  const { activeNodes, activeLinks } = useMemo(() => {
    const allMedMap = new Map(medicines.map((m) => [m.id, m]));
    const allIllMap = new Map(diseases.map((d) => [d.id, d]));

    // Adjacency maps
    const medToIlls = new Map<string, Set<string>>();
    const illToMeds = new Map<string, Set<string>>();

    links.forEach((l) => {
      if (allMedMap.has(l.medicineId) && allIllMap.has(l.diseaseId)) {
        if (!medToIlls.has(l.medicineId)) medToIlls.set(l.medicineId, new Set());
        medToIlls.get(l.medicineId)!.add(l.diseaseId);

        if (!illToMeds.has(l.diseaseId)) illToMeds.set(l.diseaseId, new Set());
        illToMeds.get(l.diseaseId)!.add(l.medicineId);
      }
    });

    let visibleNodeIds = new Set<string>();
    const directSelectedSet = new Set(selectedEntities.map((e) => e.id));

    // 1. Orphan Filter mode
    if (orphanFilter !== "none") {
      if (orphanFilter === "meds" || orphanFilter === "all") {
        medicines.forEach((m) => {
          if ((medDegrees.get(m.id) || 0) === 0) visibleNodeIds.add(m.id);
        });
      }
      if (orphanFilter === "diseases" || orphanFilter === "all") {
        diseases.forEach((d) => {
          if ((illDegrees.get(d.id) || 0) === 0) visibleNodeIds.add(d.id);
        });
      }
    }
    // 2. Intersections-Only filter mode
    else if (isIntersectingOnly && intersectionSummary.hasIntersection) {
      selectedEntities.forEach((e) => visibleNodeIds.add(e.id));
      intersectionSummary.intersectingNodeIds.forEach((id) => visibleNodeIds.add(id));
    }
    // 3. Multi-Search / Focus Filter mode: Multi-degree BFS
    else if (selectedEntities.length > 0) {
      const queue: { id: string; hop: number }[] = [];
      const visitedHops = new Map<string, number>();

      selectedEntities.forEach((entity) => {
        visitedHops.set(entity.id, 0);
        queue.push({ id: entity.id, hop: 0 });
      });

      while (queue.length > 0) {
        const { id, hop } = queue.shift()!;
        if (hop < degree) {
          const neighbors = allMedMap.has(id)
            ? (medToIlls.get(id) || new Set<string>())
            : (illToMeds.get(id) || new Set<string>());

          neighbors.forEach((nbrId) => {
            if (!visitedHops.has(nbrId)) {
              visitedHops.set(nbrId, hop + 1);
              queue.push({ id: nbrId, hop: hop + 1 });
            }
          });
        }
      }

      visitedHops.forEach((_, id) => visibleNodeIds.add(id));
    }
    // 4. Default: Show all nodes
    else {
      medicines.forEach((m) => visibleNodeIds.add(m.id));
      diseases.forEach((d) => visibleNodeIds.add(d.id));
    }

    // Build GraphNode array
    const nodes: GraphNode[] = [];
    visibleNodeIds.forEach((id) => {
      const med = allMedMap.get(id);
      if (med) {
        const deg = medDegrees.get(id) || 0;
        const isInter = intersectionSummary.intersectingNodeIds.has(id);
        nodes.push({
          id,
          name: med.name,
          type: "medicine",
          radius: isInter ? 16 : 12,
          degreeCount: deg,
          isOrphan: deg === 0,
          isIntersecting: isInter,
          isDirectSelection: directSelectedSet.has(id),
        });
        return;
      }

      const ill = allIllMap.get(id);
      if (ill) {
        const deg = illDegrees.get(id) || 0;
        const isInter = intersectionSummary.intersectingNodeIds.has(id);
        nodes.push({
          id,
          name: ill.name,
          type: "disease",
          radius: isInter ? 14 : 10,
          degreeCount: deg,
          isOrphan: deg === 0,
          isIntersecting: isInter,
          isDirectSelection: directSelectedSet.has(id),
        });
      }
    });

    const activeNodeIdSet = new Set(nodes.map((n) => n.id));

    // Filter valid links where BOTH source and target are in activeNodeIdSet
    const activeLinksList: GraphLink[] = links
      .filter((l) => activeNodeIdSet.has(l.medicineId) && activeNodeIdSet.has(l.diseaseId))
      .map((l) => {
        const linkId = `${l.medicineId}-${l.diseaseId}`;
        return {
          id: linkId,
          source: l.medicineId,
          target: l.diseaseId,
          isIntersectingLink: intersectionSummary.intersectingLinkIds.has(linkId),
        };
      });

    return { activeNodes: nodes, activeLinks: activeLinksList };
  }, [
    medicines,
    diseases,
    links,
    selectedEntities,
    degree,
    orphanFilter,
    isIntersectingOnly,
    intersectionSummary,
    medDegrees,
    illDegrees,
  ]);

  // Handle Multi-Search selections
  const handleAddSearchEntity = useCallback((entity: SelectedEntity) => {
    setSelectedEntities((prev) => {
      if (prev.some((e) => e.id === entity.id)) return prev;
      return [...prev, entity];
    });
    setOrphanFilter("none");
  }, []);

  const handleRemoveSearchEntity = useCallback((id: string) => {
    setSelectedEntities((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleClearAllSearch = useCallback(() => {
    setSelectedEntities([]);
    setIsIntersectingOnly(false);
  }, []);

  // Handle Node Inspection Navigation with Back History
  const handleInspectNode = useCallback((node: InspectedNode) => {
    setInspectedNode((current) => {
      if (current && current.id !== node.id) {
        setInspectorHistory((prev) => [...prev, current]);
      }
      return node;
    });
  }, []);

  const handleBackHistory = useCallback(() => {
    setInspectorHistory((prev) => {
      if (prev.length === 0) return prev;
      const nextHistory = [...prev];
      const previousNode = nextHistory.pop()!;
      setInspectedNode(previousNode);
      return nextHistory;
    });
  }, []);

  const handleCloseInspector = useCallback(() => {
    setInspectedNode(null);
    setInspectorHistory([]);
  }, []);

  // Initialize and Update D3 Simulation
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 650;

    // Clear previous elements inside container
    let g = svg.select<SVGGElement>("g.main-container");
    if (g.empty()) {
      g = svg.append("g").attr("class", "main-container");
      containerRef.current = g.node();
    }
    g.selectAll("*").remove();

    // Zoom behavior setup
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 6])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    // Click background to deselect inspector
    svg.on("click", (event) => {
      if (event.target === svgRef.current) {
        handleCloseInspector();
        if (applyHighlightRef.current) applyHighlightRef.current(null);
      }
    });

    // Links container
    const linkGroup = g.append("g").attr("class", "links-layer");
    // Nodes container
    const nodeGroup = g.append("g").attr("class", "nodes-layer");

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(activeNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(activeLinks)
          .id((d) => d.id)
          .distance((d) => {
            const targetNode = typeof d.target === "object" ? d.target : null;
            return targetNode && targetNode.isIntersecting ? 110 : 90;
          })
      )
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide<GraphNode>()
          .radius((d) => d.radius + Math.max(16, d.name.length * 3.6))
      )
      .force("x", d3.forceX(width / 2).strength(0.06))
      .force("y", d3.forceY(height / 2).strength(0.06));

    simulationRef.current = simulation;

    // Draw Links
    const linkElements = linkGroup
      .selectAll<SVGLineElement, GraphLink>("line")
      .data(activeLinks, (d) => d.id)
      .enter()
      .append("line")
      .attr("stroke", (d) => (d.isIntersectingLink ? "#f59e0b" : "#475569"))
      .attr("stroke-opacity", (d) => (d.isIntersectingLink ? 0.9 : 0.45))
      .attr("stroke-width", (d) => (d.isIntersectingLink ? 2.5 : 1.5))
      .attr("stroke-dasharray", (d) => (d.isIntersectingLink ? "4 2" : "none"));

    // Define applyHighlight function
    const applyHighlight = (focusedNode: InspectedNode | null) => {
      if (!focusedNode) {
        // Reset all nodes to normal
        nodeElements
          .style("opacity", 1)
          .selectAll<SVGCircleElement, GraphNode>("circle.node-core")
          .attr("stroke", (d) => {
            if (d.isDirectSelection) return "#ffffff";
            if (d.isIntersecting) return "#fef08a";
            if (d.isOrphan) return "#94a3b8";
            return d.type === "medicine" ? "#1d4ed8" : "#047857";
          })
          .attr("stroke-width", (d) => {
            if (d.isDirectSelection) return 3.5;
            if (d.isIntersecting) return 3;
            return 2;
          });

        // Reset all links to normal
        linkElements
          .attr("stroke", (d) => (d.isIntersectingLink ? "#f59e0b" : "#475569"))
          .attr("stroke-opacity", (d) => (d.isIntersectingLink ? 0.9 : 0.45))
          .attr("stroke-width", (d) => (d.isIntersectingLink ? 2.5 : 1.5))
          .attr("stroke-dasharray", (d) => (d.isIntersectingLink ? "4 2" : "none"));
        return;
      }

      // Compute 1st degree neighbors of focusedNode
      const nbrIds = new Set<string>();
      nbrIds.add(focusedNode.id);

      activeLinks.forEach((l) => {
        const sId = typeof l.source === "object" ? l.source.id : l.source;
        const tId = typeof l.target === "object" ? l.target.id : l.target;
        if (sId === focusedNode.id) nbrIds.add(tId);
        if (tId === focusedNode.id) nbrIds.add(sId);
      });

      // Highlight nodes: focused node + 1st degree neighbors, dim others
      nodeElements
        .style("opacity", (d) => (nbrIds.has(d.id) ? 1 : 0.2))
        .selectAll<SVGCircleElement, GraphNode>("circle.node-core")
        .attr("stroke", (d) => {
          if (d.id === focusedNode.id) return "#38bdf8"; // Focus ring
          if (nbrIds.has(d.id)) return "#7dd3fc"; // 1st degree neighbor ring
          return d.type === "medicine" ? "#1d4ed8" : "#047857";
        })
        .attr("stroke-width", (d) => {
          if (d.id === focusedNode.id) return 4.5;
          if (nbrIds.has(d.id)) return 3;
          return 1.5;
        });

      // Highlight links connected to focusedNode
      linkElements
        .attr("stroke", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? "#38bdf8" : "#334155";
        })
        .attr("stroke-opacity", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? 1 : 0.08;
        })
        .attr("stroke-width", (d) => {
          const sId = typeof d.source === "object" ? d.source.id : d.source;
          const tId = typeof d.target === "object" ? d.target.id : d.target;
          const isConnected = sId === focusedNode.id || tId === focusedNode.id;
          return isConnected ? 3 : 1;
        });
    };

    applyHighlightRef.current = applyHighlight;

    // Draw Nodes
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, GraphNode>("g")
      .data(activeNodes, (d) => d.id)
      .enter()
      .append("g")
      .attr("class", "graph-node cursor-pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("mouseenter", (_event, d) => {
        applyHighlight({ id: d.id, name: d.name, type: d.type });
      })
      .on("mouseleave", () => {
        applyHighlight(inspectedNodeRef.current);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        handleInspectNode({ id: d.id, name: d.name, type: d.type });
        applyHighlight({ id: d.id, name: d.name, type: d.type });
      });

    // Node Circles
    nodeElements
      .append("circle")
      .attr("class", "node-core")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        if (d.isIntersecting) return "#f59e0b"; // Gold for intersecting medicine
        if (d.type === "medicine") return "#3b82f6"; // Blue for medicine
        return "#10b981"; // Emerald for disease
      })
      .attr("stroke", (d) => {
        if (d.isDirectSelection) return "#ffffff";
        if (d.isIntersecting) return "#fef08a";
        if (d.isOrphan) return "#94a3b8";
        return d.type === "medicine" ? "#1d4ed8" : "#047857";
      })
      .attr("stroke-width", (d) => {
        if (d.isDirectSelection) return 3.5;
        if (d.isIntersecting) return 3;
        return 2;
      })
      .attr("stroke-dasharray", (d) => (d.isOrphan ? "3 3" : "none"))
      .attr("filter", (d) =>
        d.isIntersecting ? "drop-shadow(0px 0px 8px rgba(245, 158, 11, 0.7))" : "none"
      );

    // Pulsing outer halo for intersecting medicines
    nodeElements
      .filter((d) => d.isIntersecting)
      .insert("circle", ":first-child")
      .attr("class", "node-halo")
      .attr("r", (d) => d.radius + 5)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", "4 3");

    // Crisp Typography Node Labels with Halo
    nodeElements
      .append("text")
      .text((d) => d.name)
      .attr("x", (d) => d.radius + 6)
      .attr("y", 4)
      .attr("font-size", (d) => (d.isIntersecting ? "12px" : "11px"))
      .attr("font-weight", (d) => (d.isIntersecting || d.isDirectSelection ? 700 : 600))
      .attr("fill", (d) => {
        if (d.isIntersecting) return "#fef08a";
        if (d.isDirectSelection) return "#ffffff";
        return "#f1f5f9";
      })
      .attr("stroke", "#020617")
      .attr("stroke-width", 3.5)
      .attr("paint-order", "stroke fill")
      .attr("stroke-linejoin", "round")
      .attr("font-family", "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif")
      .attr("letter-spacing", "0.015em")
      .style("pointer-events", "none")
      .style("display", showLabels ? "block" : "none");

    // Initialize highlight for current inspection state
    applyHighlight(inspectedNodeRef.current);

    // Simulation Tick Update
    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d) => (typeof d.source === "object" ? d.source.x || 0 : 0))
        .attr("y1", (d) => (typeof d.source === "object" ? d.source.y || 0 : 0))
        .attr("x2", (d) => (typeof d.target === "object" ? d.target.x || 0 : 0))
        .attr("y2", (d) => (typeof d.target === "object" ? d.target.y || 0 : 0));

      nodeElements.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [activeNodes, activeLinks, showLabels, handleInspectNode, handleCloseInspector]);

  // Sync highlight whenever inspectedNode changes from outside D3 (e.g. drawer navigation or close)
  useEffect(() => {
    if (applyHighlightRef.current) {
      applyHighlightRef.current(inspectedNode);
    }
  }, [inspectedNode]);

  // Zoom / Viewport Toolbar Actions
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.75);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  const handleReheatSim = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  };

  const isLoading = loadingMeds || loadingDiseases || loadingLinks;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative font-sans">
      {/* Top Controls Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 z-10 shrink-0 shadow-md">
        {/* Left: Multi-Search and Scope */}
        <div className="flex-1 max-w-2xl">
          <GraphMultiSearch
            medicines={medicines}
            diseases={diseases}
            selectedEntities={selectedEntities}
            onAddEntity={handleAddSearchEntity}
            onRemoveEntity={handleRemoveSearchEntity}
            onClearAll={handleClearAllSearch}
            degree={degree}
            onDegreeChange={setDegree}
            totalIntersectingCount={intersectionSummary.intersectingNodeIds.size}
            intersectionLabel={intersectionSummary.title}
            isIntersectingOnly={isIntersectingOnly}
            onFilterIntersectionsOnly={() => setIsIntersectingOnly((prev) => !prev)}
          />
        </div>

        {/* Right: Quick Action Buttons & Stats */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Orphan Filters */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => {
                setOrphanFilter((prev) => (prev === "meds" ? "none" : "meds"));
                setSelectedEntities([]);
              }}
              className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1.5 ${
                orphanFilter === "meds"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Show unlinked medicines"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
              Orphan Meds ({orphanMedCount})
            </button>
            <button
              onClick={() => {
                setOrphanFilter((prev) => (prev === "diseases" ? "none" : "diseases"));
                setSelectedEntities([]);
              }}
              className={`px-2.5 py-1 rounded font-medium transition flex items-center gap-1.5 ${
                orphanFilter === "diseases"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Show unlinked diseases"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Orphan Diseases ({orphanDiseaseCount})
            </button>
          </div>

          {/* Add Entity Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Node</span>
          </button>
        </div>
      </header>

      {/* Main Canvas & Inspector Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* SVG Canvas Area */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden select-none">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-30">
              <div className="flex items-center gap-2 text-slate-300 text-sm font-medium">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                Loading Remedy Network...
              </div>
            </div>
          )}

          <svg
            ref={svgRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          ></svg>

          {/* Floating Canvas Controls (Bottom Left) */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-1 text-slate-300 shadow-xl z-10">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-slate-800 mx-1"></div>
            <button
              onClick={handleReheatSim}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded transition"
              title="Re-balance Graph Physics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLabels((prev) => !prev)}
              className={`p-1.5 rounded transition ${
                showLabels
                  ? "bg-slate-800 text-blue-400"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
              title="Toggle Text Labels"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>

          {/* Visual Legend (Bottom Right) */}
          <div className="hidden sm:flex absolute bottom-4 right-4 items-center gap-4 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 shadow-lg pointer-events-none z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Medicine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Disease</span>
            </div>
            {intersectionSummary.hasIntersection && (
              <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-300 shadow-sm"></span>
                <span>Common Intersection</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-slate-400"></span>
              <span>Orphan</span>
            </div>
          </div>

          {/* Intersection Insights Floating Banner (Bottom Left, above zoom controls) */}
          {intersectionSummary.hasIntersection && (
            <div className="absolute bottom-16 left-4 bg-slate-900/95 backdrop-blur border border-amber-500/60 rounded-lg px-3 py-1.5 flex items-center gap-2.5 text-xs text-amber-200 shadow-2xl z-10 max-w-lg">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div className="truncate text-xs">
                <span className="font-bold text-amber-300 mr-1.5">
                  {intersectionSummary.title}
                </span>
                <span className="text-slate-300 text-[11px]">
                  ({intersectionSummary.description})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsIntersectingOnly((prev) => !prev)}
                className={`ml-2 px-2.5 py-1 rounded text-[11px] font-bold transition shrink-0 ${
                  isIntersectingOnly
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-amber-950/80 hover:bg-amber-900/80 text-amber-300 border border-amber-600/50"
                }`}
                title="Isolate only the intersecting remedies / conditions"
              >
                {isIntersectingOnly ? "Show All Context" : "Isolate"}
              </button>
            </div>
          )}

          {/* Filter Status Badge (Placed at top-right to NEVER block or overlap the search dropdown on the left!) */}
          {(selectedEntities.length > 0 || orphanFilter !== "none" || isIntersectingOnly) && (
            <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-200 flex items-center gap-2 shadow-xl z-10">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>
                Showing <strong>{activeNodes.length}</strong> nodes, <strong>{activeLinks.length}</strong> links
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedEntities([]);
                  setOrphanFilter("none");
                  setIsIntersectingOnly(false);
                }}
                className="ml-2 text-rose-400 hover:text-rose-300 underline font-medium"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Slide-over Inspector Drawer */}
        <GraphInspectorDrawer
          node={inspectedNode}
          onClose={handleCloseInspector}
          onInspectNode={handleInspectNode}
          medicines={medicines}
          diseases={diseases}
          links={links}
          history={inspectorHistory}
          onBackHistory={handleBackHistory}
          intersectingMedicineIds={intersectionSummary.intersectingNodeIds}
        />
      </div>

      {/* Add Entity Modal */}
      <AddEntityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        medicines={medicines}
        diseases={diseases}
        onCreated={(newEntity) => {
          handleInspectNode(newEntity);
        }}
      />
    </div>
  );
}
