declare module 'deep-keys' {
  declare function deepKeys(
    obj: Record<string, any>,
    intermediate?: boolean
  ): string[];
  export default deepKeys;
}
