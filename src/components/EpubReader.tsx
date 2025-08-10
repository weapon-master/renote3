import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Annotation, Book } from '../types';
import { ReactReader } from 'react-reader';
import './EpubReader.css';

interface EpubReaderProps {
  book: Book;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}

const EpubReader: React.FC<EpubReaderProps> = ({ book, onAnnotationClick, onAnnotationsChange }) => {
  const [location, setLocation] = useState<string | number>(0);
  const [annotations, setAnnotations] = useState<Annotation[]>(book.annotations || []);
  const renditionRef = useRef<any>(null);
  const [pendingSelection, setPendingSelection] = useState<{ id?: string; cfiRange: string; text: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [notePopup, setNotePopup] = useState<{ top: number; left: number; annotation: Annotation } | null>(null);
  const [hoverToolbar, setHoverToolbar] = useState<{ top: number; left: number; annotation: Annotation } | null>(null);
  const hoverToolbarRef = useRef<HTMLDivElement | null>(null);
  const [clickToolbar, setClickToolbar] = useState<{ top: number; left: number; annotation: Annotation } | null>(null);
  const clickToolbarRef = useRef<HTMLDivElement | null>(null);

  const epubUrl = useMemo(() => {
    if (window.electron?.epub?.getLocalFileUrl) {
      return window.electron.epub.getLocalFileUrl(book.filePath);
    }
    return undefined;
  }, [book.filePath]);

  const handleLocationChange = (epubcfi: string) => {
    setLocation(epubcfi);
  };

  // Navigate to annotation location
  const navigateToAnnotation = (annotation: Annotation) => {
    if (renditionRef.current) {
      try {
        renditionRef.current.display(annotation.cfiRange);
        // Highlight the annotation briefly
        renditionRef.current.annotations.add('highlight', annotation.cfiRange, {}, (e: any) => {
          // Remove highlight after 2 seconds
          setTimeout(() => {
            try {
              renditionRef.current?.annotations.remove(annotation.cfiRange, 'highlight');
            } catch (error) {
              console.warn('Failed to remove temporary highlight:', error);
            }
          }, 2000);
        });
      } catch (error) {
        console.warn('Failed to navigate to annotation:', error);
      }
    }
  };

  // Expose navigation function to parent component
  useEffect(() => {
    if (onAnnotationClick) {
      // Store the navigation function in a way that parent can access
      (window as any).navigateToAnnotation = navigateToAnnotation;
    }
  }, [onAnnotationClick, renditionRef.current]);

  // Notify parent component when annotations change
  useEffect(() => {
    if (onAnnotationsChange) {
      onAnnotationsChange(annotations);
    }
  }, [annotations, onAnnotationsChange]);

  // When ReactReader gives us the rendition, wire selection handler and render highlights
  const handleRendition = (rendition: any) => {
    renditionRef.current = rendition;
    // Ensure selection is visually highlighted inside the iframe
    try {
      rendition.themes.default({
        '::selection': { background: 'rgba(0, 123, 255, 0.35)' },
        // ensure highlights can receive hover events
        '.epubjs-hl': { 'pointer-events': 'auto' },
        '.epub-highlight': { 'pointer-events': 'auto' },
      });
    } catch (error) {
      console.warn('Failed to apply selection theme:', error);
    }
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
        const iframeEl: HTMLIFrameElement | null = contents.iframe || (contents?.document?.defaultView?.frameElement as HTMLIFrameElement) || null;
        if (rect && iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          const padding = 8;
          const toolbarWidth = 220;
          const toolbarHeight = 40;
          let left = iframeRect.left + rect.left + rect.width / 2 - toolbarWidth / 2;
          // Prefer above; if not enough room, place below selection
          const topCandidate = iframeRect.top + rect.top - toolbarHeight - padding;
          let top = topCandidate;
          if (topCandidate < 8) {
            top = iframeRect.top + rect.bottom + padding;
          }
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

    // Hide toolbars/popups when relocating (page change)
    rendition.on('relocated', () => {
      setToolbarPosition(null);
      setNotePopup(null);
      setHoverToolbar(null);
      setClickToolbar(null);
    });

    // Dismiss toolbars on any click inside the iframe contents and attach hover handlers
    try {
      rendition.on('rendered', (_section: any, contents: any) => {
        const doc: Document | undefined = contents?.document;
        if (!doc) return;
        const handler = () => { setToolbarPosition(null); setNotePopup(null); setHoverToolbar(null); setClickToolbar(null); };
        doc.addEventListener('mousedown', handler);
        // No hover toolbar; toolbar is shown on click now
        // Best-effort removal when content is destroyed
        try { contents.on && contents.on('destroy', () => doc.removeEventListener('mousedown', handler)); } catch {}
      });
    } catch {}
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
        try {
          rendition.annotations.remove(a.cfiRange, 'highlight');
        } catch (error) {
          console.warn('Failed to remove highlight:', error);
        }
      });
    } catch (error) {
      console.warn('Failed to clear highlights:', error);
    }
    
    anns.forEach((a) => {
      try {
        rendition.annotations.add(
          'highlight',
          a.cfiRange,
          {},
          (e: any) => handleHighlightClick(e, a),
          'epub-highlight'
        );
      } catch (error) {
        console.warn('Failed to add highlight:', error);
      }
    });
  };

  const handleHighlightClick = (e: any, annotation: Annotation) => {
    try {
      // Find the actual highlight element to position above
      const rawTarget = (e?.target as Node) || null;
      const elementTarget: HTMLElement | null = (rawTarget && (rawTarget.nodeType === 1 ? (rawTarget as HTMLElement) : (rawTarget.parentElement))) || null;
      const ownerDoc: Document | null = elementTarget ? elementTarget.ownerDocument : null;
      let highlightEl: HTMLElement | null = null;
      if (elementTarget && typeof elementTarget.closest === 'function') {
        highlightEl = elementTarget.closest('.epubjs-hl, .epub-highlight') as HTMLElement | null;
      }
      if (!highlightEl && ownerDoc) {
        // Fallback: query by CFI on known attributes
        const selectors = [
          `.epubjs-hl[data-epubcfi="${annotation.cfiRange}"]`,
          `.epub-highlight[data-epubcfi="${annotation.cfiRange}"]`,
          `.epubjs-hl[data-cfi="${annotation.cfiRange}"]`,
          `.epub-highlight[data-cfi="${annotation.cfiRange}"]`,
        ];
        for (const sel of selectors) {
          const el = ownerDoc.querySelector(sel) as HTMLElement | null;
          if (el) { highlightEl = el; break; }
        }
      }
      const rect = highlightEl ? highlightEl.getBoundingClientRect() : (elementTarget ? elementTarget.getBoundingClientRect() : null);
      const iframeEl: HTMLIFrameElement | null = ownerDoc ? (ownerDoc.defaultView?.frameElement as HTMLIFrameElement) : null;
      const padding = 6;
      const toolbarWidth = 280;
      const toolbarHeight = 40;
      if (rect) {
        // Strategy A: rect is relative to iframe viewport → add iframe offsets
        let leftA = 0; let topA = 0; let validA = false;
        if (iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          leftA = iframeRect.left + rect.left + rect.width / 2 - toolbarWidth / 2;
          const topCandidateA = iframeRect.top + rect.top - toolbarHeight - padding;
          topA = topCandidateA < 8 ? iframeRect.top + rect.bottom + padding : topCandidateA;
          validA = true;
        }
        // Strategy B: rect is already in global viewport → use directly
        let leftB = rect.left + rect.width / 2 - toolbarWidth / 2;
        const topCandidateB = rect.top - toolbarHeight - padding;
        let topB = topCandidateB < 8 ? rect.bottom + padding : topCandidateB;
        // Clamp both
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
        if (validA) {
          leftA = clamp(leftA, 8, window.innerWidth - toolbarWidth - 8);
          topA = clamp(topA, 8, window.innerHeight - toolbarHeight - 8);
        }
        leftB = clamp(leftB, 8, window.innerWidth - toolbarWidth - 8);
        topB = clamp(topB, 8, window.innerHeight - toolbarHeight - 8);
        // Choose the candidate that requires less clamping (more natural)
        const score = (l: number, t: number, baseL: number, baseT: number) => Math.abs(l - baseL) + Math.abs(t - baseT);
        const baseLA = validA ? (iframeEl!.getBoundingClientRect().left + rect.left + rect.width / 2 - toolbarWidth / 2) : Infinity;
        const baseTA = validA ? (iframeEl!.getBoundingClientRect().top + rect.top - toolbarHeight - padding) : Infinity;
        const baseLB = rect.left + rect.width / 2 - toolbarWidth / 2;
        const baseTB = rect.top - toolbarHeight - padding;
        let useA = validA;
        if (validA) {
          const sA = score(leftA, topA, baseLA, baseTA);
          const sB = score(leftB, topB, baseLB, baseTB);
          useA = sA <= sB;
        }
        const finalLeft = validA && useA ? leftA : leftB;
        const finalTop = validA && useA ? topA : topB;
        setClickToolbar({ top: finalTop, left: finalLeft, annotation });
      } else {
        setClickToolbar({ top: 20, left: (window.innerWidth - 280) / 2, annotation });
      }
    } catch {
      setClickToolbar({ top: 20, left: (window.innerWidth - 280) / 2, annotation });
    }
  };

  const saveAnnotation = async () => {
    if (!pendingSelection || !noteDraft.trim()) {
      setShowNoteModal(false);
      return;
    }
    let next: Annotation[];
    if (pendingSelection.id) {
      next = annotations.map(a => a.id === pendingSelection.id ? { ...a, note: noteDraft.trim(), updatedAt: new Date().toISOString() } : a);
    } else {
      const newAnn: Annotation = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        cfiRange: pendingSelection.cfiRange,
        text: pendingSelection.text,
        note: noteDraft.trim(),
        createdAt: new Date().toISOString(),
      };
      next = [...annotations, newAnn];
    }
    setAnnotations(next);
    setShowNoteModal(false);
    setPendingSelection(null);
    setToolbarPosition(null);
    setHoverToolbar(null);
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

  // Dismiss toolbar on outside clicks in the main document
  useEffect(() => {
    if (!toolbarPosition) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = toolbarRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setToolbarPosition(null);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [toolbarPosition]);

  // Dismiss note popup on outside click
  useEffect(() => {
    if (!notePopup) return;
    const onDocMouseDown = () => setNotePopup(null);
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [notePopup]);

  // Dismiss click toolbar on outside click
  useEffect(() => {
    if (!clickToolbar) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = clickToolbarRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setClickToolbar(null);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [clickToolbar]);

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
      {toolbarPosition && pendingSelection && createPortal(
        <div
          className="selection-toolbar"
          ref={toolbarRef}
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
        </div>,
        document.body
      )}
      {clickToolbar && createPortal(
        <div
          className="selection-toolbar"
          ref={clickToolbarRef}
          style={{ position: 'fixed', top: clickToolbar.top, left: clickToolbar.left, width: 280 }}
        >
          <button
            className="toolbar-btn"
            onClick={() => {
              setPendingSelection({ id: clickToolbar.annotation.id, cfiRange: clickToolbar.annotation.cfiRange, text: clickToolbar.annotation.text });
              setNoteDraft(clickToolbar.annotation.note);
              setShowNoteModal(true);
              setClickToolbar(null);
            }}
          >编辑</button>
          <button
            className="toolbar-btn"
            onClick={() => {
              setNotePopup({ top: clickToolbar.top, left: clickToolbar.left, annotation: clickToolbar.annotation });
              setClickToolbar(null);
            }}
          >查看</button>
          <button
            className="toolbar-btn secondary"
            onClick={() => {
              removeAnnotation(clickToolbar.annotation.id);
              setClickToolbar(null);
            }}
          >删除</button>
        </div>,
        document.body
      )}
      {notePopup && createPortal(
        <div
          className="note-popup"
          style={{ position: 'fixed', top: notePopup.top, left: notePopup.left, width: 280 }}
        >
          <div className="note-popup-header">
            <span>批注</span>
            <button className="note-popup-close" onClick={() => setNotePopup(null)}>✕</button>
          </div>
          <div className="note-popup-text">{notePopup.annotation.text}</div>
          <div className="note-popup-note">{notePopup.annotation.note}</div>
        </div>,
        document.body
      )}
      {/* Simple note modal */}
      {showNoteModal && (
        <div className="note-modal-backdrop">
          <div className="note-modal">
            <h4>{pendingSelection?.id ? '编辑批注' : '添加批注'}</h4>
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
      {/* Sidebar notes list removed per request */}
    </div>
  );
};

export default EpubReader;
