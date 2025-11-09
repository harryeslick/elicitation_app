# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an expert elicitation web application for ecological modeling. It allows experts to define outcome distributions (baseline vs treatment) for various ecological scenarios, typically related to agricultural pest management and environmental stressors.

The application is built with React + TypeScript + Vite and uses D3/Observable Plot for interactive distribution visualization.

## Development Commands

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

## Architecture

### Data Model

The application has a unique dual-data structure:

1. **Scenarios** (`Scenario` type): Dynamic schema objects with required fields `id` and `scenario_group`, plus arbitrary user-defined columns (e.g., "canola_pct", "Yield (t)", "Sporacle"). These columns are discovered dynamically from the data.

2. **User Elicitation Data** (`UserElicitationData` type): Maps scenario IDs to distribution parameters (min/max/mode/confidence) for both baseline and treatment conditions. Uses **nullable values** - `null` indicates the user hasn't modified that parameter from defaults.

**Critical pattern:** The application preserves null values throughout to distinguish "user hasn't set this" from "user set this to the default value". Functions like `userDistributionToDistribution()` merge nulls with defaults only when needed for computation/display.

### State Management

Main application state in `App.tsx`:
- `scenarios`: Array of scenario objects with dynamic schema
- `userElicitationData`: User's distribution inputs (nullable values)
- `selectedGroup` / `selectedScenarioId`: Current selection state
- `yieldColumn`: Auto-detected column name matching `/yield/i` pattern

### CSV Import/Export

The CSV format (`services/csvUtils.ts`) is the primary session persistence mechanism:
- Reserved columns: `scenario_id`, `scenario_group`, plus 8 distribution columns
- All other columns are scenario-specific dynamic data
- Empty cells in distribution columns = null (user hasn't edited)
- `parseCSV()` rebuilds scenarios from scratch (doesn't merge with existing)
- `findYieldColumn()` uses regex to auto-detect yield columns

### Distribution Utilities

`services/distributionUtils.ts` contains critical conversion functions:
- `DEFAULT_BASELINE` and `DEFAULT_TREATMENT`: Hard-coded default distributions
- Conversion between nullable `UserDistribution` and complete `Distribution` types
- `hasUserEdits()` / `hasScenarioUserEdits()`: Completion tracking

### Component Structure

**ScenarioTable.tsx**: Main interactive component with:
- Sub-table for each scenario showing baseline/treatment distributions
- Triple-handle sliders for min/mode/max parameters
- Confidence sliders
- Uses tooltips defined in `tooltips.json` and served via `tooltipService.ts`
- Yield impact calculations when yield column is detected

**Other key components:**
- `TripleHandleSlider.tsx`: Custom slider with three draggable handles
- `DistributionInputs.tsx`: Manual parameter input fields
- `D3DistributionChart.tsx`: Beta distribution visualization
- `ControlPanel.tsx`: Session save/load controls

## Key Patterns

### Dynamic Schema Handling

Scenarios have flexible schemas. When adding features that work with scenario properties:
- Don't hardcode column names (except `id` and `scenario_group`)
- Use `Object.keys(scenario).filter(key => !['id', 'scenario_group'].includes(key))` pattern
- Check `yieldColumn` state for yield-related features

### Null Preservation

When modifying distribution data:
- Keep nulls for unedited values
- Only convert to concrete values when rendering or computing
- Use `hasUserEdits()` to check completion, not value comparison

### Group-Based Navigation

Scenarios are organized into groups (`scenario_group` field). Selection logic:
- Filter scenarios by selected group
- Reset scenario selection when group changes
- Completion indicators aggregate across all scenarios in all groups

## Deployment

GitHub Actions workflow (`.github/workflows/build-and-deploy.yml`) automatically builds and deploys to `deployment` branch on push to `main`.
