let currentModel = null;
let svg = null;
let g = null;
let simulation = null;
let zoom = null;
let currentLayout = 'hierarchical';
let currentNodes = [];
let currentLinks = [];
let mediatorLinks = [];

// Helper function to get box edge connection point with proper padding
function getBoxEdgePoint(fromNode, toNode, isTarget = false) {
    const boxWidth = 80;
    const boxHeight = 40;
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const angle = Math.atan2(dy, dx);
    
    // Calculate the edge point
    let edgeX, edgeY;
    
    // Determine which edge to connect to based on angle
    if (Math.abs(angle) < Math.PI / 4) {
        // Right edge
        edgeX = fromNode.x + boxWidth/2;
        edgeY = fromNode.y;
    } else if (Math.abs(angle) > 3 * Math.PI / 4) {
        // Left edge  
        edgeX = fromNode.x - boxWidth/2;
        edgeY = fromNode.y;
    } else if (angle > 0) {
        // Bottom edge
        edgeX = fromNode.x;
        edgeY = fromNode.y + boxHeight/2;
    } else {
        // Top edge
        edgeX = fromNode.x;
        edgeY = fromNode.y - boxHeight/2;
    }
    
    // Apply padding to make room for arrow - much larger for visibility
    if (isTarget) {
        const padding = -2; // Much larger padding for arrow visibility
        const norm = Math.sqrt(dx * dx + dy * dy);
        if (norm > 0) {
            edgeX -= (dx / norm) * padding;
            edgeY -= (dy / norm) * padding;
        }
    }
    
    return { x: edgeX, y: edgeY };
}

// Helper function to update mediator group positions
function updateMediatorGroupPositions() {
    // Group mediator links by target transition
    const transitionGroups = {};
    mediatorLinks.forEach(groupData => {
        const key = `${groupData.targetSource}-${groupData.targetTarget}`;
        if (!transitionGroups[key]) {
            transitionGroups[key] = [];
        }
        transitionGroups[key].push(groupData);
    });
    
    // Position each group
    Object.keys(transitionGroups).forEach(key => {
        const groups = transitionGroups[key];
        const s = currentNodes.find(n => n.id === groups[0].targetSource);
        const t = currentNodes.find(n => n.id === groups[0].targetTarget);
        
        if (s && t) {
            const baseX = (s.x + t.x) / 2;
            const baseY = (s.y + t.y) / 2 + 70;
            
            // Stack groups vertically
            let cumulativeY = 0;
            groups.forEach((groupData, groupIdx) => {
                // X offset for multiple groups targeting same transition
                const xOffset = (groupIdx - (groups.length - 1) / 2) * 30;
                groupData.groupX = baseX;
                groupData.arrowX = baseX + xOffset; // Separate X for arrow
                groupData.groupY = baseY + cumulativeY;
                
                // Calculate positions for mediator sets within this group
                let yOffset = 0;
                groupData.mediatorSets.forEach((set, setIdx) => {
                    const cols = Math.min(Math.ceil(Math.sqrt(set.sources.length)), 4);
                    const rows = Math.ceil(set.sources.length / cols);
                    const boxWidth = 60;
                    const boxHeight = 24;
                    const gap = 5;
                    const setGap = 15;
                    
                    if (!set.positions) set.positions = [];
                    
                    set.sources.forEach((src, idx) => {
                        const row = Math.floor(idx / cols);
                        const col = idx % cols;
                        
                        const totalWidth = Math.min(set.sources.length, cols) * boxWidth + 
                                          (Math.min(set.sources.length, cols) - 1) * gap;
                        const totalHeight = rows * boxHeight + (rows - 1) * gap;
                        
                        const sourceNode = currentNodes.find(n => n.id === src);
                        set.positions[idx] = {
                            source: src,
                            x: groupData.groupX - totalWidth / 2 + col * (boxWidth + gap) + boxWidth / 2,
                            y: groupData.groupY - totalHeight / 2 + row * (boxHeight + gap) + boxHeight / 2 + yOffset,
                            color: sourceNode ? getCompartmentColor(sourceNode.id) : '#6b7280'
                        };
                    });
                    
                    set.centerY = groupData.groupY + yOffset;
                    // Store the minimum Y for this set for arrow positioning
                    set.minY = Math.min(...set.positions.map(p => p.y));
                    yOffset += rows * boxHeight + (rows - 1) * gap + setGap;
                });
                
                // Calculate total height of this group for stacking
                const totalGroupHeight = yOffset + 40; // Add spacing between groups
                cumulativeY += totalGroupHeight;
            });
        }
    });

    // Update mediator group elements
    d3.selectAll('.mediator-group').each(function(groupData, groupIdx) {
        const group = d3.select(this);
        
        groupData.mediatorSets.forEach((set, setIdx) => {
            const setGroup = group.select(`.mediator-set-${setIdx}`);
            
            // Update boxes
            setGroup.selectAll('.mediator-box')
                .attr('x', (d, i) => set.positions && set.positions[i] ? set.positions[i].x - 30 : 0)
                .attr('y', (d, i) => set.positions && set.positions[i] ? set.positions[i].y - 12 : 0);
            
            setGroup.selectAll('.mediator-label')
                .attr('x', (d, i) => set.positions && set.positions[i] ? set.positions[i].x : 0)
                .attr('y', (d, i) => set.positions && set.positions[i] ? set.positions[i].y + 3 : 0);
            
            // Update vertical arrow with X offset
            const setMinY = set.minY || (set.positions ? Math.min(...set.positions.map(p => p.y)) : 0);
            const s = currentNodes.find(n => n.id === groupData.targetSource);
            const t = currentNodes.find(n => n.id === groupData.targetTarget);
            const targetY = s && t ? (s.y + t.y) / 2 : groupData.groupY - 50;
            
            setGroup.select('.mediator-link')
                .attr('x1', groupData.arrowX || groupData.groupX)
                .attr('y1', setMinY - 15)
                .attr('x2', groupData.arrowX || groupData.groupX) // Same X for vertical arrow
                .attr('y2', targetY);
            
            // Update rate label position - positioned near the start of the arrow
            const arrowX = groupData.arrowX !== undefined ? groupData.arrowX : groupData.groupX;
            setGroup.select('foreignObject')
                .attr('x', arrowX + 5)
                .attr('y', setMinY - 40)
                .attr('width', 100)
                .attr('height', 30);
        });
    });
}

// Predefined compartment colors - subtle and professional
const predefinedCompartmentColors = {
    'S': '#3b82f6',    // blue
    'L': '#eab308',    // yellow
    'I': '#ef4444',    // red
    'E': '#f97316',    // orange
    'Home': '#22c55e', // green
    'Hosp': '#a855f7', // purple
    'R': '#6b7280',    // gray
    'D': '#1f2937',    // dark gray
    'V': '#8b5cf6'     // violet
};

// Dynamic color palette for unknown compartments
const dynamicColorPalette = [
    '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1',
    '#f43f5e', '#22d3ee', '#a3e635', '#fb7185', '#34d399'
];

// Cache for generated colors
const generatedColors = new Map();

// Generate a consistent color for a compartment group
function generateColorForGroup(groupName) {
    if (generatedColors.has(groupName)) {
        return generatedColors.get(groupName);
    }
    
    // Simple hash function for consistent color assignment
    let hash = 0;
    for (let i = 0; i < groupName.length; i++) {
        const char = groupName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    const colorIndex = Math.abs(hash) % dynamicColorPalette.length;
    const color = dynamicColorPalette[colorIndex];
    generatedColors.set(groupName, color);
    return color;
}

function getCompartmentColor(id) {
    // Extract base compartment name (before underscore or full name)
    const baseName = getCompartmentBaseName(id);
    
    // Check predefined colors first
    if (predefinedCompartmentColors[baseName]) {
        return predefinedCompartmentColors[baseName];
    }
    
    // Generate dynamic color for unknown compartments
    return generateColorForGroup(baseName);
}

// Extract base compartment name from full ID
function getCompartmentBaseName(id) {
    // Split by underscore and take the first part
    const parts = id.split('_');
    return parts[0];
}

// Default column order for compartment types
let defaultColumnOrder = ['S', 'E', 'L', 'I', 'H', 'Home', 'Hosp', 'R', 'D'];

// Get compartment group - group by base type, then by vaccination status
function getCompartmentGroup(id) {
    // Extract base compartment name using the same logic as color function
    const baseType = getCompartmentBaseName(id);
    
    // Check if it's vaccinated
    const isVax = id.includes('_vax');
    
    // Return composite group
    return {
        base: baseType,
        isVax: isVax,
        sortKey: baseType + (isVax ? '_vax' : '')
    };
}

// Get all unique compartment base types from current model
function getUniqueCompartmentTypes(nodes) {
    const types = new Set();
    nodes.forEach(node => {
        const baseType = getCompartmentBaseName(node.id);
        types.add(baseType);
    });
    return Array.from(types);
}

// Get ordered column list based on current compartments
function getOrderedColumns(nodes) {
    const uniqueTypes = getUniqueCompartmentTypes(nodes);
    const orderedColumns = [];
    
    // First add types that are in the default order
    defaultColumnOrder.forEach(type => {
        if (uniqueTypes.includes(type)) {
            orderedColumns.push(type);
        }
    });
    
    // Then add any remaining types not in default order
    uniqueTypes.forEach(type => {
        if (!orderedColumns.includes(type)) {
            orderedColumns.push(type);
        }
    });
    
    return orderedColumns;
}

// File input handler
document.getElementById('file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('yaml-input').value = e.target.result;
            parseYAML();
        };
        reader.readAsText(file);
    }
});

// Parse YAML
function parseYAML() {
    const yamlText = document.getElementById('yaml-input').value;
    if (!yamlText.trim()) {
        showError('Please input YAML content');
        return;
    }

    try {
        currentModel = jsyaml.load(yamlText);
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('legend').style.display = 'block';
        visualizeModel();
        updateStats();
        hideError();
    } catch (e) {
        showError('YAML parsing error: ' + e.message);
    }
}

// Visualize model
function visualizeModel() {
    if (!currentModel) return;

    const nodes = [];
    const links = [];
    const mediatorLinksLocal = [];
    
    // Create nodes - handle both structures (model.compartments and direct compartments)
    const compartments = currentModel.model?.compartments || currentModel.compartments;
    if (compartments) {
        compartments.forEach((comp, i) => {
            nodes.push({
                id: comp.id,
                label: comp.label || comp.id,
                isVaccinated: comp.id.includes('_vax'),
                group: getCompartmentGroup(comp.id),
                index: i
            });
        });
    }

    // Create links and collect mediator relationships - handle both structures
    const transitions = currentModel.model?.transitions || currentModel.transitions;
    if (transitions) {
        // Group mediators by target transition and rate
        const mediatorGroups = {};
        
        transitions.forEach((trans, i) => {
            const link = {
                source: trans.source,
                target: trans.target,
                type: trans.type || 'spontaneous',
                rate: trans.rate || '',
                id: `link-${i}`,
                originalTransition: trans
            };

            // Handle mediated transitions
            if (trans.type === 'mediated' && trans.mediators) {
                link.mediatorRate = trans.mediators.rate;
                
                // Create a key for grouping by source-target-rate
                const groupKey = `${trans.source}-${trans.target}-${trans.mediators.rate}`;
                if (!mediatorGroups[groupKey]) {
                    mediatorGroups[groupKey] = {
                        targetSource: trans.source,
                        targetTarget: trans.target,
                        mediatorSets: [{
                            rate: trans.mediators.rate,
                            sources: []
                        }]
                    };
                }
                
                // Add to the set with same rate
                mediatorGroups[groupKey].mediatorSets[0].sources.push(trans.mediators.source);
            }
            
            // Handle mediated_multi transitions
            if (trans.type === 'mediated_multi' && trans.mediators) {
                link.type = 'mediated'; // Treat as mediated for display
                
                const groupKey = `${trans.source}-${trans.target}-multi-${i}`;
                if (!mediatorGroups[groupKey]) {
                    mediatorGroups[groupKey] = {
                        targetSource: trans.source,
                        targetTarget: trans.target,
                        mediatorSets: []
                    };
                }
                
                // Each mediator in mediated_multi is a separate set
                trans.mediators.forEach(mediatorGroup => {
                    const sources = Array.isArray(mediatorGroup.source) 
                        ? mediatorGroup.source 
                        : [mediatorGroup.source];
                    
                    mediatorGroups[groupKey].mediatorSets.push({
                        rate: mediatorGroup.rate,
                        sources: sources
                    });
                });
            }

            links.push(link);
        });
        
        // Convert mediator groups to mediator links
        Object.keys(mediatorGroups).forEach((key, idx) => {
            const group = mediatorGroups[key];
            mediatorLinksLocal.push({
                targetSource: group.targetSource,
                targetTarget: group.targetTarget,
                mediatorSets: group.mediatorSets,
                id: `mediator-group-${idx}`
            });
        });
    }

    currentNodes = nodes;
    currentLinks = links;
    mediatorLinks = mediatorLinksLocal;
    
    renderGraph(nodes, links, mediatorLinksLocal);
}

function renderGraph(nodes, links, mediatorLinks) {
    // Clear existing
    d3.select('#graph-container svg').remove();
    
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Create SVG
    svg = d3.select('#graph-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Define arrow markers
    const defs = svg.append('defs');
    
    ['spontaneous', 'mediated', 'vaccination'].forEach(type => {
        defs.append('marker')
            .attr('id', `arrow-${type}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 6) // Adjusted for better visibility
            .attr('refY', 0)
            .attr('markerWidth', 4)
            .attr('markerHeight', 4)
            .attr('orient', 'auto')
            .attr('markerUnits', 'strokeWidth')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', type === 'mediated' ? '#f59e0b' : type === 'vaccination' ? '#644391' : '#6b7280');
    });

    // Main container
    g = svg.append('g');

    // Setup zoom
    zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    svg.call(zoom);

    // Apply layout
    applyLayout(nodes, links, currentLayout, width, height);

    // Create mediator groups
    const mediatorGroups = g.append('g')
        .attr('class', 'mediator-groups')
        .selectAll('g')
        .data(mediatorLinks)
        .enter().append('g')
        .attr('class', 'mediator-group');

    // Initialize mediator group positions
    updateMediatorGroupPositions();

    // Draw mediator boxes for each group
    mediatorGroups.each(function(groupData) {
        const group = d3.select(this);
        
        // Draw each mediator set
        groupData.mediatorSets.forEach((set, setIdx) => {
            const setGroup = group.append('g')
                .attr('class', `mediator-set-${setIdx}`);
            
            // Draw boxes for this set
            const boxes = setGroup.selectAll('.mediator-box')
                .data(set.positions || [])
                .enter().append('g')
                .style('cursor', 'pointer');
            
            boxes.append('rect')
                .attr('class', 'mediator-box')
                .attr('x', d => d.x - 30)
                .attr('y', d => d.y - 12)
                .attr('width', 60)
                .attr('height', 24)
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('fill', d => d.color)
                .attr('fill-opacity', 0.3)
                .attr('stroke', d => d.color)
                .attr('stroke-width', 1.5)
                .on('mouseenter', function(event, d) {
                    const tooltip = document.getElementById('tooltip');
                    tooltip.classList.remove('hidden');
                    
                    let content = `
                        <div class="font-medium">Mediator: ${d.source}</div>
                        <div class="text-gray-300">Rate: ${set.rate}</div>
                    `;
                    tooltip.innerHTML = content;
                    
                    // Position tooltip centered above element
                    setTimeout(() => {
                        const rect = event.target.getBoundingClientRect();
                        tooltip.style.left = (rect.left + rect.width/2 - tooltip.offsetWidth/2) + 'px';
                        tooltip.style.top = (rect.top - tooltip.offsetHeight - 10) + 'px';
                    }, 0);
                    
                    // Highlight the box
                    d3.select(this).attr('fill-opacity', 0.5);
                })
                .on('mouseleave', function() {
                    document.getElementById('tooltip').classList.add('hidden');
                    // Reset opacity
                    d3.select(this).attr('fill-opacity', 0.3);
                });
            
            boxes.append('text')
                .attr('class', 'mediator-label')
                .attr('x', d => d.x)
                .attr('y', d => d.y + 3)
                .attr('text-anchor', 'middle')
                .attr('font-size', d => d.source.length > 8 ? '8px' : '10px')
                .attr('font-weight', '600')
                .attr('fill', d => d.color)
                .text(d => {
                    if (d.source.length > 10) {
                        return d.source.substring(0, 8) + '...';
                    }
                    return d.source;
                })
                .append('title')
                .text(d => d.source);
            
            // Draw arrow and rate for this set - vertical arrow with offset
            const setMinY = Math.min(...(set.positions || []).map(p => p.y));
            const s = nodes.find(n => n.id === groupData.targetSource);
            const t = nodes.find(n => n.id === groupData.targetTarget);
            const targetY = s && t ? (s.y + t.y) / 2 : groupData.groupY - 50;
            
            const mediatorLink = setGroup.append('line')
                .attr('class', 'mediator-link')
                .attr('stroke', '#f59e0b')
                .attr('stroke-width', 1.5)
                .attr('stroke-opacity', 0.7)
                .attr('marker-end', 'url(#arrow-mediated)')
                .attr('x1', groupData.arrowX || groupData.groupX)
                .attr('y1', setMinY - 15)
                .attr('x2', groupData.arrowX || groupData.groupX) // Same X for vertical arrow
                .attr('y2', targetY)
                .style('cursor', 'pointer');
            
            // Add hover interaction for mediator link
            mediatorLink.on('mouseenter', function(event) {
                const tooltip = document.getElementById('tooltip');
                tooltip.classList.remove('hidden');
                
                let content = `<div class="text-gray-300">Mediators: ${set.sources.join(', ')}</div>`;
                content += `<div class="text-gray-300">Rate: ${set.rate}</div>`;
                tooltip.innerHTML = content;
                
                // Position tooltip centered above cursor
                setTimeout(() => {
                    tooltip.style.left = event.pageX - tooltip.offsetWidth/2 + 'px';
                    tooltip.style.top = (event.pageY - tooltip.offsetHeight - 10) + 'px';
                }, 0);
                
                // Highlight the link
                d3.select(this).attr('stroke-width', 3);
            })
            .on('mouseleave', function() {
                document.getElementById('tooltip').classList.add('hidden');
                // Reset link width
                d3.select(this).attr('stroke-width', 1.5);
            });
            
            // Add rate label for this set - positioned to the right of arrow
            const arrowX = groupData.arrowX !== undefined ? groupData.arrowX : groupData.groupX;
            const rateFO = setGroup.append('foreignObject')
                .attr('x', arrowX + 5) // Right next to the arrow
                .attr('y', setMinY - 40) // Near the start point of arrow
                .attr('width', 100)
                .attr('height', 30); // Add explicit height
            
            rateFO.append('xhtml:div')
                .style('font-size', '9px')
                .style('color', '#f59e0b')
                .style('word-wrap', 'break-word')
                .style('line-height', '1.2')
                .style('overflow', 'visible')
                .style('background', 'rgba(255, 255, 255, 0.8)') // Add subtle background for visibility
                .style('padding', '2px')
                .style('border-radius', '2px')
                .text(set.rate);
        });
    });

    // Create main transition links with invisible hit area
    const linkGroup = g.append('g')
        .attr('class', 'links');
    
    // Add invisible wider paths for better hover detection
    const linkHitArea = linkGroup.selectAll('.link-hit-area')
        .data(links)
        .enter().append('path')
        .attr('class', 'link-hit-area')
        .attr('stroke', 'transparent')
        .attr('stroke-width', 20) // Wide hit area
        .attr('fill', 'none')
        .style('cursor', 'pointer')
        .attr('d', d => {
            const dx = d.target.x - d.source.x;
            
            // Calculate edge connection points
            const sourceBox = getBoxEdgePoint(d.source, d.target, false);
            const targetBox = getBoxEdgePoint(d.target, d.source, true);
            return `M ${sourceBox.x} ${sourceBox.y} L ${targetBox.x} ${targetBox.y}`;
        });
    
    // Create visible transition links
    const link = linkGroup.selectAll('.link')
        .data(links)
        .enter().append('path')
        .attr('class', 'link')
        .attr('stroke', d => {
            if (d.type === 'mediated') return '#f59e0b';
            if (d.type === 'vaccination') return '#644391';
            return '#6b7280';
        })
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', d => d.type === 'mediated' ? '4,2' : 'none')
        .attr('fill', 'none')
        .attr('marker-end', d => `url(#arrow-${d.type})`)
        .style('cursor', 'pointer')
        .attr('d', d => {
            const dx = d.target.x - d.source.x;
            
            // Calculate edge connection points
            const sourceBox = getBoxEdgePoint(d.source, d.target, false);
            const targetBox = getBoxEdgePoint(d.target, d.source, true);
            return `M ${sourceBox.x} ${sourceBox.y} L ${targetBox.x} ${targetBox.y}`;
            
        })
    // Add hover interactions to hit areas
    linkHitArea
        .on('mouseenter', function(event, d) {
            // Show transition details on hover
            const tooltip = document.getElementById('tooltip');
            tooltip.classList.remove('hidden');
            tooltip.style.left = event.pageX - tooltip.offsetWidth/2 + 'px';
            tooltip.style.top = (event.pageY - tooltip.offsetHeight - 10) + 'px';
            
            let content = `<div class="font-medium">Transition: ${d.source.id} → ${d.target.id}</div>`;
            content += `<div class="text-gray-300">Type: ${d.type}</div>`;
            // Don't show rate for mediated transitions (shown on mediator arrows instead)
            if (d.type !== 'mediated' && d.rate) {
                content += `<div class="text-gray-300">Rate: ${d.rate}</div>`;
            }
            tooltip.innerHTML = content;
            
            // Adjust position after content is set
            setTimeout(() => {
                tooltip.style.left = event.pageX - tooltip.offsetWidth/2 + 'px';
                tooltip.style.top = (event.pageY - tooltip.offsetHeight - 10) + 'px';
            }, 0);
            
            // Highlight the corresponding visible link
            d3.selectAll('.link').filter(l => l === d)
                .attr('stroke-width', 4);
        })
        .on('mouseleave', function(event, d) {
            document.getElementById('tooltip').classList.add('hidden');
            // Reset link width
            d3.selectAll('.link').filter(l => l === d)
                .attr('stroke-width', d => (d.type === 'vaccination' ? 3 : 2));
        });

    // Create link labels (for spontaneous and vaccination transitions) with wrapping
    const linkLabel = g.append('g')
        .attr('class', 'link-labels')
        .selectAll('foreignObject')
        .data(links.filter(d => d.type !== 'mediated' && d.rate))
        .enter().append('foreignObject')
        .attr('class', 'link-label')
        .attr('x', d => (d.source.x + d.target.x) / 2 - 30)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 20)
        .attr('width', 60)
        .attr('height', 40)
        .append('xhtml:div')
        .style('text-align', 'center')
        .style('font-size', '9px')
        .style('color', '#6b7280')
        .style('word-wrap', 'break-word')
        .style('line-height', '1.1')
        .style('padding', '2px')
        .text(d => d.rate || '');

    // Create node groups
    const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add rectangles with rounded corners
    node.append('rect')
        .attr('x', -40)
        .attr('y', -20)
        .attr('width', 80)
        .attr('height', 40)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', d => getCompartmentColor(d.id))
        .attr('stroke', d => d.isVaccinated ? '#644391' : 'white')
        .attr('stroke-width', d => d.isVaccinated ? 3 : 2)
        .attr('stroke-dasharray', d => d.isVaccinated ? '5,3' : 'none')
        .style('cursor', 'move');

    // Add main labels with wrapping at underscores
    node.append('foreignObject')
        .attr('x', -35)
        .attr('y', -15)
        .attr('width', 70)
        .attr('height', 30)
        .append('xhtml:div')
        .style('text-align', 'center')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('color', 'white')
        .style('line-height', '1.2')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('height', '100%')
        .append('div')
        .style('display', 'block')
        .html(d => {
            // Split by underscore and wrap each part
            const parts = d.id.split('_');
            return parts.map((part, i) => 
                `<span style="display: inline-block">${part}${i < parts.length - 1 ? '_' : ''}</span>`
            ).join('');
        });

    // Add sublabels with wrapping
    node.append('foreignObject')
        .attr('x', -40)
        .attr('y', 25)
        .attr('width', 80)
        .attr('height', 30)
        .append('xhtml:div')
        .style('text-align', 'center')
        .style('font-size', '9px')
        .style('color', '#6b7280')
        .style('word-wrap', 'break-word')
        .style('line-height', '1.1')
        .style('overflow', 'visible')
        .text(d => d.label);

    // Setup tooltips
    node.on('mouseenter', function(event, d) {
        const tooltip = document.getElementById('tooltip');
        tooltip.classList.remove('hidden');
        tooltip.style.left = event.pageX + 10 + 'px';
        tooltip.style.top = (event.pageY - 60) + 'px'; // Above cursor
        tooltip.innerHTML = `
            <div class="font-medium">${d.id}</div>
            <div class="text-gray-300">${d.label}</div>
        `;
    }).on('mouseleave', function() {
        document.getElementById('tooltip').classList.add('hidden');
    });

    // Update visibility based on filters
    updateVisibility();

    // Setup simulation for force-directed layout
    if (currentLayout === 'force') {
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(150))
            .force('charge', d3.forceManyBody().strength(-500))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(50))
            .on('tick', ticked);
    }

    function ticked() {
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            
            // Calculate edge connection points
            const sourceBox = getBoxEdgePoint(d.source, d.target, false);
            const targetBox = getBoxEdgePoint(d.target, d.source, true);
            return `M ${sourceBox.x} ${sourceBox.y} L ${targetBox.x} ${targetBox.y}`;
            
        });

        linkLabel
            .attr('x', d => (d.source.x + d.target.x) / 2)
            .attr('y', d => (d.source.y + d.target.y) / 2 - 5);

        // Update mediator positions
        updateMediatorGroupPositions();

        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }
}

function applyLayout(nodes, links, layout, width, height) {
    // Stop any existing simulation
    if (simulation) {
        simulation.stop();
        simulation = null;
    }

    if (layout === 'hierarchical') {
        // Group nodes by their compartment type and vaccination status
        const groups = {};
        nodes.forEach(n => {
            const groupInfo = n.group;
            // Create columns for base types, with non-vax and vax separated
            const columnKey = groupInfo.base;
            if (!groups[columnKey]) {
                groups[columnKey] = { nonVax: [], vax: [] };
            }
            if (groupInfo.isVax) {
                groups[columnKey].vax.push(n);
            } else {
                groups[columnKey].nonVax.push(n);
            }
        });

        // Use the new ordered column function
        const orderedColumns = getOrderedColumns(nodes);

        // Position nodes in columns
        let x = 100;
        const xStep = Math.min(200, (width - 200) / orderedColumns.length);
        
        orderedColumns.forEach(columnKey => {
            const column = groups[columnKey];
            const allNodesInColumn = [...column.nonVax, ...column.vax];
            const yStep = height / (allNodesInColumn.length + 1);
            
            // Position non-vax nodes first
            column.nonVax.forEach((node, i) => {
                node.x = x;
                node.y = yStep * (i + 1);
                node.fx = node.x;
                node.fy = node.y;
            });
            
            // Then position vax nodes
            column.vax.forEach((node, i) => {
                node.x = x;
                node.y = yStep * (column.nonVax.length + i + 1);
                node.fx = node.x;
                node.fy = node.y;
            });
            
            x += xStep;
        });
    } else if (layout === 'circular') {
        const radius = Math.min(width, height) / 3;
        const centerX = width / 2;
        const centerY = height / 2;
        const angleStep = (2 * Math.PI) / nodes.length;

        nodes.forEach((node, i) => {
            node.x = centerX + radius * Math.cos(i * angleStep - Math.PI / 2);
            node.y = centerY + radius * Math.sin(i * angleStep - Math.PI / 2);
            node.fx = node.x;
            node.fy = node.y;
        });
    } else if (layout === 'force') {
        // Force-directed - remove fixed positions
        nodes.forEach(n => {
            n.fx = null;
            n.fy = null;
            // Initialize with random positions if needed
            if (!n.x || !n.y) {
                n.x = Math.random() * width;
                n.y = Math.random() * height;
            }
        });
    }

    // Update link source and target references
    links.forEach(link => {
        if (typeof link.source === 'string') {
            link.source = nodes.find(n => n.id === link.source);
        }
        if (typeof link.target === 'string') {
            link.target = nodes.find(n => n.id === link.target);
        }
    });
}

// Drag functions
function dragstarted(event, d) {
    if (simulation && !event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
    d.x = event.x;
    d.y = event.y;
    
    // Update node position
    d3.select(this).attr('transform', `translate(${d.x},${d.y})`);
    
    // Update links (both visible and hit areas)
    d3.selectAll('.link, .link-hit-area').attr('d', function(l) {
        const dx = l.target.x - l.source.x;
        
        // Calculate edge connection points
        const sourceBox = getBoxEdgePoint(l.source, l.target, false);
        const targetBox = getBoxEdgePoint(l.target, l.source, true);
        return `M ${sourceBox.x} ${sourceBox.y} L ${targetBox.x} ${targetBox.y}`;

    });
    
    // Update link labels
    d3.selectAll('.link-label')
        .attr('x', l => (l.source.x + l.target.x) / 2)
        .attr('y', l => (l.source.y + l.target.y) / 2 - 5);

    // Update mediator groups
    updateMediatorGroupPositions();
}

function dragended(event, d) {
    if (simulation && !event.active) simulation.alphaTarget(0);
    if (currentLayout !== 'force') {
        d.fx = d.x;
        d.fy = d.y;
    } else {
        d.fx = null;
        d.fy = null;
    }
}

// Update visibility based on checkboxes
function updateVisibility() {
    const showSpontaneous = document.getElementById('show-spontaneous').checked;
    const showMediated = document.getElementById('show-mediated').checked;
    const showVaccination = document.getElementById('show-vaccination').checked;
    const showLabels = document.getElementById('show-labels').checked;
    const showMediators = document.getElementById('show-mediators').checked;

    d3.selectAll('.link').style('display', function(d) {
        if (d.type === 'spontaneous' && !showSpontaneous) return 'none';
        if (d.type === 'mediated' && !showMediated) return 'none';
        if (d.type === 'vaccination' && !showVaccination) return 'none';
        return 'block';
    });

    d3.selectAll('.link-label').style('display', showLabels ? 'block' : 'none');
    d3.selectAll('.mediator-group').style('display', showMediators && showMediated ? 'block' : 'none');
}

// Add event listeners for checkboxes
['show-spontaneous', 'show-mediated', 'show-vaccination', 'show-labels', 'show-mediators'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateVisibility);
});

// Change layout
function changeLayout() {
    const layout = document.getElementById('layout-select').value;
    currentLayout = layout;
    if (currentModel) {
        visualizeModel();
    }
}

// Reset zoom
function resetZoom() {
    if (svg && zoom) {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    }
}

// Export SVG
function exportSVG() {
    if (!svg) return;
    
    const svgElement = document.querySelector('#graph-container svg');
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'compartment-model.svg';
    a.click();
    
    URL.revokeObjectURL(url);
}

// Update statistics
function updateStats() {
    if (!currentModel) return;
    
    // Handle both structures
    const model = currentModel.model || currentModel;
    const compartmentCount = model.compartments ? model.compartments.length : 0;
    const transitionCount = model.transitions ? model.transitions.length : 0;
    const parameterCount = model.parameters ? Object.keys(model.parameters).length : 0;
    
    document.getElementById('stats').innerHTML = `
        <div class="text-gray-600">Compartments: <span class="font-medium text-gray-900">${compartmentCount}</span></div>
        <div class="text-gray-600">Transitions: <span class="font-medium text-gray-900">${transitionCount}</span></div>
        <div class="text-gray-600">Parameters: <span class="font-medium text-gray-900">${parameterCount}</span></div>
    `;
}

// Error handling
function showError(message) {
    document.getElementById('error-container').innerHTML = 
        `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">${message}</div>`;
}

function hideError() {
    document.getElementById('error-container').innerHTML = '';
}

// Column order dialog functions
let currentColumnOrder = [];

function showColumnOrderDialog() {
    if (!currentModel) {
        alert('Please load a model first');
        return;
    }
    
    // Get current unique compartment types
    const uniqueTypes = getUniqueCompartmentTypes(currentNodes);
    currentColumnOrder = getOrderedColumns(currentNodes);
    
    // Populate the column list
    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';
    
    currentColumnOrder.forEach((type, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        item.dataset.type = type;
        item.dataset.index = index;
        
        const color = getCompartmentColor(type);
        
        // Create up button
        const upButton = document.createElement('button');
        upButton.className = 'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed';
        upButton.disabled = index === 0;
        upButton.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
        `;
        upButton.addEventListener('click', () => moveColumnUp(index));
        
        // Create down button
        const downButton = document.createElement('button');
        downButton.className = 'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed';
        downButton.disabled = index === currentColumnOrder.length - 1;
        downButton.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        `;
        downButton.addEventListener('click', () => moveColumnDown(index));
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex items-center gap-1';
        buttonContainer.appendChild(upButton);
        buttonContainer.appendChild(downButton);
        
        // Create main content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex items-center gap-3';
        contentDiv.innerHTML = `
            <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
            <span class="font-medium">${type}</span>
        `;
        
        item.appendChild(contentDiv);
        item.appendChild(buttonContainer);
        columnList.appendChild(item);
    });
    
    document.getElementById('column-order-dialog').classList.remove('hidden');
}

function closeColumnOrderDialog() {
    document.getElementById('column-order-dialog').classList.add('hidden');
}

function resetColumnOrder() {
    currentColumnOrder = [...defaultColumnOrder.filter(type =>
        getUniqueCompartmentTypes(currentNodes).includes(type)
    )];
    
    // Add any types not in default order
    getUniqueCompartmentTypes(currentNodes).forEach(type => {
        if (!currentColumnOrder.includes(type)) {
            currentColumnOrder.push(type);
        }
    });
    
    refreshColumnOrderDialog(); // Refresh the dialog content
    previewColumnOrder(); // Preview the reset layout
}

function applyColumnOrder() {
    // Update the default column order with the new order
    defaultColumnOrder = [...currentColumnOrder];
    
    // Re-visualize the model with new order to recalculate mediator positions
    if (currentModel) {
        visualizeModel();
    }
    
    closeColumnOrderDialog();
}

// Column movement functions
function moveColumnUp(index) {
    if (index > 0) {
        // Swap with previous item
        const temp = currentColumnOrder[index];
        currentColumnOrder[index] = currentColumnOrder[index - 1];
        currentColumnOrder[index - 1] = temp;
        
        // Refresh the dialog content
        refreshColumnOrderDialog();
        
        // Preview the new layout by updating positions
        previewColumnOrder();
    }
}

function moveColumnDown(index) {
    if (index < currentColumnOrder.length - 1) {
        // Swap with next item
        const temp = currentColumnOrder[index];
        currentColumnOrder[index] = currentColumnOrder[index + 1];
        currentColumnOrder[index + 1] = temp;
        
        // Refresh the dialog content
        refreshColumnOrderDialog();
        
        // Preview the new layout by updating positions
        previewColumnOrder();
    }
}

// Preview function to update layout with current column order
function previewColumnOrder() {
    if (!currentModel || !currentNodes.length) return;
    
    // Temporarily update the default order for layout calculation
    const originalOrder = [...defaultColumnOrder];
    defaultColumnOrder = [...currentColumnOrder];
    
    // Recalculate positions with new order
    const container = document.getElementById('graph-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Apply new layout to current nodes
    applyLayout(currentNodes, currentLinks, currentLayout, width, height);
    
    // Update node positions
    d3.selectAll('.node')
        .transition()
        .duration(300)
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    // Update link positions
    d3.selectAll('.link, .link-hit-area')
        .transition()
        .duration(300)
        .attr('d', d => {
            const dx = d.target.x - d.source.x;
            const sourceBox = getBoxEdgePoint(d.source, d.target, false);
            const targetBox = getBoxEdgePoint(d.target, d.source, true);
            return `M ${sourceBox.x} ${sourceBox.y} L ${targetBox.x} ${targetBox.y}`;

        });
    
    // Update link labels
    d3.selectAll('.link-label')
        .transition()
        .duration(300)
        .attr('x', d => (d.source.x + d.target.x) / 2 - 30)
        .attr('y', d => (d.source.y + d.target.y) / 2 - 20);
    
    // Update mediator positions
    setTimeout(() => {
        updateMediatorGroupPositions();
    }, 100);
    
    // Restore original order (will be updated when Apply is clicked)
    defaultColumnOrder = originalOrder;
}

// Helper function to refresh just the column list content
function refreshColumnOrderDialog() {
    const columnList = document.getElementById('column-list');
    columnList.innerHTML = '';
    
    currentColumnOrder.forEach((type, index) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        item.dataset.type = type;
        item.dataset.index = index;
        
        const color = getCompartmentColor(type);
        
        // Create up button
        const upButton = document.createElement('button');
        upButton.className = 'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed';
        upButton.disabled = index === 0;
        upButton.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
            </svg>
        `;
        upButton.addEventListener('click', () => moveColumnUp(index));
        
        // Create down button
        const downButton = document.createElement('button');
        downButton.className = 'p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed';
        downButton.disabled = index === currentColumnOrder.length - 1;
        downButton.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        `;
        downButton.addEventListener('click', () => moveColumnDown(index));
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex items-center gap-1';
        buttonContainer.appendChild(upButton);
        buttonContainer.appendChild(downButton);
        
        // Create main content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'flex items-center gap-3';
        contentDiv.innerHTML = `
            <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
            <span class="font-medium">${type}</span>
        `;
        
        item.appendChild(contentDiv);
        item.appendChild(buttonContainer);
        columnList.appendChild(item);
    });
}

// Load sample data
function loadSample() {
    fetch('sample.yml')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(yamlContent => {
            document.getElementById('yaml-input').value = yamlContent;
            parseYAML();
        })
        .catch(error => {
            console.error('Error loading sample.yml:', error);
            showError('Failed to load sample.yml: ' + error.message);
        });
}

// ESC key handler for Column Order dialog
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dialog = document.getElementById('column-order-dialog');
        if (!dialog.classList.contains('hidden')) {
            closeColumnOrderDialog();
        }
    }
});

// Initial setup
window.addEventListener('resize', () => {
    if (currentModel) {
        visualizeModel();
    }
});