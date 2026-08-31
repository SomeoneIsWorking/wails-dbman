# Project state

## Comparison baseline

The baseline is switching between separate vendor-specific database clients and rebuilding connection,
query, object-inspection, and workspace context for each engine. DBMan intends one native desktop
workbench for SQL Server, PostgreSQL, and MySQL with persistent connections, tabs, exploration,
editing, results, and search.

## Current focus

S005 is the current focus.

## Capability inventory

| ID | Capability or outcome | State | Factual dependency | Goals |
| --- | --- | --- | --- | --- |
| S001 | Users can add, edit, remove, persist, and test database connections | partial | — | G001 |
| S002 | The explorer discovers SQL Server databases, tables, views, and stored procedures | partial | S001 | G001 |
| S003 | Query tabs provide a Monaco SQL editor with schema-aware completion and keyboard execution | partial | S001 | G001 |
| S004 | Table tabs expose data with paging, sorting, filtering, and resizable columns | partial | S002 | G001 |
| S005 | PostgreSQL and MySQL provide feature-equivalent discovery and query behavior | missing | S001 | G001 |
| S006 | Open tabs persist and restore as one desktop workspace | partial | S002 | G001 |
| S007 | Query execution displays multiple result sets, row counts, errors, and timing | partial | S003 | G001 |
| S008 | View and stored-procedure tabs expose schemas and definitions | partial | S002 | G001 |
| S009 | The desktop supports persistent light and dark themes | partial | — | G001 |
| S010 | The database explorer can be resized without losing its layout | partial | S002 | G001 |
| S011 | Global object search is keyboard-navigable across the connected server | partial | S002 | G001 |

## Capability details

### S001 — Connection management

The Wails backend and Vue connection surfaces implement save, edit, delete, list, and test paths.

Gap: there is no authoritative automated cross-database connection and persistence gate.

### S002 — SQL Server discovery

The SQL Server adapter and explorer implement databases, tables, views, columns, and stored-procedure
discovery.

Gap: implementation presence has not been backed by a real SQL Server integration gate, so this is not
yet verified behavior.

### S003 — Query workflow

The UI has Monaco SQL editing, schema-aware completion, and keyboard execution.

Gap: end-to-end behavior and error-state coverage are not recorded in a canonical test suite.

### S004 — Object inspection

Table tabs implement data queries, paging, sorting, filtering, and resizable-column surfaces.

Gap: capability varies by adapter and lacks durable cross-backend verification.

### S005 — PostgreSQL and MySQL parity

Missing capability: PostgreSQL and MySQL adapters do not yet provide the complete discovery and object
workflow implemented for SQL Server.

### S006 — Persistent workspace

The frontend persists open tabs across desktop sessions.

Gap: a complete restart/restore verification path is not recorded.

### S007 — Query results

The execution surface implements multiple result sets, row counts, errors, and timing.

Gap: end-to-end success and failure behavior is not recorded in a canonical integration suite.

### S008 — View and procedure inspection

View and stored-procedure tabs expose schemas and definitions.

Gap: behavior varies by adapter and lacks durable cross-backend verification.

### S009 — Themes

The frontend implements persistent light and dark themes.

Gap: restart persistence and complete contrast/accessibility behavior are unverified.

### S010 — Explorer layout

The database explorer is resizable and persists its workspace layout.

Gap: restart and edge-size behavior lack a canonical UI gate.

### S011 — Global search

The frontend implements keyboard-navigable global object search.

Gap: large-schema, empty, error, and accessibility states remain unverified.
