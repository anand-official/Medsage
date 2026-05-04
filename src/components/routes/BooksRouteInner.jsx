'use client';

import AppShellLayout from '../AppShellLayout';
import ProtectedGate from '../ProtectedGate';
import BookReferencePage from '../../pages/BookReferencePage';

export default function BooksRouteInner() {
  return (
    <ProtectedGate>
      <AppShellLayout>
        <BookReferencePage />
      </AppShellLayout>
    </ProtectedGate>
  );
}

