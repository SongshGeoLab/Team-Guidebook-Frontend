import type { Person } from '../types';
import { motion } from 'motion/react';

interface PeoplePageProps {
  lang: 'zh' | 'en';
  people: Person[];
}

const ROLE_ORDER: string[] = [
  'Professor',
  '教授',
  'Postdoc',
  '博士后',
  'PhD Student',
  '博士生',
  'Master Student',
  '硕士生',
  'Alumni',
  '校友'
];

export function PeoplePage({ lang, people }: PeoplePageProps) {
  const grouped = people.reduce<Record<string, Person[]>>((acc, person) => {
    const role = person.role || 'Other';
    acc[role] = acc[role] || [];
    acc[role].push(person);
    return acc;
  }, {});

  const roles = Object.keys(grouped).sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a);
    const bi = ROLE_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-12">
      <div className="p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
          {lang === 'zh' ? '团队成员' : 'Team'}
        </h1>
        <p className="text-lg text-teal-100/80 font-light">
          {lang === 'zh'
            ? '来自不同背景的研究者、设计师与工程师。'
            : 'Researchers, designers, and engineers passionate about water systems.'}
        </p>
      </div>

      {roles.map((role) => (
        <section key={role} className="space-y-6">
          <h2 className="text-xl font-light text-teal-100/80 flex items-center gap-4">
            {role}
            <span className="h-px flex-1 bg-white/5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped[role].map((person, idx) => (
              <motion.a
                key={person.id}
                href={`/${lang}/people/${person.id}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-teal-900/20 border border-white/5 hover:border-teal-500/30 transition-all backdrop-blur-sm"
              >
                <div className="relative w-12 h-12 shrink-0">
                  {person.avatar ? (
                    <img
                      src={person.avatar}
                      alt={person.name}
                      className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white">
                      {person.name.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-white truncate">{person.name}</h3>
                  <p className="text-[10px] text-teal-200/60 font-mono uppercase tracking-wider truncate">
                    {person.role}
                  </p>
                  {person.email && (
                    <p className="text-xs text-gray-500 truncate">{person.email}</p>
                  )}
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

