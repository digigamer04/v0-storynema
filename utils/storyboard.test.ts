import { calculateCurrentShotStartTime } from './storyboard'

test('calculateCurrentShotStartTime sums durations', () => {
  const scenes = [
    { images: [{ duration: 2 }, { duration: 3 }] },
    { images: [{ duration: 4 }] },
  ] as any
  expect(calculateCurrentShotStartTime(scenes, 1, 0)).toBe(5)
})
