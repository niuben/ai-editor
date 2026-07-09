import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

type GhostSuggestionStorage = {
  text: string;
  position: number | null;
};

export const ghostSuggestionKey = new PluginKey("ghostSuggestion");

export const GhostSuggestion = Extension.create<unknown, GhostSuggestionStorage>({
  name: "ghostSuggestion",

  addStorage() {
    return {
      text: "",
      position: null,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ghostSuggestionKey,
        props: {
          decorations: ({ doc }) => {
            const { position, text } = this.storage;

            if (!text || position === null || position > doc.content.size) {
              return DecorationSet.empty;
            }

            return DecorationSet.create(doc, [
              Decoration.widget(position, () => {
                const span = document.createElement("span");
                span.className = "ghost-suggestion";
                span.textContent = text;
                return span;
              }),
            ]);
          },
        },
      }),
    ];
  },
});

export function setGhostSuggestion(editor: Editor, text: string, position: number) {
  const storage = editor.storage.ghostSuggestion as GhostSuggestionStorage;
  storage.text = text;
  storage.position = position;
  editor.view.dispatch(editor.state.tr.setMeta(ghostSuggestionKey, Date.now()));
}

export function clearGhostSuggestion(editor: Editor) {
  const storage = editor.storage.ghostSuggestion as GhostSuggestionStorage | undefined;
  if (!storage?.text) return;

  storage.text = "";
  storage.position = null;
  editor.view.dispatch(editor.state.tr.setMeta(ghostSuggestionKey, Date.now()));
}

export function getGhostSuggestion(editor: Editor) {
  return editor.storage.ghostSuggestion as GhostSuggestionStorage;
}
