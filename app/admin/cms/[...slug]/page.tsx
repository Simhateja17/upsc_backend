'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminService } from '@/lib/services';
import dynamic from 'next/dynamic';
import ImageUpload from '@/components/admin/ImageUpload';

const RichTextEditor = dynamic(() => import('@/components/admin/RichTextEditor'), { ssr: false });

interface Section {
  id: string;
  key: string;
  type: string;
  content: string;
  order: number;
  isActive: boolean;
}

interface PageData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  isPublished: boolean;
  sections: Section[];
}

// Group sections by key prefix for visual organization
const SECTION_GROUPS: Record<string, { label: string; keys: string[] }> = {
  hero: { label: 'Hero Section', keys: ['hero_badge', 'hero_title', 'hero_subtitle', 'hero_cta_primary', 'hero_cta_secondary', 'hero_image', 'hero_bg'] },
  features: { label: 'Features Grid', keys: ['features_title', 'features'] },
  jeetai: { label: 'Jeet AI Section', keys: ['jeetai_title', 'jeetai_features'] },
  dashboard_preview: { label: 'Dashboard Preview', keys: ['dashboard_preview_title', 'dashboard_preview_image'] },
  mentorship: { label: 'Mentorship', keys: ['mentorship_title', 'mentorship_subtitle', 'mentorship_quote', 'mentorship_author', 'mentorship_features', 'mentorship_image'] },
  study_planner: { label: 'Study Planner', keys: ['study_planner_title', 'study_planner_features'] },
  live_study_room: { label: 'Live Study Room', keys: ['live_study_room_title', 'live_study_room_subtitle', 'live_study_room_features'] },
  download_app: { label: 'Download App', keys: ['download_app_title', 'download_app_image'] },
  faq: { label: 'FAQ Section', keys: ['faq_title', 'faq_items'] },
  footer: { label: 'Footer', keys: ['footer_contact_title', 'footer_contact_subtitle', 'footer_links', 'footer_contact_info'] },
};

function groupSections(sections: Section[]): { label: string; sections: Section[] }[] {
  const grouped: { label: string; sections: Section[] }[] = [];
  const used = new Set<string>();

  for (const [, group] of Object.entries(SECTION_GROUPS)) {
    const matching = sections.filter((s) => group.keys.includes(s.key));
    if (matching.length > 0) {
      grouped.push({ label: group.label, sections: matching });
      matching.forEach((s) => used.add(s.id));
    }
  }

  // Remaining sections not in any group
  const remaining = sections.filter((s) => !used.has(s.id));
  if (remaining.length > 0) {
    grouped.push({ label: 'Other Sections', sections: remaining });
  }

  return grouped;
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function CmsPageEditor() {
  const params = useParams();
  const router = useRouter();
  const slugParts = params.slug as string[];
  const slug = slugParts.map(decodeURIComponent).join('/');

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSections, setEditedSections] = useState<Record<string, Partial<Section>>>({});
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSection, setNewSection] = useState({ key: '', type: 'text', content: '' });
  const [saveMessage, setSaveMessage] = useState('');
  const [editModal, setEditModal] = useState<Section | null>(null);

  useEffect(() => {
    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      const res = await adminService.getCmsPage(slug);
      setPage(res.data);
    } catch {
      // page not found
    } finally {
      setLoading(false);
    }
  };

  const updateSectionLocally = useCallback((id: string, field: string, value: any) => {
    setEditedSections((prev) => ({
      ...prev,
      [id]: { ...prev[id], id, [field]: value },
    }));
  }, []);

  const saveSection = async (section: Section) => {
    const edits = editedSections[section.id];
    if (!edits) return;
    setSaving(true);
    try {
      await adminService.updateCmsSection(section.id, edits);
      setEditedSections((prev) => { const n = { ...prev }; delete n[section.id]; return n; });
      await loadPage();
      showMsg('Saved!');
    } catch {
      showMsg('Save failed!');
    } finally {
      setSaving(false);
    }
  };

  const saveAll = async () => {
    const edits = Object.values(editedSections);
    if (edits.length === 0) return;
    setSaving(true);
    try {
      await adminService.bulkUpdateCmsSections(slug, edits as any[]);
      setEditedSections({});
      await loadPage();
      showMsg(`Saved ${edits.length} sections!`);
    } catch {
      showMsg('Save failed!');
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!page || !newSection.key) return;
    setSaving(true);
    try {
      await adminService.createCmsSection({
        pageId: page.id, key: newSection.key, type: newSection.type, content: newSection.content,
      });
      setNewSection({ key: '', type: 'text', content: '' });
      setShowAddForm(false);
      await loadPage();
      showMsg('Section added!');
    } catch (err: any) {
      showMsg(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return;
    try {
      await adminService.deleteCmsSection(id);
      await loadPage();
      showMsg('Deleted');
    } catch { /* ignore */ }
  };

  const showMsg = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const getCurrentContent = (section: Section) => editedSections[section.id]?.content ?? section.content;

  const isJsonValid = (str: string) => {
    try { JSON.parse(str); return true; } catch { return false; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg mb-4">Page not found</p>
        <button onClick={() => router.push('/admin/cms')} className="text-blue-500 hover:underline">Back to Pages</button>
      </div>
    );
  }

  const hasEdits = Object.keys(editedSections).length > 0;
  const groups = groupSections(page.sections);

  const renderEditor = (section: Section) => {
    const content = getCurrentContent(section);
    const isEdited = !!editedSections[section.id];

    switch (section.type) {
      case 'richtext':
        return (
          <RichTextEditor
            content={content}
            onChange={(html: string) => updateSectionLocally(section.id, 'content', html)}
          />
        );
      case 'image':
        return (
          <ImageUpload
            value={content}
            onChange={(url) => updateSectionLocally(section.id, 'content', url)}
          />
        );
      case 'json':
        return (
          <div>
            <textarea
              value={
                isEdited && editedSections[section.id]?.content !== undefined
                  ? editedSections[section.id].content!
                  : (() => { try { return JSON.stringify(JSON.parse(content), null, 2); } catch { return content; } })()
              }
              onChange={(e) => updateSectionLocally(section.id, 'content', e.target.value)}
              className={`w-full font-mono text-sm px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] ${
                !isJsonValid(editedSections[section.id]?.content ?? content)
                  ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            />
            {!isJsonValid(editedSections[section.id]?.content ?? content) && (
              <p className="text-xs text-red-500 mt-1">Invalid JSON</p>
            )}
          </div>
        );
      default:
        return (
          <textarea
            value={content}
            onChange={(e) => updateSectionLocally(section.id, 'content', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
          />
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/cms')} className="text-gray-400 hover:text-gray-600 transition-colors">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
            <p className="text-sm text-gray-400 font-mono">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && <span className="text-sm text-green-600 font-medium">{saveMessage}</span>}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            + Add Section
          </button>
          {hasEdits && (
            <button
              onClick={saveAll}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : `Save All (${Object.keys(editedSections).length})`}
            </button>
          )}
        </div>
      </div>

      {/* Add Section Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl p-5 border border-blue-100 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Add New Section</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Key</label>
              <input
                type="text" value={newSection.key}
                onChange={(e) => setNewSection({ ...newSection, key: e.target.value })}
                placeholder="e.g. hero_image"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Type</label>
              <select
                value={newSection.type}
                onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="richtext">Rich Text</option>
                <option value="json">JSON</option>
                <option value="image">Image</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <button
                onClick={addSection} disabled={!newSection.key || saving}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >Add</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Sections */}
      <div className="space-y-6">
        {groups.map((group) => {
          const isCollapsed = collapsedGroups[group.label];
          return (
            <div key={group.label}>
              {/* Group Header */}
              <button
                type="button"
                onClick={() => setCollapsedGroups((p) => ({ ...p, [group.label]: !p[group.label] }))}
                className="flex items-center gap-2 mb-3 w-full text-left"
              >
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                >
                  <path d="M4 2.5L7.5 6L4 9.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {group.label}
                </h2>
                <span className="text-xs text-gray-400">({group.sections.length})</span>
              </button>

              {!isCollapsed && (
                <div className="space-y-2 ml-1">
                  {group.sections.map((section) => {
                    const isExpanded = expandedSection === section.id;
                    const isEdited = !!editedSections[section.id];
                    const content = getCurrentContent(section);

                    return (
                      <div
                        key={section.id}
                        className={`bg-white rounded-xl border transition-all ${
                          isEdited ? 'border-blue-200 shadow-sm' : 'border-gray-100'
                        }`}
                      >
                        {/* Section Header */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div
                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                            onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                          >
                            <span className="text-xs font-medium text-gray-700">{formatKey(section.key)}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                section.type === 'json' ? 'bg-purple-50 text-purple-600'
                                  : section.type === 'richtext' ? 'bg-blue-50 text-blue-600'
                                  : section.type === 'image' ? 'bg-orange-50 text-orange-600'
                                  : 'bg-gray-50 text-gray-500'
                              }`}
                            >
                              {section.type}
                            </span>
                            {isEdited && <span className="text-[10px] text-blue-500 font-medium">Modified</span>}
                            {!section.isActive && <span className="text-[10px] text-red-400">Inactive</span>}
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Edit modal button */}
                            <button
                              onClick={() => setEditModal(section)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit in modal"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-300 transition-colors"
                            >
                              <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Content Preview */}
                        {!isExpanded && (
                          <div className="px-4 pb-3">
                            {section.type === 'image' && content ? (
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={content} alt="" className="w-10 h-10 rounded object-cover bg-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <span className="text-xs text-gray-400 truncate">{content}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 truncate">
                                {section.type === 'json'
                                  ? (() => { try { const p = JSON.parse(content); return Array.isArray(p) ? `[${p.length} items]` : `{${Object.keys(p).length} keys}`; } catch { return content.slice(0, 80); } })()
                                  : content.slice(0, 120)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Expanded Editor */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-gray-50 pt-4">
                            {renderEditor(section)}
                            <div className="flex items-center justify-between mt-4">
                              <label className="flex items-center gap-2 text-sm text-gray-500">
                                <input
                                  type="checkbox"
                                  checked={editedSections[section.id]?.isActive ?? section.isActive}
                                  onChange={(e) => updateSectionLocally(section.id, 'isActive', e.target.checked)}
                                  className="rounded border-gray-300"
                                />
                                Active
                              </label>
                              <div className="flex items-center gap-2">
                                <button onClick={() => deleteSection(section.id)} className="px-3 py-1.5 text-xs rounded-lg text-red-500 hover:bg-red-50">Delete</button>
                                {isEdited && (
                                  <button onClick={() => saveSection(section)} disabled={saving} className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {page.sections.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No sections yet. Click &quot;Add Section&quot; to create one.
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Edit Section</h2>
              <button onClick={() => setEditModal(null)} className="p-1 rounded-md hover:bg-gray-100">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#6B7280" strokeWidth="2">
                  <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Key</label>
                <div className="px-3 py-2 rounded-lg bg-gray-50 text-sm text-gray-500 font-mono">{editModal.key}</div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
                {renderEditor(editModal)}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                <select
                  value={editedSections[editModal.id]?.type ?? editModal.type}
                  onChange={(e) => updateSectionLocally(editModal.id, 'type', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="text">Text</option>
                  <option value="richtext">Rich Text</option>
                  <option value="json">JSON</option>
                  <option value="image">Image</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={editedSections[editModal.id]?.order ?? editModal.order}
                  onChange={(e) => updateSectionLocally(editModal.id, 'order', parseInt(e.target.value) || 0)}
                  className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editedSections[editModal.id]?.isActive ?? editModal.isActive}
                    onChange={(e) => updateSectionLocally(editModal.id, 'isActive', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-blue-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-gray-700">Active</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button onClick={() => deleteSection(editModal.id)} className="text-sm text-red-500 hover:text-red-700">
                Delete Section
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditModal(null)} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await saveSection(editModal);
                    setEditModal(null);
                  }}
                  disabled={saving || !editedSections[editModal.id]}
                  className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
