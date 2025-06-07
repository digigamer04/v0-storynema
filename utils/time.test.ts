import { formatTime, formatTimeWithMilliseconds } from './time'

test('formatTime formats mm:ss', () => {
  expect(formatTime(125)).toBe('02:05')
})

test('formatTimeWithMilliseconds formats mm:ss.ms', () => {
  expect(formatTimeWithMilliseconds(61.5)).toBe('01:01.50')
})
