/**
 * Module configuration for Synkra Platform
 * Defines navigation, branding, and routing for each system module.
 */

export interface ModuleConfig {
  name: string;
  icon: string;
  color: string;
  route: string;
  description: string;
}

export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  admin: {
    name: 'Admin Dashboard',
    icon: 'layout-dashboard',
    color: 'cyan',
    route: '/admin',
    description: 'Gerenciamento global do sistema e agendamentos'
  },
  devos: {
    name: 'DevOS',
    icon: 'brain',
    color: 'purple',
    route: '/devos',
    description: 'Sistema operacional de execução inteligente'
  }
};

export type ModuleKey = keyof typeof MODULE_CONFIGS;
