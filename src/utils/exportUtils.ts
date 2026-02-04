import { toSvg } from 'html-to-image';

export async function exportToSvg() {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) return;

  const dataUrl = await toSvg(viewport, {
    filter: (node: HTMLElement) => {
      // Exclude minimap and controls from export
      if (node.classList?.contains('react-flow__minimap')) return false;
      if (node.classList?.contains('react-flow__controls')) return false;
      return true;
    },
  });

  const link = document.createElement('a');
  link.download = 'compartment-model.svg';
  link.href = dataUrl;
  link.click();
}
