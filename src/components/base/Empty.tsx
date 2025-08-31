import React from 'react';
import { VscEmptyWindow } from "react-icons/vsc";
import ImportBook from './button/ImportBook';
interface Props {
    text?: string;
}

export default function Empty({ text }: Props) {
    return (
        <div className="flex items-center justify-center h-full text-center">
            <div className='flex flex-col items-center justify-center mb-16'>
                <ImportBook />
                <p className="text-color-secondary mt-4">{text}</p>
            </div>
        </div>
    );
}