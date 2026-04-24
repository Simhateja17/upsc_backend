'use client';

export default function PrivacyPolicyPage() {
  return (
    <iframe
      src="/privacy-policy.html"
      title="Privacy Policy | RiseWithJeet"
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
