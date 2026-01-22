package models

// ConnectionPostModel represents the payload used when creating or updating
// a connection from the frontend. It contains only the fields allowed to be
// set by the client.
type ConnectionPostModel struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username,omitempty"`
	Password string `json:"password,omitempty"`
	Database string `json:"database,omitempty"`
}
