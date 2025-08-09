import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Annotation, Book } from '../types';
import { ReactReader } from 'react-reader';
import './EpubReader.css';

interface EpubReaderProps {
  book: Book;
}

const EpubReader: React.FC<EpubReaderProps> = ({ book }) => {
  const [location, setLocation] = useState<string | number>(0);
  const [annotations, setAnnotations] = useState<Annotation[]>(book.annotations || []);
  const renditionRef = useRef<any>(null);
  const [pendingSelection, setPendingSelection] = useState<{cfiRange: string; text: string} | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const epubUrl = useMemo(() => {
    if (window.electron?.epub?.getLocalFileUrl) {
      return window.electron.epub.getLocalFileUrl(book.filePath);
    }
    return undefined;
  }, [book.filePath]);

  const handleLocationChange = (epubcfi: string) => {
    setLocation(epubcfi);
  };

  // When ReactReader gives us the rendition, wire selection handler and render highlights
  const handleRendition = (rendition: any) => {
    renditionRef.current = rendition;
    // Ensure selection is visually highlighted inside the iframe
    try {
      rendition.themes.default({
        '::selection': { background: 'rgba(0, 123, 255, 0.35)' },
        '::-moz-selection': { background: 'rgba(0, 123, 255, 0.35)' },
      });
    } catch {}
    // Render existing highlights
    applyHighlights(rendition, annotations);
    // Selection handler
    rendition.on('selected', (cfiRange: string, contents: any) => {
      const sel = contents.window.getSelection();
      const selectedText = sel ? sel.toString() : '';
      setPendingSelection({ cfiRange, text: selectedText });
      setNoteDraft('');
      // Position toolbar above selection
      try {
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const rect = range ? range.getBoundingClientRect() : null;
        const iframeEl: HTMLIFrameElement | null = contents.iframe || null;
        if (rect && iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          const padding = 8;
          const toolbarWidth = 220;
          const toolbarHeight = 40;
          let left = iframeRect.left + rect.left + (rect.width / 2) - (toolbarWidth / 2);
          let top = iframeRect.top + rect.top - toolbarHeight - padding;
          // Clamp to viewport
          left = Math.max(8, Math.min(window.innerWidth - toolbarWidth - 8, left));
          top = Math.max(8, top);
          setToolbarPosition({ top, left });
        } else {
          // Fallback: center top of viewport
          setToolbarPosition({ top: 20, left: (window.innerWidth - 220) / 2 });
        }
      } catch {
        setToolbarPosition({ top: 20, left: (window.innerWidth - 220) / 2 });
      }
    });

    // Hide toolbar when relocating (page change)
    rendition.on('relocated', () => {
      setToolbarPosition(null);
    });
  };

  useEffect(() => {
    if (renditionRef.current) {
      applyHighlights(renditionRef.current, annotations);
    }
  }, [annotations]);

  const applyHighlights = (rendition: any, anns: Annotation[]) => {
    try {
      // Clear all then re-add to keep in sync
      // epub.js doesn't expose a simple clear-all; removing by cfi is fine
      anns.forEach((a) => {
        rendition.annotations.remove(a.cfiRange, 'highlight');
      });
    } catch {}
    anns.forEach((a) => {
      try {
        rendition.annotations.add('highlight', a.cfiRange, {}, undefined, 'epub-highlight');
      } catch {}
    });
  };

  const saveAnnotation = async () => {
    if (!pendingSelection || !noteDraft.trim()) {
      setShowNoteModal(false);
      return;
    }
    const newAnn: Annotation = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      cfiRange: pendingSelection.cfiRange,
      text: pendingSelection.text,
      note: noteDraft.trim(),
      createdAt: new Date().toISOString(),
    };
    const next = [...annotations, newAnn];
    setAnnotations(next);
    setShowNoteModal(false);
    setPendingSelection(null);
    setToolbarPosition(null);
    // Persist to storage via Electron API
    try {
      await window.electron?.books?.update?.(book.id, { annotations: next });
    } catch (e) {
      console.error('保存批注失败', e);
    }
  };

  const removeAnnotation = async (id: string) => {
    const next = annotations.filter(a => a.id !== id);
    setAnnotations(next);
    try {
      await window.electron?.books?.update?.(book.id, { annotations: next });
    } catch (e) {
      console.error('删除批注失败', e);
    }
  };

  if (!epubUrl) {
    return (
      <div className="epub-error">
        <p>无法生成EPUB读取地址</p>
        <p>文件路径: {book.filePath}</p>
      </div>
    );
  }

  return (
    <div className="epub-reader">
      <ReactReader
        url={epubUrl}
        location={location}
        locationChanged={handleLocationChange}
        swipeable={false}
        showToc
        getRendition={handleRendition}
      />
      {toolbarPosition && pendingSelection && (
        <div
          className="selection-toolbar"
          style={{ position: 'fixed', top: toolbarPosition.top, left: toolbarPosition.left, width: 220 }}
        >
          <button
            className="toolbar-btn"
            onClick={() => { setShowNoteModal(true); }}
          >添加批注</button>
          <button
            className="toolbar-btn secondary"
            onClick={() => { /* explain no-op for now */ }}
          >解释</button>
        </div>
      )}
      {/* Simple note modal */}
      {showNoteModal && (
        <div className="note-modal-backdrop">
          <div className="note-modal">
            <h4>添加批注</h4>
            <div className="note-selected-text">{pendingSelection?.text}</div>
            <textarea
              placeholder="输入你的笔记..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
            <div className="note-actions">
              <button className="nav-btn" onClick={saveAnnotation}>保存</button>
              <button className="nav-btn" onClick={() => { setShowNoteModal(false); setPendingSelection(null); setToolbarPosition(null); }}>取消</button>
            </div>
          </div>
        </div>
      )}
      {/* Annotation list (quick access) */}
      {annotations.length > 0 && (
        <div className="epub-sidebar">
          <h4>批注</h4>
          <div className="chapter-list">
            {annotations.map(a => (
              <button key={a.id} className="chapter-item" onClick={() => setLocation(a.cfiRange)}>
                {a.note}
                <span style={{ float: 'right' }} onClick={(e) => { e.stopPropagation(); removeAnnotation(a.id); }}>✕</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EpubReader;
