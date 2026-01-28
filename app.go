package main

import (
	"context"
	"log"
	"wails-dbman/pkg/adapters"
	"wails-dbman/pkg/cache"
	"wails-dbman/pkg/models"
	"wails-dbman/pkg/search"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	cache.InitDB()
}

func (a *App) createAdapter(connectionId string) (adapters.BaseAdapter, error) {
	conn, err := cache.GetConnection(connectionId)
	if err != nil {
		return nil, err
	}
	config := adapters.ConnectionConfig{
		Type:         conn.Type,
		Host:         conn.Host,
		Port:         conn.Port,
		Username:     conn.Username,
		Password:     conn.Password,
		Database:     conn.Database,
		ConnectionID: connectionId,
	}
	factory := adapters.AdapterFactory{}
	adapter, err := factory.CreateAdapter(config)
	if err != nil {
		return nil, err
	}
	return adapter, nil
}

func (a *App) GetConnections() ([]cache.ConnectionDetail, error) {
	conns, err := cache.GetConnections()
	if err != nil {
		return nil, err
	}

	result := make([]cache.ConnectionDetail, len(conns))
	for i, conn := range conns {
		detail := cache.ConnectionDetail{
			ID:              conn.ID,
			Name:            conn.Name,
			Type:            conn.Type,
			Host:            conn.Host,
			Port:            conn.Port,
			Username:        conn.Username,
			Password:        conn.Password,
			Database:        conn.Database,
			HiddenDatabases: conn.HiddenDatabases,
			ShowHidden:      conn.ShowHidden,
		}

		// Get all database names for this connection
		dbNames, err := a.GetDatabases(conn.ID, false)
		if err != nil {
			// Mark connection as having an error in response, but continue rendering other connections
			errMsg := err.Error()
			detail.HasError = true
			detail.LastError = &errMsg
			log.Printf("Error getting databases for connection %s: %v", conn.ID, err)
			// Fallback to default database list
			dbNames = []string{}
		}

		detail.Databases = make([]cache.DatabaseDetail, len(dbNames))
		for j, name := range dbNames {
			dbDetail := cache.DatabaseDetail{
				Name:   name,
				Loaded: false,
			}

			detail.Databases[j] = dbDetail
		}

		result[i] = detail
	}

	return result, nil
}

func (a *App) CreateConnection(conn models.ConnectionPostModel) (cache.Connection, error) {
	return cache.CreateConnection(conn)
}

func (a *App) GetConnection(id string) (cache.Connection, error) {
	return cache.GetConnection(id)
}

func (a *App) UpdateConnection(id string, data models.ConnectionPostModel) (cache.Connection, error) {
	return cache.UpdateConnection(id, data)
}

func (a *App) UpdateConnectionSettings(id string, hiddenDatabases string, showHidden bool) error {
	return cache.UpdateConnectionSettings(id, hiddenDatabases, showHidden)
}

func (a *App) DeleteConnection(id string) error {
	return cache.DeleteConnection(id)
}

func (a *App) TestConnection(conn cache.Connection) error {
	config := adapters.ConnectionConfig{
		Type:     conn.Type,
		Host:     conn.Host,
		Port:     conn.Port,
		Username: conn.Username,
		Password: conn.Password,
		Database: conn.Database,
	}
	factory := adapters.AdapterFactory{}
	adapter, err := factory.CreateAdapter(config)
	if err != nil {
		return err
	}
	// Try to list databases to test the connection
	_, err = adapter.ListDatabases()
	return err
}

func (a *App) GetDatabases(connectionId string, invalidate bool) ([]string, error) {
	// Check cache first
	if !invalidate {
		cached, err := cache.GetCachedDatabases(connectionId)
		if err != nil {
			return nil, err
		}
		if cached != nil {
			return cached.Databases, nil
		}
	}
	// Fetch from DB
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}
	databases, err := adapter.ListDatabases()
	if err != nil {
		return nil, err
	}
	// Cache
	err = cache.CacheDatabases(connectionId, databases)
	if err != nil {
		// Log but don't fail
	}
	return databases, nil
}

func (a *App) GetSchema(connectionId, database string, invalidate bool) (*cache.SchemaResponse, error) {
	// Check cache first
	if !invalidate {
		cached, err := cache.GetCachedSchema(connectionId, database)
		if err != nil {
			return nil, err
		}
		if cached != nil {
			return cached, nil
		}
	}
	// Fetch from DB
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}
	schema, err := adapter.GetSchema(database)
	if err != nil {
		log.Printf("Error getting schema for database %s: %v", database, err)
		return nil, err
	}
	// Cache
	err = cache.CacheSchema(connectionId, database, *schema)
	if err != nil {
		// Log but don't fail
	}
	result := &cache.SchemaResponse{
		Tables:           make([]cache.TableResponse, len(schema.Tables)),
		Views:            make([]cache.ViewResponse, len(schema.Views)),
		StoredProcedures: make([]cache.ProcedureResponse, len(schema.StoredProcedures)),
	}
	for i, table := range schema.Tables {
		columns := make([]cache.ColumnResponse, len(table.Columns))
		for j, col := range table.Columns {
			columns[j] = cache.ColumnResponse{
				Name:         col.Name,
				Type:         col.Type,
				Nullable:     col.Nullable,
				DefaultValue: col.DefaultValue,
				Primary:      col.Primary,
				Unique:       col.Unique,
				Foreign:      col.Foreign,
				Comment:      col.Comment,
			}
		}
		result.Tables[i] = cache.TableResponse{
			Name:       table.Name,
			Schema:     table.Schema,
			Columns:    columns,
			PrimaryKey: table.PrimaryKey,
		}
	}
	for i, view := range schema.Views {
		columns := make([]cache.ColumnResponse, len(view.Columns))
		for j, col := range view.Columns {
			columns[j] = cache.ColumnResponse{
				Name:         col.Name,
				Type:         col.Type,
				Nullable:     col.Nullable,
				DefaultValue: col.DefaultValue,
			}
		}
		result.Views[i] = cache.ViewResponse{
			Name:       view.Name,
			Schema:     view.Schema,
			Columns:    columns,
			Definition: view.Definition,
		}
	}
	for i, proc := range schema.StoredProcedures {
		result.StoredProcedures[i] = cache.ProcedureResponse{
			Name:   proc.Name,
			Schema: proc.Schema,
		}
	}
	return result, nil
}

func (a *App) Search(query, connectionId, database string) ([]search.SearchResult, error) {
	// Only ensure specific schema is cached if context is provided
	if connectionId != "" && database != "" {
		_, err := a.GetSchema(connectionId, database, false)
		if err != nil {
			return nil, err
		}
	}
	return search.Search(query, connectionId, database)
}

func (a *App) AnalyzeProcedure(connectionId, database, schema, name string) (*cache.StoredProcedureInfo, error) {
	log.Printf("AnalyzeProcedure called with connectionId=%s, database=%s, schema=%s, name=%s", connectionId, database, schema, name)
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		log.Printf("Error creating adapter: %v", err)
		return nil, err
	}
	result, err := adapter.GetProcedureDetails(database, schema, name)
	if err != nil {
		log.Printf("Error getting procedure details: %v", err)
		return nil, err
	}
	if result == nil {
		log.Printf("GetProcedureDetails returned nil")
	}
	log.Printf("AnalyzeProcedure completed successfully")
	return result, nil
}

type GetTableDataRequest struct {
	ConnectionID  string         `json:"connectionId"`
	Database      string         `json:"database"`
	Schema        string         `json:"schema"`
	TableName     string         `json:"tableName"`
	Page          int            `json:"page"`
	Limit         int            `json:"limit"`
	Filters       []cache.Filter `json:"filters"`
	SortColumn    string         `json:"sortColumn,omitempty"`
	SortDirection string         `json:"sortDirection,omitempty"`
}

type GetTableDataCountRequest struct {
	ConnectionID string         `json:"connectionId"`
	Database     string         `json:"database"`
	Schema       string         `json:"schema"`
	TableName    string         `json:"tableName"`
	Filters      []cache.Filter `json:"filters"`
}

func (a *App) GetTableData(request GetTableDataRequest) (*cache.TableDataResponse, error) {
	adapter, err := a.createAdapter(request.ConnectionID)
	if err != nil {
		return nil, err
	}

	// Get table data with pagination
	options := map[string]interface{}{
		"page":          request.Page,
		"limit":         request.Limit,
		"filters":       request.Filters,
		"sortColumn":    request.SortColumn,
		"sortDirection": request.SortDirection,
	}

	return adapter.GetTableData(request.Database, request.Schema, request.TableName, options)
}

func (a *App) GetTableDataCount(request GetTableDataCountRequest) (int, error) {
	adapter, err := a.createAdapter(request.ConnectionID)
	if err != nil {
		return 0, err
	}

	options := map[string]interface{}{
		"filters": request.Filters,
	}

	return adapter.GetTableDataCount(request.Database, request.Schema, request.TableName, options)
}

func (a *App) GetViewData(connectionId, database, schema, viewName string, page, limit int) (*cache.TableDataResponse, error) {
	adapter, err := a.createAdapter(connectionId)
	if err != nil {
		return nil, err
	}

	// For views, we can use the same GetTableData method but treat it as a table
	options := map[string]interface{}{
		"page":  page,
		"limit": limit,
	}

	return adapter.GetTableData(database, schema, viewName, options)
}

// SaveTab saves a tab to the backend
func (a *App) SaveTab(tabID, tabType, title, connectionID, database, objectName, data string) error {
	return cache.SaveTab(tabID, tabType, title, connectionID, database, objectName, data)
}

// LoadTabs loads all tabs from the backend
func (a *App) LoadTabs() ([]cache.Tab, error) {
	return cache.LoadTabs()
}

// DeleteTab deletes a tab from the backend
func (a *App) DeleteTab(tabID string) error {
	return cache.DeleteTab(tabID)
}

// ClearAllTabs deletes all tabs from the backend
func (a *App) ClearAllTabs() error {
	return cache.ClearAllTabs()
}
