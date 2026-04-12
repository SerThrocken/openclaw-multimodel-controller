import React, { useState } from 'react';
import { Search, X, Plus, Trash2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store';
import { BUILTIN_SKILLS, SKILL_CATEGORIES } from '../../providers/skills-library';
import type { Skill } from '../../types';

export const SkillsPage: React.FC = () => {
  const { settings, updateSettings, customSkills, addCustomSkill, removeCustomSkill } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    description: '',
    category: 'Writing',
    systemPrompt: '',
    icon: '🔧',
    tags: '',
  });

  const activeSkillIds = settings.activeSkillIds || [];

  const toggleSkill = (id: string) => {
    const current = activeSkillIds;
    const updated = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
    updateSettings({ activeSkillIds: updated });
  };

  const allSkills: Skill[] = [...BUILTIN_SKILLS, ...customSkills];

  const filtered = allSkills.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = category === 'All' || s.category === category;
    return matchSearch && matchCategory;
  });

  const geminiSkills = filtered.filter((s) => s.category === 'Gemini Gems');
  const regularSkills = filtered.filter((s) => s.category !== 'Gemini Gems');

  const handleAddCustom = () => {
    if (!customForm.name.trim() || !customForm.systemPrompt.trim()) return;
    addCustomSkill({
      name: customForm.name.trim(),
      description: customForm.description.trim() || 'Custom skill',
      category: customForm.category,
      systemPrompt: customForm.systemPrompt.trim(),
      icon: customForm.icon || '🔧',
      tags: customForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      provider: 'all',
    });
    setCustomForm({ name: '', description: '', category: 'Writing', systemPrompt: '', icon: '🔧', tags: '' });
    setShowAddCustom(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles size={20} className="text-blue-400" />
          <h1 className="text-xl font-bold text-white">Skills Library</h1>
          {activeSkillIds.length > 0 && (
            <span className="ml-auto bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
              {activeSkillIds.length} active
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm">Activate skills to specialize AI responses</p>
      </div>

      {/* Search + category filter */}
      <div className="px-4 pt-4 pb-2 bg-slate-950 shrink-0 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Skills grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Regular skills */}
        {regularSkills.length > 0 && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {regularSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isActive={activeSkillIds.includes(skill.id)}
                  onToggle={() => toggleSkill(skill.id)}
                  onDelete={skill.isCustom ? () => removeCustomSkill(skill.id) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Gemini Gems */}
        {geminiSkills.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💎</span>
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">Gemini Gems</h2>
              <span className="text-xs text-slate-500">Gemini-optimized skills</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {geminiSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  isActive={activeSkillIds.includes(skill.id)}
                  onToggle={() => toggleSkill(skill.id)}
                  onDelete={skill.isCustom ? () => removeCustomSkill(skill.id) : undefined}
                  gemini
                />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles size={40} className="text-slate-700 mb-3" />
            <p className="text-slate-400 text-sm">No skills found</p>
            <p className="text-slate-600 text-xs mt-1">Try a different search or category</p>
          </div>
        )}

        {/* Custom skills section */}
        <div className="border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Custom Skills</h2>
              <p className="text-xs text-slate-500 mt-0.5">{customSkills.length} custom skill{customSkills.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowAddCustom((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
            >
              <Plus size={12} />
              Add Custom
              {showAddCustom ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showAddCustom && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={customForm.name}
                  onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Skill name *"
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={customForm.icon}
                  onChange={(e) => setCustomForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="Icon emoji"
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <input
                type="text"
                value={customForm.description}
                onChange={(e) => setCustomForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <textarea
                value={customForm.systemPrompt}
                onChange={(e) => setCustomForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="System prompt (instructions for the AI) *"
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
              <input
                type="text"
                value={customForm.tags}
                onChange={(e) => setCustomForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="Tags (comma separated)"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCustom}
                  disabled={!customForm.name.trim() || !customForm.systemPrompt.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
                >
                  Save Skill
                </button>
                <button
                  onClick={() => setShowAddCustom(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Attribution */}
        <p className="text-center text-slate-600 text-xs pb-4">
          Skill library by SerThrocken · openclaw-multimodel-controller
        </p>
      </div>
    </div>
  );
};

const SkillCard: React.FC<{
  skill: Skill;
  isActive: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  gemini?: boolean;
}> = ({ skill, isActive, onToggle, onDelete, gemini }) => (
  <div
    className={`relative flex flex-col gap-2 p-3 rounded-xl border transition-all ${
      isActive
        ? gemini
          ? 'bg-purple-900/30 border-purple-500/60'
          : 'bg-blue-900/30 border-blue-500/60'
        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
    }`}
  >
    {onDelete && (
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 p-0.5 text-slate-600 hover:text-red-400 transition-colors"
        title="Delete custom skill"
      >
        <Trash2 size={12} />
      </button>
    )}
    <div className="flex items-start gap-2">
      <span className="text-xl leading-none">{skill.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-white leading-tight truncate">{skill.name}</div>
        <span
          className={`inline-block text-xs rounded px-1 mt-0.5 ${
            gemini ? 'text-purple-400 bg-purple-900/40' : 'text-blue-400 bg-blue-900/40'
          }`}
        >
          {skill.category}
        </span>
      </div>
    </div>
    <p className="text-xs text-slate-400 leading-snug line-clamp-2">{skill.description}</p>
    <button
      onClick={onToggle}
      className={`mt-auto w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isActive
          ? gemini
            ? 'bg-purple-600 hover:bg-purple-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
      }`}
    >
      {isActive ? '✓ Active' : 'Activate'}
    </button>
  </div>
);
