# Expert Elicitation Application Specification

This document defines the comprehensive functionality and requirements for the Bayesian expert elicitation web application for ecological modeling.

## 1. Core Application Purpose

**Primary Goal**: A static web application designed to systematically collect expert opinion and uncertainty quantification for ecological model development through structured elicitation processes.

**Target Users**: Domain experts, researchers, and practitioners who need to provide probabilistic assessments of ecological outcomes under different intervention scenarios.

**Use Cases**:

- Agricultural impact assessment (crop yield predictions under different treatments)
- Environmental risk evaluation (species population responses to conservation interventions)
- Ecosystem service valuation (quantifying benefits of restoration activities)
- Climate change impact modeling (ecological responses to mitigation strategies)

## 2. Elicitation Framework

### 2.1. Probabilistic Elicitation Model

- **Distribution Type**: Beta distributions model outcome uncertainties, ideal for bounded percentage-based outcomes (0-100%)
- **Dual Outcome Structure**: Each scenario requires assessment of two related probability distributions:
  1. **Baseline Distribution**: Expected outcomes without any intervention
  2. **Treatment Distribution**: Expected outcomes after applying a specific intervention
- **Comparative Analysis**: Treatment outcomes are constrained to be equal to or better than baseline outcomes (treatment ≤ baseline for damage/loss scenarios)

### 2.2. Expert Input Parameters

Each distribution is defined through four intuitive parameters:

- **Minimum Value**: The lowest possible outcome (best-case scenario)
- **Maximum Value**: The highest possible outcome (worst-case scenario)  
- **Mode**: The most likely outcome (expert's best estimate)
- **Confidence**: Certainty level (1-100) controlling distribution shape (higher values = more peaked/certain)

## 3. Dynamic Data Architecture

### 3.1. Flexible Scenario Structure

- **Dynamic Schema**: Scenarios can contain arbitrary attributes beyond required core fields
- **Required Fields**: `scenario_id` (unique identifier) and `scenario_group` (categorization)
- **Reserved Fields**: Distribution parameters (`baseline_min`, `baseline_max`, `baseline_mode`, `baseline_confidence`, `treatment_min`, `treatment_max`, `treatment_mode`, `treatment_confidence`)
- **Custom Attributes**: All other columns become scenario descriptors (location, crop type, environmental conditions, etc.)

### 3.2. Intelligent Yield Detection

- **Pattern Recognition**: Automatically identifies yield/production columns using regex pattern matching (`/yield/i`)
- **Flexible Naming**: Supports various naming conventions ("Total Yield", "Yield (t/ha)", "Expected Yield Production", etc.)
- **Impact Calculations**: Dynamically calculates tonnage impacts based on detected yield values and loss percentages

## 4. User Interface Design

### 4.1. Scenario Management Interface

- **Dynamic Table Rendering**: Automatically generates table columns based on uploaded scenario structure
- **Group-Based Navigation**: Tabbed interface for filtering scenarios by category
- **Completion Tracking**: Visual indicators showing which scenarios have user-provided distributions vs. default values
- **Interactive Operations**:
  - Row selection for scenario focus
  - Scenario duplication for creating similar cases
  - Scenario deletion with confirmation
  - Real-time completion status updates

### 4.2. Distribution Visualization System

- **Interactive Chart Display**: Real-time Beta distribution curves with smooth parameter updates
- **Multi-Layer Visualization**:
  - Active distributions (baseline in blue, treatment in green) with full interactivity
  - Background distributions from other scenarios in the same group (faded for context)
  - Group-specific filtering for relevant comparisons
- **Direct Manipulation**: Draggable handles on chart for intuitive parameter adjustment
- **Axis Configuration**: Fixed scales (X: 0-100%, Y: 0-0.4 density) with visual clipping for extreme distributions

### 4.3. Parameter Input Interface

- **Dual Input Methods**:
  - Direct numerical input fields with validation
  - Interactive chart manipulation
  - Real-time synchronization between methods
- **Smart Defaults System**:
  - Blank input fields show placeholder values for defaults
  - User entries override defaults and are tracked separately
  - Clear visual distinction between default and user-specified parameters
- **Constraint Enforcement**: Automatic validation ensuring treatment values don't exceed baseline values
- **Yield Impact Display**: Real-time tonnage calculations displayed alongside percentage inputs

## 5. Completion Tracking & State Management

### 5.1. User Progress Monitoring

- **Granular State Tracking**: Distinguishes between default parameters and user-modified values
- **Completion Indicators**: Visual status markers in scenario table showing elicitation progress
- **Flexible Data Model**: Nullable value system allowing partial completion and incremental progress
- **Session Continuity**: Preservation of exact user state across sessions

### 5.2. Default Value Handling

- **Intelligent Defaults**: System-provided baseline parameters for immediate visualization
- **Override Tracking**: Clear separation between system defaults and user inputs
- **Visual Clarity**: Empty input fields with placeholder hints for default values
- **Chart Integration**: Distributions render using defaults even when parameters are blank

## 6. Data Persistence & Portability

### 6.1. Session Management

- **Stateless Architecture**: No backend dependencies, purely client-side operation
- **File-Based Persistence**: Complete session state saved as CSV files
- **Session Restoration**: Upload previously saved files to continue work
- **Data Integrity**: Preservation of exact user state including blank vs. specified parameters

### 6.2. Dynamic CSV Processing

- **Flexible Import**: Accepts CSV files with arbitrary column structures
- **Validation Framework**: Comprehensive error handling for missing required fields
- **Schema Detection**: Automatic identification of scenario attributes and yield columns
- **Export Fidelity**: CSV output exactly reflects user input state (blanks remain blank, values remain values)

## 7. Error Handling & Validation

### 7.1. Input Validation

- **Required Field Enforcement**: Clear error messages for missing `scenario_id` or `scenario_group`
- **Data Type Validation**: Automatic parsing and validation of numeric vs. text fields
- **Constraint Checking**: Real-time validation of parameter relationships and bounds
- **User Feedback**: Informative error messages with specific guidance for resolution

### 7.2. Robust Processing

- **Graceful Degradation**: System continues functioning with partial data
- **Format Flexibility**: Handles various CSV formats and column arrangements
- **Recovery Mechanisms**: Clear pathways for correcting invalid inputs
- **State Preservation**: No loss of valid data when errors occur

## 8. Technical Requirements

### 8.1. Performance & Usability

- **Real-Time Responsiveness**: Instant updates across all interface elements
- **Smooth Interactions**: Fluid animations and transitions for parameter changes
- **Scalable Display**: Efficient rendering of multiple distributions and large scenario sets
- **Cross-Platform Compatibility**: Consistent behavior across different devices and browsers

### 8.2. Data Format Standards

- **CSV Compliance**: Standard comma-separated value format for maximum compatibility
- **Unicode Support**: Proper handling of international characters and symbols
- **Numeric Precision**: Appropriate decimal precision for scientific applications
- **Metadata Preservation**: Retention of all original scenario information through processing cycles
