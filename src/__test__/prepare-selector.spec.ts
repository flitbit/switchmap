import { expect } from 'chai';
import { prepareSelector } from '../';

describe('prepareSelector()', () => {
  it('throws when not sel undefined', () => {
    expect(() => {
      prepareSelector(undefined);
    }).to.throw('sel (string) is required');
  });

  it('throws when not sel null', () => {
    expect(() => {
      prepareSelector(null);
    }).to.throw('sel (string) is required');
  });

  it('returns a simple selector when sel specified as non-pointer string', () => {
    const data = { foo: 'bar' };
    const selector = prepareSelector('foo');
    expect(selector).to.be.a('function');
    expect(selector(data)).to.eql(data.foo);
  });

  it('returns a pointer selector when sel specified as JSON Pointer string', () => {
    const data = { foo: { bar: 'baz' } };
    const selector = prepareSelector('/foo/bar');
    expect(selector).to.be.a('function');
    expect(selector(data)).to.eql(data.foo.bar);
  });

  it('returns a pointer selector when sel specified as fragment Id string', () => {
    const data = { foo: { bar: { baz: 'quux' } } };
    const selector = prepareSelector('#/foo/bar/baz');
    expect(selector).to.be.a('function');
    expect(selector(data)).to.eql(data.foo.bar.baz);
  });
  it('selector returns undefined when selection undefined', () => {
    const data = { foo: 'bar', baz: 'quux' };
    const selector = prepareSelector('quux');
    expect(selector).to.be.a('function');
    expect(selector(data)).to.be.undefined;
  });
});
