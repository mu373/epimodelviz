import yaml from 'js-yaml';
import { MarkerType, type Node, type Edge } from '@xyflow/react';
import type {
  ModelConfig,
  CompartmentNodeData,
  TransitionEdgeData,
  MediatorGroup,
  ModelStats,
} from '../types/model';
import { getCompartmentColor, getCompartmentBaseName } from './colorUtils';

export interface ParseResult {
  nodes: Node<CompartmentNodeData>[];
  edges: Edge<TransitionEdgeData>[];
  mediatorGroups: MediatorGroup[];
  stats: ModelStats;
}

export function parseModel(yamlText: string): ParseResult {
  const raw = yaml.load(yamlText) as ModelConfig;

  const compartments = raw.model?.compartments ?? raw.compartments ?? [];
  const transitions = raw.model?.transitions ?? raw.transitions ?? [];
  const parameters = raw.model?.parameters ?? raw.parameters ?? {};

  // Build nodes
  const nodes: Node<CompartmentNodeData>[] = compartments.map((comp) => ({
    id: comp.id,
    type: 'compartment',
    position: { x: 0, y: 0 },
    data: {
      id: comp.id,
      label: comp.label ?? comp.id,
      isVaccinated: comp.id.includes('_vax'),
      color: getCompartmentColor(comp.id),
    },
  }));

  // Build edges and mediator groups
  const edges: Edge<TransitionEdgeData>[] = [];
  const mediatorGroupMap: Record<
    string,
    { targetSource: string; targetTarget: string; mediatorSets: { rate: string; sources: string[] }[] }
  > = {};

  transitions.forEach((trans, i) => {
    let edgeType = trans.type ?? 'spontaneous';

    // Handle mediated transitions
    if (trans.type === 'mediated' && trans.mediators && !Array.isArray(trans.mediators)) {
      const med = trans.mediators as { rate: string; source: string };
      const groupKey = `${trans.source}-${trans.target}-${med.rate}`;
      if (!mediatorGroupMap[groupKey]) {
        mediatorGroupMap[groupKey] = {
          targetSource: trans.source,
          targetTarget: trans.target,
          mediatorSets: [{ rate: med.rate, sources: [] }],
        };
      }
      mediatorGroupMap[groupKey].mediatorSets[0].sources.push(med.source);
    }

    // Handle mediated_multi transitions
    if (trans.type === 'mediated_multi' && Array.isArray(trans.mediators)) {
      edgeType = 'mediated';
      const groupKey = `${trans.source}-${trans.target}-multi-${i}`;
      if (!mediatorGroupMap[groupKey]) {
        mediatorGroupMap[groupKey] = {
          targetSource: trans.source,
          targetTarget: trans.target,
          mediatorSets: [],
        };
      }
      for (const mediatorGroup of trans.mediators as Array<{ rate: string; source: string | string[] }>) {
        const sources = Array.isArray(mediatorGroup.source)
          ? mediatorGroup.source
          : [mediatorGroup.source];
        mediatorGroupMap[groupKey].mediatorSets.push({
          rate: mediatorGroup.rate,
          sources,
        });
      }
    }

    const resolvedType = edgeType === 'vaccination' ? 'vaccination' : edgeType === 'mediated' ? 'mediated' : 'spontaneous';
    const markerColor = resolvedType === 'mediated' ? '#f59e0b' : resolvedType === 'vaccination' ? '#644391' : '#6b7280';

    edges.push({
      id: `edge-${i}`,
      source: trans.source,
      target: trans.target,
      type: resolvedType,
      markerEnd: { type: MarkerType.ArrowClosed, color: markerColor },
      data: {
        type: edgeType,
        rate: trans.rate ?? '',
        showLabel: true,
      },
    });
  });

  const mediatorGroups: MediatorGroup[] = Object.keys(mediatorGroupMap).map((key, idx) => {
    const g = mediatorGroupMap[key];
    return {
      targetSource: g.targetSource,
      targetTarget: g.targetTarget,
      mediatorSets: g.mediatorSets,
      id: `mediator-group-${idx}`,
    };
  });

  const stats: ModelStats = {
    compartments: compartments.length,
    transitions: transitions.length,
    parameters: typeof parameters === 'object' && parameters !== null ? Object.keys(parameters).length : 0,
  };

  return { nodes, edges, mediatorGroups, stats };
}

export function getCompartmentGroup(id: string) {
  const baseType = getCompartmentBaseName(id);
  const isVax = id.includes('_vax');
  return { base: baseType, isVax };
}

export function getOrderedColumns(
  nodes: Node<CompartmentNodeData>[],
  defaultOrder: string[],
): string[] {
  const uniqueTypes = new Set<string>();
  nodes.forEach((n) => uniqueTypes.add(getCompartmentBaseName(n.id)));

  const ordered: string[] = [];
  defaultOrder.forEach((t) => {
    if (uniqueTypes.has(t)) ordered.push(t);
  });
  uniqueTypes.forEach((t) => {
    if (!ordered.includes(t)) ordered.push(t);
  });
  return ordered;
}
