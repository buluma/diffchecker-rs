export default async function init(): Promise<never> {
  throw new Error('The desktop application provides its comparison engine through Tauri.');
}

export function dispatch(): never {
  throw new Error('The desktop application provides its comparison engine through Tauri.');
}
