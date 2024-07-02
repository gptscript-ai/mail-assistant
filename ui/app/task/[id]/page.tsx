'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Run from '../run';
import { useEffect } from 'react';

export default function Page(): React.JSX.Element {
    const params = useParams<{ id: string }>();
    return <Run id={params.id}></Run>;
}
