# Expert Elicitation Application Requirements

This document summarizes the requirements for the Bayesian expert elicitation web application, as specified throughout the development process.

## 1. Core Application Purpose

-   **Goal**: To build a static web application to collect expert opinion for ecological model development.
-   **Elicitation Process**: Experts are shown a series of scenarios and must supply outcome distributions for each.
-   **Distribution Types**: For each scenario, experts provide two separate distributions:
    1.  A **Baseline** outcome.
    2.  A **Treatment** outcome (the expected outcome after an intervention).

## 2. Distribution Definition & Interaction

-   **Model**: Outcome distributions are modeled using a Beta distribution.
-   **User Inputs**: Experts define each distribution by providing four parameters:
    -   `min`: The minimum possible outcome value.
    -   `max`: The maximum possible outcome value.
    -   `mode`: The most likely outcome value.
    -   `confidence`: A value (1-100) indicating the expert's confidence, which controls the "peakiness" (variance) of the distribution.

## 3. User Interface & Layout

The application is structured with a clear layout to guide the user through the elicitation process.

### 3.1. Scenario Table & Grouping

-   **Layout**: The scenario table is positioned at the top of the main view and spans the full width of the page.
-   **Display**: The table has a fixed height, showing approximately 5 rows, with a vertical scrollbar to navigate longer lists of scenarios.
-   **Scenario Groups**:
    -   Scenarios are categorized by a `scenario_group` property.
    -   A tabbed interface allows users to select a group, filtering the table to show only scenarios belonging to that group.
-   **Interaction**: Users can select a scenario by clicking its row. The selected row is highlighted.

### 3.2. Interactive Distribution Chart

-   **Functionality**: A primary interactive chart displays the Beta distribution curves for the selected scenario.
-   **Real-time Updates**: The distribution curve updates instantly and smoothly as its parameters are changed.
-   **Draggable Handles**:
    -   The `min`, `mode`, and `max` parameters are represented by large, clearly identifiable draggable points on the chart.
    -   These handles are positioned directly on the x-axis for intuitive manipulation.
-   **Axis Configuration**:
    -   **X-Axis**: Represents the "Outcome Value", fixed domain of 0-100.
    -   **Y-Axis**: Represents "Probability Density", with a fixed domain of 0 to 0.4. Any part of the distribution curve exceeding 0.4 is visually clipped.
-   **Contextual Display**:
    -   The chart displays the editable "Baseline" (blue) and "Treatment" (green) distributions for the currently selected scenario.
    -   Distributions from all *other* scenarios within the *currently selected group* are shown as faded lines in the background for comparison.
    -   When the user switches to a new scenario group via the tabs, the chart is cleared and refreshed to show data only for the new group.

### 3.3. Distribution Parameters Panel

-   **Functionality**: A dedicated panel displays the precise numerical values for `min`, `mode`, `max`, and `confidence` for both the baseline and treatment distributions of the active scenario.
-   **Manual Input**: This panel allows experts to type values directly into number inputs, providing an alternative to dragging handles on the chart for fine-grained control.
-   **Two-Way Binding**: The chart and the input panel are fully synchronized. Modifying a value in one immediately updates the other.

## 4. Session Management (Data Persistence)

-   **Static Nature**: The application is a static webpage with no backend.
-   **Download Results**: Users can download their complete set of elicited distributions at any time. The data is saved as a `results.csv` file.
-   **Upload Session**: Users can upload a previously downloaded CSV file to restore their session, allowing them to pause and continue their work across multiple sessions.
-   **CSV Format**: The CSV file contains one row per scenario, including all original scenario data plus additional columns for the user-defined distribution parameters (`baseline_min`, `baseline_max`, etc., and `treatment_min`, `treatment_max`, etc.).
