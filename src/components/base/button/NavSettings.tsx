import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IoIosSettings } from 'react-icons/io';
import Button from '.';

export default function NavSettings() {
  const navigate = useNavigate();
  return (
    <Button
      type="icon"
      onClick={() => navigate('/settings')}
      icon={<IoIosSettings size={24} />}
    />
  );
}
