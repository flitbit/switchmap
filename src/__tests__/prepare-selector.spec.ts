/**
 * @hidden
 * @packageDocumentation
 */

import { prepareSelector } from '..';

describe('prepareSelector()', () => {
  it('throws when not sel undefined', () => {
    expect(() => {
      prepareSelector(undefined as unknown as string);
    }).toThrow('sel (string) is required');
  });

  it('throws when not sel null', () => {
    expect(() => {
      prepareSelector(null as unknown as string);
    }).toThrow('sel (string) is required');
  });

  it('returns a simple selector when sel specified as non-pointer string', () => {
    const data = { foo: 'bar' };
    const selector = prepareSelector('foo');
    expect(typeof selector).toBe('function');
    expect(selector(data)).toEqual(data.foo);
  });

  it('returns a pointer selector when sel specified as JSON Pointer string', () => {
    const data = { foo: { bar: 'baz' } };
    const selector = prepareSelector('/foo/bar');
    expect(typeof selector).toBe('function');
    expect(selector(data)).toEqual(data.foo.bar);
  });

  it('returns a pointer selector when sel specified as fragment Id string', () => {
    const data = { foo: { bar: { baz: 'quux' } } };
    const selector = prepareSelector('#/foo/bar/baz');
    expect(typeof selector).toBe('function');
    expect(selector(data)).toEqual(data.foo.bar.baz);
  });

  it('selector returns undefined when selection undefined', () => {
    const data = { foo: 'bar', baz: 'quux' };
    const selector = prepareSelector('quux');
    expect(typeof selector).toBe('function');
    expect(selector(data)).toBeUndefined();
  });
});
