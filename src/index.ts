export interface IResult<T, E> {
  isOk: boolean
  isErr: boolean
  isOkAnd(fn: (val: T) => boolean): boolean
  isErrAnd(fn: (err: E) => boolean): boolean
  unwrap(): T
  expect(msg?: string): T
  unwrapOr(def: T): T
  map<const Vn>(fn: (val: T) => Vn): IResult<Vn, E>
  mapErr<const En>(fn: (err: E) => En): IResult<T, En>
  bind<const Vn, const En>(fn: (val: T) => IResult<Vn, En>): IResult<Vn, E | En>
  bindErr<const Vn, const En>(fn: (err: E) => IResult<Vn, En>): IResult<T | Vn, En>
  match<const Vm, const Em>(onOk: (val: T) => Vm, onErr: (err: E) => Em): Vm | Em
  tap(fn: (val: T) => void): IResult<T, E>
  tapErr(fn: (err: E) => void): IResult<T, E>
}

export class ResultOk<V> implements IResult<V, never> {
  constructor(public readonly val: V) {}

  readonly isOk = true
  readonly isErr = false

  isOkAnd(fn: (val: V) => boolean) {
    return fn(this.val)
  }
  isErrAnd() {
    return false
  }

  unwrap() {
    return this.val
  }
  expect() {
    return this.val
  }
  unwrapOr() {
    return this.val
  }

  match<const Vm, const Em>(onOk: (val: V) => Vm, _: (err: never) => Em): Vm | Em {
    return onOk(this.val)
  }

  map<const Vn>(fn: (val: V) => Vn) {
    return Result.ok(fn(this.val))
  }
  mapErr() {
    return this
  }

  bind<const Vn, const En>(fn: (val: V) => Result<Vn, En>) {
    return fn(this.val)
  }
  bindErr() {
    return this
  }

  tap(fn: (val: V) => void) {
    fn(this.val)
    return this
  }
  tapErr() {
    return this
  }
}

export class ResultErr<E> implements IResult<never, E> {
  constructor(public readonly err: E) {}

  readonly isOk = false
  readonly isErr = true

  isOkAnd() {
    return false
  }
  isErrAnd(fn: (err: E) => boolean) {
    return fn(this.err)
  }

  unwrap(): never {
    throw this.err
  }
  expect(msg?: string): never {
    throw new Error(msg)
  }
  unwrapOr<const T>(def: T) {
    return def
  }

  match<const Vm, const Em>(_: (val: never) => Vm, onErr: (err: E) => Em): Vm | Em {
    return onErr(this.err)
  }

  map() {
    return this
  }
  mapErr<const En>(fn: (err: E) => En) {
    return Result.err(fn(this.err))
  }

  bind() {
    return this
  }
  bindErr<const Vn, const En>(fn: (err: E) => Result<Vn, En>) {
    return fn(this.err)
  }

  tap() {
    return this
  }
  tapErr(fn: (err: E) => void) {
    fn(this.err)
    return this
  }
}

export const Ok = <const V>(val: V): Result<V, never> => new ResultOk(val)
export const Err = <const E>(err: E): Result<never, E> => new ResultErr(err)

export type Result<V, E> = ResultOk<V> | ResultErr<E>

export type InferVal<R extends Result<any, any>> = R extends ResultOk<infer V> ? V : never
export type InferErr<R extends Result<any, any>> = R extends ResultErr<infer E> ? E : never

export namespace Result {
  export const ok = Ok
  export const err = Err

  export type All<Rs extends Result<any, any>[]> = Result<
    { [I in keyof Rs]: InferVal<Rs[I]> },
    InferErr<Rs[number]>
  >
  export const all = <const Rs extends Result<any, any>[]>(results: Rs): All<Rs> => {
    const vals = [] as { [I in keyof Rs]: InferVal<Rs[I]> }
    for (const result of results) {
      if (result.isErr) return result
      vals.push(result.val)
    }
    return Result.ok(vals)
  }

  export type Any<Rs extends Result<any, any>[]> = Result<
    InferVal<Rs[number]>,
    { [I in keyof Rs]: InferErr<Rs[I]> }
  >
  export const any = <const Rs extends Result<any, any>[]>(results: Rs): Any<Rs> => {
    const errs = [] as { [I in keyof Rs]: InferErr<Rs[I]> }
    for (const result of results) {
      if (result.isOk) return result
      errs.push(result.err)
    }
    return Result.err(errs)
  }

  export const wrap = <V, E>(fn: () => V): Result<V, E> => {
    try {
      return Result.ok(fn())
    }
    catch (err) {
      return Result.err(err as E)
    }
  }
}
