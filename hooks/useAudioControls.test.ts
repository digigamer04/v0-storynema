import { renderHook, act } from '@testing-library/react'
import { useAudioControls } from './useAudioControls'

test('useAudioControls toggles play state', () => {
  const { result } = renderHook(() => useAudioControls())
  act(() => {
    result.current.toggle()
  })
  expect(result.current.isPlaying).toBe(true)
  act(() => {
    result.current.toggle()
  })
  expect(result.current.isPlaying).toBe(false)
})
