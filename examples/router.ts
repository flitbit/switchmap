// examples/router.ts
/**
 * @hidden
 * @packageDocumentation
 */
// A simple, contrived routing example.

import { SwitchMap } from '../dist';

import {
  sendEmail, sendText, callRequesterByPhone,
  queueForSupportPersonnel, unsupported
} from './contact-types';

const requests = new SwitchMap('type')
  .value('email', sendEmail)
  .value('text', sendText)
  .match(t => t === 'phone', callRequesterByPhone)
  .value(['tweet', 'holla'], queueForSupportPersonnel)
  .default(unsupported);

requests.push({
  type: 'email',
  name: 'Bilbo',
  surname: 'Baggins',
  emailAddress: 'bilbo@bagend.com'
});
// sending info to Bilbo Baggins via email: bilbo@bagend.com

requests.push({
  type: 'tweet',
  name: 'Frodo',
  surname: 'Baggins',
  twitterHandle: 'frodob'
});
// contact by tweet for Frodo Baggins queued for support personnel

requests.push({
  type: 'eagle',
  name: 'Gandalf',
  surname: 'Greyhame'
});
// contact by eagle unsupported, Gandalf Greyhame won't hear from us, round file it.

interface Message {
  version?: string;
  data: string;
}
type Handler = (message: Message) => void;

const versions: Record<string, Handler> = {
  init: ({ data }) => console.log(`${data}`),
  pre1: ({ version, data }) => console.log(`got ${version}: ${data}`),
  v1x: ({ version, data }) => console.log(`${version}: ${data}`),
  v2x: ({ version, data }) => console.log(`received ${version}: ${data}`),
  unrecognized: ({ version }) => console.log(`unsupported: ${version}`),
};

const dispatch = new SwitchMap((m: Message) => m.version || '0')
  .value('0', versions.init)
  .value('0.7', versions.pre1)
  .match(/^1\.[0-7]$/, versions.v1x)
  .value(['2.0', '2.1'], versions.v2x)
  .default(versions.unrecognized);

dispatch.push({ data: 'blah blah' });
// blah blah

dispatch.push({ version: '1.1', data: 'blah blah' });
// 1.1: blah blah

dispatch.push({ version: '2.1', data: 'blah blah' });
// received 2.1: blah blah

dispatch.push({ version: '3.1', data: 'blah blah' });
