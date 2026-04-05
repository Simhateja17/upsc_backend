'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/lib/services';

export default function VideoManager() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', iconUrl: '', order: 0 });
  const [videoForm, setVideoForm] = useState({ subjectId: '', title: '', description: '', videoUrl: '', thumbnailUrl: '', duration: '', instructor: '', order: 0 });
  const [questionForm, setQuestionForm] = useState({
    question: '',
    option0: '', option1: '', option2: '', option3: '',
    correctOption: 0,
    explanation: '',
    order: 0,
  });

  const loadSubjects = () => {
    setLoading(true);
    adminService.getVideoSubjects()
      .then((res) => setSubjects(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSubjects(); }, []);

  const handleCreateSubject = async () => {
    setMsg('');
    try {
      await adminService.createVideoSubject({ ...subjectForm });
      setMsg('Subject created!');
      setShowSubjectForm(false);
      setSubjectForm({ name: '', description: '', iconUrl: '', order: 0 });
      loadSubjects();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Delete this subject and all its videos?')) return;
    try {
      await adminService.deleteVideoSubject(id);
      if (selectedSubject?.id === id) { setSelectedSubject(null); setVideos([]); setSelectedVideo(null); setQuestions([]); }
      loadSubjects();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleCreateVideo = async () => {
    setMsg('');
    try {
      const data = { ...videoForm, duration: videoForm.duration ? parseInt(videoForm.duration) : undefined };
      await adminService.createVideo(data);
      setMsg('Video added!');
      setShowVideoForm(false);
      setVideoForm({ subjectId: selectedSubject?.id || '', title: '', description: '', videoUrl: '', thumbnailUrl: '', duration: '', instructor: '', order: 0 });
      if (selectedSubject) loadSubjectVideos(selectedSubject.id);
      loadSubjects();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Delete this video?')) return;
    try {
      await adminService.deleteVideo(id);
      setVideos(v => v.filter(x => x.id !== id));
      if (selectedVideo?.id === id) { setSelectedVideo(null); setQuestions([]); }
      loadSubjects();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const loadSubjectVideos = async (subjectId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/videos/${encodeURIComponent(subjectId)}`);
      const data = await res.json();
      const arr = Array.isArray(data.data) ? data.data : data.data?.videos;
      setVideos(Array.isArray(arr) ? arr : []);
    } catch {
      setVideos([]);
    }
  };

  const handleSelectSubject = (subject: any) => {
    setSelectedSubject(subject);
    setVideoForm(f => ({ ...f, subjectId: subject.id }));
    setSelectedVideo(null);
    setQuestions([]);
    loadSubjectVideos(subject.id);
  };

  const handleSelectVideo = (video: any) => {
    if (selectedVideo?.id === video.id) {
      setSelectedVideo(null);
      setQuestions([]);
      return;
    }
    setSelectedVideo(video);
    setShowQuestionForm(false);
    adminService.getVideoQuestions(video.id)
      .then(res => setQuestions(res.data || []))
      .catch(() => setQuestions([]));
  };

  const handleCreateQuestion = async () => {
    if (!selectedVideo) return;
    setMsg('');
    try {
      const options = [questionForm.option0, questionForm.option1, questionForm.option2, questionForm.option3];
      if (!questionForm.question.trim() || options.some(o => !o.trim())) {
        setMsg('Error: Please fill in the question and all 4 options.');
        return;
      }
      await adminService.createVideoQuestion(selectedVideo.id, {
        question: questionForm.question,
        options,
        correctOption: questionForm.correctOption,
        explanation: questionForm.explanation,
        order: questionForm.order,
      });
      setMsg('Question added!');
      setShowQuestionForm(false);
      setQuestionForm({ question: '', option0: '', option1: '', option2: '', option3: '', correctOption: 0, explanation: '', order: 0 });
      const res = await adminService.getVideoQuestions(selectedVideo.id);
      setQuestions(res.data || []);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (qid: string) => {
    if (!confirm('Delete this question?') || !selectedVideo) return;
    try {
      await adminService.deleteVideoQuestion(selectedVideo.id, qid);
      setQuestions(q => q.filter(x => x.id !== qid));
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div>
      <div className="flex items-center justify-between mb-[clamp(1.5rem,2vw,2rem)]">
        <h1 className="font-inter font-bold text-[#111827]" style={{ fontSize: 'clamp(22px, 1.6vw, 30px)' }}>
          Video Lecture Manager
        </h1>
        <button
          onClick={() => setShowSubjectForm(!showSubjectForm)}
          className="px-4 py-2 rounded-lg text-sm font-inter font-medium text-white"
          style={{ background: '#6366F1' }}
        >
          {showSubjectForm ? 'Cancel' : 'Add Subject'}
        </button>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm font-inter" style={{
          background: msg.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
          color: msg.startsWith('Error') ? '#991B1B' : '#065F46',
          border: `1px solid ${msg.startsWith('Error') ? '#FECACA' : '#A7F3D0'}`,
        }}>
          {msg}
        </div>
      )}

      {/* Subject Form */}
      {showSubjectForm && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">Add Video Subject</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Name *</label>
              <input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                placeholder="e.g. Indian Polity" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm text-[#6B7280] mb-1">Icon URL</label>
              <input value={subjectForm.iconUrl} onChange={(e) => setSubjectForm({ ...subjectForm, iconUrl: e.target.value })}
                placeholder="https://..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1">Description</label>
            <input value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
              placeholder="Brief description" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-[#6B7280] mb-1">Display Order</label>
            <input type="number" value={subjectForm.order} onChange={(e) => setSubjectForm({ ...subjectForm, order: parseInt(e.target.value) || 0 })}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <button onClick={handleCreateSubject}
            className="px-5 py-2 rounded-lg text-white font-inter font-medium text-sm" style={{ background: '#10B981' }}>
            Create Subject
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Subjects */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="font-inter font-semibold text-[#111827] mb-4">Subjects ({subjects.length})</h2>
          {loading ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">Loading...</p>
          ) : subjects.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">No subjects yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSubject(s)}
                  className="p-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    background: selectedSubject?.id === s.id ? '#EFF6FF' : '#FAFAFA',
                    border: `1px solid ${selectedSubject?.id === s.id ? '#BFDBFE' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{s.name}</p>
                      <p className="text-xs text-[#6B7280]">{s._count?.videos ?? s.videoCount} videos</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }}
                      className="text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Videos */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-inter font-semibold text-[#111827]">
              {selectedSubject ? `Videos in "${selectedSubject.name}"` : 'Select a subject'}
            </h2>
            {selectedSubject && (
              <button
                onClick={() => setShowVideoForm(!showVideoForm)}
                className="px-3 py-1.5 rounded-lg text-xs font-inter font-medium text-white"
                style={{ background: '#6366F1' }}
              >
                {showVideoForm ? 'Cancel' : 'Add Video'}
              </button>
            )}
          </div>

          {showVideoForm && selectedSubject && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div className="space-y-2">
                <input value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  placeholder="Video title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={videoForm.instructor} onChange={(e) => setVideoForm({ ...videoForm, instructor: e.target.value })}
                  placeholder="Instructor name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={videoForm.videoUrl} onChange={(e) => setVideoForm({ ...videoForm, videoUrl: e.target.value })}
                  placeholder="YouTube URL (e.g. https://youtu.be/abc123)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <input value={videoForm.thumbnailUrl} onChange={(e) => setVideoForm({ ...videoForm, thumbnailUrl: e.target.value })}
                  placeholder="Thumbnail URL" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" value={videoForm.duration} onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })}
                    placeholder="Duration (seconds)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <input type="number" value={videoForm.order} onChange={(e) => setVideoForm({ ...videoForm, order: parseInt(e.target.value) || 0 })}
                    placeholder="Order" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <textarea value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                  placeholder="Description" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button onClick={handleCreateVideo}
                  className="px-4 py-2 rounded-lg text-white text-sm font-inter font-medium" style={{ background: '#10B981' }}>
                  Add Video
                </button>
              </div>
            </div>
          )}

          {!selectedSubject ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">Click a subject to see its videos.</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">No videos yet.</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {videos.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => handleSelectVideo(v)}
                  className="p-3 rounded-xl cursor-pointer"
                  style={{
                    background: selectedVideo?.id === v.id ? '#FFF7ED' : '#FAFAFA',
                    border: `1px solid ${selectedVideo?.id === v.id ? '#FED7AA' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{v.title}</p>
                      {v.instructor && <p className="text-xs text-[#6B7280]">by {v.instructor}</p>}
                      {v.duration && <p className="text-xs text-[#9CA3AF]">{Math.floor(v.duration / 60)}m {v.duration % 60}s</p>}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteVideo(v.id); }}
                      className="text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2] flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Questions for selected video */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-inter font-semibold text-[#111827]">
              {selectedVideo ? `Questions for "${selectedVideo.title.substring(0, 28)}${selectedVideo.title.length > 28 ? '…' : ''}"` : 'Select a video'}
            </h2>
            {selectedVideo && (
              <button
                onClick={() => setShowQuestionForm(!showQuestionForm)}
                className="px-3 py-1.5 rounded-lg text-xs font-inter font-medium text-white"
                style={{ background: '#F59E0B' }}
              >
                {showQuestionForm ? 'Cancel' : '+ Add Question'}
              </button>
            )}
          </div>

          {showQuestionForm && selectedVideo && (
            <div className="mb-4 p-4 rounded-xl space-y-2" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <p className="text-xs font-medium text-[#92400E] mb-2">New MCQ Question</p>
              <textarea
                value={questionForm.question}
                onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="Question text *" rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              {(['option0', 'option1', 'option2', 'option3'] as const).map((key, idx) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#6B7280] w-4">{optionLabels[idx]}</span>
                  <input
                    value={questionForm[key]}
                    onChange={(e) => setQuestionForm({ ...questionForm, [key]: e.target.value })}
                    placeholder={`Option ${optionLabels[idx]} *`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#6B7280] mb-1">Correct Answer *</label>
                <select
                  value={questionForm.correctOption}
                  onChange={(e) => setQuestionForm({ ...questionForm, correctOption: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {optionLabels.map((label, idx) => (
                    <option key={idx} value={idx}>Option {label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Explanation (shown after submission)" rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button onClick={handleCreateQuestion}
                className="px-4 py-2 rounded-lg text-white text-sm font-inter font-medium" style={{ background: '#F59E0B' }}>
                Save Question
              </button>
            </div>
          )}

          {!selectedVideo ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">Click a video to manage its questions.</p>
          ) : questions.length === 0 ? (
            <p className="text-sm text-[#6B7280] py-8 text-center">No questions yet. Add one above.</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {questions.map((q: any, idx: number) => (
                <div key={q.id} className="p-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#111827] flex-1">
                      <span className="text-[#9CA3AF] mr-1">Q{idx + 1}.</span>
                      {q.question}
                    </p>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-xs px-2 py-1 rounded text-[#EF4444] hover:bg-[#FEF2F2] flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {(q.options as string[]).map((opt: string, i: number) => (
                      <p key={i} className="text-xs px-2 py-1 rounded"
                        style={{
                          background: i === q.correctOption ? '#ECFDF5' : 'transparent',
                          color: i === q.correctOption ? '#065F46' : '#6B7280',
                          fontWeight: i === q.correctOption ? 600 : 400,
                        }}>
                        {optionLabels[i]}. {opt} {i === q.correctOption && '✓'}
                      </p>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-[#6B7280] mt-2 italic">💡 {q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
