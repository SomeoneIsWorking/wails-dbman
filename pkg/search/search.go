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
}

type ProcedureSearchResult struct {
	ConnectionID   string `json:"connectionId"`
	ConnectionName string `json:"connectionName"`
	Database       string `json:"database"`
	Type           string `json:"type"`
	Name           string `json:"name"`
	Definition     string `json:"definition"`
	MatchedText    string `json:"matchedText,omitempty"`
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

		var databases []string
		if database != "" {
			databases = []string{database}
		} else {
			cachedDbs, err := cache.GetCachedDatabases(conn.ID)
			if err != nil || cachedDbs == nil {
				continue
			}
			databases = cachedDbs.Databases
		}

		for _, db := range databases {
			schema, err := cache.GetCachedSchema(conn.ID, db)
			if err != nil || schema == nil {
				continue
			}

			searchInSchema(conn, db, schema, query, &results)
		}
	}

	return results, nil
}

func ProcedureSearch(query string) ([]ProcedureSearchResult, error) {
	var results []ProcedureSearchResult

	connections, err := cache.GetConnections()
	if err != nil {
		return nil, err
	}

	for _, conn := range connections {
		cachedDbs, err := cache.GetCachedDatabases(conn.ID)
		if err != nil || cachedDbs == nil {
			continue
		}

		dbs := cachedDbs.Databases

		for _, db := range dbs {
			schema, err := cache.GetCachedSchema(conn.ID, db)
			if err != nil || schema == nil {
				continue
			}

			searchInProcedures(conn, db, schema, query, &results)
		}
	}

	return results, nil
}

func searchInSchema(conn cache.Connection, database string, schema *cache.SchemaResponse, query string, results *[]SearchResult) {
	// Search tables
	for _, table := range schema.Tables {
		tablePath := conn.Name + "/" + database + "." + table.Schema + "." + table.Name
		tableFullName := table.Schema + "." + table.Name

		if fuzzyMatch(table.Name, query) || fuzzyMatch(tableFullName, query) || fuzzyMatch(tablePath, query) {
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
		}
	}

	// Search procedures
	for _, proc := range schema.StoredProcedures {
		procPath := conn.Name + "/" + database + "." + proc.Schema + "." + proc.Name
		procFullName := proc.Schema + "." + proc.Name

		if fuzzyMatch(proc.Name, query) || fuzzyMatch(procFullName, query) || fuzzyMatch(procPath, query) {
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
		}
	}
}

func searchInProcedures(conn cache.Connection, database string, schema *cache.SchemaResponse, query string, results *[]ProcedureSearchResult) {
	for _, proc := range schema.StoredProcedures {
		if proc.Definition != nil && strings.Contains(strings.ToLower(*proc.Definition), strings.ToLower(query)) {
			// Find context around match
			defLower := strings.ToLower(*proc.Definition)
			queryLower := strings.ToLower(query)
			matchIndex := strings.Index(defLower, queryLower)
			contextStart := max(0, matchIndex-50)
			contextEnd := min(len(*proc.Definition), matchIndex+len(queryLower)+50)
			matchedText := (*proc.Definition)[contextStart:contextEnd]

			*results = append(*results, ProcedureSearchResult{
				ConnectionID:   conn.ID,
				ConnectionName: conn.Name,
				Database:       database,
				Type:           "procedure",
				Name:           proc.Schema + "." + proc.Name,
				Definition:     *proc.Definition,
				MatchedText:    matchedText,
			})
		}
	}
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
