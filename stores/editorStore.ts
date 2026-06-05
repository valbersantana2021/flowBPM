import { create } from 'zustand'
import type { ChatMessage } from '@/types'

interface EditorStore {
  diagramId: string | null
  diagramName: string
  currentXml: string | null
  isDirty: boolean
  isSaving: boolean
  messages: ChatMessage[]
  isGenerating: boolean

  setDiagramId: (id: string) => void
  setDiagramName: (name: string) => void
  setCurrentXml: (xml: string) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setGenerating: (v: boolean) => void
  setSaving: (v: boolean) => void
  reset: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  diagramId: null,
  diagramName: 'Novo Diagrama',
  currentXml: null,
  isDirty: false,
  isSaving: false,
  messages: [],
  isGenerating: false,

  setDiagramId: (id) => set({ diagramId: id }),
  setDiagramName: (name) => set({ diagramName: name, isDirty: true }),
  setCurrentXml: (xml) => set({ currentXml: xml, isDirty: true }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { ...msg, id: crypto.randomUUID(), timestamp: new Date() },
      ],
    })),
  setGenerating: (v) => set({ isGenerating: v }),
  setSaving: (v) => set({ isSaving: v }),
  reset: () =>
    set({
      diagramId: null,
      diagramName: 'Novo Diagrama',
      currentXml: null,
      isDirty: false,
      isSaving: false,
      messages: [],
      isGenerating: false,
    }),
}))
