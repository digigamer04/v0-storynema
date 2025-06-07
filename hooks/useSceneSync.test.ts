import { renderHook } from '@testing-library/react'
import { useSceneSync } from './useSceneSync'

const scenes = [
  { images: [{ duration: 2 }, { duration: 3 }] },
  { images: [{ duration: 4 }] },
] as any

test('useSceneSync returns current start time', () => {
  const { result } = renderHook(() => useSceneSync(scenes, 1, 0))
  expect(result.current.getCurrentStartTime()).toBe(5)
})
