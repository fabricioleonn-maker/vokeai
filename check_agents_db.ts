
import { prisma } from './lib/db';

async function listAgents() {
    try {
        const agents = await prisma.agentNode.findMany();
        console.log('Agents found:', agents.length);
        agents.forEach(a => console.log(`- ${a.slug}: ${a.name} (Status: ${a.status})`));
    } catch (e) {
        console.error('Error listing agents:', e);
    } finally {
        await prisma.$disconnect();
    }
}

listAgents();
