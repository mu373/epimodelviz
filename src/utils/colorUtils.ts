import { predefinedCompartmentColors, dynamicColorPalette } from '../constants/colors';

const generatedColors = new Map<string, string>();

export function getCompartmentBaseName(id: string): string {
  return id.split('_')[0];
}

export function generateColorForGroup(groupName: string): string {
  if (generatedColors.has(groupName)) {
    return generatedColors.get(groupName)!;
  }

  let hash = 0;
  for (let i = 0; i < groupName.length; i++) {
    const char = groupName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const colorIndex = Math.abs(hash) % dynamicColorPalette.length;
  const color = dynamicColorPalette[colorIndex];
  generatedColors.set(groupName, color);
  return color;
}

export function getCompartmentColor(id: string): string {
  const baseName = getCompartmentBaseName(id);
  if (predefinedCompartmentColors[baseName]) {
    return predefinedCompartmentColors[baseName];
  }
  return generateColorForGroup(baseName);
}
