import React from "react";
import { useBookStore } from "@/store/book";
import Button from ".";
import { RiSortDesc } from "react-icons/ri";

export default function ToggleNoteView() {
    const spineSelectorModalOpen = useBookStore((state) => state.spineSelectorModalOpen);
    const openSpineSelectorModal = useBookStore((state) => state.openSpineSelectorModal);
    // if (spineSelectorModalOpen) return null;
    return (
    <Button
      type="icon"
      icon={<RiSortDesc size={24} />}
      onClick={() => openSpineSelectorModal()}
    />
  );
}

