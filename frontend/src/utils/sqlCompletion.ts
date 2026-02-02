import * as monaco from 'monaco-editor';
import { useConnectionsStore } from '@/stores/connectionsStore';

interface EditorMetadata {
  connectionId: string;
  database: string;
}

const modelMetadata = new Map<string, EditorMetadata>();
let providerInitialized = false;

export function registerEditorMetadata(model: monaco.editor.ITextModel, connectionId: string, database: string) {
  modelMetadata.set(model.uri.toString(), { connectionId, database });
  initSqlCompletion();
}

export function unregisterEditorMetadata(model: monaco.editor.ITextModel) {
  modelMetadata.delete(model.uri.toString());
}

export function initSqlCompletion() {
  if (providerInitialized) return;
  providerInitialized = true;

  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' ', '"', '['],
    provideCompletionItems: (model, position) => {
      const metadata = modelMetadata.get(model.uri.toString());
      if (!metadata) return { suggestions: [] };

      const { connectionId, database } = metadata;
      const store = useConnectionsStore();

      const connection = store.connections.find((c) => c.id === connectionId);
      const dbInfo = connection?.databases.find((d) => d.name === database);

      if (!dbInfo || !dbInfo.loaded) {
        return { suggestions: [] };
      }

      const wordUntil = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        wordUntil.startColumn,
        position.lineNumber,
        wordUntil.endColumn
      );

      // Check if we are completing after a dot
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // Match database.schema. , schema.table. or table.
      const doubleMatch = textBeforeCursor.match(
        /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\.$/
      );
      const singleMatch = textBeforeCursor.match(/([a-zA-Z0-9_]+)\.$/);

      const suggestions: monaco.languages.CompletionItem[] = [];

      if (doubleMatch) {
        const first = doubleMatch[1];
        const second = doubleMatch[2];

        // Case Database.Schema. (e.g., Oasis.dbo.)
        if (first.toLowerCase() === database.toLowerCase()) {
          const schemaName = second;
          if (
            dbInfo.tablesBySchema[schemaName] ||
            dbInfo.viewsBySchema[schemaName]
          ) {
            dbInfo.tablesBySchema[schemaName]?.forEach((table) => {
              suggestions.push({
                label: table.name,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: table.name,
                detail: `Table (${schemaName})`,
                range: range,
              });
            });
            dbInfo.viewsBySchema[schemaName]?.forEach((view) => {
              suggestions.push({
                label: view.name,
                kind: monaco.languages.CompletionItemKind.Interface,
                insertText: view.name,
                detail: `View (${schemaName})`,
                range: range,
              });
            });
            return { suggestions };
          }
        }

        // Case Schema.Table. (e.g., dbo.Users.)
        const table =
          dbInfo.tablesBySchema[first]?.find(
            (t) => t.name.toLowerCase() === second.toLowerCase()
          ) ||
          dbInfo.viewsBySchema[first]?.find(
            (v) => v.name.toLowerCase() === second.toLowerCase()
          );

        if (table) {
          table.columns.forEach((col) => {
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: `Column (${table.name})`,
              range: range,
            });
          });
          return { suggestions };
        }
      } else if (singleMatch) {
        const name = singleMatch[1];

        // Case Database Name (e.g., Oasis.)
        if (name.toLowerCase() === database.toLowerCase()) {
          Object.keys(dbInfo.tablesBySchema).forEach((schemaName) => {
            if (schemaName && schemaName !== "null") {
              suggestions.push({
                label: schemaName,
                kind: monaco.languages.CompletionItemKind.Module,
                insertText: schemaName,
                detail: "Schema",
                range: range,
              });
            }
          });
          return { suggestions };
        }

        // Could be a schema name
        if (dbInfo.tablesBySchema[name] || dbInfo.viewsBySchema[name]) {
          dbInfo.tablesBySchema[name]?.forEach((table) => {
            suggestions.push({
              label: table.name,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: `Table (${name})`,
              range: range,
            });
          });
          dbInfo.viewsBySchema[name]?.forEach((view) => {
            suggestions.push({
              label: view.name,
              kind: monaco.languages.CompletionItemKind.Interface,
              insertText: view.name,
              detail: `View (${name})`,
              range: range,
            });
          });
          return { suggestions };
        }

        // Or a table name in any schema
        const table =
          Object.values(dbInfo.tablesBySchema)
            .flat()
            .find((t) => t.name.toLowerCase() === name.toLowerCase()) ||
          Object.values(dbInfo.viewsBySchema)
            .flat()
            .find((v) => v.name.toLowerCase() === name.toLowerCase());

        if (table) {
          table.columns.forEach((col) => {
            suggestions.push({
              label: col.name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: col.name,
              detail: `Column (${table.name})`,
              range: range,
            });
          });
          return { suggestions };
        }
      }

      // Default suggestions (when no dot or dot didn't match anything)
      // Add Schemas
      Object.keys(dbInfo.tablesBySchema).forEach((schemaName) => {
        if (schemaName && schemaName !== "null") {
          suggestions.push({
            label: schemaName,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: schemaName,
            detail: "Schema",
            range: range,
          });
        }
      });

      // Add tables
      Object.values(dbInfo.tablesBySchema)
        .flat()
        .forEach((table) => {
          suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: `Table (${table.schema})`,
            range: range,
          });
        });

      // Add views
      Object.values(dbInfo.viewsBySchema)
        .flat()
        .forEach((view) => {
          suggestions.push({
            label: view.name,
            kind: monaco.languages.CompletionItemKind.Interface,
            insertText: view.name,
            detail: `View (${view.schema})`,
            range: range,
          });
        });

      // Add all columns from all tables (optionally, but might be too many)
      // For now, let's keep it clean and only show tables/views/schemas by default
      // and columns when after a table.

      return { suggestions };
    },
  });
}
