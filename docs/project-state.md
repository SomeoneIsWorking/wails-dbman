# Project state

## Current focus

S005 is the current focus.

## Capability inventory

| ID | Capability or outcome | State | Factual dependency | Goals |
| --- | --- | --- | --- | --- |
| S001 | Users can add, edit, remove, persist, and test database connections | partial | — | G001 |
| S002 | The explorer discovers SQL Server databases, tables, views, and stored procedures | partial | S001 | G001 |
| S003 | Query tabs provide a Monaco editor, execution, multiple result sets, timing, and completion | partial | S001 | G001 |
| S004 | Table, view, and procedure tabs expose data, schemas, definitions, paging, sorting, and filtering | partial | S002 | G001 |
| S005 | PostgreSQL and MySQL provide feature-equivalent discovery and query behavior | missing | S001 | G001 |
| S006 | Tabs, theme, explorer sizing, and global object search persist as a coherent desktop workspace | partial | S002 | G001 |

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

The UI has persistent query tabs, Monaco SQL editing, schema-aware completion, keyboard execution,
multiple result sets, row counts, and timing.

Gap: end-to-end behavior and error-state coverage are not recorded in a canonical test suite.

### S004 — Object inspection

Table, view, and procedure tabs implement the documented data, schema, definition, query, paging,
sorting, filtering, and resizable-column surfaces.

Gap: capability varies by adapter and lacks durable cross-backend verification.

### S005 — PostgreSQL and MySQL parity

Missing capability: PostgreSQL and MySQL adapters do not yet provide the complete discovery and object
workflow implemented for SQL Server.

### S006 — Persistent workspace

The frontend implements persistent tabs, light/dark themes, a resizable explorer, and keyboard-navigable
global search.

Gap: a complete restart/restore and accessibility verification path is not recorded.
