export class SeededPrng {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public nextUint32(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1) >>> 0;
    value ^= (value + Math.imul(value ^ (value >>> 7), value | 61)) >>> 0;
    return (value ^ (value >>> 14)) >>> 0;
  }

  public nextBoolean(): boolean {
    return (this.nextUint32() & 1) === 1;
  }

  public getState(): number {
    return this.state >>> 0;
  }
}
