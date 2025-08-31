import React from 'react';
import { GiBookshelf } from 'react-icons/gi';
import Button from './index';
import { useNavigate } from 'react-router-dom';

export default function NavBookShelf() {
  const navigate = useNavigate();
  return (
    <Button
      onClick={() => navigate('/bookshelf')}
      type="icon"
      icon={<GiBookshelf size={24} />}
    />
  );
}
