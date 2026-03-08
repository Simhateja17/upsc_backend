'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { pricingService } from '@/lib/services';

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pricingService.getTestimonials()
      .then((res: any) => {
        const items = res?.data ?? [];
        setTestimonials(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section
        className="w-full"
        style={{
          background: 'linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)',
          paddingTop: 'clamp(3rem, 5vw, 6.25rem)',
          paddingBottom: 'clamp(3rem, 5vw, 6.25rem)',
        }}
      >
        <div className="container-responsive">
          <h2
            className="font-lora font-bold text-center text-[#1C2E45] mb-[clamp(2rem,4vw,5rem)]"
            style={{ fontSize: 'clamp(2rem, 3.385vw, 4.063rem)', lineHeight: '150%', letterSpacing: '0.01em' }}
          >
            What our toppers say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[clamp(1.5rem,2.083vw,2.5rem)]">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white p-[clamp(1.5rem,2.083vw,2.5rem)] rounded-[10px] h-48 animate-pulse" style={{ boxShadow: '0px 4px 88px 0px rgba(0,0,0,0.05)' }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section
      className="w-full"
      style={{
        background: 'linear-gradient(180deg, #F5F3EF 0%, #EDE9E3 100%)',
        paddingTop: 'clamp(3rem, 5vw, 6.25rem)',
        paddingBottom: 'clamp(3rem, 5vw, 6.25rem)',
      }}
    >
      <div className="container-responsive">
        <h2
          className="font-lora font-bold text-center text-[#1C2E45] mb-[clamp(2rem,4vw,5rem)]"
          style={{ fontSize: 'clamp(2rem, 3.385vw, 4.063rem)', lineHeight: '150%', letterSpacing: '0.01em' }}
        >
          What our toppers say
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[clamp(1.5rem,2.083vw,2.5rem)]">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="bg-white p-[clamp(1.5rem,2.083vw,2.5rem)] rounded-[10px] flex flex-col items-center"
              style={{ boxShadow: '0px 4px 88px 0px rgba(0, 0, 0, 0.05)' }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: item.rating ?? 5 }).map((_, i) => (
                  <span key={i} style={{ color: '#FDC700', fontSize: '18px' }}>★</span>
                ))}
              </div>

              <div className="flex-grow flex items-center">
                <p
                  className="font-roboto font-normal text-[#525252] text-center"
                  style={{ fontSize: 'clamp(1rem, 0.99vw, 1.188rem)', lineHeight: '156%', letterSpacing: '0.02em' }}
                >
                  &ldquo;{item.content}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-4 mt-8 w-full justify-center">
                {item.avatarUrl ? (
                  <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    <Image src={item.avatarUrl} alt={item.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
                    style={{ background: '#6366F1', fontSize: '16px' }}
                  >
                    {item.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <h4 className="font-poppins font-medium text-[#353535]" style={{ fontSize: '17px', lineHeight: '156%' }}>
                    {item.name}
                  </h4>
                  <p className="font-poppins text-[#8E8E8E]" style={{ fontSize: '13px', lineHeight: '156%' }}>
                    {item.title}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
