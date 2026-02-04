export interface CompartmentDef {
  id: string;
  label?: string;
}

export interface TransitionDef {
  type: 'spontaneous' | 'mediated' | 'mediated_multi' | 'vaccination';
  source: string;
  target: string;
  rate?: string;
  /** New format: singular mediator compartment ID */
  mediator?: string;
  /** Old format: mediators object or array */
  mediators?:
    | { rate: string; source: string }
    | Array<{ rate: string; source: string | string[] }>;
}

export interface ModelConfig {
  model?: {
    compartments?: CompartmentDef[];
    transitions?: TransitionDef[];
    parameters?: Record<string, unknown>;
    name?: string;
    version?: string;
    date?: string;
  };
  compartments?: CompartmentDef[];
  transitions?: TransitionDef[];
  parameters?: Record<string, unknown>;
}

export interface MediatorSet {
  rate: string;
  sources: string[];
}

export interface MediatorGroup {
  targetSource: string;
  targetTarget: string;
  mediatorSets: MediatorSet[];
  id: string;
}

export interface CompartmentNodeData {
  id: string;
  label: string;
  isVaccinated: boolean;
  color: string;
}

export interface TransitionEdgeData {
  type: string;
  rate: string;
  showLabel: boolean;
}

export interface ModelStats {
  compartments: number;
  transitions: number;
  parameters: number;
}
