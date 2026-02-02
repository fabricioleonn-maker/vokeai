const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001, // Tentando porta 3001 onde o erro foi reportado
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`\n[${method} ${path}] Status: ${res.statusCode}`);
                console.log('Headers:', JSON.stringify(res.headers));
                console.log('Body:', data.substring(0, 1000));
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Problema com a requisição: ${e.message}`);
            // Tentar porta 3000 se 3001 falhar
            if (options.port === 3001) {
                console.log('Tentando porta 3000...');
                options.port = 3000;
                const req2 = http.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        console.log(`\n[${method} ${path}] Status: ${res.statusCode} (Porta 3000)`);
                        console.log('Body:', data.substring(0, 1000));
                        resolve();
                    });
                });
                req2.on('error', (e2) => console.error(`Falha porta 3000: ${e2.message}`));
                if (body) req2.write(JSON.stringify(body));
                req2.end();
            } else {
                resolve();
            }
        });

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    console.log('🔍 Iniciando Diagnóstico HTTP (Zero Dep)...');

    // Teste 1: Auditoria
    await makeRequest('/api/admin/audit?limit=1');

    // Teste 2: Chat
    await makeRequest('/api/chat/message', 'POST', {
        message: 'Ping Diagnostico',
        isTestMode: true
    });
}

run();
