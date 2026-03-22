import { ref, computed } from 'vue'

export function useUndoStack<T>() {
  const undoStack = ref<T[]>([]) as { value: T[] }
  const redoStack = ref<T[]>([]) as { value: T[] }
  const current = ref<T | undefined>(undefined) as { value: T | undefined }

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function push(state: T) {
    if (current.value !== undefined) {
      undoStack.value.push(current.value)
    }
    current.value = state
    redoStack.value = []
  }

  function undo() {
    if (!canUndo.value) return
    redoStack.value.push(current.value!)
    current.value = undoStack.value.pop()!
  }

  function redo() {
    if (!canRedo.value) return
    undoStack.value.push(current.value!)
    current.value = redoStack.value.pop()!
  }

  function reset(initialState: T) {
    undoStack.value = []
    redoStack.value = []
    current.value = initialState
  }

  return { current, canUndo, canRedo, push, undo, redo, reset }
}
