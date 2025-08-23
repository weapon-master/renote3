import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Annotation, Book } from '../../../types';
import { ReactReader } from 'react-reader';
import { AnnotationColor } from '../../../const/annotation-color';
import './EpubReader.css';
import { useBookStore } from '@/store/book';
import { useAnnotationStore } from '@/store/annotation';
import { useCardStore } from '@/store/card';
import { Rendition } from 'epubjs';

interface EpubReaderProps {
  book: Book;
  onAnnotationClick?: (annotation: Annotation) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
}

const EpubReader: React.FC<EpubReaderProps> = ({
  // book,
  onAnnotationClick,
  onAnnotationsChange,
}) => {
  const book = useBookStore(state => state.currBook);
  const readingProgress = book.readingProgress;
  // const [location, setLocation] = useState<string | number>(
  //   book.readingProgress || 0,
  // );
  // const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const renditionRef = useRef<any>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    id?: string;
    cfiRange: string;
    text: string;
  } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState<boolean>(false);
  const [toolbarPosition, setToolbarPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [notePopup, setNotePopup] = useState<{
    top: number;
    left: number;
    annotation: Annotation;
  } | null>(null);
  const [hoverToolbar, setHoverToolbar] = useState<{
    top: number;
    left: number;
    annotation: Annotation;
  } | null>(null);
  const hoverToolbarRef = useRef<HTMLDivElement | null>(null);
  const [clickToolbar, setClickToolbar] = useState<{
    top: number;
    left: number;
    annotation: Annotation;
  } | null>(null);
  const clickToolbarRef = useRef<HTMLDivElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(
    AnnotationColor.HighlightYellow,
  );
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const updateReadingProgress = useBookStore((state) => state.updateReadingProgress)
  const loadAnnotationsByBook = useAnnotationStore(state => state.loadAnnotationsByBook);
  const createAnnotation = useAnnotationStore(state => state.createAnnotation);
  const updateAnnotation = useAnnotationStore(state => state.updateAnnotation);
  const deleteAnnotation = useAnnotationStore(state => state.deleteAnnotation)
  const annotations = useAnnotationStore(state => state.annotations);
  const createCard = useCardStore(state => state.createCard);
  const epubUrl = useMemo(() => {
    if (window.electron?.epub?.getLocalFileUrl) {
      return window.electron.epub.getLocalFileUrl(book.filePath);
    }
    return undefined;
  }, [book.filePath]);

  const handleLocationChange = (epubcfi: string) => {
    updateReadingProgress(book.id, epubcfi)
    console.log('Location changed to:', epubcfi);
  };

  // Navigate to annotation location
  const navigateToAnnotation = (annotation: Annotation) => {
    if (renditionRef.current) {
      try {
        renditionRef.current.display(annotation.cfiRange);
        // Highlight the annotation briefly
        // renditionRef.current.annotations.add('highlight', annotation.cfiRange, {}, (e: any) => {
        //   // Remove highlight after 2 seconds
        //   setTimeout(() => {
        //     try {
        //       renditionRef.current?.annotations.remove(annotation.cfiRange, 'highlight');
        //     } catch (error) {
        //       console.warn('Failed to remove temporary highlight:', error);
        //     }
        //   }, 2000);
        // });
      } catch (error) {
        console.warn('Failed to navigate to annotation:', error);
      }
    }
  };
  useEffect(() => {
    loadAnnotationsByBook(book.id)
  }, [book.id]);
  // Expose navigation function to parent component
  useEffect(() => {
    if (onAnnotationClick) {
      // Store the navigation function in a way that parent can access
      (window as any).navigateToAnnotation = navigateToAnnotation;
    }
  }, [onAnnotationClick, renditionRef.current]);

  // When ReactReader gives us the rendition, wire selection handler and render highlights
  const handleRendition = (rendition: any) => {
    console.log('Rendition ready, setting up highlights');
    renditionRef.current = rendition;
    // Ensure selection is visually highlighted inside the iframe
    try {
      rendition.themes.default({
        '::selection': { background: 'rgba(0, 123, 255, 0.35)' },
        // ensure highlights can receive hover events and are visible
        '.epubjs-hl': {
          pointerEvents: 'auto',
          zIndex: '1',
          borderRadius: '2px',
          padding: '1px 2px',
          margin: '0 1px',
        },
        '.epub-highlight': {
          pointerEvents: 'auto',
          zIndex: '1',
          borderRadius: '2px',
          padding: '1px 2px',
          margin: '0 1px',
        },
        '.epubjs-ul': {
          pointerEvents: 'auto',
          zIndex: '1',
          borderRadius: '2px',
          padding: '1px 2px',
          margin: '0 1px',
        },
        '.epubjs-hl[data-epubcfi]': {
          zIndex: '1',
          borderRadius: '2px',
          padding: '1px 2px',
          margin: '0 1px',
        },
      });
      console.log('Theme applied successfully');
    } catch (error) {
      console.warn('Failed to apply selection theme:', error);
    }
    // Render existing highlights
    console.log(
      'Initial highlights application with',
      annotations.length,
      'annotations',
    );
    if (annotations.length > 0) {
      setTimeout(() => {
        applyHighlights(rendition, annotations);
      }, 200);
    }

    // Re-apply highlights when content is rendered
    rendition.on('rendered', (_section: any, contents: any) => {
      // Small delay to ensure content is fully rendered
      setTimeout(() => {
        applyHighlights(rendition, annotations);
      }, 100);
    });

    // Also re-apply highlights when location changes
    // rendition.on('relocated', () => {
    //   setTimeout(() => {
    //     applyHighlights(rendition, annotations);
    //   }, 200);
    // });
    // Selection handler
    rendition.on('selected', (cfiRange: string, contents: any) => {
      const sel = contents.window.getSelection();
      const selectedText = sel ? sel.toString() : '';
      console.log('Selection made - CFI:', cfiRange, 'Text:', selectedText);
      setPendingSelection({ cfiRange, text: selectedText });
      setNoteDraft('');
      setSelectedColor(AnnotationColor.HighlightYellow);
      setShowColorPicker(false);
      // Position toolbar above selection
      try {
        const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const rect = range ? range.getBoundingClientRect() : null;
        const iframeEl: HTMLIFrameElement | null =
          contents.iframe ||
          (contents?.document?.defaultView
            ?.frameElement as HTMLIFrameElement) ||
          null;
        if (rect && iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          const padding = 8;
          const toolbarWidth = 220;
          const toolbarHeight = 40;
          let left =
            iframeRect.left + rect.left + rect.width / 2 - toolbarWidth / 2;
          // Prefer above; if not enough room, place below selection
          const topCandidate =
            iframeRect.top + rect.top - toolbarHeight - padding;
          let top = topCandidate;
          if (topCandidate < 8) {
            top = iframeRect.top + rect.bottom + padding;
          }
          // Clamp to viewport
          left = Math.max(
            8,
            Math.min(window.innerWidth - toolbarWidth - 8, left),
          );
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
        const handler = () => {
          setToolbarPosition(null);
          setNotePopup(null);
          setHoverToolbar(null);
          setClickToolbar(null);
        };
        doc.addEventListener('mousedown', handler);
        // No hover toolbar; toolbar is shown on click now
        // Best-effort removal when content is destroyed
        try {
          if (contents.on) {
            contents.on('destroy', () =>
              doc.removeEventListener('mousedown', handler),
            );
          }
        } catch {
          // Ignore errors
        }
      });
    } catch {
      // Ignore errors
    }
  };

  useEffect(() => {
    console.log(
      'Annotations changed, applying highlights. Count:',
      annotations.length,
    );
    if (renditionRef.current) {
      // Small delay to ensure any pending renders are complete
      setTimeout(() => {
        applyHighlights(renditionRef.current, annotations);
      }, 50);
    } else {
      console.log('Rendition not ready yet');
    }
  }, [annotations]);

  const applyHighlights = (rendition: Rendition, anns: Annotation[]) => {
    console.log('Applying highlights for', anns.length, 'annotations');

    if (!rendition || !rendition.annotations) {
      console.warn('Rendition or annotations not available');
      return;
    }
    const newAnns = anns.filter(ann => {
      const range = ann.cfiRange;
      //@ts-ignore
      return !Object.values(rendition.annotations._annotations).find(item => item.cfiRange === range);
    })
    if (!newAnns.length) {
      return;
    }
    anns = newAnns;
    // First, remove all existing highlights to avoid duplicates
    try {
      rendition.annotations.remove('highlight');
      console.log('Removed existing highlights');
    } catch (error) {
      console.warn('Failed to remove existing highlights:', error);
    }

    // Add highlights for each annotation
    anns.forEach((a) => {
      try {
        console.log(
          'Adding highlight for annotation:',
          a.id,
          'at CFI:',
          a.cfiRange,
          'with color:',
          a.color?.rgba,
        );

        // Validate CFI range
        if (!a.cfiRange || a.cfiRange.trim() === '') {
          console.warn('Invalid CFI range for annotation:', a.id);
          return;
        }

        // Try multiple approaches to add highlight
        let success = false;

        // Method 1: Standard approach with callback
        try {
          rendition.annotations.add(
            'highlight',
            a.cfiRange,
            {
              backgroundColor: a.color?.rgba || AnnotationColor.HighlightYellow,
              borderRadius: '2px',
              padding: '1px 2px',
              margin: '0 1px',
            },
            (e: any) => handleHighlightClick(e, a),
            '',
            { fill: a.color?.rgba || AnnotationColor.HighlightYellow },
          );
          console.log(
            'Successfully added highlight (method 1) for annotation:',
            a.id,
          );
          success = true;
        } catch (method1Error) {
          console.warn('Method 1 failed:', method1Error);
        }

        // Method 2: Without callback
        if (!success) {
          try {
            rendition.annotations.add(
              'highlight',
              a.cfiRange,
              {
                backgroundColor:
                  a.color?.rgba || AnnotationColor.HighlightYellow,
                borderRadius: '2px',
                padding: '1px 2px',
                margin: '0 1px',
              },
              (e: any) => handleHighlightClick(e, a),
              '',
              { fill: a.color?.rgba || AnnotationColor.HighlightYellow },
            );
            console.log(
              'Successfully added highlight (method 2) for annotation:',
              a.id,
            );
            success = true;
          } catch (method2Error) {
            console.warn('Method 2 failed:', method2Error);
          }
        }

        // Method 3: Try with different annotation type
        if (!success) {
          try {
            rendition.annotations.add(
              'underline',
              a.cfiRange,
              {
                backgroundColor:
                  a.color?.rgba || AnnotationColor.HighlightYellow,
                borderRadius: '2px',
                padding: '1px 2px',
                margin: '0 1px',
              },
              (e: any) => handleHighlightClick(e, a),
              '',
              { fill: a.color?.rgba || AnnotationColor.HighlightYellow },
            );
            console.log(
              'Successfully added highlight (method 3) for annotation:',
              a.id,
            );
            success = true;
          } catch (method3Error) {
            console.warn('Method 3 failed:', method3Error);
          }
        }

        if (!success) {
          console.error('All methods failed for annotation:', a.id);
        }
      } catch (error) {
        console.warn('Failed to add highlight for annotation:', a.id, error);
      }
    });

    // Debug: Check if highlights are visible
    setTimeout(() => {
      try {
        const iframe = rendition.manager?.container?.querySelector('iframe');
        if (iframe && iframe.contentDocument) {
          const highlights = iframe.contentDocument.querySelectorAll(
            '.epubjs-hl, .epub-highlight, .epubjs-ul',
          );
          console.log('Found', highlights.length, 'highlight elements in DOM');
          highlights.forEach((hl: Element, index: number) => {
            const textContent = hl.textContent?.substring(0, 50);
            const backgroundColor = (hl as HTMLElement).style.backgroundColor;
            console.log(
              `Highlight ${index}:`,
              textContent,
              'style:',
              backgroundColor,
            );
          });
        } else {
          console.warn('No iframe or contentDocument found');
        }
      } catch (error) {
        console.warn('Failed to debug highlights:', error);
      }
    }, 500);
  };

  const handleHighlightClick = (e: any, annotation: Annotation) => {
    try {
      // Find the actual highlight element to position above
      const rawTarget = (e?.target as Node) || null;
      const elementTarget: HTMLElement | null =
        (rawTarget &&
          (rawTarget.nodeType === 1
            ? (rawTarget as HTMLElement)
            : rawTarget.parentElement)) ||
        null;
      const ownerDoc: Document | null = elementTarget
        ? elementTarget.ownerDocument
        : null;
      let highlightEl: HTMLElement | null = null;
      if (elementTarget && typeof elementTarget.closest === 'function') {
        highlightEl = elementTarget.closest(
          '.epubjs-hl, .epub-highlight',
        ) as HTMLElement | null;
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
          if (el) {
            highlightEl = el;
            break;
          }
        }
      }
      const rect = highlightEl
        ? highlightEl.getBoundingClientRect()
        : elementTarget
          ? elementTarget.getBoundingClientRect()
          : null;
      const iframeEl: HTMLIFrameElement | null = ownerDoc
        ? (ownerDoc.defaultView?.frameElement as HTMLIFrameElement)
        : null;
      const padding = 6;
      const toolbarWidth = 280;
      const toolbarHeight = 40;
      if (rect) {
        // Strategy A: rect is relative to iframe viewport → add iframe offsets
        let leftA = 0;
        let topA = 0;
        let validA = false;
        if (iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          leftA =
            iframeRect.left + rect.left + rect.width / 2 - toolbarWidth / 2;
          const topCandidateA =
            iframeRect.top + rect.top - toolbarHeight - padding;
          topA =
            topCandidateA < 8
              ? iframeRect.top + rect.bottom + padding
              : topCandidateA;
          validA = true;
        }
        // Strategy B: rect is already in global viewport → use directly
        let leftB = rect.left + rect.width / 2 - toolbarWidth / 2;
        const topCandidateB = rect.top - toolbarHeight - padding;
        let topB = topCandidateB < 8 ? rect.bottom + padding : topCandidateB;
        // Clamp both
        const clamp = (v: number, min: number, max: number) =>
          Math.max(min, Math.min(max, v));
        if (validA) {
          leftA = clamp(leftA, 8, window.innerWidth - toolbarWidth - 8);
          topA = clamp(topA, 8, window.innerHeight - toolbarHeight - 8);
        }
        leftB = clamp(leftB, 8, window.innerWidth - toolbarWidth - 8);
        topB = clamp(topB, 8, window.innerHeight - toolbarHeight - 8);
        // Choose the candidate that requires less clamping (more natural)
        const score = (l: number, t: number, baseL: number, baseT: number) =>
          Math.abs(l - baseL) + Math.abs(t - baseT);
        const baseLA = validA
          ? iframeEl!.getBoundingClientRect().left +
          rect.left +
          rect.width / 2 -
          toolbarWidth / 2
          : Infinity;
        const baseTA = validA
          ? iframeEl!.getBoundingClientRect().top +
          rect.top -
          toolbarHeight -
          padding
          : Infinity;
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
        setClickToolbar({
          top: 20,
          left: (window.innerWidth - 280) / 2,
          annotation,
        });
      }
    } catch {
      setClickToolbar({
        top: 20,
        left: (window.innerWidth - 280) / 2,
        annotation,
      });
    }
  };

  const saveAnnotation = async () => {
    if (!pendingSelection || !noteDraft.trim()) {
      setShowNoteModal(false);
      return;
    }
    let next: Annotation[];
    if (pendingSelection.id) {
      // edit
      await updateAnnotation(book.id, {
        note: noteDraft.trim(),
        color: {
          rgba: selectedColor,
          category: 'default',
        },
        updatedAt: Date.now(),
      })
    } else {
      // create
      const newAnn: Annotation = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        bookId: book.id,
        cfiRange: pendingSelection.cfiRange,
        text: pendingSelection.text,
        title: `Note ${annotations.length + 1}`,
        note: noteDraft.trim(),
        color: {
          rgba: selectedColor,
          category: 'default',
        },
        createdAt: Date.now(),
      };
      const savedAnnotation = await createAnnotation(book.id, newAnn);
       const defaultCard = {
          annotationId: savedAnnotation.id,
          position: { x: 50 + annotations.length * 200, y: 50 + annotations.length * 150 },
          width: 200,
          height: 120,
        };
        const savedCard = await createCard(defaultCard);
        console.log('Creating default card for new annotation:', savedAnnotation.id, savedCard.id);
    }
    // Persist to storage via Electron API
      // Clear UI state
      setShowNoteModal(false);
      setPendingSelection(null);
      setToolbarPosition(null);
      setHoverToolbar(null);
    };

    const removeAnnotation = async (id: string) => {
      try {
        await deleteAnnotation(id);
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
          setShowColorPicker(false);
        }
      };
      document.addEventListener('mousedown', onDocMouseDown, true);
      return () =>
        document.removeEventListener('mousedown', onDocMouseDown, true);
    }, [toolbarPosition]);

    // Dismiss note popup on outside click
    useEffect(() => {
      if (!notePopup) return;
      const onDocMouseDown = () => setNotePopup(null);
      document.addEventListener('mousedown', onDocMouseDown, true);
      return () =>
        document.removeEventListener('mousedown', onDocMouseDown, true);
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
      return () =>
        document.removeEventListener('mousedown', onDocMouseDown, true);
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
          location={readingProgress}
          locationChanged={handleLocationChange}
          swipeable={false}
          showToc
          getRendition={handleRendition}
        />
        {toolbarPosition &&
          pendingSelection &&
          createPortal(
            <div
              className="selection-toolbar"
              ref={toolbarRef}
              style={{
                position: 'fixed',
                top: toolbarPosition.top,
                left: toolbarPosition.left,
                width: 280,
              }}
            >
              <div className="color-picker-container">
                <button
                  className="color-picker-btn"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="color-picker-dropdown">
                    {Object.entries(AnnotationColor).map(([name, color]) => (
                      <button
                        key={name}
                        className="color-option"
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setSelectedColor(color);
                          setShowColorPicker(false);
                        }}
                        title={name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                className="toolbar-btn"
                onClick={() => {
                  setShowNoteModal(true);
                }}
              >
                添加批注
              </button>
              <button
                className="toolbar-btn secondary"
                onClick={() => {
                  /* explain no-op for now */
                }}
              >
                解释
              </button>
            </div>,
            document.body,
          )}
        {clickToolbar &&
          createPortal(
            <div
              className="selection-toolbar"
              ref={clickToolbarRef}
              style={{
                position: 'fixed',
                top: clickToolbar.top,
                left: clickToolbar.left,
                width: 280,
              }}
            >
              <button
                className="toolbar-btn"
                onClick={() => {
                  setPendingSelection({
                    id: clickToolbar.annotation.id,
                    cfiRange: clickToolbar.annotation.cfiRange,
                    text: clickToolbar.annotation.text,
                  });
                  setNoteDraft(clickToolbar.annotation.note);
                  setSelectedColor(
                    clickToolbar.annotation.color?.rgba ||
                    AnnotationColor.HighlightYellow,
                  );
                  setShowNoteModal(true);
                  setClickToolbar(null);
                }}
              >
                编辑
              </button>
              <button
                className="toolbar-btn"
                onClick={() => {
                  setNotePopup({
                    top: clickToolbar.top,
                    left: clickToolbar.left,
                    annotation: clickToolbar.annotation,
                  });
                  setClickToolbar(null);
                }}
              >
                查看
              </button>
              <button
                className="toolbar-btn secondary"
                onClick={() => {
                  removeAnnotation(clickToolbar.annotation.id);
                  setClickToolbar(null);
                }}
              >
                删除
              </button>
            </div>,
            document.body,
          )}
        {notePopup &&
          createPortal(
            <div
              className="note-popup"
              style={{
                position: 'fixed',
                top: notePopup.top,
                left: notePopup.left,
                width: 280,
              }}
            >
              <div className="note-popup-header">
                <span>批注</span>
                <button
                  className="note-popup-close"
                  onClick={() => setNotePopup(null)}
                >
                  ✕
                </button>
              </div>
              <div className="note-popup-text">{notePopup.annotation.text}</div>
              <div className="note-popup-note">{notePopup.annotation.note}</div>
            </div>,
            document.body,
          )}
        {/* Simple note modal */}
        {showNoteModal && (
          <div className="note-modal-backdrop">
            <div className="note-modal">
              <h4>{pendingSelection?.id ? '编辑批注' : '添加批注'}</h4>
              <div className="note-selected-text">{pendingSelection?.text}</div>
              <div className="note-color-selector">
                <label>选择颜色:</label>
                <div className="color-options">
                  {Object.entries(AnnotationColor).map(([name, color]) => (
                    <button
                      key={name}
                      className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      title={name}
                    />
                  ))}
                </div>
              </div>
              <textarea
                placeholder="输入你的笔记..."
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <div className="note-actions">
                <button className="nav-btn" onClick={saveAnnotation}>
                  保存
                </button>
                <button
                  className="nav-btn"
                  onClick={() => {
                    setShowNoteModal(false);
                    setPendingSelection(null);
                    setToolbarPosition(null);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Sidebar notes list removed per request */}
      </div>
    );
  };

  export default EpubReader;
