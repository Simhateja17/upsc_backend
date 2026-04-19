'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dailyAnswerService } from '@/lib/services';

export default function DailyAnswerAttemptPage() {
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
    const [isActive, setIsActive] = useState(false);
    const [answerText, setAnswerText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft => timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            if (interval) clearInterval(interval);
            setIsActive(false);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(15 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async () => {
        if (!answerText.trim()) {
            setSubmitError('Please write your answer before submitting.');
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            await dailyAnswerService.submitText(answerText);
            router.push('/dashboard/daily-answer/challenge/attempt/evaluating');
        } catch (err: any) {
            setSubmitError(err.message || 'Failed to submit answer. Please try again.');
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8F9FC] font-sans justify-center">

            <main className="flex-1 max-w-[1200px]">

                    {/* Main Content Area - Centered Card */}
                    <div className="p-10 flex flex-col items-center w-full">

                        {/* Timer Card Section */}
                        <div
                            className="bg-white rounded-[16px] flex flex-col items-center justify-center mb-6"
                            style={{
                                width: '100%', maxWidth: '909px',
                                minHeight: '263px',
                                boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A',
                                padding: '30px'
                            }}
                        >
                            {/* Title: WRITING TIMER */}
                            <div style={{
                                fontFamily: 'Arimo',
                                fontSize: '20px',
                                fontWeight: 400,
                                letterSpacing: '0.3px',
                                color: '#6A7282',
                                textTransform: 'uppercase',
                                marginBottom: '20px'
                            }}>
                                WRITING TIMER
                            </div>

                            {/* Timer Circle */}
                            <div
                                className="rounded-full border-4 border-[#101828] flex items-center justify-center mb-4"
                                style={{
                                    width: '112px',
                                    height: '112px'
                                }}
                            >
                                <span style={{
                                    fontFamily: 'Arimo',
                                    fontWeight: 700,
                                    fontSize: '24px',
                                    color: '#101828'
                                }}>
                                    {formatTime(timeLeft)}
                                </span>
                            </div>

                            {/* Subtitle: WRITING IN PROGESS */}
                            <div style={{
                                fontFamily: 'Arimo',
                                fontSize: '20px',
                                fontWeight: 400,
                                letterSpacing: '0.3px',
                                color: '#6A7282',
                                textTransform: 'uppercase',
                                marginBottom: '24px'
                            }}>
                                WRITING IN PROGESS
                            </div>

                            {/* Buttons Row */}
                            <div className="flex gap-4">
                                {/* Start Timer Button */}
                                <button
                                    onClick={toggleTimer}
                                    className="flex items-center justify-center gap-2 text-white font-bold transition-transform hover:scale-105"
                                    style={{
                                        width: '136px',
                                        height: '48px',
                                        background: isActive ? '#dc2626' : '#00BC7D', // Red if active, Green default
                                        borderRadius: '10px',
                                        fontSize: '16px'
                                    }}
                                >
                                    <img src="/Icon%20(11).png" alt="" style={{ width: '24px', height: '24px', filter: 'brightness(0) invert(1)' }} />
                                    {isActive ? 'Pause' : 'Start Timer'}
                                </button>

                                 {/* Reset Button */}
                                 <button
                                    onClick={resetTimer}
                                    className="flex items-center justify-center gap-2 bg-white border border-[#D1D5DB] text-[#374151] font-bold transition-transform hover:scale-105"
                                    style={{
                                        width: '96px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        fontSize: '16px'
                                    }}
                                >
                                    <img src="/Icon%20(10).png" alt="Reset" style={{ width: '20px', height: '20px' }} />
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Bottom Card Container (Wrapping Text Area, Upload & Submit) */}
                        <div
                            className="bg-white rounded-[16px] flex flex-col items-center pt-[68px] pb-8 mb-8"
                            style={{
                                width: '100%', maxWidth: '909px',
                                minHeight: '600px',
                                boxShadow: '0px 1px 3px 0px #0000001A, 0px 1px 2px -1px #0000001A'
                            }}
                        >
                            {/* Text Answer Area */}
                            <div className="w-full px-[134px] mb-8">
                                <label
                                    htmlFor="answer-text"
                                    style={{
                                        fontFamily: 'Arimo',
                                        fontWeight: 700,
                                        fontSize: '16px',
                                        color: '#101828',
                                        display: 'block',
                                        marginBottom: '8px'
                                    }}
                                >
                                    Type your answer
                                </label>
                                <textarea
                                    id="answer-text"
                                    value={answerText}
                                    onChange={(e) => {
                                        setAnswerText(e.target.value);
                                        if (submitError) setSubmitError(null);
                                    }}
                                    placeholder="Write your answer here..."
                                    className="w-full rounded-[10px] border border-[#D1D5DB] bg-[#F9FAFB] p-4 text-[#101828] font-arimo focus:outline-none focus:ring-2 focus:ring-[#17223E] focus:border-transparent resize-vertical"
                                    style={{
                                        minHeight: '200px',
                                        fontSize: '15px',
                                        lineHeight: '24px',
                                    }}
                                />
                                <p className="mt-2 text-right text-[#6A7282]" style={{ fontSize: '13px' }}>
                                    {answerText.trim().split(/\s+/).filter(Boolean).length} words
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="w-full px-[134px] mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-px bg-[#E5E7EB]"></div>
                                    <span className="text-[#6A7282] font-arimo" style={{ fontSize: '13px' }}>OR upload handwritten answer</span>
                                    <div className="flex-1 h-px bg-[#E5E7EB]"></div>
                                </div>
                            </div>

                            {/* Check Dotted Box for Upload */}
                            <div
                                className="bg-[#F9FAFB] rounded-[16px] flex flex-col items-center justify-center mb-8 relative"
                                style={{
                                    width: '639.81px',
                                    height: '300px',
                                    border: '1px dashed #17223E',
                                }}
                            >
                                {/* Upload Icon */}
                                <div className="mb-4">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/upload-icon.png" alt="Upload" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                                </div>

                                {/* Drop Text */}
                                <h3 style={{
                                    fontFamily: 'Arimo',
                                    fontWeight: 700,
                                    fontSize: '20px',
                                    textAlign: 'center',
                                    color: '#101828',
                                    marginBottom: '8px'
                                }}>
                                    Drop your answer script here
                                </h3>

                                <p style={{
                                    fontFamily: 'Arimo',
                                    fontWeight: 400,
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    color: '#4A5565',
                                    marginBottom: '24px'
                                }}>
                                    Upload handwritten answers for AI evaluation
                                </p>

                                {/* File Format Chips */}
                                <div className="flex gap-3 mb-8">
                                    {['JPG', 'PNG', 'PDF', 'DOCX'].map((fmt) => (
                                        <span key={fmt} className="px-3 py-1 bg-[#E5E7EB] rounded text-[#374151] font-arimo" style={{ fontSize: '14px' }}>
                                            {fmt}
                                        </span>
                                    ))}
                                    <span className="px-3 py-1 bg-[#E5E7EB] rounded text-[#374151] font-arimo" style={{ fontSize: '14px' }}>Max 10MB</span>
                                </div>

                                {/* Browse Files Button */}
                                <button
                                    className="bg-white border border-[#D1D5DB] text-[#111827] font-bold rounded-[10px] hover:bg-gray-50 transition-colors"
                                    style={{
                                        width: '156px',
                                        height: '48px',
                                        fontSize: '16px'
                                    }}
                                >
                                    Browse Files
                                </button>
                            </div>

                            {/* Error Message */}
                            {submitError && (
                                <div className="mb-4 px-6 py-3 bg-red-50 border border-red-200 rounded-[10px] text-red-700 font-arimo" style={{ width: '100%', maxWidth: '640px', fontSize: '14px' }}>
                                    {submitError}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex items-center justify-center gap-2 text-white font-bold transition-transform hover:scale-105 mb-4 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                                style={{
                                    width: '100%', maxWidth: '640px',
                                    height: '56px',
                                    background: '#17223E',
                                    borderRadius: '14px',
                                    fontSize: '16px',
                                    boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <img src="/Icon%20(13).png" alt="" style={{ width: '24px', height: '24px' }} />
                                        Submit Answer for Evaluation
                                    </>
                                )}
                            </button>

                            {/* Footer Feedback Text */}
                            <div className="flex items-center gap-2">
                                <img src="/Text%20(8).png" alt="Flash" style={{ height: '20px' }} />
                                <span style={{
                                    fontFamily: 'Arimo',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    color: '#364153'
                                }}>
                                    Get detailed feedback in 60 seconds
                                </span>
                            </div>
                        </div>
                    </div>
            </main>
        </div>
    );
}
