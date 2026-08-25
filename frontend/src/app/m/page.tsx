'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DefaultPublicMenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const table = searchParams.get('table') || searchParams.get('tableId');
    const targetUrl = table ? `/m/default?table=${encodeURIComponent(table)}` : '/m/default';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return null;
}

export default function DefaultPublicMenuPage() {
  return (
    <Suspense fallback={null}>
      <DefaultPublicMenuContent />
    </Suspense>
  );
}
