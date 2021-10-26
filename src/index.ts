import * as assert from 'assert-plus';
import { JsonPointer } from 'json-ptr';

export type Selector = (target: unknown) => string;
export type Matcher = (value: string) => boolean;

export type Handler = (it: unknown, context?: unknown) => void | Promise<void>;

export function prepareSelector(sel: string): Selector {
  assert.string(sel, 'sel');
  // if it looks like a JSON Pointer, use the pointer as a selector...
  if (~['#', '/'].indexOf(sel[0])) {
    const ptr = new JsonPointer(sel);
    return (target: unknown): string => ptr.get(target) + '';
  }
  // Otherwise use it as a property on the target...
  return (target) => {
    const t = target as Record<string, unknown>;
    return t ? (t[sel] as string) : (undefined as unknown as string);
  };
}

export interface AbstractCase {
  handler: Handler;
}

export interface Match extends AbstractCase {
  match: Matcher | RegExp;
}

export interface Value extends AbstractCase {
  value: unknown;
}

export type Case = Match | Value;

/** @hidden */
function prepareCases(
  selector: Selector,
  values: Value[],
  matches: Match[],
  defa?: Handler,
): Push {
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
        const len2 = (values[i].value as unknown[]).length;
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
  const compiledFn = new Function(
    'values',
    'matches',
    'defa',
    'value',
    'propagatedArgs',
    emit,
  );
  return (target: unknown, propagatedArgs: unknown[]): Promise<unknown> => {
    const value = selector(target);
    return compiledFn(values, matches, defa, value, propagatedArgs);
  };
}

type Push = (target: unknown, propagatedArgs: unknown[]) => unknown;

/** @hidden */
const $push = Symbol('push');
/** @hidden */
const $default = Symbol('default');

/**
 * A `SwitchMap` is somewhat like a router or a dispatcher. If you consider
 * objects arriving at your application, lets say on an AMQP queue, a
 * `SwitchMap` could be used to inspect some property(ies) of an incoming
 * object to match those incoming objects with appropriate handlers. This is
 * accomplished by the 3 configurable parts of a `SwitchMap`:
 *
 * * `selector` · a [[Selector]] selects a key, based on some property(ies) of an incoming object
 * * `matcher` · a [[Matcher]] matches a subset of keys to a specific handler
 * * `handler` · a [[Handler]] handles items as per your business logic
 *
 * If you visualize a prepared `SwitchMap` as a `switch`
 * statement you wouldn't be far off. The practical difference is that you can
 * compose a `SwitchMap` at runtime and use both synchronous and `async`
 * handlers. Because of our _prepare_ step, the performance should be
 * negligible compared to a hand written switch statement.
 *
 * ```ts
 * // examples/router.ts
 *
 * // $ npx ts-node examples/router.ts
 *
 * // A simple, contrived routing example.
 *
 * import { SwitchMap } from 'switchmap';
 * import { sendEmail, sendText, callRequesterByPhone, queueForSupportPersonnel, unsupported } from './contact-types';
 *
 * const requests = new SwitchMap('type')
 *   .value('email', sendEmail)
 *   .value('text', sendText)
 *   .match(t => t === 'phone', callRequesterByPhone)
 *   .value(['tweet', 'holla'], queueForSupportPersonnel)
 *   .default(unsupported);
 *
 * requests.push({
 *   type: 'email',
 *   name: 'Bilbo',
 *   surname: 'Baggins',
 *   emailAddress: 'bilbo@bagend.com'
 * });
 * // sending info to Bilbo Baggins via email: bilbo@bagend.com
 *
 * requests.push({
 *   type: 'tweet',
 *   name: 'Frodo',
 *   surname: 'Baggins',
 *   twitterHandle: 'frodob'
 * });
 * // contact by tweet for Frodo Baggins queued for support personnel
 *
 * requests.push({
 *   type: 'eagle',
 *   name: 'Gandalf',
 *   surname: 'Greyhame'
 * });
 * // contact by eagle unsupported, Gandalf Greyhame won't hear from us, round file it.
 * ```
 */
export class SwitchMap {
  /** @hidden */
  private [$push]: Push;
  /** @hidden */
  private [$default]: Handler;

  /**
   * The instance's [[Selector]].
   */
  public selector: Selector;
  /**
   * The instance's configured [[Value]]s
   */
  public values: Value[];
  /**
   * The instance's configured [[Match]]es
   */
  public matches: Match[];

  /**
   * Creates an instance using the specified `selector`.
   *
   * The [[Selector | `selector`]] may be specified as a string or [[Selector]].
   * If it is specified as a string, it will be prepared as a [[Selector]]
   * before being used by the instance.
   *
   * <b>Simple String Selector Example</b>
   *
   * ```ts
   * const dispatch = new SwitchMap('size')
   *   .value('small', it => console.log(`it is small: ${it.data}`))
   *   .value('medium', it => console.log(`it is medium: ${it.data}`))
   *   .value('large', it => console.log(`it is large: ${it.data}`))
   *   .default(it => console.log(`unhandled: ${it.size}`));
   *
   * dispatch.push({size: 'small', data: 1});
   * // it is small: 1
   *
   * dispatch.push({size: 'big', data: 100});
   * // unhandled: big
   * ```
   *
   * In the code above, since a simple string was specified, items pushed to the
   * instance will have their `size` property inspected in order to match
   * against a `handler`.
   *
   * <b>JSON Pointer Selector Example</b>
   *
   * When `selector` is specified as a string and looks like a JSON Pointer, it
   * will be used as such to match among handlers.
   *
   * ```ts
   * const dispatch = new SwitchMap('/person/salutation')
   *   .value('Mr.', it => console.log(`dude complains: ${it.name} ${it.surname}`))
   *   .value('Mrs.', it => console.log(`she complains: ${it.name} ${it.surname}`))
   *   .value('Miss', it => console.log(`chick complains: ${it.name} ${it.surname}`))
   *   .value('Dr.', it => console.log(`person complains: ${it.name} ${it.surname}`))
   *   .default(it => console.log(`idiot complains: ${it.name} ${it.surname}`));
   *
   * dispatch.push({
   *   complaint: 'The reason for my complaint is blah blah blah...',
   *   person: {
   *     salutation: 'Miss',
   *     name: 'June',
   *     surname: 'Snoot'
   *   }
   * });
   * // chick complains: June Snoot
   *
   * dispatch.push({
   *   complaint: 'The reason for my complaint is blah blah blah...',
   *   person: {
   *     salutation: 'Dr.',
   *     name: 'Mack',
   *     surname: 'Gee'
   *   }
   * });
   * // person complains: Mack Gee
   * ```
   *
   * <b>Selector Fn Example</b>
   *
   * When a [[Selector]] is specified, the result of the selector is used to
   * match among handlers.
   *
   * ```ts
   * interface Message {
   *   version?: string;
   *   data: string;
   * }
   * type Handler = (message: Message) => void;
   *
   * const versions: Record<string, Handler> = {
   *   init: ({ data }) => console.log(`${data}`),
   *   pre1: ({ version, data }) => console.log(`got ${version}: ${data}`),
   *   v1x: ({ version, data }) => console.log(`${version}: ${data}`),
   *   v2x: ({ version, data }) => console.log(`received ${version}: ${data}`),
   *   unrecognized: ({ version }) => console.log(`unsupported: ${version}`),
   * };
   *
   * const dispatch = new SwitchMap((m: Message) => m.version || '0')
   *   .value('0', versions.init)
   *   .value('0.7', versions.pre1)
   *   .match(/^1\.[0-7]$/, versions.v1x)
   *   .value(['2.0', '2.1'], versions.v2x);
   *   .default(versions.unrecognized);
   *
   * dispatch.push({ data: 'blah blah' });
   * // blah blah
   *
   * dispatch.push({ version: '1.1', data: 'blah blah' });
   * // 1.1: blah blah
   *
   * dispatch.push({ version: '2.1', data: 'blah blah' });
   * // received 2.1: blah blah
   * ```
   * @param selector a selector, either as a string or a function
   */
  constructor(selector: string | Selector) {
    if (typeof selector === 'string') {
      selector = prepareSelector(selector);
    } else {
      assert.ok(
        typeof selector === 'function',
        'selector (string | Selector) is required',
      );
    }
    this.selector = selector;
    this.values = [];
    this.matches = [];
  }

  /**
   * Indicates whether the instance has a _default_ [[Handler]].
   *
   * @returns `true` if the instance has a _default_; otherwise `false`.
   */
  get hasDefault(): boolean {
    return typeof this[$default] === 'function';
  }

  /**
   * Indicates whether the instance has been prepared.
   *
   * @returns `true` if the instance has been prepared; otherwise `false`.
   */
  get isPrepared(): boolean {
    return typeof this[$push] === 'function';
  }

  /**
   * Adds a [[Match]] case to the instance.
   *
   * A `match` may be either an instance of a [[Matcher]] function or a regular
   * expression. If a function, the case matches when the function returns
   * a truthy result. If a regular expression, the case matches when the
   * expression tests positive.
   *
   * <b>Matcher Example</b>
   * ```ts
   * dispatch.match(it => it === 'Giselle', composeSpecialMessage);
   * ```
   *
   * <b>RegExp Example</b>
   * ```ts
   * dispatch.match(/^1\.[0-7]$/, handleVersion1xMessage);
   * ```
   *
   * @param match a [[Matcher]] or a regular expression used to match incoming
   * objects.
   * @param handler a handler that will process matched objects
   */
  match(match: Matcher | RegExp, handler: Handler): this {
    return this.case({ match, handler });
  }

  /**
   * Adds a [[Value]] case to the instance.
   *
   * A `value` may be either a single value or an array of values. In either
   * case, the values are flattened to a single list of values. When the
   * instance is prepared, values are considered "exact matches", so are
   * evaluated first. When considering equality, if the value would match when
   * written as a `case` in an ecmascript `switch` statement, it will match in
   * a `SwitchMap`.
   *
   * <b>Example</b>
   * ```ts
   * dispatch.value('Giselle', composeSpecialMessage);
   * ```
   *
   * <b>Array Example</b>
   * ```ts
   * dispatch.value(['1', '1.1', '1.2', '1.3', '1.4'], handleVersion1xMessage);
   * ```
   *
   * @param value one or more values to match
   * @param handler a handler that will process matched objects
   */
  value(value: unknown, handler: Handler): this {
    return this.case({ value, handler });
  }

  /**
   * Adds one or more [[Case]]s to the instance.
   *
   * `cases` may be one or more [[Match]] or [[Value]] objects.
   *
   * <b>Example</b>
   * ```ts
   * const dispatch = new SwitchMap('version')
   *   .case(
   *     { value: '0', handler: versions.init },
   *     { value: '0.7', handler: versions.pre1 },
   *     { match: /^1\.[0-7]$/, handler: versions.v1x },
   *     { value: ['2.0', '2.1'], handler: versions.v2x })
   *   .default(versions.unrecognized);
   * ```
   *
   * @param cases one or more [[Case]] defining a matcher and a handler
   */
  case(...cases: Case[]): this {
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    if (cases && cases.length) {
      for (const c of cases) {
        assert.ok(c && typeof c === 'object', 'cases (Case[]) is required');
        const v = c as Value;
        if (typeof v.value !== 'undefined') {
          this.values.push(v);
        } else {
          const m = c as Match;
          if (typeof m.match === 'function') this.matches.push(m);
          else {
            const rx = m.match as RegExp;
            this.matches.push({ handler: m.handler, match: (v) => rx.test(v) });
          }
        }
      }
    }
    return this;
  }

  /**
   * Establishes a _default_ handler for items that are unmatched by the
   * instance's cases.
   *
   * @param handler a handler that receives unmatched items
   */
  default(handler: Handler): SwitchMap {
    assert.ok(!this.hasDefault, 'Invalid operation; cannot be reassigned.');
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    assert.ok(typeof handler === 'function', 'handler (Handler) is required');
    this[$default] = handler;
    return this;
  }

  /**
   * Prepares the instance.
   *
   * When an instance is _prepared_, a logic function is compiled to efficiently
   * evaluate incoming objects and match them to handlers. Because the function
   * is emitted based on the instance's `selector`, `values`, and `matches`,
   * it is an error to add new cases to the instance after it is prepared.
   */
  prepare(): this {
    assert.ok(!this.isPrepared, 'Invalid operation; already prepared.');
    const { selector, values, matches } = this;
    this[$push] = prepareCases(selector, values, matches, this[$default]);
    return this;
  }

  /**
   * Pushes the `target` item through the switch, possibly mapping it to a
   * handler. If the item is matched to a handler, the handler is invoked with
   * the item.
   *
   * @param target the target item
   *
   * @returns a Promise<void> that resolves or rejects when the mapped handler resolves
   * or rejects
   */
  async push<T>(target: T): Promise<unknown> {
    if (!this.isPrepared) {
      this.prepare();
    }
    // eslint-disable-next-line prefer-rest-params
    return await this[$push](target, [...arguments]);
  }
}
