import { prisma } from '@/lib/db';

export const ProjectService = {
  /**
   * Sync projects progress based on their underlying sessions and tasks
   */
  async syncProgress(projectId: string) {
    const project = await prisma.devOsProject.findUnique({
      where: { id: projectId },
      include: {
        sessions: {
          include: {
            tasks: { select: { status: true } }
          }
        }
      }
    });

    if (!project) return;

    let totalTasks = 0;
    let completedTasks = 0;

    project.sessions.forEach(session => {
      session.tasks.forEach(task => {
        totalTasks++;
        if (task.status === 'COMPLETED') completedTasks++;
      });
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await prisma.devOsProject.update({
      where: { id: projectId },
      data: {
        progress,
        status: progress === 100 ? 'COMPLETED' : 'EXECUTING'
      }
    });

    return progress;
  }
};
