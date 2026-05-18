import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Users, BarChart3, Briefcase } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';

const featureTiles = [
  {
    icon: ShieldCheck,
    title: 'Compliance Ready',
    description: 'Enforce policies with audited workflows and secure access controls.',
  },
  {
    icon: Users,
    title: 'People Operations',
    description: 'Coordinate HR, admin, and recruitment activity across every client.',
  },
  {
    icon: BarChart3,
    title: '360° Insights',
    description: 'Spot bottlenecks instantly with dynamic dashboards and SLA monitoring.',
  },
];

const LoginLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"></div>
        <div className="absolute top-1/2 right-[-10%] h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-sky-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 h-48 w-[720px] -translate-x-1/2 bg-gradient-to-t from-slate-900 via-slate-900/0 to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="grid w-full max-w-6xl gap-12 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-10">
            <div className="flex flex-col gap-6">
              <BrandLogo size="lg" />
              <div className="inline-flex w-fit items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
                gostaff.in HRMS Demo
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-100 md:text-5xl">
                Modern HR operations, powered by gostaff.in
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                Onboard teams, manage talent, track attendance, and run compliant HR services from a single workspace.
                Explore how gostaff.in keeps your people operations organized and insight-driven.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login/spc-management')}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-lg font-semibold text-slate-900 shadow-[0_20px_45px_-20px_rgba(16,185,129,0.9)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 md:w-auto"
            >
              Sign in to Demo
              <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
            </button>

            <div className="grid gap-4 md:grid-cols-2">
              {featureTiles.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/5 bg-white/5 p-5 backdrop-blur-sm transition hover:border-emerald-400/60 hover:bg-emerald-500/10"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
                  <p className="mt-2 text-sm text-slate-300/90">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-br from-white/10 via-white/5 to-transparent blur-2xl"></div>
            <div className="rounded-[32px] border border-white/5 bg-slate-950/70 px-8 py-10 shadow-[0_35px_60px_-35px_rgba(30,64,175,0.45)] backdrop-blur-xl">
              <div className="mb-8 space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Briefcase size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-100">Purpose-built for your team</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300/90">
                    Log in with your authorized demo credentials to explore candidates, clients, and deliverables across the HRMS.
                  </p>
                </div>
              </div>

              <div className="space-y-5 rounded-2xl border border-white/5 bg-white/5 p-6 text-left">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">What you get</p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-100">Operational clarity in minutes</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-slate-300/95">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                      Unified access for HR and admin teams with granular permissions.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                      Real-time candidate pipelines synced with your tenant database.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                      Automated compliance alerts so deadlines never slip through the cracks.
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                  Need access? Contact the gostaff.in team to provision your secure demo login.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 pb-8 pt-4 text-center text-xs text-slate-500">
        Need help? Reach out to support@gostaff.in
      </div>
    </div>
  );
};

export default LoginLanding;
