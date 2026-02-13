package cache

import (
	"encoding/json"
	"errors"
	"log"
	"time"
	"wails-dbman/pkg/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SchemaInfo represents the schema information
type SchemaInfo struct {
	Tables           []TableInfo           `json:"tables"`
	Views            []ViewInfo            `json:"views"`
	StoredProcedures []StoredProcedureInfo `json:"storedProcedures"`
}

type TableInfo struct {
	Name        string           `json:"name"`
	Schema      string           `json:"schema"`
	Columns     []ColumnInfo     `json:"columns"`
	PrimaryKey  []string         `json:"primaryKey"`
	ForeignKeys []ForeignKeyInfo `json:"foreignKeys"`
}

type ColumnInfo struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Nullable     bool    `json:"nullable"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	Primary      bool    `json:"primary"`
	Unique       bool    `json:"unique"`
	Foreign      bool    `json:"foreign"`
	Comment      *string `json:"comment,omitempty"`
	MaxLength    *int    `json:"maxLength,omitempty"`
	Precision    *int    `json:"precision,omitempty"`
	Scale        *int    `json:"scale,omitempty"`
}

type ForeignKeyInfo struct {
	Columns           []string `json:"columns"`
	ReferencedTable   string   `json:"referencedTable"`
	ReferencedColumns []string `json:"referencedColumns"`
}

type ViewInfo struct {
	Name       string       `json:"name"`
	Schema     string       `json:"schema"`
	Columns    []ColumnInfo `json:"columns"`
	Definition *string      `json:"definition,omitempty"`
}

type StoredProcedureInfo struct {
	Name       string          `json:"name"`
	Schema     string          `json:"schema"`
	Parameters []ParameterInfo `json:"parameters"`
	ResultSets []ResultSetInfo `json:"resultSets"`
	Definition *string         `json:"definition,omitempty"`
	Cached     bool            `json:"cached"`
	LastCached string          `json:"lastCached"`
}

type ParameterInfo struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Mode         string  `json:"mode"`
	DefaultValue *string `json:"defaultValue,omitempty"`
	IsNullable   bool    `json:"isNullable"`
	MaxLength    *int    `json:"maxLength,omitempty"`
	Precision    *int    `json:"precision,omitempty"`
	Scale        *int    `json:"scale,omitempty"`
}

type ResultSetInfo struct {
	Columns []ResultSetColumnInfo `json:"columns"`
}

type ResultSetColumnInfo struct {
	Name      string `json:"name"`
	Type      string `json:"type"`
	Nullable  bool   `json:"nullable"`
	MaxLength *int   `json:"maxLength,omitempty"`
	Precision *int   `json:"precision,omitempty"`
	Scale     *int   `json:"scale,omitempty"`
}

type ProcedureCacheInfo struct {
	ParametersCached bool    `json:"parametersCached"`
	ResultSetsCached bool    `json:"resultSetsCached"`
	FailedToLoad     bool    `json:"failedToLoad"`
	FailureReason    *string `json:"failureReason,omitempty"`
	UpdatedAt        string  `json:"updatedAt"`
}

type CachedProcedureDetails struct {
	Definition       *string              `json:"definition,omitempty"`
	Parameters       []ProcedureParameter `json:"parameters"`
	ResultSets       []ProcedureResultSet `json:"resultSets"`
	ParametersCached bool                 `json:"parametersCached"`
	ResultSetsCached bool                 `json:"resultSetsCached"`
	FailedToLoad     bool                 `json:"failedToLoad"`
	FailureReason    *string              `json:"failureReason,omitempty"`
	UpdatedAt        string               `json:"updatedAt"`
}

// Connection management functions
func GetConnections() ([]Connection, error) {
	var connections []Connection
	err := DB.Order("updated_at desc").Find(&connections).Error
	if err != nil {
		log.Printf("Error reading connections: %v", err)
		return nil, err
	}
	return connections, nil
}

func GetConnection(id string) (Connection, error) {
	var connection Connection
	err := DB.First(&connection, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Connection{}, errors.New("connection not found")
		}
		log.Printf("Error reading connection: %v", err)
		return Connection{}, err
	}
	return connection, nil
}

func CreateConnection(data models.ConnectionPostModel) (Connection, error) {
	c := Connection{
		ID:              uuid.New().String(),
		Name:            data.Name,
		Type:            data.Type,
		Host:            data.Host,
		Port:            data.Port,
		Username:        data.Username,
		Password:        data.Password,
		Database:        data.Database,
		HiddenDatabases: "[]",
		ShowHidden:      false,
		CreatedAt:       time.Now().Format(time.RFC3339),
		UpdatedAt:       time.Now().Format(time.RFC3339),
	}
	err := DB.Create(&c).Error
	if err != nil {
		log.Printf("Error creating connection: %v", err)
		return Connection{}, err
	}
	return c, nil
}

func UpdateConnection(id string, updates models.ConnectionPostModel) (Connection, error) {
	var connection Connection
	err := DB.First(&connection, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return Connection{}, errors.New("connection not found")
		}
		log.Printf("Error finding connection: %v", err)
		return Connection{}, err
	}

	// Build a map of fields we want to update explicitly.
	// Using a map ensures zero values (empty strings, 0) are applied.
	updatesMap := map[string]any{
		"updated_at": time.Now().Format(time.RFC3339),
	}

	// Only update the fields allowed in the "post"/update model.
	updatesMap["name"] = updates.Name
	updatesMap["type"] = updates.Type
	updatesMap["host"] = updates.Host
	updatesMap["port"] = updates.Port
	updatesMap["username"] = updates.Username
	updatesMap["password"] = updates.Password
	updatesMap["database"] = updates.Database

	err = DB.Model(&connection).Updates(updatesMap).Error
	if err != nil {
		log.Printf("Error updating connection: %v", err)
		return Connection{}, err
	}
	return connection, nil
}

func UpdateConnectionSettings(id string, hiddenDatabases string, showHidden bool) error {
	return DB.Model(&Connection{}).Where("id = ?", id).Updates(map[string]interface{}{
		"hidden_databases": hiddenDatabases,
		"show_hidden":      showHidden,
		"updated_at":       time.Now().Format(time.RFC3339),
	}).Error
}

func DeleteConnection(id string) error {
	err := DB.Delete(&Connection{}, "id = ?", id).Error
	if err != nil {
		log.Printf("Error deleting connection: %v", err)
		return err
	}
	return nil
}

// Query history functions
func SaveQueryHistory(connectionId, query string, result interface{}, errorMsg *string) error {
	var resultStr *string
	if result != nil {
		jsonBytes, err := json.Marshal(result)
		if err != nil {
			log.Printf("Error marshaling result: %v", err)
		} else {
			str := string(jsonBytes)
			resultStr = &str
		}
	}
	qh := QueryHistory{
		ID:           uuid.New().String(),
		ConnectionID: connectionId,
		Query:        query,
		Result:       resultStr,
		Error:        errorMsg,
		ExecutedAt:   time.Now().Format(time.RFC3339),
	}
	err := DB.Create(&qh).Error
	if err != nil {
		log.Printf("Error saving query history: %v", err)
		return err
	}
	// Keep only last 100 queries per connection
	var count int64
	DB.Model(&QueryHistory{}).Where("connection_id = ?", connectionId).Count(&count)
	if count > 100 {
		var oldQueries []QueryHistory
		DB.Where("connection_id = ?", connectionId).Order("executed_at asc").Limit(int(count - 100)).Find(&oldQueries)
		ids := make([]string, len(oldQueries))
		for i, q := range oldQueries {
			ids[i] = q.ID
		}
		DB.Where("id IN ?", ids).Delete(&QueryHistory{})
	}
	return nil
}

// Cache database list
func CacheDatabases(connectionId string, databases []string) error {
	// Remove existing
	err := DB.Where("connection_id = ?", connectionId).Delete(&CachedDatabase{}).Error
	if err != nil {
		log.Printf("Error deleting cached databases: %v", err)
		return err
	}
	// Add new
	for _, name := range databases {
		cd := CachedDatabase{
			ID:           uuid.New().String(),
			ConnectionID: connectionId,
			Name:         name,
			UpdatedAt:    time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&cd).Error
		if err != nil {
			log.Printf("Error creating cached database: %v", err)
			return err
		}
	}
	return nil
}

// Get cached databases
func GetCachedDatabases(connectionId string) (*DatabasesResponse, error) {
	var cached []CachedDatabase
	err := DB.Where("connection_id = ?", connectionId).Order("name asc").Find(&cached).Error
	if err != nil {
		log.Printf("Error reading cached databases: %v", err)
		return nil, err
	}
	if len(cached) == 0 {
		return nil, nil
	}
	// Find most recent
	var mostRecent string = ""
	names := make([]string, len(cached))
	for i, db := range cached {
		names[i] = db.Name
		if db.UpdatedAt > mostRecent {
			mostRecent = db.UpdatedAt
		}
	}
	return &DatabasesResponse{
		Databases: names,
		UpdatedAt: mostRecent,
	}, nil
}

// Cache schema
func CacheSchema(connectionId, database string, schema SchemaInfo) error {
	// Upsert schema
	var cachedSchema CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).First(&cachedSchema).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		log.Printf("Error finding cached schema: %v", err)
		return err
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		cachedSchema = CachedSchema{
			ID:           uuid.New().String(),
			ConnectionID: connectionId,
			Database:     database,
			UpdatedAt:    time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&cachedSchema).Error
		if err != nil {
			log.Printf("Error creating cached schema: %v", err)
			return err
		}
	} else {
		cachedSchema.UpdatedAt = time.Now().Format(time.RFC3339)
		DB.Save(&cachedSchema)
	}
	// Clear existing
	DB.Where("schema_id = ?", cachedSchema.ID).Delete(&CachedTable{})
	DB.Where("schema_id = ?", cachedSchema.ID).Delete(&CachedView{})
	DB.Where("schema_id = ?", cachedSchema.ID).Delete(&CachedProcedure{})
	// Cache tables
	for _, table := range schema.Tables {
		ct := CachedTable{
			ID:        uuid.New().String(),
			SchemaID:  cachedSchema.ID,
			Name:      table.Name,
			Schema:    table.Schema,
			UpdatedAt: time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&ct).Error
		if err != nil {
			log.Printf("Error creating cached table: %v", err)
			return err
		}
		// Columns
		for i, col := range table.Columns {
			ctc := CachedTableColumn{
				ID:              uuid.New().String(),
				TableID:         ct.ID,
				Name:            col.Name,
				DataType:        col.Type,
				IsNullable:      col.Nullable,
				DefaultValue:    col.DefaultValue,
				IsPrimary:       col.Primary,
				IsUnique:        col.Unique,
				IsForeign:       col.Foreign,
				Comment:         col.Comment,
				MaxLength:       col.MaxLength,
				Precision:       col.Precision,
				Scale:           col.Scale,
				OrdinalPosition: i + 1,
			}
			DB.Create(&ctc)
		}
		// Primary keys
		for i, pk := range table.PrimaryKey {
			ctpk := CachedTablePrimaryKey{
				ID:              uuid.New().String(),
				TableID:         ct.ID,
				ColumnName:      pk,
				OrdinalPosition: i + 1,
			}
			DB.Create(&ctpk)
		}
		// Foreign keys
		for _, fk := range table.ForeignKeys {
			for i, col := range fk.Columns {
				refCol := fk.ReferencedColumns[i]
				ctfk := CachedTableForeignKey{
					ID:               uuid.New().String(),
					TableID:          ct.ID,
					ColumnName:       col,
					ReferencedTable:  fk.ReferencedTable,
					ReferencedColumn: refCol,
					OrdinalPosition:  i + 1,
				}
				DB.Create(&ctfk)
			}
		}
	}
	// Cache views
	for _, view := range schema.Views {
		cv := CachedView{
			ID:         uuid.New().String(),
			SchemaID:   cachedSchema.ID,
			Name:       view.Name,
			Schema:     view.Schema,
			Definition: view.Definition,
			UpdatedAt:  time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&cv).Error
		if err != nil {
			log.Printf("Error creating cached view: %v", err)
			return err
		}
		for i, col := range view.Columns {
			cvc := CachedViewColumn{
				ID:              uuid.New().String(),
				ViewID:          cv.ID,
				Name:            col.Name,
				DataType:        col.Type,
				IsNullable:      col.Nullable,
				DefaultValue:    col.DefaultValue,
				MaxLength:       col.MaxLength,
				Precision:       col.Precision,
				Scale:           col.Scale,
				OrdinalPosition: i + 1,
			}
			DB.Create(&cvc)
		}
	}
	// Cache procedures
	for _, proc := range schema.StoredProcedures {
		cp := CachedProcedure{
			ID:               uuid.New().String(),
			SchemaID:         cachedSchema.ID,
			Schema:           proc.Schema,
			ProcedureName:    proc.Name,
			ParametersCached: false,
			ResultSetsCached: false,
			CreatedAt:        time.Now().Format(time.RFC3339),
			UpdatedAt:        time.Now().Format(time.RFC3339),
		}
		DB.Create(&cp)
	}
	return nil
}

// Get cached schema
func GetCachedSchema(connectionId, database string) (*SchemaResponse, error) {
	var cachedSchemas []CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).
		Preload("Tables.Columns").
		Preload("Tables.PrimaryKeys").
		Preload("Tables.ForeignKeys").
		Preload("Views.Columns").
		Preload("Procedures.Parameters").
		Preload("Procedures.ResultSets.Columns").
		Limit(1).
		Find(&cachedSchemas).Error
	if err != nil {
		log.Printf("Error reading cached schema: %v", err)
		return nil, err
	}
	if len(cachedSchemas) == 0 {
		return nil, nil
	}
	cachedSchema := cachedSchemas[0]
	// Build tables
	tables := make([]TableResponse, len(cachedSchema.Tables))
	for i, table := range cachedSchema.Tables {
		columns := make([]ColumnResponse, len(table.Columns))
		for j, col := range table.Columns {
			columns[j] = ColumnResponse{
				Name:         col.Name,
				Type:         col.DataType,
				Nullable:     col.IsNullable,
				DefaultValue: col.DefaultValue,
				Primary:      col.IsPrimary,
				Unique:       col.IsUnique,
				Foreign:      col.IsForeign,
				Comment:      col.Comment,
			}
		}
		pks := make([]string, len(table.PrimaryKeys))
		for j, pk := range table.PrimaryKeys {
			pks[j] = pk.ColumnName
		}
		fks := make([]ForeignKeyResponse, 0)
		// Group foreign keys
		fkMap := make(map[string]*ForeignKeyInfo)
		for _, fk := range table.ForeignKeys {
			key := fk.ReferencedTable
			if _, ok := fkMap[key]; !ok {
				fkMap[key] = &ForeignKeyInfo{
					Columns:           []string{},
					ReferencedTable:   fk.ReferencedTable,
					ReferencedColumns: []string{},
				}
			}
			fkMap[key].Columns = append(fkMap[key].Columns, fk.ColumnName)
			fkMap[key].ReferencedColumns = append(fkMap[key].ReferencedColumns, fk.ReferencedColumn)
		}
		for _, fk := range fkMap {
			fks = append(fks, ForeignKeyResponse{
				Columns:           fk.Columns,
				ReferencedTable:   fk.ReferencedTable,
				ReferencedColumns: fk.ReferencedColumns,
			})
		}
		tables[i] = TableResponse{
			Name:        table.Name,
			Schema:      table.Schema,
			Columns:     columns,
			PrimaryKey:  pks,
			ForeignKeys: fks,
		}
	}
	// Build views
	views := make([]ViewResponse, len(cachedSchema.Views))
	for i, view := range cachedSchema.Views {
		columns := make([]ColumnResponse, len(view.Columns))
		for j, col := range view.Columns {
			columns[j] = ColumnResponse{
				Name:         col.Name,
				Type:         col.DataType,
				Nullable:     col.IsNullable,
				DefaultValue: col.DefaultValue,
			}
		}
		views[i] = ViewResponse{
			Name:       view.Name,
			Schema:     view.Schema,
			Columns:    columns,
			Definition: view.Definition,
		}
	}
	// Build procedures
	procs := make([]ProcedureResponse, len(cachedSchema.Procedures))
	for i, proc := range cachedSchema.Procedures {
		params := make([]ProcedureParameterResponse, len(proc.Parameters))
		for j, param := range proc.Parameters {
			params[j] = ProcedureParameterResponse{
				Name:         param.Name,
				Type:         param.DataType,
				Mode:         param.Direction,
				DefaultValue: param.DefaultValue,
				IsNullable:   param.IsNullable,
				MaxLength:    param.MaxLength,
				Precision:    param.Precision,
				Scale:        param.Scale,
			}
		}
		resultSets := make([]ResultSetResponse, len(proc.ResultSets))
		for j, rs := range proc.ResultSets {
			cols := make([]ResultSetColumnResponse, len(rs.Columns))
			for k, col := range rs.Columns {
				cols[k] = ResultSetColumnResponse{
					Name:      col.Name,
					Type:      col.DataType,
					Nullable:  col.IsNullable,
					MaxLength: col.MaxLength,
					Precision: col.Precision,
					Scale:     col.Scale,
				}
			}
			resultSets[j] = ResultSetResponse{
				Columns: cols,
			}
		}
		procs[i] = ProcedureResponse{
			Name:       proc.ProcedureName,
			Schema:     proc.Schema,
			Parameters: params,
			ResultSets: resultSets,
			Definition: proc.Definition,
			Cached:     proc.ParametersCached,
			LastCached: proc.UpdatedAt,
		}
	}
	return &SchemaResponse{
		Tables:           tables,
		Views:            views,
		StoredProcedures: procs,
		UpdatedAt:        cachedSchema.UpdatedAt,
	}, nil
}

// Store procedure definition
func StoreProcedureDefinition(connectionId, database, schema, procedureName string, definition *string, parameters []ProcedureParameterData, resultSets []ResultSetData) (string, error) {
	fileName := database + "." + schema + "." + procedureName + ".sql"
	var cachedSchemas []CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).Limit(1).Find(&cachedSchemas).Error
	if err != nil {
		log.Printf("Error finding cached schema: %v", err)
		return "", err
	}
	if len(cachedSchemas) == 0 {
		log.Printf("No cached schema found")
		return "", errors.New("no cached schema found")
	}
	cachedSchema := cachedSchemas[0]

	var procs []CachedProcedure
	err = DB.Where("schema_id = ? AND schema = ? AND procedure_name = ?", cachedSchema.ID, schema, procedureName).Limit(1).Find(&procs).Error
	if err != nil {
		log.Printf("Error finding cached procedure: %v", err)
		return "", err
	}

	var cachedProc CachedProcedure
	if len(procs) == 0 {
		cachedProc = CachedProcedure{
			ID:               uuid.New().String(),
			SchemaID:         cachedSchema.ID,
			Schema:           schema,
			ProcedureName:    procedureName,
			Definition:       definition,
			ParametersCached: parameters != nil,
			ResultSetsCached: resultSets != nil,
			CreatedAt:        time.Now().Format(time.RFC3339),
			UpdatedAt:        time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&cachedProc).Error
		if err != nil {
			log.Printf("Error creating cached procedure: %v", err)
			return "", err
		}
	} else {
		cachedProc = procs[0]
		cachedProc.Definition = definition
		if parameters != nil {
			cachedProc.ParametersCached = true
		}
		if resultSets != nil {
			cachedProc.ResultSetsCached = true
		}
		cachedProc.UpdatedAt = time.Now().Format(time.RFC3339)
		DB.Save(&cachedProc)
	}
	// Store parameters
	if parameters != nil {
		DB.Where("procedure_id = ?", cachedProc.ID).Delete(&ProcedureParameter{})
		for i, param := range parameters {
			pp := ProcedureParameter{
				ID:              uuid.New().String(),
				ProcedureID:     cachedProc.ID,
				Name:            param.Name,
				DataType:        param.Type,
				Direction:       param.Direction,
				DefaultValue:    param.DefaultValue,
				IsNullable:      param.IsNullable,
				MaxLength:       param.MaxLength,
				Precision:       param.Precision,
				Scale:           param.Scale,
				OrdinalPosition: i + 1,
			}
			DB.Create(&pp)
		}
	}
	// Store result sets
	if resultSets != nil {
		DB.Where("procedure_id = ?", cachedProc.ID).Delete(&ProcedureResultSet{})
		for i, rs := range resultSets {
			prs := ProcedureResultSet{
				ID:             uuid.New().String(),
				ProcedureID:    cachedProc.ID,
				ResultSetIndex: i,
			}
			err = DB.Create(&prs).Error
			if err != nil {
				log.Printf("Error creating result set: %v", err)
				continue
			}
			for j, col := range rs.Columns {
				rsc := ResultSetColumn{
					ID:              uuid.New().String(),
					ResultSetID:     prs.ID,
					Name:            col.Name,
					DataType:        col.Type,
					IsNullable:      col.Nullable,
					MaxLength:       col.MaxLength,
					Precision:       col.Precision,
					Scale:           col.Scale,
					OrdinalPosition: j + 1,
				}
				DB.Create(&rsc)
			}
		}
	}
	return fileName, nil
}

// Get all cached procedures
func GetAllCachedProcedures(connectionId, database string) (map[string]ProcedureCacheInfo, error) {
	var cachedSchemas []CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).Limit(1).Find(&cachedSchemas).Error
	if err != nil {
		log.Printf("Error finding cached schema: %v", err)
		return nil, err
	}
	if len(cachedSchemas) == 0 {
		return make(map[string]ProcedureCacheInfo), nil
	}
	cachedSchema := cachedSchemas[0]
	var procs []CachedProcedure
	err = DB.Where("schema_id = ?", cachedSchema.ID).Find(&procs).Error
	if err != nil {
		log.Printf("Error reading cached procedures: %v", err)
		return nil, err
	}
	result := make(map[string]ProcedureCacheInfo)
	for _, proc := range procs {
		key := proc.Schema + "." + proc.ProcedureName
		result[key] = ProcedureCacheInfo{
			ParametersCached: proc.ParametersCached,
			ResultSetsCached: proc.ResultSetsCached,
			FailedToLoad:     proc.FailedToLoad,
			FailureReason:    proc.FailureReason,
			UpdatedAt:        proc.UpdatedAt,
		}
	}
	return result, nil
}

// Get cached procedure
func GetCachedProcedure(connectionId, database, schema, procedureName string) (*CachedProcedureDetails, error) {
	var cachedSchemas []CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).Limit(1).Find(&cachedSchemas).Error
	if err != nil {
		log.Printf("Error finding cached schema: %v", err)
		return nil, err
	}
	if len(cachedSchemas) == 0 {
		return nil, nil
	}
	cachedSchema := cachedSchemas[0]

	var procs []CachedProcedure
	err = DB.Where("schema_id = ? AND schema = ? AND procedure_name = ?", cachedSchema.ID, schema, procedureName).
		Preload("Parameters").
		Preload("ResultSets.Columns").
		Limit(1).
		Find(&procs).Error
	if err != nil {
		log.Printf("Error reading cached procedure: %v", err)
		return nil, err
	}
	if len(procs) == 0 {
		return nil, nil
	}
	proc := procs[0]
	return &CachedProcedureDetails{
		Definition:       proc.Definition,
		Parameters:       proc.Parameters,
		ResultSets:       proc.ResultSets,
		ParametersCached: proc.ParametersCached,
		ResultSetsCached: proc.ResultSetsCached,
		FailedToLoad:     proc.FailedToLoad,
		FailureReason:    proc.FailureReason,
		UpdatedAt:        proc.UpdatedAt,
	}, nil
}

// Mark procedure as failed
func MarkProcedureAsFailed(connectionId, database, schema, procedureName, errorMessage string) error {
	var cachedSchemas []CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).Limit(1).Find(&cachedSchemas).Error
	if err != nil {
		log.Printf("Error finding cached schema: %v", err)
		return err
	}
	if len(cachedSchemas) == 0 {
		return errors.New("no cached schema found")
	}
	cachedSchema := cachedSchemas[0]

	var procs []CachedProcedure
	err = DB.Where("schema_id = ? AND schema = ? AND procedure_name = ?", cachedSchema.ID, schema, procedureName).Limit(1).Find(&procs).Error
	if err != nil {
		log.Printf("Error finding cached procedure: %v", err)
		return err
	}

	if len(procs) == 0 {
		proc := CachedProcedure{
			ID:            uuid.New().String(),
			SchemaID:      cachedSchema.ID,
			Schema:        schema,
			ProcedureName: procedureName,
			FailedToLoad:  true,
			FailureReason: &errorMessage,
			CreatedAt:     time.Now().Format(time.RFC3339),
			UpdatedAt:     time.Now().Format(time.RFC3339),
		}
		err = DB.Create(&proc).Error
	} else {
		proc := procs[0]
		proc.FailedToLoad = true
		proc.FailureReason = &errorMessage
		proc.UpdatedAt = time.Now().Format(time.RFC3339)
		err = DB.Save(&proc).Error
	}
	if err != nil {
		log.Printf("Error marking procedure as failed: %v", err)
		return err
	}
	return nil
}

// Clear procedure failed state
func ClearProcedureFailedState(connectionId, database, schema, procedureName string) error {
	var cachedSchema CachedSchema
	err := DB.Where("connection_id = ? AND database = ?", connectionId, database).First(&cachedSchema).Error
	if err != nil {
		return err
	}
	err = DB.Model(&CachedProcedure{}).Where("schema_id = ? AND schema = ? AND procedure_name = ?", cachedSchema.ID, schema, procedureName).Updates(map[string]interface{}{
		"failed_to_load": false,
		"failure_reason": nil,
	}).Error
	if err != nil {
		log.Printf("Error clearing procedure failed state: %v", err)
		return err
	}
	return nil
}

// Update procedure in schema
func UpdateProcedureInSchema(connectionId, database, schema, procedureName string, procedureDetails ProcedureDetailsData) error {
	_, err := StoreProcedureDefinition(connectionId, database, schema, procedureName, procedureDetails.Definition, procedureDetails.Parameters, procedureDetails.ResultSets)
	return err
}

// Close connection
func ClosePrismaConnection() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// SaveTab saves a tab to the database
func SaveTab(tabID, tabType, title, connectionID, database, objectName, data string) error {
	now := time.Now().Format(time.RFC3339)
	tab := Tab{
		ID:           tabID,
		Type:         tabType,
		Title:        title,
		ConnectionID: connectionID,
		Database:     database,
		ObjectName:   objectName,
		Data:         data,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	err := DB.Save(&tab).Error
	if err != nil {
		log.Printf("Error saving tab: %v", err)
		return err
	}
	return nil
}

// LoadTabs loads all tabs from the database
func LoadTabs() ([]Tab, error) {
	var tabs []Tab
	err := DB.Find(&tabs).Error
	if err != nil {
		log.Printf("Error loading tabs: %v", err)
		return nil, err
	}
	return tabs, nil
}

// DeleteTab deletes a tab from the database
func DeleteTab(tabID string) error {
	err := DB.Delete(&Tab{}, "id = ?", tabID).Error
	if err != nil {
		log.Printf("Error deleting tab: %v", err)
		return err
	}
	return nil
}

// ClearAllTabs deletes all tabs from the database
func ClearAllTabs() error {
	err := DB.Exec("DELETE FROM tabs").Error
	if err != nil {
		log.Printf("Error clearing all tabs: %v", err)
		return err
	}
	return nil
}
