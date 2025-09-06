import React, { useState, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Button,
} from '@heroui/react';
import { useBookStore } from '@/store/book';
import { useAnnotationStore } from '@/store/annotation';
import { AnnotationColor } from '@/const/annotation-color';
import ColorPalette from '../ColorSelector';

interface Props {}

export default function GenerateExplanationModal({}: Props) {
  const [status, setStatus] = useState<'default' | 'generated'>('default');
  const [selectedColor, setSelectedColor] = useState<string>(AnnotationColor.HighlightYellow);
  const explanationModalOpen = useBookStore(
    (state) => state.explanationModalOpen,
  );
  const closeExplanationModal = useBookStore(
    (state) => state.closeExplanationModal,
  );
  const pendingSelection = useBookStore((state) => state.pendingSelection);
  const book = useBookStore((state) => state.currBook);
  const annotations = useAnnotationStore((state) => state.annotations);
  const createAnnotation = useAnnotationStore((state) => state.createAnnotation);
  const [explanation, setExplanation] = useState<string>('');
  const [generationLoading, setGenerationLoading] = useState<boolean>(false);
  const generateExplanation = async () => {
    if (!book || !pendingSelection?.text) return;
    setGenerationLoading(true);
    try {
      const explanation = await window.electron.llm.explainText(
        book.description || book.title || '通用',
        pendingSelection?.text,
      );
      setExplanation(explanation);
      setStatus('generated');
    } catch (error) {
      console.error(error);
    } finally {
      setGenerationLoading(false);
    }
  };
  const cancelBtnText = useMemo(() => {
    if (status === 'default') {
      return 'Cancel';
    } else if (status === 'generated') {
      return 'Reject';
    }
  }, [status]);
  const onCancel = () => {
    if (status === 'default') {
      closeExplanationModal();
    } else if (status === 'generated') {
      setStatus('default');
    }
  };
  const confirmBtnText = useMemo(() => {
    if (status === 'default') {
      return 'Explain';
    } else if (status === 'generated') {
      return 'Add Note';
    }
  }, [status]);
  const onConfirm = async () => {
    if (status === 'default') {
      generateExplanation();
    } else if (status === 'generated') {
      await createAnnotation(book.id, {
        bookId: book.id,
        cfiRange: pendingSelection?.cfiRange,
        text: pendingSelection?.text,
        note: explanation,
        title: `Explanation ${annotations.length + 1}`,
        createdAt: Date.now(),
        color: {
          rgba: selectedColor,
          category: 'explanation',
        },
      });
      closeExplanationModal();
    }
  };
  return (
    <Modal isOpen={explanationModalOpen}>
      <ModalContent>
        <ModalHeader>Explain</ModalHeader>
        <ModalBody>
          <p className="text-color-secondary">{pendingSelection?.text}</p>
          {generationLoading ? (
            <Spinner title="Generating explanation..." />
          ) : (
            <p className="text-color-primary">{explanation}</p>
          )}
          { status === 'generated' && <ColorPalette onColorSelect={setSelectedColor} selectedColor={selectedColor} />}
        </ModalBody>
        <ModalFooter>
          <Button color="default" onPress={onCancel}>
            {cancelBtnText}
          </Button>
          <Button color="primary" onPress={onConfirm}>
            {confirmBtnText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
