import type { Person, Project } from '../types';
import { motion } from 'motion/react';
import { ArrowRight, Calendar, Github } from 'lucide-react';

interface ProjectsPageProps {
  lang: 'zh' | 'en';
  projects: Project[];
  people?: Person[];
}

export function ProjectsPage({ lang, projects, people = [] }: ProjectsPageProps) {
  const peopleMap = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 rounded-2xl bg-slate-950/20 backdrop-blur-md border border-white/10 shadow-lg">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
            {lang === 'zh' ? '项目' : 'Projects'}
          </h1>
          <p className="text-lg text-teal-100/80 font-light max-w-2xl">
            {lang === 'zh'
              ? '探索水与社会的复杂系统。'
              : 'Exploring fluid dynamics, tangible interfaces, and citizen science.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {projects.map((project, idx) => (
          <motion.a
            key={project.id}
            href={project.detailUrl || `/${lang}/projects/${project.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all"
          >
            <div className="lg:col-span-5 aspect-[4/3] bg-black/30 rounded-2xl overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-900/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center text-teal-900/30 font-black opacity-30">
                <Calendar className="w-16 h-16" />
              </div>
            </div>

            <div className="lg:col-span-7 flex flex-col justify-center space-y-3">
              {project.tags && (
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="text-xs font-mono uppercase tracking-wider text-teal-400/80">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="text-3xl font-light text-white group-hover:text-teal-200 transition-colors">
                {project.title}
              </h2>

              <div className="text-sm text-gray-400 flex gap-4">
                <span>
                  {project.start_date}
                  {project.end_date ? ` - ${project.end_date}` : ' - Present'}
                </span>
                {project.repo && (
                  <a
                    href={project.repo}
                    className="inline-flex items-center gap-1 text-teal-300 hover:text-teal-200"
                  >
                    <Github className="w-4 h-4" />
                    Repo
                  </a>
                )}
              </div>

              {project.people && project.people.length > 0 && (
                <div className="text-sm text-gray-300">
                  {(lang === 'zh' ? '参与人员' : 'Team') + ': '}
                  {project.people.map((id) => peopleMap.get(id) || id).join(' / ')}
                </div>
              )}

              <div className="flex items-center gap-2 text-teal-400 font-medium group-hover:translate-x-2 transition-transform">
                {lang === 'zh' ? '查看详情' : 'View project'} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}


