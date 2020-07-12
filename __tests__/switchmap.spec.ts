/**
 * @hidden
 * @packageDocumentation
 */

import { SwitchMap } from '../src';

describe('SwitchMap', () => {
  describe('.ctor(selector)', () => {
    it('.ctor throws when not selector undefined', () => {
      expect(() => {
        new SwitchMap(undefined);
      }).toThrow('selector (string | Selector) is required');
    });

    it('.ctor throws when not selector null', () => {
      expect(() => {
        new SwitchMap(null);
      }).toThrow('selector (string | Selector) is required');
    });

    it('has a simple selector when selector specified as non-pointer string', () => {
      const data = { foo: 'bar' };
      const dispatcher = new SwitchMap('foo');
      const selector = dispatcher.selector;
      expect(typeof selector).toBe('function');
      expect(selector(data)).toEqual(data.foo);
    });

    it('has a pointer selector when selector specified as JSON Pointer string', () => {
      const data = { foo: { bar: 'baz' } };
      const dispatcher = new SwitchMap('/foo/bar');
      const selector = dispatcher.selector;
      expect(typeof selector).toBe('function');
      expect(selector(data)).toEqual(data.foo.bar);
    });

    it('has a pointer selector when selector specified as fragment Id string', () => {
      const data = { foo: { bar: { baz: 'quux' } } };
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      const selector = dispatcher.selector;
      expect(typeof selector).toBe('function');
      expect(selector(data)).toBe(data.foo.bar.baz);
    });

  });

  describe('.hasDefault', () => {

    it('is false, by default', () => {
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      expect(dispatcher.hasDefault).toBe(false);
    });

    it('is true after setting default handler', () => {
      const dispatcher = new SwitchMap('#/foo/bar/baz');
      dispatcher.default(() => null);
      expect(dispatcher.hasDefault).toBe(true);
    });

  });

  describe('.isPrepared', () => {

    it('is false, by default', () => {
      const dispatcher = new SwitchMap('foo');
      expect(dispatcher.isPrepared).toBe(false);
    });

    it('is true after preparing', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher.default(() => null);
      dispatcher.prepare();
      expect(dispatcher.isPrepared).toBe(true);
    });

  });

  describe('.default(handler)', () => {

    it('throws if handler is undefined', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.default(undefined);
      }).toThrow('handler (Handler) is required');
    });

    it('throws if handler is null', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.default(null);
      }).toThrow('handler (Handler) is required');
    });

    it('throws if already has default', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher.default(() => null);
      expect(() => {
        dispatcher.default(() => null);
      }).toThrow('Invalid operation; cannot be reassigned.');
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
      }).toThrow('Invalid operation; already prepared.');
    });

    it('succeeds when specified correctly', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatcher.default((target: any): void => {
        console.log(target.foo.bar);
      });
      expect(dispatcher.hasDefault).toBe(true);
    });

    it('returns self', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher.default((target: any): void => {
          console.log(target.foo.bar);
        })
      ).toEqual(dispatcher);
    });

  });

  describe('.case(...cases: Case[])', () => {

    it('throws if c is undefined', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.case(undefined);
      }).toThrow('cases (Case[]) is required');
    });

    it('throws if c is null', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.case(null);
      }).toThrow('cases (Case[]) is required');
    });

    it('falls through when cases unspecified', () => {
      const dispatcher = new SwitchMap('foo');
      expect(() => {
        dispatcher.case();
      }).not.toThrow();
    });

    it('throws if already prepared', () => {
      const dispatcher = new SwitchMap('foo');
      dispatcher
        .value('bar', () => null)
        .prepare();
      expect(() => dispatcher.value('bar', () => null))
        .toThrow('Invalid operation; already prepared.');
    });

    it('succeeds when specified correctly', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const data = [
        { foo: 'bar' },
        { foo: 'baz' },
        { foo: 'qux' },
        { foo: 'quux' },
        { foo: 'garply' },
      ];
      const dispatcher = new SwitchMap('foo');
      dispatcher
        .match(v => v === 'bar', handler1)
        .match(/^qu.+/, handler2)
        .value(['baz', 'garply'], handler3)
        .prepare();
      await expect(dispatcher.push(data[1])).resolves.not.toThrow();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledWith(data[1]);
    });

    it('returns self', () => {
      const dispatcher = new SwitchMap('/foo/bar');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatcher.case({
          value: 'bar',
          handler: () => null,
        })
      ).toEqual(dispatcher);
    });

  });

  describe('.push()', () => {
    const data = [
      { foo: 'bar' },
      { foo: 'baz' },
      { foo: 'qux' },
      { foo: 'quux' },
      { foo: 'garply' },
      { foo: 'waldo' }
    ];

    it('matches handler by value (single)', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const handler4 = jest.fn();
      const dispatch = new SwitchMap('foo')
        .match(v => v === 'bar', handler1)
        .match(/^qu.+/, handler2)
        .value('waldo', handler3)
        .value(['baz', 'garply'], handler4)
        .prepare();

      const item = data.find(it => it.foo === 'waldo');
      await expect(dispatch.push(item)).resolves.not.toThrow();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledWith(item);
      expect(handler4).not.toHaveBeenCalled();
    });

    it('matches handler by value (multi)', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const handler4 = jest.fn();

      const dispatch = new SwitchMap('foo')
        .match(v => v === 'bar', handler1)
        .match(/^qu.+/, handler2)
        .value('waldo', handler3)
        .value(['baz', 'garply'], handler4)
        .prepare();

      const item = data.find(it => it.foo === 'garply');
      await expect(dispatch.push(item)).resolves.not.toThrow();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
      expect(handler4).toHaveBeenCalledWith(item);
    });

    it('matches handler by matcher', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const handler4 = jest.fn();

      const dispatch = new SwitchMap('foo')
        .match(v => v === 'bar', handler1)
        .match(/^qu.+/, handler2)
        .value('waldo', handler3)
        .value(['baz', 'garply'], handler4)
        .prepare();

      const item = data.find(it => it.foo === 'bar');
      await expect(dispatch.push(item)).resolves.not.toThrow();
      expect(handler1).toHaveBeenCalledWith(item);
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).not.toHaveBeenCalled();
      expect(handler4).not.toHaveBeenCalled();
    });

    it('matches handler by regexp', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();
      const handler4 = jest.fn();

      const dispatch = new SwitchMap('foo')
        .match(v => v === 'bar', handler1)
        .match(/^qu.+/, handler2)
        .value('waldo', handler3)
        .value(['baz', 'garply'], handler4)
        .prepare();

      const item = data.find(it => it.foo === 'quux');
      await expect(dispatch.push(item)).resolves.not.toThrow();
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(item);
      expect(handler3).not.toHaveBeenCalled();
      expect(handler4).not.toHaveBeenCalled();
    });

  });

  it('default handler is called when pushing undefined', async () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const dispatcher = new SwitchMap('foo');
    dispatcher
      .match(v => v === 'bar', handler1)
      .default(handler2);
    await expect(dispatcher.push(undefined)).resolves.not.toThrow();
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith(undefined);
  });

});
