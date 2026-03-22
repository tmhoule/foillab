import { describe, it, expect } from 'vitest'
import { useUndoStack } from '../../src/composables/useUndoStack'

describe('useUndoStack', () => {
  it('starts with no undo/redo available', () => {
    const { canUndo, canRedo } = useUndoStack<number>()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('pushes state and enables undo', () => {
    const { push, canUndo } = useUndoStack<number>()
    push(1)
    push(2)
    expect(canUndo.value).toBe(true)
  })

  it('undoes to previous state', () => {
    const { push, undo, current } = useUndoStack<number>()
    push(1)
    push(2)
    push(3)
    expect(current.value).toBe(3)
    undo()
    expect(current.value).toBe(2)
    undo()
    expect(current.value).toBe(1)
  })

  it('redoes after undo', () => {
    const { push, undo, redo, current } = useUndoStack<number>()
    push(1)
    push(2)
    undo()
    redo()
    expect(current.value).toBe(2)
  })

  it('clears redo stack on new push after undo', () => {
    const { push, undo, canRedo, current } = useUndoStack<number>()
    push(1)
    push(2)
    undo()
    push(3)
    expect(current.value).toBe(3)
    expect(canRedo.value).toBe(false)
  })

  it('reset clears everything', () => {
    const { push, reset, canUndo, canRedo, current } = useUndoStack<number>()
    push(1)
    push(2)
    reset(0)
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
    expect(current.value).toBe(0)
  })
})
