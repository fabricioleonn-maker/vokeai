const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
const fs = require('fs');

async function check() {
    try {
        const agents = await client.agentNode.findMany();
        let output = '--- ALL AGENT DATA ---\n';

        agents.forEach(a => {
            output += `\n--------------------------------\n`;
            output += `SLUG: ${a.slug}\n`;

            const prompts = a.prompts || {};
            const config = typeof a.config === 'string' ? JSON.parse(a.config) : (a.config || {});
            const configPrompts = config.prompts || {};

            const finalPrompt = prompts.system_base || prompts.base || config.system_base || configPrompts.system_base || 'NOT FOUND';

            output += `FINAL PROMPT: ${finalPrompt}\n`;
        });
        fs.writeFileSync('prompt_results.txt', output);
        console.log('Results written to prompt_results.txt');
    } catch (e) {
        console.error('Error checking prompts:', e);
    } finally {
        await client.$disconnect();
    }
}

check();
