'use client';

export default function TermsOfServicePage() {
  return (
    <iframe
      src="/terms-of-service.html"
      title="Terms of Use | RiseWithJeet"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        zIndex: 1,
      }}
    />
  );
}
