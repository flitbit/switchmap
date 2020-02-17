import { expect } from 'chai';
import { SwitchMap } from '..';

describe('SwitchMap', () => {
  describe('.ctor(selector)', () => {
    it('.ctor throws when not selector undefined', () => {
      expect(() => {
        new SwitchMap(undefined);
      }).to.throw('selector (string | Selector) is required');
    });

    it('.ctor throws when not selector null', () => {
      expect(() => {
        new SwitchMap(null);
      }).to.throw('selector (string | Selector) is required');
    });

    it('has a simple selector when selector specified as non-pointer string', () => {
      const data = { foo: 'bar' };
      const dispatcher = new SwitchMap('foo');
      const selector = dispatcher.selector;
      expect(selector).to.be.a('function');
      expect(selector(data)).to.eql(data.foo);
    });

    it('has a pointer selector when selector specified as JSON Pointer string', () => {
      const data = { foo: { bar: 'baz' } };
      const dispatcher = new SwitchMap('/foo/bar');
      const selector = dispatcher.selector;
      expect(selector).to.be.a('function');
      expect(selector(data)).to.eql(data.foo.bar);
    });

    it('has a pointer selector when selector specified as fragment Id string', () => {
      const data = { foo: { bar: { baz: 'quux' } } };
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      const selector = dispatcher.selector;
      expect(selector).to.be.a('function');
      expect(selector(data)).to.eql(data.foo.bar.baz);
    });
  });

  describe('.hasDefault', () => {
    it('is false, by default', () => {
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      expect(dispatcher.hasDefault).to.be.false;
    });
    it('is true after setting default handler', () => {
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      dispatcher.default(() => null);
      expect(dispatcher.hasDefault).to.be.true;
    });
  });

  describe('.isPrepared', () => {
    it('is false, by default', () => {
      const dispatcher = new SwitchMap('foo');
      expect(dispatcher.isPrepared).to.be.false;
    });
    it('is true after preparing', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher.default(() => null);
      dispatcher.prepare();
      expect(dispatcher.isPrepared).to.be.true;
    });
  });

  describe('.default(handler)', () => {
    it('throws if handler is undefined', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.default(undefined);
      }).to.throw('handler (Handler) is required');
    });
    it('throws if handler is null', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.default(null);
      }).to.throw('handler (Handler) is required');
    });
    it('throws if already has default', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher.default(() => null);
      expect(() => {
        dispatcher.default(() => null);
      }).to.throw('Invalid operation; cannot be reassigned.');
    });
    it('throws if already prepared', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher
        .case({
          value: 'bar',
          handler: () => null,
        })
        .prepare();
      expect(() => {
        dispatcher.default(() => null);
      }).to.throw('Invalid operation; already prepared.');
    });
    it('succeeds when specified correctly', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher.default((target: any): void => {
        console.log(target.foo.bar);
      });
      expect(dispatcher.hasDefault).to.be.true;
    });
    it('returns self', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher.default((target: any): void => {
          console.log(target.foo.bar);
        })
      ).to.be.eql(dispatcher);
    });
  });

  describe('.case(Match | Value)', () => {
    it('throws if c is undefined', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.case(undefined);
      }).to.throw('c (Match | Value) is required');
    });
    it('throws if c is null', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.case(null);
      }).to.throw('c (Match | Value) is required');
    });
    it('throws if already prepared', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher
        .case({
          value: 'bar',
          handler: () => null,
        })
        .prepare();
      expect(() => {
        dispatcher.case({
          value: 'bar',
          handler: () => null,
        });
      }).to.throw('Invalid operation; already prepared.');
    });
    it('succeeds when specified correctly', () => {
      const data = [{ foo: 'bar' }, { foo: 'baz' }, { foo: 'quux' }];
      const dispatcher = new SwitchMap('foo');
      const observed: string[] = [];
      dispatcher
        .case({
          value: 'bar',
          handler: () => {
            observed.push('bar');
          },
        })
        .case({
          value: 'baz',
          handler: () => {
            observed.push('baz');
          },
        })
        .prepare();
      return dispatcher.push(data[1]).then(() => {
        expect(observed.length).to.be.eql(1);
        expect(observed[0]).to.be.eql('baz');
      });
    });
    it('returns self', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher.case({
          value: 'bar',
          handler: () => null,
        })
      ).to.be.eql(dispatcher);
    });
  });
});
