'use client';

import { useState } from 'react';

export default function PageName() {
    const [count, setCount] = useState(0);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Page Title</h1>
            <button onClick={() => setCount(count + 1)}>
                Clicked {count} times
            </button>
        </div>
    );
}