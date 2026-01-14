package search

import (
	"strings"

	"wails-dbman/pkg/cache"
)

type SearchResult struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Path         string `json:"path"`
	Type         string `json:"type"`
	ConnectionID string `json:"connectionId"`
	Database     string `json:"database"`
	Schema       string `json:"schema,omitempty"`
	ObjectName   string `json:"objectName,omitempty"`
	MatchedText  string `json:"matchedText,omitempty"`
	MatchReason  string `json:"matchReason,omitempty"`
	LineNumber   int    `json:"lineNumber,omitempty"`
}

func Search(query string, connectionId, database string) ([]SearchResult, error) {
	var results []SearchResult

	connections, err := cache.GetConnections()
	if err != nil {
		return nil, err
	}

	for _, conn := range connections {
		if connectionId != "" && conn.ID != connectionId {
			continue
		}

		// Collect target databases for this connection
		dbMap := make(map[string]bool)

		if database != "" {
			dbMap[database] = true
		} else {
			// Add default database if set
			if conn.Database != nil && *conn.Database != "" {
				dbMap[*conn.Database] = true
			}

			// Add any databases with cached schemas
			var schemas []cache.CachedSchema
			cache.DB.Where("connection_id = ?", conn.ID).Find(&schemas)
			for _, s := range schemas {
				dbMap[s.Database] = true
			}

			// Add any databases in the cached database list
			cachedDbs, _ := cache.GetCachedDatabases(conn.ID)
			if cachedDbs != nil {
				for _, dbName := range cachedDbs.Databases {
					dbMap[dbName] = true
				}
			}
		}

		for db := range dbMap {
			schema, err := cache.GetCachedSchema(conn.ID, db)
			if err != nil || schema == nil {
				continue
			}

			searchInSchema(conn, db, schema, query, &results)
		}
	}

	return results, nil
}

func searchInSchema(conn cache.Connection, database string, schema *cache.SchemaResponse, query string, results *[]SearchResult) {
	queryLower := strings.ToLower(query)

	// Search tables
	for _, table := range schema.Tables {
		tablePath := conn.Name + "/" + database + "." + table.Schema + "." + table.Name
		tableFullName := table.Schema + "." + table.Name

		// Name match
		if fuzzyMatch(table.Name, query) || fuzzyMatch(tableFullName, query) {
			*results = append(*results, SearchResult{
				ID:           "table-" + tablePath,
				Name:         table.Name,
				Path:         tablePath,
				Type:         "table",
				ConnectionID: conn.ID,
				Database:     database,
				Schema:       table.Schema,
				ObjectName:   table.Name,
			})
			continue
		}

		// Column match
		for _, col := range table.Columns {
			if fuzzyMatch(col.Name, query) {
				*results = append(*results, SearchResult{
					ID:           "table-col-" + tablePath + "-" + col.Name,
					Name:         table.Name,
					Path:         tablePath,
					Type:         "table",
					ConnectionID: conn.ID,
					Database:     database,
					Schema:       table.Schema,
					ObjectName:   table.Name,
					MatchedText:  col.Name,
					MatchReason:  "Column match",
				})
				break // Found a column, no need to check other columns for the same table
			}
		}
	}

	// Search views
	for _, view := range schema.Views {
		viewPath := conn.Name + "/" + database + "." + view.Schema + "." + view.Name
		viewFullName := view.Schema + "." + view.Name

		// Name match
		if fuzzyMatch(view.Name, query) || fuzzyMatch(viewFullName, query) {
			*results = append(*results, SearchResult{
				ID:           "view-" + viewPath,
				Name:         view.Name,
				Path:         viewPath,
				Type:         "view",
				ConnectionID: conn.ID,
				Database:     database,
				Schema:       view.Schema,
				ObjectName:   view.Name,
			})
			continue
		}

		// Definition match
		if view.Definition != nil {
			defLower := strings.ToLower(*view.Definition)
			if matchIndex := strings.Index(defLower, queryLower); matchIndex != -1 {
				*results = append(*results, SearchResult{
					ID:           "view-def-" + viewPath,
					Name:         view.Name,
					Path:         viewPath,
					Type:         "view",
					ConnectionID: conn.ID,
					Database:     database,
					Schema:       view.Schema,
					ObjectName:   view.Name,
					MatchedText:  extractContext(*view.Definition, matchIndex, len(query)),
					MatchReason:  "Definition match",
					LineNumber:   strings.Count((*view.Definition)[:matchIndex], "\n") + 1,
				})
				continue
			}
		}

		// Column match
		for _, col := range view.Columns {
			if fuzzyMatch(col.Name, query) {
				*results = append(*results, SearchResult{
					ID:           "view-col-" + viewPath + "-" + col.Name,
					Name:         view.Name,
					Path:         viewPath,
					Type:         "view",
					ConnectionID: conn.ID,
					Database:     database,
					Schema:       view.Schema,
					ObjectName:   view.Name,
					MatchedText:  col.Name,
					MatchReason:  "Column match",
				})
				break
			}
		}
	}

	// Search procedures
	for _, proc := range schema.StoredProcedures {
		procPath := conn.Name + "/" + database + "." + proc.Schema + "." + proc.Name
		procFullName := proc.Schema + "." + proc.Name

		// Name match
		if fuzzyMatch(proc.Name, query) || fuzzyMatch(procFullName, query) {
			*results = append(*results, SearchResult{
				ID:           "proc-" + procPath,
				Name:         proc.Name,
				Path:         procPath,
				Type:         "procedure",
				ConnectionID: conn.ID,
				Database:     database,
				Schema:       proc.Schema,
				ObjectName:   proc.Name,
			})
			continue
		}

		// Definition match
		if proc.Definition != nil {
			defLower := strings.ToLower(*proc.Definition)
			if matchIndex := strings.Index(defLower, queryLower); matchIndex != -1 {
				*results = append(*results, SearchResult{
					ID:           "proc-def-" + procPath,
					Name:         proc.Name,
					Path:         procPath,
					Type:         "procedure",
					ConnectionID: conn.ID,
					Database:     database,
					Schema:       proc.Schema,
					ObjectName:   proc.Name,
					MatchedText:  extractContext(*proc.Definition, matchIndex, len(query)),
					MatchReason:  "Definition match",
					LineNumber:   strings.Count((*proc.Definition)[:matchIndex], "\n") + 1,
				})
				continue
			}
		}

		// Parameter match
		for _, param := range proc.Parameters {
			if fuzzyMatch(param.Name, query) {
				*results = append(*results, SearchResult{
					ID:           "proc-param-" + procPath + "-" + param.Name,
					Name:         proc.Name,
					Path:         procPath,
					Type:         "procedure",
					ConnectionID: conn.ID,
					Database:     database,
					Schema:       proc.Schema,
					ObjectName:   proc.Name,
					MatchedText:  param.Name,
					MatchReason:  "Parameter match",
				})
				break
			}
		}

		// Result set column match
		foundInResultSet := false
		for rsIdx, rs := range proc.ResultSets {
			for _, col := range rs.Columns {
				if fuzzyMatch(col.Name, query) {
					*results = append(*results, SearchResult{
						ID:           "proc-rs-col-" + procPath + "-" + col.Name,
						Name:         proc.Name,
						Path:         procPath,
						Type:         "procedure",
						ConnectionID: conn.ID,
						Database:     database,
						Schema:       proc.Schema,
						ObjectName:   proc.Name,
						MatchedText:  col.Name,
						MatchReason:  "Result set column match (Set " + string(rune(rsIdx+'1')) + ")",
					})
					foundInResultSet = true
					break
				}
			}
			if foundInResultSet {
				break
			}
		}
	}
}

func extractContext(text string, matchIndex, queryLen int) string {
	start := max(0, matchIndex-40)
	end := min(len(text), matchIndex+queryLen+40)
	context := text[start:end]
	if start > 0 {
		context = "..." + context
	}
	if end < len(text) {
		context = context + "..."
	}
	return context
}

func fuzzyMatch(target, query string) bool {
	return strings.Contains(strings.ToLower(target), strings.ToLower(query))
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
