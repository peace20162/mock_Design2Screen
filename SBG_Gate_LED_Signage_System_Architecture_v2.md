# SBG Gate LED Signage Web Application System Architecture

#  1\. Executive Summary & Distributed System Topology

The Suvarnabhumi Airport (SBG) Gate LED Signage System is a distributed web application designed for real-time management of passenger-facing gate displays. The topology connects a central Node.js/PostgreSQL backend core to three primary endpoints: the Airline Gate Officer Portal, the Airport IT Admin Dashboard, and the GDU Signage Edge Players. Data is synchronized via WebSockets for sub-second latency and integrated with AOT core IFIMS flight data via SOAP and SFTP bridges. This system ensures high availability through local offline caching (IndexedDB) and provides a secure, multi-tenant environment for diverse airline operations alongside centralized airport emergency control.

# 2\. Design System & Visual Language

**Aesthetic Theme:** "Aviation Command & Precision Operations" tailored for airport environments.  
**Color Palette & Semantic Tokens:**

* Backgrounds: Deep Aeronautical Navy (\#0B0F19), Obsidian Surface (\#111827), Card Slate (\#1E293B), Border (\#334155).  
* Accent & Actions: AOT Aviation Blue (\#0284C7 / \#38BDF8), Focus Ring (\#0EA5E9).  
* Flight Status Semantics: Emerald Green (\#10B981) for Now Boarding, Amber Gold (\#F59E0B) for Final Call, Ruby Crimson (\#EF4444) for Delayed/Gate Closed.  
* Text: Pure White (\#F8FAFC) for titles, Muted Slate (\#94A3B8) for labels.

**Typography System:**

* Primary Interface & Thai Script: "Prompt" and "Plus Jakarta Sans".  
* Flight Codes, Times, Numbers: "JetBrains Mono" / "Space Grotesk" (monospaced tabular figures to guarantee zero layout shift).

**Component Design Rules:** 1px subtle borders, 8px-12px rounded corners, high-contrast tactile buttons, glanceable operational hierarchies.

# 3\. Page-by-Page Functional & Technical Specifications

## 3.1 Page 1: Unified Role-Based Login (/login)

**\[A\] Route & User Persona:** URL: `/login`. Access: Airline Staff & AOT IT Admin. Context: Desktop Web.  
**\[B\] Functional Inventory:**

* Role Selector: Toggle between \[✈️ Airline Staff\] and \[🛡️ Airport Admin\].  
* Airline Selection: Dropdown for local database accounts (e.g., TG, PG).  
* Gate Selection: Dropdown to define active terminal context (e.g., D1).  
* Credential Entry: Standard Username/Password fields for airline users.  
* SSO Button: "Continue with Azure AD SSO" for AOT Corporate staff.

**\[C\] Data Contracts:** Consumes `AirlineUserAccount` schema. Emits JWT containing `role`, `airlineCode`, and `assignedGate`.  
**\[D\] UI Wireframe:**  
`+--------------------------------------------------+`  
`| [ (1) Airline Staff ] | [ (2) Airport Admin ]    |`  
`| -------------------------------------------------- |`  
`| [ (3) Select Airline v] [ (4) Select Gate v]     |`  
`| [ (5) Username ]                                 |`  
`| [ (6) Password ]                                 |`  
`| [ (7) SIGN IN ]                                  |`  
`|            -- OR (Admin Login) --                |`  
`| [ (8) CONTINUE WITH AZURE AD SSO ]               |`  
`+--------------------------------------------------+`  
**\[E\] Business Logic:** (1,3-7) routes to `/gate/:gateId`; (2,8) routes to `/admin`.  
**\[F\] Visual Design & Layout:** Centered dark aeronautical card; tactile segmented role pill switcher with sliding active indicator; airline dropdown with logo badge; distinct Azure AD SSO button styling.  
**\[G\] Component Architecture & Breakdown Tree:** AuthLayout (Parent) \-\> LoginCard (Compound) \-\> RoleSwitcher (Segmented Control), LoginForm (Atomic), SSOProviderButton (Atomic).  
**\[H\] State Machine & State Matrix:** Initial Loading (Skeleton shimmer on airline list), Ready (Populated), Submitting (Login in-flight), Error (Invalid credentials/Network drop).  
**\[I\] Production-Grade Accessibility:** Role='combobox' for airline/gate selectors with aria-expanded; aria-live='polite' for login error messages; full keyboard tab-loop within the card.  
**\[J\] Layout Mechanics:** CSS Flexbox centering; max-width container for the login card; responsive clamp for title font sizes.  
**\[K\] Micro-Interactions:** Active press states (scale-\[0.98\]) on Sign In button; 150ms ease-out sliding indicator for role switcher.  
**\[L\] Edge Cases & Resilience:** Handling concurrent session overrides if staff logs into a second terminal.

## 3.2 Page 2: Gate Screen Controller (/gate/:gateId)

**\[A\] Route & User Persona:** URL: `/gate/:gateId`. Access: Airline Officer. Context: CUPPS Counter PC.  
**\[B\] Functional Inventory:**

* Active Flight Dropdown: Lists IFIMS-filtered flights for the specific gate.  
* Screen Status: View current design thumbnails. The interface dynamically renders screen cards based on the gate's configured screen count (e.g., Gate D1 with 2 screens renders 2 cards; Gate C1 with 3 screens renders 3 cards).  
* Template Assignment: Direct link to Gallery to "Choose Template" for either screen.  
* Boarding Advancement: Quick status buttons (Boarding \-\> Zones \-\> Final Call).

**\[C\] Data Contracts:** GET `/api/v1/gates/:gateId/screens`. Consumes `GateDisplayScreen` data.  
**\[D\] UI Wireframe:**  
`+--------------------------------------------------+`  
`| Gate: (1) [Select Flight v]                      |`  
`| [ (2-3) Dynamic Screen Cards (1 to N) ]          |`  
`| (4) [ Advanced Boarding Mode Toggles ]           |`  
`+--------------------------------------------------+`  
**\[E\] Visual Design & Layout:** Flight selector combobox with live status badge; dynamic N-screen rack with 16:9 aspect frames; active status chips with glowing LED indicators; tactile push buttons.  
**\[F\] Component Architecture & Breakdown Tree:** ControllerDashboard (Parent) \-\> FlightHeader (Compound), ScreenGrid (Compound) \-\> ScreenCard (Atomic), BoardingControls (Atomic).  
**\[G\] State Machine & State Matrix:** Ready, In-Flight mutation (Boarding status update), Optimistic UI updates for status toggles, Error (WebSocket disconnect).  
**\[H\] Production-Grade Accessibility:** Role='status' for live LED indicators; aria-live='polite' for flight changes; keyboard shortcuts for status advancement.  
**\[I\] Layout Mechanics:** CSS Grid for N-screen rack; overflow-hidden on cards; truncation strategies for long flight destination names.  
**\[J\] Micro-Interactions:** Glowing animation for active status indicators; 150ms transition for card state changes.  
**\[K\] Edge Cases & Resilience:** Resilience against network blips at the CUPPS counter PC; local offline caching (IndexedDB).

## 3.3 Page 3: Airline Template Gallery (/templates)

**\[A\] Route & User Persona:** URL: `/templates`. Access: Airline Officer. Context: Template Library.  
**\[B\] Functional Inventory:**

* Tenant Isolation: Only displays templates owned by the logged-in airline.  
* Instant Search by Name: Real-time debounced search bar filtering templates by title, description, or tags (e.g. 'Royal Silk', 'Final Call').  
* Multi-Criteria Sort Control: Dropdown selector featuring: 'Creation Date: Newest First' (Default), 'Creation Date: Oldest First', 'Recently Modified', 'Template Name: A to Z', and 'Template Name: Z to A'.  
* Combined Filtering: Search query, sort order, and category pills (Boarding, Final Call, Delay, Welcome) operate concurrently.  
* Empty Search State: Informative fallback view when search query yields 0 results with 'Clear Search' action.  
* Category Tabs: Navigation between Boarding, Final Call, Delay, and Welcome.  
* Assignment Actions: Dynamic "Apply to Screen... v" dropdown that populates based on the active gate's configured screens.  
* Management: "Edit Template" for existing items or "+ Create New Template".

\[C\] Data Contracts: GET /api/v1/airlines/:airlineId/templates. Parameters: search (string), sortBy ('created\_at' | 'name' | 'updated\_at'), sortOrder ('asc' | 'desc'), category (string). Payload: SignageTemplate\[\].  
**\[D\] UI Wireframe:**  
`+--------------------------------------------------+`  
| \[ 🔍 Search template by name... \]                 |  
| \[ Sort by: Created Date (Newest) v \]              |  
| (1) \[Boarding\] \[Final Call\] \[Delay\] \[Welcome\]    |  
| (2) \[ Template A \] \[ Template B \] \[ Template C \] |  
| (3) \[ Apply to Screen... v\] \[ Edit Template \]    |  
| (4) \[           \+ Create New Template          \] |  
\+--------------------------------------------------+  
**\[E\] Visual Design & Layout:** Masonry 16:9 card grid; category filter pill bar; dynamic "Apply to Screen... v" action menu; floating "+ Create New Template" button.  
**\[F\] Component Architecture & Breakdown Tree:** GalleryView (Parent) \-\> FilterToolbar (Compound) \-\> SearchInput (Atomic), SortDropdown (Atomic), CategoryTabs (Compound) \-\> TabItem (Atomic), TemplateGrid (Compound) \-\> TemplateCard (Atomic).  
\[G\] State Machine & State Matrix: Initial Loading (Grid shimmer), Ready, SearchInput, SortOption, Empty Search State (0 results with Clear Search action), Empty State (No templates for airline), Error (Network blip).  
**\[H\] Production-Grade Accessibility:** Role='tablist' for categories with aria-selected; roving tabindex for arrow-key grid navigation.  
**\[I\] Layout Mechanics:** CSS Grid masonry layout; auto-scaling thumbnails; clamp functions for card labels.  
**\[J\] Micro-Interactions:** Scale-\[1.02\] hover effect on cards; tactile feedback on "Apply" selection.  
**\[K\] Edge Cases & Resilience:** Concrete handling for image loading errors within the gallery grid.

## 3.4 Page 4: Visual Template Editor Studio (/templates/editor)

**\[A\] Route & User Persona:** URL: `/templates/editor`. Access: Airline Officer. Context: 1080p Design Studio.  
**\[B\] Functional Inventory:**

* Visual Canvas: Fixed 1920x1080 workspace with 40px bezel-safe guides.  
* Toolbox: Controls to Import Images, add IFIMS Data Chips, Multilingual Text, Bangkok Clock, and Shape Containers.  
* Simulation Engine: Toggle to preview live D1 data bindings or edge-case delay presets.  
* Storage/Push: Save to Gallery or direct deployment to Gate GDU players.

**\[C\] Data Contracts:** POST `/api/v1/airlines/:airlineId/templates`. Emits `SignageTemplate` JSON object.  
**\[D\] UI Wireframe:**  
`+----------------------------------------------------------------------------+`  
`| (1) [ TOOLBAR: Image | Chip | Text | Shapes | Clock ] (2) [LIVE PREVIEW ON] |`  
`| (3) [ Layers ]   (4) CANVAS WORKSPACE (1920 x 1080)   (5) [ Inspector ]     |`  
`| (6) [ SAVE TO GALLERY ]                  (7) [ PUSH TO SCREEN 1 / 2 ]      |`  
`+----------------------------------------------------------------------------+`  
**\[E\] Visual Design & Layout:** Dark-mode design studio layout: top toolbar, left layer stack panel, central 1920x1080 canvas with 40px dashed bezel-safe line, right properties inspector, and bottom simulation bar.  
**\[F\] Component Architecture & Breakdown Tree:** StudioProvider (Parent) \-\> CanvasWorkspace (Compound) \-\> LayerElement (Atomic), SidebarInspector (Compound) \-\> PropertyControl (Atomic).  
**\[G\] State Machine & State Matrix:** Ready, Canvas-Dirty (Unsaved changes), Simulating (Live bindings), Submitting (Push to GDU).  
**\[H\] Production-Grade Accessibility:** Keyboard shortcuts (Arrow nudging, Ctrl+S, Esc to cancel); Focus trap for property modals; role='toolbar' for tools.  
**\[I\] Layout Mechanics:** Fixed 1920x1080 CSS Grid workspace; 40px bezel-safe guides; absolute positioning for layers.  
**\[J\] Micro-Interactions:** Smooth transitions for layer selection; tactile scale effects on toolbar buttons.  
**\[K\] Edge Cases & Resilience:** Auto-save to IndexedDB; memory management for high-resolution image assets in the browser.

## 3.5 Page 5: Airport IT Admin Dashboard (/admin)

**\[A\] Route & User Persona:** URL: `/admin`. Access: Airport IT Admin (AOT ฝรส.). Context: Central Management.  
**\[B\] Functional Inventory:**

* Gate & Screen Fleet Configuration: Dedicated module (via tab or /admin/gates) to view all gates and their physical screen counts.  
* \[+ Add Screen to Gate\]: Admin can add a new screen specifying Index, Label, Size (43"/55"), GDU Hardware ID/IP, and Resolution.  
* \[Edit/Remove Screen\]: Update display size, label, or GDU binding; decommission or unbind screens.  
* Fleet Telemetry: Concourse-wide status grid showing online state, resolution, and live thumbnails.  
* Account Management: Provisioning of airline accounts, gate permissions, and quotas.  
* Emergency Override: Global trigger for terminal-wide evacuation instructions.  
* Remote Controls: Ability to soft-restart GDU player or clear local cache.

**\[C\] Data Contracts:** GET /api/v1/admin/gates. POST /api/v1/admin/gates/:gateId/screens. PUT/DELETE /api/v1/admin/gates/:gateId/screens/:screenId.  
**\[D\] UI Wireframe:**  
`+--------------------------------------------------+`  
`| (1) [ OVERVIEW ] [ ACCOUNTS ] [ BROADCAST ]      |`  
`| (2) [Gate D1: Online ]      (2) [Gate D2: Online]|`  
`|     Sc1 [ Thumb ]               Sc1 [ Thumb ]    |`  
`| (3) [ TRIGGER TERMINAL EMERGENCY OVERRIDE ]      |`  
**\[E\] Gate Screen Manager Wireframe:**  
`+--------------------------------------------------+`  
`| [ GATES ] | [ SCREENS ] | [ TELEMETRY ]          |`  
`| ------------------------------------------------ |`  
`| GATE D1: [ Screen 1: 55" ] [ Screen 2: 43" ]     |`  
`|          [+ Add New Screen to D1]                |`  
`| ------------------------------------------------ |`  
`| EDIT SCREEN: Label [_______] Size [ 43" v ]      |`  
`| GDU IP: [ 10.0.0.5 ] [ SAVE ] [ REMOVE SCREEN ]  |`  
`+--------------------------------------------------+`  
**\[F\] Visual Design & Layout:** Command-center / SOC aesthetic; concourse tab filters; gate telemetry cards with animated pulsing green online dots; screen fleet management table; crimson emergency broadcast override button.  
**\[G\] Component Architecture & Breakdown Tree:** AdminShell (Parent) \-\> TelemetryGrid (Compound) \-\> ConcourseCard (Atomic), ScreenManager (Compound) \-\> FleetTable (Atomic).  
**\[H\] State Machine & State Matrix:** Ready, Emergency-Active, In-Flight mutation (Screen decommission), Error (Fleet sync failure).  
**\[I\] Production-Grade Accessibility:** Role='status' for emergency state; aria-live='assertive' for system-wide overrides; focus trap for configuration modals.  
**\[J\] Layout Mechanics:** CSS Flexbox for telemetry cards; responsive table architectures; overflow-y scroll for fleet lists.  
**\[K\] Micro-Interactions:** Animated pulsing indicators for online state; distinct hover/active styles for crimson emergency controls.  
**\[L\] Edge Cases & Resilience:** Handling network dropouts during global emergency triggers; quota progress bar accuracy.  
`+--------------------------------------------------+`

## 3.6 Page 6: GDU Signage Edge Player (/player/:gateId/:screenId)

**\[A\] Route & User Persona:** URL: `/player/:gateId/:screenId`. Access: Machine (GDU Mini PC). Context: Kiosk Display.  
**\[B\] Functional Inventory:**

* WebSocket Listener: Subscribes to real-time layout push notifications.  
* DOM Rendering: Zero-flicker execution of JSON layout layers.  
* Offline Cache: Persists templates in IndexedDB to handle network outages.  
* Telemetry Sender: Transmits heartbeats every 15 seconds to the backend.

**\[C\] Data Contracts:** WSS `/ws/v1/gdu/:gduHardwareId`. Consumes `layoutConfig` payload.  
**\[D\] Visual Design & Layout:** Zero-chrome fullscreen 1080p kiosk; ultra-bold typography for 25-meter readability; smooth CSS fade-in transitions.  
**\[E\] Component Architecture & Breakdown Tree:** PlayerRoot (Parent) \-\> LayoutEngine (Compound) \-\> RenderLayer (Atomic).  
**\[F\] State Machine & State Matrix:** Initial Boot, Ready (Content active), Offline (Loading from IndexedDB cache), Error (No layout available).  
**\[G\] Production-Grade Accessibility:** WAI-ARIA roles for visual elements to support potential accessibility inspections.  
**\[H\] Layout Mechanics:** Zero-flicker DOM rendering; 1080p fixed viewport; ultra-bold monospaced tabular figures for flight times.  
**\[I\] Micro-Interactions:** Smooth CSS fade-in (150ms) for layout transitions; zero-flicker execution.  
**\[J\] Edge Cases & Resilience:** 24/7 memory management; heartbeats every 15 seconds; sub-second latency via WebSockets; offline cache persistence.

# 4\. Technical Appendix & Integration Contracts

**AOT IFIMS Ingestion Reference:**

* Batch SFTP: Daily 17:00 ingestion of fixed-length flat files for primary schedules.  
* SOAP Bridge: Port 8443 listener consuming `RealTimeFlightNotification` XML payloads for intra-day changes.

**GateScreenConfig Interface:** Includes `gateId`, `screenId`, `screenIndex`, `label`, `displaySize`, `gduId`, and `status`.  
**Global Shared Contracts:** Signage system relies on unified TypeScript interfaces for `GateDisplayScreen` (physical state), `SignageTemplate` (layer schema), and `AirlineUserAccount` (identity/quota management).

# 5\. Deployment & Container Infrastructure (Docker Compose & Database)

**Container Architecture:** The system operates on a 4-tier stack: PostgreSQL 16 (Relational Core), Redis 7 (WebSocket/Session Cache), Backend API & SOAP Ingestion (Ports 3000 & 8443), and Frontend Nginx/SPA (Port 80).  
**Complete docker-compose.yml YAML configuration:**

```xml
services:
  postgres:
    image: postgres:16-alphine
    volumes: [postgres_data:/var/lib/postgresql/data, ./init.sql:/docker-entrypoint-initdb.d/init.sql]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U user"] }
  redis:
    image: redis:7-alpine
    volumes: [redis_data:/data]
    healthcheck: { test: ["CMD", "redis-cli", "ping"] }
  backend:
    build: ./backend
    ports: ["3000:3000", "8443:8443"]
    volumes: [uploads_data:/app/uploads]
  frontend:
    build: ./frontend
    ports: ["80:80"]
networks: { sbg_network: { driver: bridge } }
volumes: { postgres_data: {}, redis_data: {}, uploads_data: {} }
```

**Environment Variables (.env.example):**

```
DB_USER=sbg_admin
DB_PASSWORD=secure_gate_pass
REDIS_URL=redis://redis:6379
JWT_SECRET=aot_signage_secret_2024
API_PORT=3000
SOAP_PORT=8443
```

**PostgreSQL Database DDL & Seed Script (init.sql):**

```sql
-- Tables
CREATE TABLE airlines (id UUID PRIMARY KEY, code TEXT, name TEXT);
CREATE TABLE users (id UUID PRIMARY KEY, username TEXT, password_hash TEXT, role TEXT, airline_id UUID);
CREATE TABLE gates (id UUID PRIMARY KEY, name TEXT);
CREATE TABLE gate_screens (id UUID PRIMARY KEY, gate_id UUID, screen_index INT, label TEXT, size TEXT, gdu_id TEXT);
CREATE TABLE templates (id UUID PRIMARY KEY, airline_id UUID, name TEXT, canvas_config JSONB);
CREATE TABLE flights (id UUID PRIMARY KEY, flight_number TEXT, destination TEXT, gate_id UUID, status TEXT);
CREATE TABLE active_screen_states (screen_id UUID PRIMARY KEY, template_id UUID, flight_id UUID);
-- Initial Seed Data
INSERT INTO airlines VALUES (gen_random_uuid(), 'TG', 'Thai Airways'), ('PG', 'Bangkok Airways'), ('SQ', 'Singapore Airlines');
INSERT INTO gates (name) VALUES ('D1'), ('D2'), ('C1');
INSERT INTO gate_screens (gate_id, screen_index, label, size) VALUES ('D1', 1, 'Primary', '55"'), ('D1', 2, 'Secondary', '43"'), ('D2', 1, 'Main', '55"');
INSERT INTO users (username, role) VALUES ('tg_staff', 'airline'), ('admin_it', 'admin');
INSERT INTO flights (flight_number, destination, status) VALUES ('TG920', 'Frankfurt (FRA)', 'Boarding');
```

**Quick Start Commands:**

```shell
# Build and run containers
docker compose up -d --build
# View service logs
docker compose logs -f
# Endpoints: Frontend (http://localhost:80), API (http://localhost:3000)
```

**Decision Log Status:**

* \[DEC-01\] through \[DEC-09\]: Foundation for auth, IFIMS integration, and basic player scope.  
* \[DEC-10\] Interactive Role Selector; \[DEC-11\] Visual Studio Expansion; \[DEC-12\] Mockup Destination; \[DEC-13\] Admin Flow Scope; \[DEC-14-Dynamic-Gate-Screen-Management\] Admin can dynamically manage and scale screen counts per gate; \[DEC-15-Frontend-Design-System-Specification\] Frontend Design System Specification; \[DEC-16-Frontend-UI-Engineering-Specifications\] Frontend UI Engineering Specifications; \[DEC-17-Container-Deployment-Infrastructure\] Container Deployment Infrastructure; \[DEC-18-Template-Search-And-Sort\] Template search by name and multi-criteria sorting functionality.

**Active Frontier Tickets:** \[MOCK-01\] Assignment State; \[MOCK-02\] Editor D\&D; \[MOCK-03\] Flight JSON Schema.

### 

