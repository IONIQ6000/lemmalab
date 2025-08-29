"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface KeyLegendItem {
  symbol: string;
  key: string; // display key
  code: string; // KeyboardEvent.code, e.g., "KeyA"
  description: string;
  insertText: string;
}

const keyLegendItems: KeyLegendItem[] = [
  { symbol: "∧", key: "A", code: "KeyA", description: "Conjunction", insertText: "∧" },
  { symbol: "∨", key: "V", code: "KeyV", description: "Disjunction", insertText: "∨" },
  { symbol: "¬", key: "N", code: "KeyN", description: "Negation", insertText: "¬" },
  { symbol: "→", key: "I", code: "KeyI", description: "Implication", insertText: "→" },
  { symbol: "↔", key: "B", code: "KeyB", description: "Biconditional", insertText: "↔" },
  { symbol: "∀", key: "F", code: "KeyF", description: "Universal", insertText: "∀" },
  { symbol: "∃", key: "E", code: "KeyE", description: "Existential", insertText: "∃" },
  { symbol: "⊤", key: "T", code: "KeyT", description: "True", insertText: "⊤" },
  { symbol: "⊥", key: "U", code: "KeyU", description: "False", insertText: "⊥" },
  { symbol: "⊢", key: "D", code: "KeyD", description: "Proves", insertText: "⊢" },
  { symbol: "⊨", key: "M", code: "KeyM", description: "Models", insertText: "⊨" },
];

interface KeyLegendProps {
  onSymbolInsert: (symbol: string) => void;
  activeInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function KeyLegend({ onSymbolInsert, activeInputRef }: KeyLegendProps) {
  const legendRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Detect platform and choose a non-conflicting shortcut:
  // - macOS: Option (⌥) + key
  // - Windows/Linux: Ctrl + Alt + key
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierText = isMac ? '⌥' : 'Ctrl+Alt';

  const insertSymbol = (symbol: string) => {
    if (activeInputRef?.current) {
      const input = activeInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const value = input.value;
      const newValue = value.slice(0, start) + symbol + value.slice(end);
      
      input.value = newValue;
      
      // Trigger change event
      const changeEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Set cursor position after inserted text
      const newPosition = start + symbol.length;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    } else {
      // Fallback: call the callback
      onSymbolInsert(symbol);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCombo = isMac
        ? event.altKey && !event.ctrlKey && !event.metaKey
        : event.ctrlKey && event.altKey && !event.shiftKey && !event.metaKey;
      if (!isCombo) return;

      // Use KeyboardEvent.code for layout-independent matching
      const item = keyLegendItems.find((item) => item.code === event.code);
      
      if (item) {
        event.preventDefault();
        event.stopPropagation();
        insertSymbol(item.insertText);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSymbolInsert, activeInputRef, isMac]);

  return (
    <div 
      ref={legendRef}
      className="w-full bg-muted/30 border rounded-lg mb-4"
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Logical Symbols
          </span>
          <span className="text-xs text-muted-foreground">
            (Click symbols or use {modifierText} + key)
          </span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3">
            {keyLegendItems.map((item, index) => (
              <button
                key={index}
                onClick={() => insertSymbol(item.insertText)}
                className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-sm hover:shadow-md hover:bg-accent transition-all cursor-pointer"
                title={`Click to insert ${item.symbol} or use ${modifierText} ${item.key}`}
              >
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded">
                    {modifierText} {item.key}
                  </kbd>
                  <span className="text-lg font-medium text-foreground">
                    {item.symbol}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {item.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
