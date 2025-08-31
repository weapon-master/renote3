import React from "react";
import { useNoteViewStore } from "@/store/noteView";
import Button from ".";
import { GiNotebook } from "react-icons/gi";
import { IoBookOutline } from "react-icons/io5";
export default function ToggleNoteView() {
    const showNotesView = useNoteViewStore((state) => state.showNotesView);
    const toggleNotesView = useNoteViewStore((state) => state.toggleNotesView);
    const icon = showNotesView ? <IoBookOutline size={24} /> : <GiNotebook size={24} />;
    return (
    <Button
      type="icon"
      icon={icon}
      onClick={toggleNotesView}
    />
  );
}

