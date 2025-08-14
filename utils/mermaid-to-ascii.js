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

        const lines = mermaidCode.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines, comments, and directives
            if (!trimmed || trimmed.startsWith('%%') || 
                trimmed.startsWith('graph') || trimmed.startsWith('subgraph') || 
                trimmed.startsWith('end') || trimmed.startsWith('classDef') || 
                trimmed.startsWith('class') || trimmed.startsWith('style')) {
                continue;
            }

            // Parse node definitions: A["Node Label"]
            const nodeMatch = trimmed.match(/(\w+)\[["']?([^"'\]]+)["']?\]/);
            if (nodeMatch) {
                const [, nodeId, label] = nodeMatch;
                this.nodes.set(nodeId, {
                    id: nodeId,
                    label: label.replace(/\\"/g, '"'),
                    children: new Set(),
                    parents: new Set(),
                    level: -1
                });
                continue;
            }

            // Parse edge definitions: A --> B or A -->|"label"| B
            const edgeMatch = trimmed.match(/(\w+)\s*-->(?:\|["']?([^"'|]+)["']?\|)?\s*(\w+)/);
            if (edgeMatch) {
                const [, from, edgeLabel, to] = edgeMatch;
                
                // Ensure nodes exist
                if (!this.nodes.has(from)) {
                    this.nodes.set(from, {
                        id: from,
                        label: from,
                        children: new Set(),
                        parents: new Set(),
                        level: -1
                    });
                }
                if (!this.nodes.has(to)) {
                    this.nodes.set(to, {
                        id: to,
                        label: to,
                        children: new Set(),
                        parents: new Set(),
                        level: -1
                    });
                }
                
                // Add edge
                this.edges.push({
                    from,
                    to,
                    label: edgeLabel || ''
                });
                
                // Update parent-child relationships
                this.nodes.get(from).children.add(to);
                this.nodes.get(to).parents.add(from);
            }
        }
    }

    /**
     * Find root nodes (nodes with no parents)
     */
    findRoots() {
        for (const [nodeId, node] of this.nodes) {
            if (node.parents.size === 0) {
                this.roots.add(nodeId);
                node.level = 0;
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
                this.nodes.get(bestRoot).level = 0;
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
        
        // Process each root
        for (const rootId of this.roots) {
            this.buildSubtree(rootId, '', true, visited, result, maxWidth, showRelations, compactMode);
        }
        
        // Add any unvisited nodes (disconnected components)
        for (const [nodeId, node] of this.nodes) {
            if (!visited.has(nodeId)) {
                result.push('');
                result.push('(Disconnected):');
                this.buildSubtree(nodeId, '', true, visited, result, maxWidth, showRelations, compactMode);
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