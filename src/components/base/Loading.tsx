import React from 'react';
import { AiOutlineLoading3Quarters } from "react-icons/ai";

interface Props {
    text?: string;
}

export default function Loading({ text }: Props) {
    return (
        <div className="flex items-center justify-center h-full text-center">
            <div className='flex flex-col items-center justify-center mb-16'>
                <AiOutlineLoading3Quarters className="animate-spin text-2xl" />
                <p className="text-color-secondary mt-4">{text}</p>
            </div>
        </div>
    );
}