export interface IResult<T, E> {
  isOk: boolean
  isErr: boolean
  isOkAnd(fn: (val: T) => boolean): boolean
  isErrAnd(fn: (err: E) => boolean): boolean
  unwrap(): T
  expect(msg?: string): T
  unwrapOr(def: T): T
  map<const To>(fn: (val: T) => To): Result<To, E>
  mapErr<const Eo>(fn: (err: E) => Eo): Result<T, Eo>
  bind<const To, const Eo>(fn: (val: T) => Result<To, Eo>): Result<To, E | Eo>
  bindErr<const To, const Eo>(fn: (err: E) => Result<To, Eo>): Result<T | To, Eo>
  match<const To, const Eo>(onOk: (val: T) => To, onErr: (err: E) => Eo): To | Eo
  union(): T | E
  tap(fn: (val: T) => void): Result<T, E>
  tapErr(fn: (err: E) => void): Result<T, E>
}

export class ResultOk<T> implements IResult<T, never> {
  constructor(public readonly val: T) {}

  readonly isOk = true
  readonly isErr = false

  isOkAnd(fn: (val: T) => boolean) {
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

  match<const To, const Eo>(onOk: (val: T) => To, _: (err: never) => Eo): To | Eo {
    return onOk(this.val)
  }
  union(): T {
    return this.val
  }

  map<const To>(fn: (val: T) => To) {
    return Result.ok(fn(this.val))
  }
  mapErr() {
    return this
  }

  bind<const To, const Eo>(fn: (val: T) => Result<To, Eo>) {
    return fn(this.val)
  }
  bindErr() {
    return this
  }

  tap(fn: (val: T) => void) {
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

  match<const To, const Eo>(_: (val: never) => To, onErr: (err: E) => Eo): To | Eo {
    return onErr(this.err)
  }
  union(): E {
    return this.err
  }

  map() {
    return this
  }
  mapErr<const Eo>(fn: (err: E) => Eo) {
    return Result.err(fn(this.err))
  }

  bind() {
    return this
  }
  bindErr<const To, const Eo>(fn: (err: E) => Result<To, Eo>) {
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

export const Ok = <const T>(val: T): Result<T, never> => new ResultOk(val)
export const Err = <const E>(err: E): Result<never, E> => new ResultErr(err)

export type Result<T, E> = ResultOk<T> | ResultErr<E>

export type InferVal<R extends Result<any, any>> = R extends ResultOk<infer T> ? T : never
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

  export const wrap = <T, E>(fn: () => T): Result<T, E> => {
    try {
      return Result.ok(fn())
    }
    catch (err) {
      return Result.err(err as E)
    }
  }

  export const fold = <T, E, To>(
    list: T[],
    init: To,
    folder: (acc: To, curr: T, index: number) => Result<To, E>
  ): Result<To, E> => list.reduce<Result<To, E>>(
    (accResult, curr, index) => accResult.bind(acc => folder(acc, curr, index)),
    Result.ok(init),
  )
}
