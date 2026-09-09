import { spawn } from 'child_process';
import net from 'net';

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', (err: any) => {
        // Se der erro EADDRINUSE, a porta está ocupada
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          // Outros erros assumimos como indisponível por segurança
          resolve(false);
        }
      })
      .once('listening', () => {
        server.close(() => resolve(true));
      })
      .listen({
        port,
        host: '127.0.0.1',
        exclusive: true
      });
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    console.log(`[DevOS] Micro-collision detected on ${port}. Jumping to next...`);
    port++;
    // Pequeno atraso para o SO liberar recursos se houver race condition
    await new Promise(r => setTimeout(r, 100));
  }
  return port;
}

async function startNext() {
  const port = 3005; // Port fix requested by user
  console.log(`[DevOS] Starting Next.js on FIXED port ${port}...`);

  // Injetar a URL correta para o NextAuth reconhecer a porta 3005
  const env = { 
    ...process.env, 
    NEXTAUTH_URL: `http://localhost:${port}` 
  };

  const next = spawn('npx', ['next', 'dev', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true,
    env
  });

  next.on('close', (code) => {
    process.exit(code || 0);
  });
}

startNext();
