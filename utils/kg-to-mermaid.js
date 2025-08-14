/**
 * Knowledge Graph to Mermaid Converter Utility
 * Converts MCP memory knowledge graph format to Mermaid diagram syntax
 */

class KnowledgeGraphToMermaid {
    constructor() {
        this.nodeIds = new Map(); // Track node IDs for consistent referencing
        this.nextId = 1;
    }

    /**
     * Convert MCP memory knowledge graph to Mermaid flowchart syntax
     * @param {Object} knowledgeGraph - The knowledge graph from MCP memory
     * @param {Array} knowledgeGraph.entities - Array of entities
     * @param {Array} knowledgeGraph.relations - Array of relations
     * @param {Object} options - Conversion options
     * @returns {string} Mermaid diagram syntax
     */
    convertToMermaid(knowledgeGraph, options = {}) {
        const {
            direction = 'TD', // Top-Down, can be 'TD', 'LR', 'BT', 'RL'
            includeObservations = true,
            maxObservationsPerEntity = 3,
            entityTypeColors = {
                person: '#FFE4B5',
                concept: '#B5E7FF',
                skill: '#FFB5B5',
                knowledge: '#E7FFB5',
                default: '#F0F0F0'
            }
        } = options;

        if (!knowledgeGraph || !knowledgeGraph.entities) {
            return 'graph TD\n    Empty["No data available"]';
        }

        let mermaidCode = `graph ${direction}\n`;
        
        // Clear node ID tracking for each conversion
        this.nodeIds.clear();
        this.nextId = 1;

        // First pass: Create all nodes
        for (const entity of knowledgeGraph.entities) {
            const nodeId = this.getNodeId(entity.name);
            const sanitizedName = this.sanitizeText(entity.name);
            const entityType = entity.entityType || 'default';
            
            // Create main entity node
            mermaidCode += `    ${nodeId}["${sanitizedName}"]\n`;
            
            // Add styling for entity type
            const color = entityTypeColors[entityType] || entityTypeColors.default;
            mermaidCode += `    ${nodeId} --> ${nodeId}\n`;
            mermaidCode += `    style ${nodeId} fill:${color}\n`;

            // Add observations as connected nodes if requested
            if (includeObservations && entity.observations && entity.observations.length > 0) {
                const obsToShow = entity.observations.slice(0, maxObservationsPerEntity);
                
                for (let i = 0; i < obsToShow.length; i++) {
                    const obsId = `${nodeId}_obs_${i}`;
                    const sanitizedObs = this.sanitizeText(obsToShow[i]);
                    mermaidCode += `    ${obsId}("${sanitizedObs}")\n`;
                    mermaidCode += `    ${nodeId} --> ${obsId}\n`;
                    mermaidCode += `    style ${obsId} fill:#F9F9F9,stroke:#DDD\n`;
                }

                // Add ellipsis if there are more observations
                if (entity.observations.length > maxObservationsPerEntity) {
                    const moreId = `${nodeId}_more`;
                    const remaining = entity.observations.length - maxObservationsPerEntity;
                    mermaidCode += `    ${moreId}("...${remaining} more")\n`;
                    mermaidCode += `    ${nodeId} --> ${moreId}\n`;
                    mermaidCode += `    style ${moreId} fill:#F0F0F0,stroke:#CCC,stroke-dasharray: 5 5\n`;
                }
            }
        }

        // Second pass: Add relations between entities
        if (knowledgeGraph.relations && knowledgeGraph.relations.length > 0) {
            for (const relation of knowledgeGraph.relations) {
                const fromId = this.getNodeId(relation.from);
                const toId = this.getNodeId(relation.to);
                const relationLabel = this.sanitizeText(relation.relationType);
                
                // Only add relation if both nodes exist
                if (this.nodeIds.has(relation.from) && this.nodeIds.has(relation.to)) {
                    mermaidCode += `    ${fromId} -->|"${relationLabel}"| ${toId}\n`;
                }
            }
        }

        return mermaidCode.trim();
    }

    /**
     * Get or create a unique node ID for an entity name
     * @param {string} entityName - The entity name
     * @returns {string} Unique node ID
     */
    getNodeId(entityName) {
        if (!this.nodeIds.has(entityName)) {
            const sanitized = entityName.replace(/[^a-zA-Z0-9]/g, '_');
            const nodeId = `node_${sanitized}_${this.nextId}`;
            this.nodeIds.set(entityName, nodeId);
            this.nextId++;
        }
        return this.nodeIds.get(entityName);
    }

    /**
     * Sanitize text for Mermaid diagram compatibility
     * @param {string} text - Text to sanitize
     * @returns {string} Sanitized text
     */
    sanitizeText(text) {
        if (!text) return '';
        
        return text
            .replace(/"/g, '\\"')  // Escape quotes
            .replace(/\n/g, ' ')   // Replace newlines with spaces
            .replace(/\r/g, '')    // Remove carriage returns
            .trim()
            .substring(0, 50) + (text.length > 50 ? '...' : ''); // Limit length
    }

    /**
     * Create a diff between two knowledge graphs and generate Mermaid
     * @param {Object} userGraph - User's knowledge graph
     * @param {Object} claudeGraph - Claude's knowledge graph
     * @returns {Object} Delta analysis with Mermaid diagrams
     */
    createDelta(userGraph, claudeGraph) {
        const userEntities = new Set(userGraph.entities?.map(e => e.name) || []);
        const claudeEntities = new Set(claudeGraph.entities?.map(e => e.name) || []);
        
        const userOnlyEntities = Array.from(userEntities).filter(name => !claudeEntities.has(name));
        const claudeOnlyEntities = Array.from(claudeEntities).filter(name => !userEntities.has(name));
        const commonEntities = Array.from(userEntities).filter(name => claudeEntities.has(name));

        // Create filtered graphs for visualization
        const userOnlyGraph = this.filterGraphByEntities(userGraph, userOnlyEntities);
        const claudeOnlyGraph = this.filterGraphByEntities(claudeGraph, claudeOnlyEntities);
        const commonGraph = this.filterGraphByEntities(userGraph, commonEntities);

        return {
            summary: {
                userOnlyCount: userOnlyEntities.length,
                claudeOnlyCount: claudeOnlyEntities.length,
                commonCount: commonEntities.length,
                totalUser: userEntities.size,
                totalClaude: claudeEntities.size
            },
            userOnlyMermaid: this.convertToMermaid(userOnlyGraph, {
                entityTypeColors: {
                    person: '#FFE4CC',
                    concept: '#CCE7FF', 
                    skill: '#FFCCCC',
                    knowledge: '#E7FFCC',
                    default: '#F0F0F0'
                }
            }),
            claudeOnlyMermaid: this.convertToMermaid(claudeOnlyGraph, {
                entityTypeColors: {
                    person: '#E4CCFF',
                    concept: '#CCFFE4',
                    skill: '#FFCCFF',
                    knowledge: '#FFFCCC',
                    default: '#F5F5F5'
                }
            }),
            commonMermaid: this.convertToMermaid(commonGraph, {
                entityTypeColors: {
                    person: '#E0E0E0',
                    concept: '#D0D0D0',
                    skill: '#C0C0C0',
                    knowledge: '#B0B0B0',
                    default: '#A0A0A0'
                }
            })
        };
    }

    /**
     * Filter a knowledge graph to only include specified entities
     * @param {Object} graph - Original knowledge graph
     * @param {Array} entityNames - Names of entities to include
     * @returns {Object} Filtered knowledge graph
     */
    filterGraphByEntities(graph, entityNames) {
        if (!graph || !graph.entities) {
            return { entities: [], relations: [] };
        }

        const entitySet = new Set(entityNames);
        
        const filteredEntities = graph.entities.filter(entity => entitySet.has(entity.name));
        
        const filteredRelations = (graph.relations || []).filter(relation => 
            entitySet.has(relation.from) && entitySet.has(relation.to)
        );

        return {
            entities: filteredEntities,
            relations: filteredRelations
        };
    }
}

// Export for use in Node.js and browsers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnowledgeGraphToMermaid;
} else if (typeof window !== 'undefined') {
    window.KnowledgeGraphToMermaid = KnowledgeGraphToMermaid;
}