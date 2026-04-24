'use client';

export default function CookiePolicyPage() {
  return (
    <iframe
      src="/cookie-policy.html"
      title="Cookie Policy | RiseWithJeet"
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
