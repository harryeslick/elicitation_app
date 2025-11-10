# Expert Elicitation Web Application

A client-side tool for collecting expert judgments and uncertainty estimates for ecological modeling scenarios. The app helps domain experts specify beta distributions for unsprayed and sprayed outcomes (stored in baseline/treatment fields), track completion progress, and export fully reproducible elicitation sessions.

## Key Capabilities

- Scenario management with dynamic schemas, group-based navigation, duplication, and deletion workflows
- Dual unsprayed vs sprayed distribution editing with real-time beta curve visualization and slider/field inputs
- Intelligent yield detection to derive tonnage impacts from percentage losses
- Smart defaults and completion tracking that preserve nulls to distinguish untouched parameters from user edits
- CSV-driven import/export that maintains exact session state, including blanks and custom scenario attributes

## Tech Stack

- React + TypeScript + Vite for the frontend
- D3/Observable Plot for interactive distribution charts
- CSV parsing utilities for schema discovery, validation, and persistence

## Getting Started

- **Prerequisite:** Node.js 18+

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Build for production: `npm run build`
4. Preview the production build: `npm run preview`

## Data Model Overview

- **Scenarios:** Dynamic objects with required `scenario_id` and `scenario_group` plus arbitrary descriptive columns (e.g., location, crop type). Reserved distribution columns include `baseline_min`, `baseline_max`, `baseline_mode`, `baseline_confidence`, `treatment_min`, `treatment_max`, `treatment_mode`, and `treatment_confidence`.
- **User Elicitation Data:** Nullable parameter overrides keyed by `scenario_id`. Null indicates the expert has not modified the default value.
- **Defaults:** Unsprayed and sprayed distributions render immediately using system defaults; user input replaces defaults only where specified.

## CSV Workflow

- **Import:** Upload CSV files with the required ID and group columns plus any number of custom attributes. Empty distribution cells are treated as null.
- **Validation:** Missing required fields, non-numeric parameters, and constraint violations surface informative errors without discarding valid data.
- **Yield Detection:** Columns matching `/yield/i` are automatically recognized to drive tonnage impact calculations.
- **Export:** Downloaded CSVs preserve the exact session state, including untouched fields and user-specified parameters.

## Application Structure

- `App.tsx` holds primary state (scenarios, elicitation data, selections, detected yield column).
- `components/ScenarioTable.tsx` renders the tabbed scenario table, completion indicators, sliders, and distribution inputs.
- `components/TripleHandleSlider.tsx`, `components/ScenarioEditModal.tsx`, and `components/ControlPanel.tsx` provide core editing and session management interactions.
- `services/csvUtils.ts` handles schema discovery, parsing, validation, and export logic.
- `services/distributionUtils.ts` converts between nullable user inputs and complete beta distributions while preserving null tracking.

## Development Notes

- The interface enforces unsprayed ≥ sprayed constraints (for loss-oriented metrics) and synchronizes slider and numeric inputs in real time.
- State is entirely client-side; persistence depends on importing/exporting CSV files.
- Tooltips are defined in `tooltips.json` and delivered through `services/tooltipService.ts` for contextual guidance.
