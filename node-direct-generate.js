const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Tentando gerar Prisma Client (Tentativa Script Puro)...');

// Caminho para o JS compilado do Prisma CLI (versão 5.22.0)
const prismaJs = path.join(process.cwd(), 'node_modules', 'prisma', 'build', 'index.js');

const child = spawn('node', [prismaJs, 'generate'], {
    env: { ...process.env },
    cwd: process.cwd()
});

child.stdout.on('data', (data) => console.log(`[OUT] ${data}`));
child.stderr.on('data', (data) => console.log(`[ERR] ${data}`));

child.on('close', (code) => {
    console.log(`🏁 Processo terminou com código: ${code}`);
});
