import React, { useEffect, useState, useMemo } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from '@heroui/react';
import { Book as EpubBook } from 'epubjs';
import { Button } from '@heroui/button';
import useSpine, { NormSpineItem } from '@/hooks/book/useSpine';
import BookSpineSelector from '../BookSpineSelector';
import { useBookStore } from '@/store/book';

interface BookSpineSelectorModalProps {
  bookRef: React.RefObject<EpubBook>;
}

export default function GenerateBookDescriptionModal({
  bookRef,
}: BookSpineSelectorModalProps) {
  const [status, setStatus] = useState<
    'selectSpine' | 'confirmContent' | 'generateDescription'
  >('selectSpine');
  const spine = useSpine(bookRef);
  const spineSelectorModalOpen = useBookStore(
    (state) => state.spineSelectorModalOpen,
  );
  const book = useBookStore((state) => state.currBook);
  const updateBook = useBookStore((state) => state.updateBook);
  const closeSpineSelectorModal = useBookStore(
    (state) => state.closeSpineSelectorModal,
  );
  const [selectedSpine, setSelectedSpine] = useState<NormSpineItem | null>(
    null,
  );
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedHtml, setSelectedHtml] = useState<string>('');
  const [generatedDescription, setGeneratedDescription] = useState<string>('');
  const [generationLoading, setGenerationLoading] = useState<boolean>(false);
  useEffect(() => {
    if (selectedSpine) {
      selectedSpine.loadTextContent().then(({ text, html }) => {
        setSelectedText(text);
        setSelectedHtml(html);
      });
    }
  }, [selectedSpine]);
  const headerText = useMemo(() => {
    if (status === 'selectSpine') {
      return 'Select A Section to generate description';
    } else if (status === 'confirmContent') {
      return 'Confirm the Content Used to Generate Description';
    } else if (status === 'generateDescription') {
      return 'Confirm the Generated Description';
    }
  }, [status]);
  const cancelBtnText = useMemo(() => {
    if (status === 'selectSpine') {
      return 'Cancel';
    } else if (status === 'confirmContent') {
      return 'Back';
    } else if (status === 'generateDescription') {
      return 'Back';
    }
    return 'Cancel';
  }, [status]);
  const onCancel = () => {
    if (status === 'selectSpine') {
      closeSpineSelectorModal();
    } else if (status === 'confirmContent') {
      setStatus('selectSpine');
    } else if (status === 'generateDescription') {
      setStatus('confirmContent');
    }
  };
  const confirmBtnText = useMemo(() => {
    if (status === 'selectSpine') {
      return 'Next';
    } else if (status === 'confirmContent') {
      return 'Generate';
    } else if (status === 'generateDescription') {
      return 'Confirm';
    }
    return 'Confirm';
  }, [status]);
  const onConfirm = () => {
    if (status === 'selectSpine') {
      setStatus('confirmContent');
    } else if (status === 'confirmContent') {
      setStatus('generateDescription');
      setGenerationLoading(true);
      window.electron.llm
        .summarizeBook(selectedText)
        .then(setGeneratedDescription)
        .finally(() => {
          setGenerationLoading(false);
        });
    } else if (status === 'generateDescription') {
      updateBook(book.id, {
        description: generatedDescription,
      });
      closeSpineSelectorModal();
    }
  };
  return (
    <>
      <Modal isOpen={spineSelectorModalOpen}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {headerText}
          </ModalHeader>
          <ModalBody>
            <div>
              {(() => {
                if (status === 'selectSpine') {
                  return (
                    <BookSpineSelector
                      items={spine}
                      value={selectedSpine?.id ?? ''}
                      onSelect={setSelectedSpine}
                    />
                  );
                } else if (status === 'confirmContent') {
                  return (
                    <div>
                      <p dangerouslySetInnerHTML={{ __html: selectedHtml }}></p>
                    </div>
                  );
                } else if (status === 'generateDescription') {
                  if (generationLoading) {
                    return <Spinner title="Generating description..." />;
                  }
                  return (
                    <div>
                      <p>{generatedDescription}</p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => {
                onCancel();
              }}
            >
              {cancelBtnText}
            </Button>
            <Button
              color="primary"
              onPress={() => {
                onConfirm();
              }}
            >
              {confirmBtnText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
