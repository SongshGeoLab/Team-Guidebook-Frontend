import type { Person } from '../types';
import { motion } from 'motion/react';
import { ALUMNI_LABEL, ROLES, ROLE_LABELS, ROLE_TITLES } from '../../../utils/roles';
import { ui } from '../../../i18n/ui';

interface PeoplePageProps {
  lang: 'zh' | 'en';
  people: Person[];
}

function PersonCard({ person, lang, idx }: { person: Person; lang: 'zh' | 'en'; idx: number }) {
  // The free-text job title if the author wrote one, else the singular form of
  // the role. ROLE_LABELS would say "PhD Students" on one person's card;
  // rendering `person.role` raw would print the internal slug ("phd").
  const subtitle = person.title ?? ROLE_TITLES[person.role][lang];

  return (
    <motion.a
      href={person.detailUrl || `/${lang}/people/${person.id}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.05 }}
      className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-teal-900/20 border border-white/5 hover:border-teal-500/30 transition-all backdrop-blur-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
    >
      <div className="relative w-12 h-12 shrink-0">
        {person.avatar ? (
          <img
            src={person.avatar}
            alt=""
            /* Intrinsic size and lazy loading: these come from the vault via
               public/attachments, so astro:assets cannot reach them, but the
               attributes that stop layout shift cost nothing. The markdown
               pipeline already sets both on embedded images. */
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            className="w-12 h-12 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white"
          >
            {person.name.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-white truncate">{person.name}</h3>
        {/* Was text-[10px] at 60% opacity over a translucent surface, which
            fails WCAG AA on contrast and size. */}
        <p className="text-xs text-teal-200 font-mono tracking-wider truncate">{subtitle}</p>
        {person.destination && (
          <p className="text-xs text-gray-300 truncate">{person.destination}</p>
        )}
        {person.email && <p className="text-xs text-gray-400 truncate">{person.email}</p>}
      </div>
    </motion.a>
  );
}

export function PeoplePage({ lang, people }: PeoplePageProps) {
  // Alumni cut across roles — a former PhD student belongs under "Alumni", not
  // under "PhD Students", where a reader would take them for a current member.
  const current = people.filter((p) => p.status !== 'alumni');
  const alumni = people.filter((p) => p.status === 'alumni');

  // Iterate ROLES rather than the roles that happen to appear, so section order
  // comes from the vocabulary instead of from filesystem order. Grouping used
  // to compare free text against ten hardcoded spellings, and anything else —
  // 'Ph.D. student', '副教授', a trailing space — became its own one-person
  // section sorted to the end.
  const sections = ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role][lang],
    members: current.filter((p) => p.role === role),
  })).filter((section) => section.members.length > 0);

  return (
    <div className="space-y-12">
      <div className="p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
          {ui.people.title[lang]}
        </h1>
        <p className="text-lg text-teal-100/80 font-light">{ui.people.description[lang]}</p>
      </div>

      {sections.map((section) => (
        <section key={section.role} className="space-y-6">
          <h2 className="text-xl font-light text-teal-100/80 flex items-center gap-4">
            {section.label}
            <span className="h-px flex-1 bg-white/5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.members.map((person, idx) => (
              <PersonCard key={person.id} person={person} lang={lang} idx={idx} />
            ))}
          </div>
        </section>
      ))}

      {alumni.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xl font-light text-teal-100/80 flex items-center gap-4">
            {ALUMNI_LABEL[lang]}
            <span className="h-px flex-1 bg-white/5" />
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alumni.map((person, idx) => (
              <PersonCard key={person.id} person={person} lang={lang} idx={idx} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
