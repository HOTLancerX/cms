export const hello = () => (
  <div className="bg-blue-600 text-white p-4">
    <h1 className="text-2xl font-bold">HeLLo</h1>
  </div>
);

export const goodbye = () => (
  <div className="bg-red-600 text-white p-4">
    <h1 className="text-2xl font-bold">Goodbye!</h1>
  </div>
);

export const actions = [
  { hookName: 'Blog-header', position: 0, componentName: 'hello' },
  { hookName: 'Nex-header', position: 1, componentName: 'hello' },
  { hookName: 'Nex-header', position: 0, componentName: 'goodbye' },
];