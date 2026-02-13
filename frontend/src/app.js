const { GetConnections, CreateConnection } = window.runtime;

async function loadConnections() {
    try {
        const connections = await GetConnections(false);
        const container = document.getElementById('connections');
        container.innerHTML = '<h2>Connections</h2>' + connections.map(conn => `
            <div class="connection">
                <h3>${conn.name} (${conn.type})</h3>
                <p>Host: ${conn.host || 'N/A'}</p>
                <p>Database: ${conn.database || 'N/A'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading connections:', error);
    }
}

document.getElementById('connectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const conn = {
        name: formData.get('name'),
        type: formData.get('type'),
        host: formData.get('host') || undefined,
        port: parseInt(formData.get('port')) || undefined,
        username: formData.get('username') || undefined,
        password: formData.get('password') || undefined,
        database: formData.get('database') || undefined,
    };
    try {
        await CreateConnection(conn);
        loadConnections();
        e.target.reset();
    } catch (error) {
        console.error('Error creating connection:', error);
    }
});

document.addEventListener('DOMContentLoaded', loadConnections);