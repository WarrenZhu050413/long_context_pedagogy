/**
 * Mermaid Graph to ASCII Tree Converter
 * Converts Mermaid graph syntax to ASCII tree representation
 */

class MermaidToAscii {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
        this.roots = new Set();
    }

    /**
     * Parse Mermaid graph syntax and convert to ASCII tree
     * @param {string} mermaidCode - Mermaid diagram syntax
     * @param {Object} options - Conversion options
     * @returns {string} ASCII tree representation
     */
    convertToAscii(mermaidCode, options = {}) {
        const {
            maxWidth = 80,
            showRelations = true,
            compactMode = false
        } = options;

        if (!mermaidCode || mermaidCode.trim() === '') {
            return '(empty graph)';
        }

        // Parse the Mermaid code
        this.parseMermaid(mermaidCode);
        
        // Find root nodes (nodes with no incoming edges)
        this.findRoots();
        
        // Build ASCII tree
        return this.buildAsciiTree(maxWidth, showRelations, compactMode);
    }

    /**
     * Parse Mermaid syntax to extract nodes and edges
     * @param {string} mermaidCode - Mermaid diagram code
     */
    parseMermaid(mermaidCode) {
        this.nodes.clear();
        this.edges = [];
        this.roots.clear();
        this.subgraphs = new Map();

        const lines = mermaidCode.split('\n');
        let currentSubgraph = null;
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines, comments, and certain directives
            if (!trimmed || trimmed.startsWith('%%') || 
                trimmed.startsWith('graph TD') || trimmed.startsWith('graph LR') ||
                trimmed.startsWith('classDef') || trimmed.startsWith('class')) {
                continue;
            }
            
            // Handle subgraph start
            if (trimmed.startsWith('subgraph')) {
                const subgraphMatch = trimmed.match(/subgraph\s+"?([^"]+)"?/);
                if (subgraphMatch) {
                    currentSubgraph = subgraphMatch[1];
                    this.subgraphs.set(currentSubgraph, new Set());
                }
                continue;
            }
            
            // Handle subgraph end
            if (trimmed === 'end') {
                currentSubgraph = null;
                continue;
            }
            
            // Skip style definitions
            if (trimmed.startsWith('style')) {
                continue;
            }

            // First, try to parse standalone node definitions: A["Node Label"] or A[Node Label]
            const standaloneNodeMatch = trimmed.match(/^(\w+)\[["']?([^"'\]]+)["']?\]$/);
            if (standaloneNodeMatch) {
                const [, nodeId, label] = standaloneNodeMatch;
                if (!this.nodes.has(nodeId)) {
                    this.nodes.set(nodeId, {
                        id: nodeId,
                        label: label.replace(/\\"/g, '"'),
                        children: new Set(),
                        parents: new Set(),
                        level: -1,
                        subgraph: currentSubgraph
                    });
                    if (currentSubgraph) {
                        this.subgraphs.get(currentSubgraph).add(nodeId);
                    }
                }
                continue;
            }

            // Parse edge definitions with possible inline node definitions
            // This regex now handles: A --> B[Label], A[Label] --> B, etc.
            const edgeRegex = /(\w+)(?:\[["']?([^"'\]]+)["']?\])?\s*-->(?:\|["']?([^"'|]+)["']?\|)?\s*(\w+)(?:\[["']?([^"'\]]+)["']?\])?/;
            const edgeMatch = trimmed.match(edgeRegex);
            
            if (edgeMatch) {
                const [, fromId, fromLabel, edgeLabel, toId, toLabel] = edgeMatch;
                
                // Create or update 'from' node
                if (!this.nodes.has(fromId)) {
                    this.nodes.set(fromId, {
                        id: fromId,
                        label: fromLabel || fromId,
                        children: new Set(),
                        parents: new Set(),
                        level: -1,
                        subgraph: currentSubgraph
                    });
                    if (currentSubgraph) {
                        this.subgraphs.get(currentSubgraph).add(fromId);
                    }
                } else if (fromLabel && this.nodes.get(fromId).label === fromId) {
                    // Update label if it was just the ID before
                    this.nodes.get(fromId).label = fromLabel;
                }
                
                // Create or update 'to' node
                if (!this.nodes.has(toId)) {
                    this.nodes.set(toId, {
                        id: toId,
                        label: toLabel || toId,
                        children: new Set(),
                        parents: new Set(),
                        level: -1,
                        subgraph: currentSubgraph
                    });
                    if (currentSubgraph) {
                        this.subgraphs.get(currentSubgraph).add(toId);
                    }
                } else if (toLabel && this.nodes.get(toId).label === toId) {
                    // Update label if it was just the ID before
                    this.nodes.get(toId).label = toLabel;
                }
                
                // Add edge
                this.edges.push({
                    from: fromId,
                    to: toId,
                    label: edgeLabel || ''
                });
                
                // Update parent-child relationships
                this.nodes.get(fromId).children.add(toId);
                this.nodes.get(toId).parents.add(fromId);
            }
        }
        
        // Assign levels using BFS from roots
        this.assignLevels();
    }

    /**
     * Find root nodes (nodes with no parents)
     */
    findRoots() {
        for (const [nodeId, node] of this.nodes) {
            if (node.parents.size === 0) {
                this.roots.add(nodeId);
            }
        }
        
        // If no clear roots (circular graph), pick nodes with most children
        if (this.roots.size === 0 && this.nodes.size > 0) {
            let maxChildren = 0;
            let bestRoot = null;
            
            for (const [nodeId, node] of this.nodes) {
                if (node.children.size > maxChildren) {
                    maxChildren = node.children.size;
                    bestRoot = nodeId;
                }
            }
            
            if (bestRoot) {
                this.roots.add(bestRoot);
            }
        }
    }
    
    /**
     * Assign levels to nodes using BFS
     */
    assignLevels() {
        // First find roots
        this.findRoots();
        
        // BFS to assign levels
        const queue = [];
        const visited = new Set();
        
        // Start with all root nodes at level 0
        for (const rootId of this.roots) {
            queue.push({ id: rootId, level: 0 });
            visited.add(rootId);
        }
        
        while (queue.length > 0) {
            const { id, level } = queue.shift();
            const node = this.nodes.get(id);
            
            // Assign level (use minimum level if already assigned)
            if (node.level === -1 || node.level > level) {
                node.level = level;
            }
            
            // Add children to queue
            for (const childId of node.children) {
                if (!visited.has(childId)) {
                    visited.add(childId);
                    queue.push({ id: childId, level: level + 1 });
                }
            }
        }
    }

    /**
     * Build ASCII tree representation
     * @param {number} maxWidth - Maximum width for lines
     * @param {boolean} showRelations - Whether to show relation labels
     * @param {boolean} compactMode - Use compact formatting
     * @returns {string} ASCII tree
     */
    buildAsciiTree(maxWidth, showRelations, compactMode) {
        if (this.nodes.size === 0) {
            return '(empty)';
        }

        let result = [];
        const visited = new Set();
        
        // Add title if we have subgraphs
        if (this.subgraphs && this.subgraphs.size > 0 && !compactMode) {
            result.push('Knowledge Graph Structure');
            result.push('=' .repeat(Math.min(50, maxWidth)));
            result.push('');
        }
        
        // Process root nodes
        const sortedRoots = Array.from(this.roots).sort((a, b) => {
            const nodeA = this.nodes.get(a);
            const nodeB = this.nodes.get(b);
            // Sort by number of descendants (larger trees first)
            return nodeB.children.size - nodeA.children.size;
        });
        
        for (let i = 0; i < sortedRoots.length; i++) {
            const rootId = sortedRoots[i];
            const isLastRoot = i === sortedRoots.length - 1;
            
            // Add spacing between major trees
            if (i > 0 && !compactMode) {
                result.push('');
            }
            
            this.buildSubtree(rootId, '', isLastRoot, visited, result, maxWidth, showRelations, compactMode);
        }
        
        // Add any unvisited nodes (disconnected components)
        const unvisited = [];
        for (const [nodeId, node] of this.nodes) {
            if (!visited.has(nodeId)) {
                unvisited.push(nodeId);
            }
        }
        
        if (unvisited.length > 0) {
            result.push('');
            result.push('─── Disconnected Nodes ───');
            for (const nodeId of unvisited) {
                this.buildSubtree(nodeId, '  ', true, visited, result, maxWidth, showRelations, compactMode);
            }
        }
        
        return result.join('\n');
    }

    /**
     * Recursively build subtree
     * @param {string} nodeId - Current node ID
     * @param {string} prefix - Prefix for indentation
     * @param {boolean} isLast - Whether this is the last child
     * @param {Set} visited - Set of visited nodes
     * @param {Array} result - Result array to append lines to
     * @param {number} maxWidth - Maximum line width
     * @param {boolean} showRelations - Whether to show edge labels
     * @param {boolean} compactMode - Use compact formatting
     */
    buildSubtree(nodeId, prefix, isLast, visited, result, maxWidth, showRelations, compactMode) {
        if (visited.has(nodeId)) {
            // Handle cycles
            const node = this.nodes.get(nodeId);
            const line = prefix + (isLast ? '└─ ' : '├─ ') + `[↻ ${this.truncateLabel(node.label, maxWidth - prefix.length - 4)}]`;
            result.push(line);
            return;
        }
        
        visited.add(nodeId);
        const node = this.nodes.get(nodeId);
        
        // Build current node line
        const connector = isLast ? '└─ ' : '├─ ';
        const label = this.truncateLabel(node.label, maxWidth - prefix.length - connector.length);
        result.push(prefix + connector + label);
        
        // Process children
        const children = Array.from(node.children);
        if (children.length > 0) {
            const childPrefix = prefix + (isLast ? '   ' : '│  ');
            
            for (let i = 0; i < children.length; i++) {
                const childId = children[i];
                const isLastChild = i === children.length - 1;
                
                // Add relation label if requested
                if (showRelations && !compactMode) {
                    const edge = this.edges.find(e => e.from === nodeId && e.to === childId);
                    if (edge && edge.label) {
                        result.push(childPrefix + '│');
                        result.push(childPrefix + `├─[${edge.label}]→`);
                    }
                }
                
                this.buildSubtree(childId, childPrefix, isLastChild, visited, result, maxWidth, showRelations, compactMode);
            }
        }
    }

    /**
     * Truncate label to fit within width
     * @param {string} label - Label to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated label
     */
    truncateLabel(label, maxLength) {
        if (!label) return '(unnamed)';
        
        // Clean up the label
        label = label.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (label.length <= maxLength) {
            return label;
        }
        
        return label.substring(0, maxLength - 3) + '...';
    }

    /**
     * Convert knowledge graph delta to ASCII comparison
     * @param {Object} delta - Delta object from KnowledgeGraphToMermaid
     * @returns {Object} ASCII representations of the delta
     */
    convertDeltaToAscii(delta) {
        return {
            userOnly: this.convertToAscii(delta.userOnlyMermaid, { compactMode: true }),
            claudeOnly: this.convertToAscii(delta.claudeOnlyMermaid, { compactMode: true }),
            common: this.convertToAscii(delta.commonMermaid, { compactMode: true })
        };
    }
}

// Export for use in Node.js and browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MermaidToAscii;
} else if (typeof window !== 'undefined') {
    window.MermaidToAscii = MermaidToAscii;
}