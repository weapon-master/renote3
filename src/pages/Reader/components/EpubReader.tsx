import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Annotation, Book } from '../../../types';
import { ReactReader } from 'react-reader';
import { AnnotationColor } from '../../../const/annotation-color';

import { useBookStore } from '@/store/book';
import { useAnnotationStore } from '@/store/annotation';
import { Rendition } from 'epubjs';
import ChapterSelector from '../../../components/ChapterSelector';
import DescriptionConfirm from '../../../components/DescriptionConfirm';
import ExplanationPopup from '../../../components/ExplanationPopup';

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
  const renditionRef = useRef<Rendition>(null);
  const bookRef = useRef<Rendition['book']>(null);
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
  
  // Description generation states
  const [showChapterSelector, setShowChapterSelector] = useState<boolean>(false);
  const [showDescriptionConfirm, setShowDescriptionConfirm] = useState<boolean>(false);
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState<boolean>(false);
  const [chapters, setChapters] = useState<Array<{index: number; title: string; href: string}>>([]);
  const [showDescriptionButton, setShowDescriptionButton] = useState<boolean>(false);
  
  // Explanation states
  const [showExplanationPopup, setShowExplanationPopup] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState<boolean>(false);
  const updateReadingProgress = useBookStore((state) => state.updateReadingProgress)
  const updateBook = useBookStore((state) => state.updateBook)
  const loadAnnotationsByBook = useAnnotationStore(state => state.loadAnnotationsByBook);
  const createAnnotation = useAnnotationStore(state => state.createAnnotation);
  const updateAnnotation = useAnnotationStore(state => state.updateAnnotation);
  const deleteAnnotation = useAnnotationStore(state => state.deleteAnnotation)
  const annotations = useAnnotationStore(state => state.annotations);
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
  console.log('bookRef', bookRef.current);
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

  // Check if book needs description generation
  useEffect(() => {
    if (!book.description && bookRef.current && !showChapterSelector && !showDescriptionConfirm) {
      // Check if user has dismissed the description generation for this book
      const dismissedKey = `description_dismissed_${book.id}`;
      const isDismissed = localStorage.getItem(dismissedKey) === 'true';
      
      if (!isDismissed) {
        // Get chapters from table of contents (toc) instead of spine
        const book = bookRef.current;
        const chaptersList = [];
        
        // @ts-ignore - toc contains the actual chapters with titles
        const toc = book.navigation?.toc || [];
        
        for (let i = 0; i < toc.length; i++) {
          const item = toc[i];
          if (item && item.href) {
            chaptersList.push({
              index: i,
              title: item.label || `第${i + 1}章`,
              href: item.href
            });
          }
        }
        
        // If toc is empty, fallback to spine but try to get better titles
        if (chaptersList.length === 0) {
          // @ts-ignore - spine.items is the correct way to access spine items
          const items = book.spine?.items || [];
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item) {
              // Try to get title from manifest or use a more descriptive name
              // @ts-ignore - manifest might contain title information
              const manifestItem = book.manifest?.[item.id];
              const title = manifestItem?.title || 
                           (item.id && item.id.toLowerCase().includes('chapter') ? item.id : `第${i + 1}章`);
              
              chaptersList.push({
                index: i,
                title: title,
                href: item.href
              });
            }
          }
        }
        
        setChapters(chaptersList);
        setShowChapterSelector(true);
      } else {
        // Show the manual description generation button
        setShowDescriptionButton(true);
      }
    }
  }, [book.description, bookRef.current, showChapterSelector, showDescriptionConfirm]);

  // Handle chapter selection
  const handleChapterSelect = async (chapter: {index: number; title: string; href: string}) => {
    setShowChapterSelector(false);
    setIsGeneratingDescription(true);
    setShowDescriptionConfirm(true);

    try {
      if (bookRef.current) {
        // Find the spine item that corresponds to the selected chapter
        const book = bookRef.current;
        // @ts-ignore - spine.items is the correct way to access spine items
        const spineItems = book.spine?.items || [];
        
        // Find the spine item that matches the chapter href
        let spineItem = null;
        let spinIndex = 0
        for (const item of spineItems) {
          if (item && item.href === chapter.href) {
            spineItem = item;
            spinIndex = spineItems.indexOf(item);
            break;
          }
        }
        
        // If not found by href, try by index
        if (!spineItem && spineItems[chapter.index]) {
          spineItem = spineItems[chapter.index];
          spinIndex = chapter.index;
        }
        
        if (spineItem) {
          const spineSection = book.spine.get(spinIndex);
          const doc = await spineSection.load(book.load.bind(book));
          // @ts-ignore
          const text = doc.innerText;
          
          // Call summarizeBook function
          const summary = await window.electron.llm.summarizeBook(text);
          setGeneratedDescription(summary);
        } else {
          throw new Error('无法找到对应的章节内容');
        }
      }
    } catch (error) {
      console.error('Error generating description:', error);
      setGeneratedDescription('生成描述时出现错误，请重试。');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Handle description acceptance
  const handleAcceptDescription = async () => {
    try {
      await updateBook(book.id, { description: generatedDescription });
      setShowDescriptionConfirm(false);
      setGeneratedDescription('');
      setShowDescriptionButton(false); // Hide the button after successful save
    } catch (error) {
      console.error('Error saving description:', error);
    }
  };

  // Handle description rejection
  const handleRejectDescription = () => {
    setShowDescriptionConfirm(false);
    setGeneratedDescription('');
    setShowChapterSelector(true);
  };

  // Handle manual description generation trigger
  const handleManualDescriptionGeneration = () => {
    if (bookRef.current) {
      const book = bookRef.current;
      const chaptersList = [];
      
      // @ts-ignore - toc contains the actual chapters with titles
      const toc = book.navigation?.toc || [];
      
      for (let i = 0; i < toc.length; i++) {
        const item = toc[i];
        if (item && item.href) {
          chaptersList.push({
            index: i,
            title: item.label || `第${i + 1}章`,
            href: item.href
          });
        }
      }
      
      // If toc is empty, fallback to spine but try to get better titles
      if (chaptersList.length === 0) {
        // @ts-ignore - spine.items is the correct way to access spine items
        const items = book.spine?.items || [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item) {
            // Try to get title from manifest or use a more descriptive name
            // @ts-ignore - manifest might contain title information
            const manifestItem = book.manifest?.[item.id];
            const title = manifestItem?.title || 
                         (item.id && item.id.toLowerCase().includes('chapter') ? item.id : `第${i + 1}章`);
            
            chaptersList.push({
              index: i,
              title: title,
              href: item.href
            });
          }
        }
      }
      
      setChapters(chaptersList);
      setShowChapterSelector(true);
    }
  };

  // Handle explanation generation
  const handleGenerateExplanation = async () => {
    if (!pendingSelection) return;
    
    setIsGeneratingExplanation(true);
    setShowExplanationPopup(true);
    
    try {
      const topic = book.topic || book.title || '通用';
      const explanation = await window.electron.llm.explainText(topic, pendingSelection.text);
      setExplanation(explanation);
    } catch (error) {
      console.error('Error generating explanation:', error);
      setExplanation('生成解释时出现错误，请重试。');
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  // Handle explanation acceptance
  const handleAcceptExplanation = async (explanationText: string) => {
    if (!pendingSelection) return;
    
    try {
      const newAnnotation = await createAnnotation(book.id, {
        bookId: book.id,
        cfiRange: pendingSelection.cfiRange,
        text: pendingSelection.text,
        title: `解释笔记 ${annotations.length + 1}`,
        note: explanationText,
        color: {
          rgba: AnnotationColor.MintGreen,
          category: 'explanation'
        },
        createdAt: Date.now()
      });
      
      // Clear UI state
      setShowExplanationPopup(false);
      setPendingSelection(null);
      setToolbarPosition(null);
      setExplanation('');
      
      console.log('解释笔记创建成功:', newAnnotation);
    } catch (error) {
      console.error('Error creating explanation annotation:', error);
    }
  };

  // Handle explanation rejection
  const handleRejectExplanation = () => {
    setShowExplanationPopup(false);
    setExplanation('');
  };

  // Handle explanation regeneration
  const handleRegenerateExplanation = async () => {
    if (!pendingSelection) return;
    
    setIsGeneratingExplanation(true);
    
    try {
      const topic = book.topic || book.title || '通用';
      const newExplanation = await window.electron.llm.explainText(topic, pendingSelection.text);
      setExplanation(newExplanation);
    } catch (error) {
      console.error('Error regenerating explanation:', error);
      setExplanation('重新生成解释时出现错误，请重试。');
    } finally {
      setIsGeneratingExplanation(false);
    }
  };
  // Expose navigation function to parent component
  useEffect(() => {
    if (onAnnotationClick) {
      // Store the navigation function in a way that parent can access
      (window as any).navigateToAnnotation = navigateToAnnotation;
    }
  }, [onAnnotationClick, renditionRef.current]);

  useEffect(() => {
    if (!book.description && renditionRef.current && bookRef.current) {
      const spineItems = bookRef.current.spine;
      const spineItem = spineItems.get(2);
      (async () => {
        const doc = await spineItem.load(bookRef.current.load.bind(bookRef.current))
        // @ts-ignore
        const text = doc.innerText;
        console.log('htmlContent', text);
      })();
    }
  }, [book]);

  // When ReactReader gives us the rendition, wire selection handler and render highlights
  const handleRendition = (rendition: Rendition) => {
    console.log('Rendition ready, setting up highlights');
    renditionRef.current = rendition;
    bookRef.current = rendition.book;
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
    // const newAnns = anns.filter(ann => {
    //   const range = ann.cfiRange;
    //   //@ts-ignore
    //   return !Object.values(rendition.annotations._annotations).find(item => item.cfiRange === range);
    // })
    // if (!newAnns.length) {
    //   return;
    // }
    // anns = newAnns;
    // First, remove all existing highlights to avoid duplicates
    try {
      rendition.annotations.remove('highlight', '');
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
        // @ts-ignore - manager property exists on rendition
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
      await createAnnotation(book.id, newAnn);
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
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-800 mb-2">无法生成EPUB读取地址</h3>
            <p className="text-red-600 mb-2">文件路径: {book.filePath}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full relative bg-white">
        <div className="w-full h-full">
          <ReactReader
            url={epubUrl}
            location={readingProgress}
            locationChanged={handleLocationChange}
            swipeable={false}
            showToc
            getRendition={handleRendition}
          />
        </div>
        
        {/* Manual Description Generation Button */}
        {showDescriptionButton && !book.description && (
          <div className="fixed top-4 right-4 z-40">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 font-medium"
              onClick={handleManualDescriptionGeneration}
              title="生成书籍描述"
            >
              📝 生成描述
            </button>
          </div>
        )}
        {toolbarPosition &&
          pendingSelection &&
          createPortal(
            <div
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2"
              ref={toolbarRef}
              style={{
                position: 'fixed',
                top: toolbarPosition.top,
                left: toolbarPosition.left,
                width: 280,
              }}
            >
              <div className="relative">
                <button
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                  style={{ backgroundColor: selectedColor }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                />
                {showColorPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1 z-50">
                    {Object.entries(AnnotationColor).map(([name, color]) => (
                      <button
                        key={name}
                        className="w-6 h-6 rounded border border-gray-300 hover:border-gray-400 transition-colors"
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
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                onClick={() => {
                  setShowNoteModal(true);
                }}
              >
                添加批注
              </button>
              <button
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                onClick={handleGenerateExplanation}
              >
                解释
              </button>
            </div>,
            document.body,
          )}
        {clickToolbar &&
          createPortal(
            <div
              className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex flex-col gap-1"
              ref={clickToolbarRef}
              style={{
                position: 'fixed',
                top: clickToolbar.top,
                left: clickToolbar.left,
                width: 280,
              }}
            >
              <button
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
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
                className="w-full bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
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
                className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
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
              className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
              style={{
                position: 'fixed',
                top: notePopup.top,
                left: notePopup.left,
                width: 280,
              }}
            >
              <div className="flex justify-between items-center p-3 bg-gray-50 border-b border-gray-200">
                <span className="font-medium text-gray-800">批注</span>
                <button
                  className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors"
                  onClick={() => setNotePopup(null)}
                >
                  ✕
                </button>
              </div>
              <div className="p-3 text-sm text-gray-700 border-b border-gray-100">{notePopup.annotation.text}</div>
              <div className="p-3 text-sm text-gray-800">{notePopup.annotation.note}</div>
            </div>,
            document.body,
          )}
        {/* Simple note modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-11/12 max-w-md p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{pendingSelection?.id ? '编辑批注' : '添加批注'}</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm text-gray-700 mb-4">{pendingSelection?.text}</div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">选择颜色:</label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(AnnotationColor).map(([name, color]) => (
                    <button
                      key={name}
                      className={`w-8 h-8 rounded border-2 transition-colors ${
                        selectedColor === color ? 'border-blue-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
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
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-500 mb-4"
                rows={4}
              />
              <div className="flex gap-3 justify-end">
                <button 
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  onClick={saveAnnotation}
                >
                  保存
                </button>
                <button
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
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
        
                 {/* Chapter Selector Modal */}
         <ChapterSelector
           isOpen={showChapterSelector}
           chapters={chapters}
           onSelectChapter={handleChapterSelect}
           onClose={() => {
             setShowChapterSelector(false);
             // Mark as dismissed in localStorage
             const dismissedKey = `description_dismissed_${book.id}`;
             localStorage.setItem(dismissedKey, 'true');
             setShowDescriptionButton(true);
           }}
         />
        
        {/* Description Confirm Modal */}
        <DescriptionConfirm
          isOpen={showDescriptionConfirm}
          description={generatedDescription}
          onAccept={handleAcceptDescription}
          onReject={handleRejectDescription}
          onClose={() => setShowDescriptionConfirm(false)}
          isLoading={isGeneratingDescription}
        />
        
        {/* Explanation Popup */}
        <ExplanationPopup
          isVisible={showExplanationPopup}
          onClose={() => setShowExplanationPopup(false)}
          onAccept={handleAcceptExplanation}
          onReject={handleRejectExplanation}
          onRegenerate={handleRegenerateExplanation}
          explanation={explanation}
          isLoading={isGeneratingExplanation}
          selectedText={pendingSelection?.text || ''}
        />
        
        {/* Sidebar notes list removed per request */}
      </div>
    );
  };

  export default EpubReader;
