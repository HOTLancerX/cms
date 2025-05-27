import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { cache } from 'react';

interface PluginAction {
  hookName: string;
  position: number;
  componentName: string;
  fileId: string;
}

interface PluginComponent {
  name: string;
  component: string;
}

// Recursive function to collect all .tsx files from nested plugin folders
function getAllTsxFiles(dir: string): string[] {
  let results: string[] = [];

  const list = readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getAllTsxFiles(filePath));
    } else if (file.endsWith('.tsx')) {
      results.push(filePath);
    }
  });

  return results;
}

const getPlugins = cache(async () => {
  const pluginsDir = path.join(process.cwd(), 'plugins');
  const pluginFiles = getAllTsxFiles(pluginsDir); // Recursive .tsx search

  const plugins: PluginAction[] = [];
  const components: PluginComponent[] = [];

  for (const filePath of pluginFiles) {
    const fileContent = readFileSync(filePath, 'utf-8');
    const relativeFilePath = path.relative(pluginsDir, filePath);
    const fileId = relativeFilePath.replace(/\.tsx$/, ''); // Remove .tsx for ID

    // Extract components
    const componentExports = fileContent.match(/export const (\w+) = \(\) => \(([\s\S]*?)\);/g) || [];
    for (const exportStr of componentExports) {
      const match = exportStr.match(/export const (\w+) = \(\) => \(([\s\S]*?)\);/);
      if (match?.[1] && match?.[2]) {
        components.push({
          name: match[1],
          component: match[2]
        });
      }
    }

    // Extract actions array
    const actionExportMatch = fileContent.match(/export const actions = (\[[\s\S]*?\]);/);
    if (actionExportMatch?.[1]) {
      try {
        const rawActions: Omit<PluginAction, 'fileId'>[] = new Function(`return ${actionExportMatch[1]}`)();
        if (Array.isArray(rawActions)) {
          plugins.push(...rawActions.map(action => ({
            ...action,
            fileId
          })));
        }
      } catch (e) {
        console.error(`Error parsing actions in ${filePath}:`, e);
      }
    }
  }

  return { plugins, components };
});

export default async function Hooks({ name }: { name: string }) {
  const { plugins, components } = await getPlugins();
  const relevantPlugins = plugins.filter(plugin => plugin.hookName === name);

  relevantPlugins.sort((a, b) => a.position - b.position);

  return (
    <div>
      {relevantPlugins.map((plugin, index) => {
        const component = components.find(c => c.name === plugin.componentName);
        if (!component) {
          console.error(`Component ${plugin.componentName} not found`);
          return null;
        }

        return (
          <div
            key={`${plugin.fileId}-${plugin.hookName}-${index}-${plugin.componentName}`}
            dangerouslySetInnerHTML={{ __html: component.component }}
          />
        );
      })}
    </div>
  );
}