import { reactive } from "vue";
import type { ConnectionForm, DatabaseType } from "~/types/connection";

export function useConnectionForm(initialValues?: Partial<ConnectionForm>) {
  const form = reactive<ConnectionForm>({
    name: "",
    type: "postgresql",
    host: "",
    port: "",
    username: "",
    password: "",
    database: "",
    ...initialValues,
  });

  function parseConnectionString(str: string): boolean {
    str = str.trim();
    // Try URL format first
    try {
      const url = new URL(str);
      const urlType = url.protocol.replace(":", "") as DatabaseType;
      if (!["postgresql", "mysql", "mssql"].includes(urlType)) {
        return false;
      }

      Object.assign(form, {
        type: urlType,
        host: url.hostname,
        port: url.port,
        database: url.pathname.replace("/", ""),
        username: url.username,
        password: decodeURIComponent(url.password),
      });
      return true;
    } catch {
      // Try key-value format
      const params = new Map();
      str.split(";").forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          const cleanKey = key
            .trim()
            .replace(/^["']|["']$/g, "")
            .toLowerCase();
          const cleanValue = value.trim().replace(/^["']|["']$/g, "");
          params.set(cleanKey, cleanValue);
        }
      });

      const serverKey = params.has("server")
        ? "server"
        : params.has("host")
        ? "host"
        : params.has("data source")
        ? "data source"
        : null;
      const userKey = params.has("user id")
        ? "user id"
        : params.has("uid")
        ? "uid"
        : params.has("username")
        ? "username"
        : null;
      const dbKey = params.has("database")
        ? "database"
        : params.has("initial catalog")
        ? "initial catalog"
        : null;

      if (!serverKey || !dbKey) {
        return false;
      }

      // Split host and port if port is specified with comma
      let host = params.get(serverKey);
      let port = params.get("port") || "";

      if (host && host.includes(",")) {
        const [hostPart, portPart] = host.split(",");
        host = hostPart;
        port = portPart || port;
      }

      Object.assign(form, {
        host,
        port,
        database: params.get(dbKey),
        username: userKey ? params.get(userKey) : "",
        password: params.get("password") || "",
      });
      return true;
    }
  }

  function reset() {
    Object.assign(form, {
      name: "",
      type: "postgresql",
      host: "",
      port: "",
      username: "",
      password: "",
      database: "",
    });
  }

  return {
    form,
    parseConnectionString,
    reset,
  };
}
