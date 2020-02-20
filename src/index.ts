import * as assert from 'assert-plus';
import { JsonPointer } from 'json-ptr';

export type Selector = (target: object) => string;
export type Matcher = (value: string) => boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (it: object, context?: any) => void | Promise<void>;

export function prepareSelector(sel: string): Selector {
  assert.string(sel, 'sel');
  // if it looks like a JSON Pointer, use the pointer as a selector...
  if (~['#', '/'].indexOf(sel[0])) {
    const ptr = new JsonPointer(sel);
    return (target: object): string => ptr.get(target);
  }
  // Otherwise use it as a property on the target...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: { [n: string]: any }): string => (target ? target[sel] : undefined);
}

export interface Case {
  handler: Handler;
}

export interface Match extends Case {
  match: Matcher | RegExp;
}

export interface Value extends Case {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

function prepareCases(selector: Selector, values: Value[], matches: Match[], defa?: Handler): Push {
  // This function captures selector, values, matches, and default, and creates a Function with an
  // emitted switch statement that [tries to] efficiently evaluate the cases registered with the
  // calling SwitchMap.
  let emit = '';
  if (values.length) {
    const len = values.length;
    let i = -1;
    emit += `
  switch(value) {`;
    while (++i < len) {
      if (Array.isArray(values[i].value)) {
        const len2 = values[i].value.length;
        let j = -1;
        while (++j < len2) {
          emit += `
    case values[${i}].value[${j}]:`;
        }
        emit += `
      return values[${i}].handler.apply(null, propagatedArgs);`;
        continue;
      }
      emit += `
    case values[${i}].value:
      return values[${i}].handler.apply(null, propagatedArgs);
      `;
    }
    emit += `
  }`;
  }
  if (matches.length) {
    const len = matches.length;
    let i = -1;
    while (++i < len) {
      emit += `
  if (matches[${i}].match(value)) {
    return matches[${i}].handler.apply(null, propagatedArgs);
  }`;
    }
  }
  if (defa) {
    emit += `
  return defa.apply(null, propagatedArgs);
  `;
  }
  const compiledFn = new Function('values', 'matches', 'defa', 'value', 'propagatedArgs', emit);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target: any, propagatedArgs: any[]): Promise<any> => {
    const value = selector(target);
    return compiledFn(values, matches, defa, value, propagatedArgs);
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Push = (target: any, propagatedArgs: any[]) => any;

const $push = Symbol('push');
const $default = Symbol('default');

export class SwitchMap {
  private [$push]: Push;
  private [$default]: Handler;

  public selector: Selector;
  public values: Value[];
  public matches: Match[];

  constructor(selector: string | Selector) {
    if (typeof selector === 'string') {
      selector = prepareSelector(selector);
    } else {
      assert.ok(typeof selector === 'function', 'selector (string | Selector) is required');
    }
    this.selector = selector;
    this.values = [];
    this.matches = [];
  }

  get hasDefault(): boolean {
    return typeof this[$default] === 'function';
  }

  get isPrepared(): boolean {
    return typeof this[$push] === 'function';
  }

  case(c: Match | Value): SwitchMap {
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    assert.ok(c && typeof c === 'object', 'c (Match | Value) is required');
    const v = c as Value;
    if (typeof v.value !== 'undefined') {
      this.values.push(v);
    } else {
      const m = c as Match;
      if (typeof m.match === 'function') this.matches.push(m);
      else {
        const rx = m.match as RegExp;
        this.matches.push({ handler: m.handler, match: v => rx.test(v) });
      }
    }
    return this;
  }

  default(handler: Handler): SwitchMap {
    assert.ok(!this.hasDefault, 'Invalid operation; cannot be reassigned.');
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    assert.ok(typeof handler === 'function', 'handler (Handler) is required');
    this[$default] = handler;
    return this;
  }

  prepare(): void {
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    const { selector, values, matches } = this;
    this[$push] = prepareCases(selector, values, matches, this[$default]);
  }

  async push<T, R>(target: T): Promise<R> {
    assert.ok(this.isPrepared, 'Invalid operation; not prepared.');
    // eslint-disable-next-line prefer-rest-params
    return await this[$push](target, [...arguments]);
  }
}
