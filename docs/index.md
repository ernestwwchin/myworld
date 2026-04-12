# Document Index

This document provides a comprehensive index of all documentation in the project, organized by purpose and audience.

## Quick Reference

### For AI Assistants
- **[Skills](skills/)** - Domain-focused AI skills documentation
  - [skills-project.md](skills/skills-project.md) - Conventions, globals, file structure (always load)
  - [skills-architecture.md](skills/skills-architecture.md) - Module extraction, system design
  - [skills-dnd5e.md](skills/skills-dnd5e.md) - Dice, combat, ability scores
  - [skills-testing.md](skills/skills-testing.md) - Test patterns, mocks, debugging
  - [skills-modding.md](skills/skills-modding.md) - YAML data, modding API
- **[Modding Guide](modding_guide.md)** - API reference and extension patterns

### For Game Designers
- **[5e Reference Documents](#reference-documents)** - D&D 5e rules and content
- **[Game Mechanics](#game-mechanics)** - Implementation of game systems
- **[Tileset and Sprite Sourcing](tileset-sourcing.md)** - Asset shortlist, licensing checks, and integration plan for richer map content

### For Developers
- **[Architecture](#architecture)** - Code structure and patterns
- **[API Documentation](#api-documentation)** - Technical references
- **[Testing](#testing)** - Test frameworks and patterns
- **[BUGS.md](BUGS.md)** - Known bugs and immediate fixes needed
- **[TODO (repo memory)](/memories/repo/TODO.md)** - Full feature roadmap

## Reference Documents

### D&D 5e Rules & Content

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| **[classes_5e.md](ref/classes_5e.md)** | Character classes and features | Class selection grid, level progression, subclass options |
| **[races_5e.md](ref/races_5e.md)** | Character races and traits | Ability bonuses, racial features, YAML examples |
| **[feats_5e.md](ref/feats_5e.md)** | Optional character feats | Prerequisites, benefits, implementation notes |
| **[monsters_5e.md](ref/monsters_5e.md)** | Creature statistics and abilities | CR calculation, stat blocks, encounter design |
| **[spells_5e.md](ref/spells_5e.md)** | Spell descriptions and mechanics | Spell levels, casting time, duration, components |
| **[weapons_5e.md](ref/weapons_5e.md)** | Weapon statistics and properties | Damage types, proficiency, magical properties |
| **[armor_5e.md](ref/armor_5e.md)** | Armor types and protection | AC calculation, stealth penalties, weight |
| **[items_5e.md](ref/items_5e.md)** | Equipment and adventuring gear | Item categories, costs, mechanical effects |
| **[statuses_5e.md](ref/statuses_5e.md)** | Status effects and conditions | Duration, effects, saving throws, removal |

### Reference Document Features

- **Visual Elements**: ASCII art, emoji icons, markdown tables
- **YAML Examples**: Ready-to-use modding configurations
- **Cross-References**: Links between related concepts
- **Implementation Notes**: Technical guidance for developers

## Game Mechanics

### Core Systems

| System | Document | Description |
|--------|----------|-------------|
| **Depth Layers** | [depth-layers.md](depth-layers.md) | Phaser render depth assignments for all game objects |
| **Combat System** | *[Link when created]* | Turn-based combat, initiative, action economy |
| **Fog of War** | [fog-of-war.md](fog-of-war.md) | Hybrid smooth fog renderer, LOS visibility, exploration memory |
| **Movement System** | *[Link when created]* | Grid navigation, pathfinding, positioning |
| **Sight System** | *[Link when created]* | Line of sight, detection, stealth |
| **Status Effects** | *[Link when created]* | Buffs, debuffs, condition management |
| **AI Behavior** | *[Link when created]* | Enemy tactics, wandering, engagement |

### Mechanics Documentation

- **Mathematical Formulas**: Damage calculations, AC, attack rolls
- **State Diagrams**: Combat flow, status transitions
- **Edge Cases**: Boundary conditions, error handling
- **Performance Notes**: Optimization strategies

## Architecture

### Code Organization

```
js/
├── game.js                 # Main game scene (1700+ lines)
├── systems/                # Modular game systems
│   ├── fog-system.js       # Fog of war & visibility
│   ├── sight-system.js     # Sight overlays & detection
│   ├── explore-tb-system.js # Turn-based exploration
│   ├── movement-system.js  # Player movement (planned)
│   ├── wander-system.js    # Enemy wandering (planned)
│   ├── combat-system.js    # Combat mechanics (planned)
│   ├── ability-system.js   # Ability system
│   └── combat-init-system.js # Combat initialization
├── ui/
│   └── core-ui.js          # UI components & interactions
├── config.js               # Game configuration & constants
└── data/                   # Game data (YAML files)
    ├── core/               # Core game content
    └── player.yaml         # Player configuration
```

### Design Patterns

- **Prototype-based Modules**: `Object.assign(GameScene.prototype, module)`
- **Event-driven Architecture**: Hook system for extensibility
- **Data-driven Design**: YAML configuration files
- **Zero-build Architecture**: No bundler, vanilla JavaScript

### Architecture Documents

- **[Modding Guide](modding_guide.md)** - Extension patterns and API
- **[AI Context Optimization](ai-context-optimization.md)** - Code navigation strategies
- **[AI Skills Guide](ai-skills.md)** - Development competencies

## API Documentation

### Modding API

| Tier | Description | Example |
|------|-------------|---------|
| **Data** | YAML configuration | Weapons, monsters, items |
| **Tuning** | Balance adjustments | Damage formulas, encounter rates |
| **Hook** | Event system integration | Custom triggers, effects |
| **Script** | Full JavaScript access | New mechanics, UI components |

### Core APIs

- **Game Scene API**: Main game loop and state management
- **System APIs**: Modular game system interfaces
- **UI API**: Component creation and event handling
- **Data API**: YAML loading and validation

## Testing

### Test Structure

```
tests/
├── run-tests.js            # Main test runner
├── test-fog-system.js      # Fog system unit tests
├── test-sight-system.js    # Sight system unit tests (planned)
├── test-explore-tb.js      # Explore TB tests (planned)
└── autoplay.js             # Integration test scenarios
```

### Test Categories

- **Unit Tests**: Individual module functionality
- **Integration Tests**: System interaction
- **Regression Tests**: Bug fix verification
- **Performance Tests**: Optimization validation

### Testing Documentation

- **Test Patterns**: How to write effective tests
- **Mock Strategies**: Isolating dependencies
- **Coverage Reports**: What's tested and what's not
- **CI/CD Integration**: Automated testing pipeline

## Development Workflow

### Code Development Process

1. **Requirements Analysis**
   - Understand feature requirements
   - Identify dependencies and constraints
   - Plan implementation approach

2. **Implementation**
   - Write code following established patterns
   - Create or update tests
   - Document changes

3. **Verification**
   - Run test suite
   - Manual testing if needed
   - Performance validation

4. **Integration**
   - Update documentation
   - Verify no regressions
   - Commit changes

### Quality Assurance

- **Code Review**: Self-review and peer review
- **Documentation**: Always update relevant docs
- **Testing**: Comprehensive test coverage
- **Performance**: Monitor and optimize

## Contributing

### For AI Assistants

1. **Context Management**: Use efficient information access patterns
2. **Question Formulation**: Be specific and provide context
3. **Documentation**: Update docs with every change
4. **Testing**: Verify changes with tests

### For Human Developers

1. **Clear Requirements**: Provide specific examples
2. **Feedback Loop**: Review and guide AI suggestions
3. **Testing**: Verify implementations thoroughly
4. **Documentation**: Keep docs in sync with code

## Document Maintenance

### Version Control

- **Semantic Versioning**: Track document versions
- **Change Log**: Document significant updates
- **Review Schedule**: Regular content validation
- **Archive Policy**: Keep historical versions

### Quality Standards

- **Accuracy**: Verify technical content
- **Clarity**: Use clear, concise language
- **Completeness**: Cover all relevant aspects
- **Accessibility**: Consider diverse audiences

## Quick Start Guides

### For New AI Assistants

1. Read **[AI Context Optimization](ai-context-optimization.md)**
2. Study **[AI Skills Guide](ai-skills.md)**
3. Review **[Modding Guide](modding_guide.md)**
4. Examine reference documents for your domain

### For New Developers

1. Read architecture overview
2. Study relevant reference documents
3. Examine existing code patterns
4. Review testing framework

### For New Designers

1. Review **[5e Reference Documents](#reference-documents)**
2. Understand **[Game Mechanics](#game-mechanics)**
3. Study **[Modding Guide](modding_guide.md)**
4. Examine existing content examples

## Index Navigation

### By Purpose

- **Learning**: Start with reference documents
- **Development**: Use architecture and API docs
- **Modding**: Follow modding guide and examples
- **Testing**: Review test patterns and frameworks

### By Skill Level

- **Beginner**: Reference documents, basic patterns
- **Intermediate**: System integration, API usage
- **Advanced**: Architecture design, optimization

### By Role

- **AI Assistant**: Context optimization, skills guide
- **Developer**: Architecture, API, testing
- **Designer**: Rules, mechanics, content
- **Modder**: Modding guide, examples

## Future Documentation

### Planned Additions

- **Performance Guide**: Optimization strategies
- **Deployment Guide**: Production setup
- **Security Guide**: Best practices
- **Migration Guide**: Version upgrades

### Community Contributions

- **Tutorials**: Step-by-step guides
- **Examples**: Common use cases
- **Templates**: Starting patterns
- **Tools**: Development utilities

---

**Last Updated**: 2026-04-07  
**Maintainers**: Development Team  
**Version**: 1.0.0

For questions or contributions, refer to the project's contribution guidelines or contact the development team.
