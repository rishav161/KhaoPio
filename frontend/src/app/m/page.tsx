'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DefaultPublicMenuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const table = searchParams.get('table') || searchParams.get('tableId');
    const targetUrl = table ? `/m/default?table=${encodeURIComponent(table)}` : '/m/default';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return null;
}
