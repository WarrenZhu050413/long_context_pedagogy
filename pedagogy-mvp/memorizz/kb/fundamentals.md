# MemoRizz Fundamentals

## What is MemoRizz?

MemoRizz is an **experimental educational memory management framework** for AI agents that creates memory-augmented agents with explicit memory type allocation based on cognitive science principles.

### Core Problem It Solves
Traditional AI agents lack persistent memory - they forget everything between sessions. MemoRizz solves this by providing:
- **Persistent memory across sessions**
- **Semantic search and retrieval**
- **Specialized memory types** (episodic, semantic, procedural)
- **Multi-agent coordination capabilities**

### Key Architectural Components

#### 1. Memory Types (Cognitive Science Based)
MemoRizz organizes memory according to established cognitive science principles:

**Long-Term Memory Systems:**
- **Semantic Memory**: Facts, concepts, knowledge ("What I know")
  - Knowledge Base: Domain-specific facts and information
  - Persona: Agent identity, personality, behavioral patterns
- **Procedural Memory**: Skills, behaviors, processes ("How I act")
  - Toolbox: Executable functions with semantic discovery
  - Workflow: Multi-step process orchestration
- **Episodic Memory**: Experiences, events, history ("What I've experienced")
  - Conversational Memory Units: Time-stamped interaction records
  - Summary Components: Compressed episodic experiences

**Short-Term Memory Systems:**
- **Semantic Cache**: Temporary fact storage for performance
- **Working Memory**: Active workspace and context management

**Coordination Memory:**
- **Shared Memory**: Multi-agent communication and coordination

#### 2. MemAgent System
The core agent interface that integrates all memory systems:
- Unified agent API
- Automatic memory management
- Context-aware responses
- Tool integration
- Persona-driven behavior

#### 3. Memory Provider Architecture
Abstraction layer for different storage backends:
- **MongoDB Provider**: Primary implementation with vector search
- **Extensible Interface**: Support for custom storage backends
- **Vector Search**: Semantic similarity for retrieval

#### 4. Application Modes
Different operational modes activate different memory combinations:
- **ASSISTANT**: General conversational agent (conversation + knowledge + persona)
- **WORKFLOW**: Task-oriented agent (workflow + toolbox + knowledge)
- **DEEP_RESEARCH**: Research and analysis (toolbox + shared + knowledge)

### Core Dependencies and Prerequisites

**Required Components:**
- **Python 3.7+**: Runtime environment
- **MongoDB Atlas**: Primary storage with vector search capabilities
- **OpenAI API**: For embeddings and LLM functionality

**Key Libraries:**
- **pymongo**: MongoDB connectivity
- **openai**: LLM and embedding services
- **pydantic**: Data validation and modeling

### Basic Usage Pattern

```python
# 1. Set up memory provider
mongodb_config = MongoDBConfig(uri="mongodb-atlas-uri")
memory_provider = MongoDBProvider(mongodb_config)

# 2. Create agent with memory
agent = MemAgent(
    model=OpenAI(model="gpt-4"),
    instruction="You are a helpful assistant with persistent memory.",
    memory_provider=memory_provider
)

# 3. Interact - memory is automatic
response = agent.run("My name is John")
# Later session...
response = agent.run("What's my name?")  # Remembers "John"
```

### Memory Storage and Retrieval

**Vector-Based Semantic Search:**
- All memory content is embedded using OpenAI embeddings
- Retrieval uses cosine similarity for relevance matching
- Supports natural language queries across all memory types

**Automatic Memory Management:**
- Working Memory coordinates access to all memory systems
- Context Window Management optimizes LLM token usage
- Automatic summarization prevents memory overflow

### Tool System

**Function Registration:**
```python
@toolbox
def calculate_interest(principal: float, rate: float, time: int) -> float:
    """Calculate compound interest."""
    return principal * (1 + rate) ** time
```

**Semantic Tool Discovery:**
- Tools are indexed by their descriptions and parameters
- Natural language queries find appropriate tools
- Automatic execution with parameter extraction

### Multi-Agent Coordination

**Shared Memory Pattern:**
```python
# Create shared session
session_id = shared_memory.create_shared_session(
    root_agent_id="orchestrator",
    delegate_agent_ids=["researcher", "analyst"]
)

# Agents coordinate through shared memory
orchestrator = MemAgent(shared_memory_session_id=session_id)
researcher = MemAgent(shared_memory_session_id=session_id)
```

### Data Flow Architecture

```
User Input → Working Memory → Long-Term Memory Systems
                ↓                      ↓
            Context Assembly ←  Semantic Retrieval
                ↓
             LLM Processing
                ↓
          Response + Memory Updates
```

## Important Limitations and Considerations

**Educational Purpose Only:**
- Experimental framework, not production-ready
- No security audits performed
- May contain bugs and breaking changes
- Intended for learning AI agent concepts

**Performance Considerations:**
- Requires MongoDB Atlas with vector search enabled
- Embedding costs for all stored content
- Network latency for cloud storage
- Memory retrieval adds processing overhead

**Setup Requirements:**
- MongoDB Atlas cluster configuration
- Vector search index creation
- API key management for OpenAI services
- Proper IP whitelisting for database access