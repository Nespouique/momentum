export class DailyReadCoordinator<T> {
  private generation = 0;
  private requestKey: string | null = null;
  private readonly snapshots = new Map<string, T>();

  async read(key: string, fetchData: () => Promise<T>): Promise<T | null> {
    const generation = ++this.generation;
    this.requestKey = key;
    const result = await fetchData();
    if (this.requestKey !== key || this.generation !== generation) return null;
    this.snapshots.set(key, result);
    return result;
  }

  isCurrent(key: string): boolean {
    return this.requestKey === key;
  }

  snapshot(key: string): T | undefined {
    return this.snapshots.get(key);
  }

  invalidate(): void {
    this.generation += 1;
    this.requestKey = null;
    this.snapshots.clear();
  }
}
