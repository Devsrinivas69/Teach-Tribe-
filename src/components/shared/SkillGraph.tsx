import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Course } from '@/types';

type SkillStatus = 'mastered' | 'weak' | 'blocked';

interface SkillNode {
  id: string;
  label: string;
  status: SkillStatus;
  mastery: number;
  dependsOn?: string;
}

interface SkillGraphProps {
  course: Course;
  completedLessons: string[];
  progress: number;
  onContinue?: () => void;
}

const MAX_SKILLS = 8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const compactLabel = (value: string) => {
  const text = value.trim();
  if (text.length <= 28) return text;
  return `${text.slice(0, 25)}...`;
};

const statusStyles: Record<SkillStatus, string> = {
  mastered: 'bg-success/10 text-success border-success/30',
  weak: 'bg-warning/10 text-warning border-warning/30',
  blocked: 'bg-destructive/10 text-destructive border-destructive/30',
};

const nodeFillByStatus: Record<SkillStatus, string> = {
  mastered: 'hsl(var(--success))',
  weak: 'hsl(var(--warning))',
  blocked: 'hsl(var(--destructive))',
};

export default function SkillGraph({ course, completedLessons, progress, onContinue }: SkillGraphProps) {
  const graph = useMemo(() => {
    const lessons = course.curriculum.flatMap((section) => section.lessons);
    const completed = new Set(completedLessons);

    const outcomes = course.whatYouLearn.filter(Boolean).slice(0, MAX_SKILLS);
    const fallbackFromSections = course.curriculum.map((section) => section.title).slice(0, MAX_SKILLS);
    const fallbackFromLessons = lessons.map((lesson) => lesson.title).slice(0, MAX_SKILLS);

    const baseSkills =
      outcomes.length > 0
        ? outcomes
        : fallbackFromSections.length > 0
          ? fallbackFromSections
          : fallbackFromLessons;

    const skillCount = clamp(baseSkills.length || 1, 1, MAX_SKILLS);

    const nodes: SkillNode[] = Array.from({ length: skillCount }).map((_, i) => {
      const lessonStart = Math.floor((i * lessons.length) / skillCount);
      const lessonEnd = Math.floor(((i + 1) * lessons.length) / skillCount);
      const lessonChunk = lessons.slice(lessonStart, lessonEnd);

      const chunkMastery =
        lessonChunk.length === 0
          ? progress / 100
          : lessonChunk.filter((lesson) => completed.has(lesson.id)).length / lessonChunk.length;

      const previousNode = i > 0 ? `${course.id}-skill-${i - 1}` : undefined;

      return {
        id: `${course.id}-skill-${i}`,
        label: compactLabel(baseSkills[i] || `Skill ${i + 1}`),
        status: 'weak',
        mastery: Number(clamp(chunkMastery, 0, 1).toFixed(2)),
        dependsOn: previousNode,
      };
    });

    const finalized = nodes.map((node) => {
      const isMastered = node.mastery >= 0.8;
      if (isMastered) return { ...node, status: 'mastered' as const };

      const blockedBy = node.dependsOn ? nodes.find((n) => n.id === node.dependsOn) : null;
      const isBlocked = blockedBy ? blockedBy.mastery < 0.8 : false;

      return {
        ...node,
        status: isBlocked ? ('blocked' as const) : ('weak' as const),
      };
    });

    const weakNodes = finalized.filter((node) => node.status === 'weak');
    const blockedNodes = finalized.filter((node) => node.status === 'blocked');

    const mainBlocker = blockedNodes.length > 0
      ? finalized.find((node) => node.id === blockedNodes[0].dependsOn)
      : null;

    return {
      nodes: finalized,
      weakNodes,
      blockedNodes,
      mainBlocker,
    };
  }, [course, completedLessons, progress]);

  const width = Math.max(700, graph.nodes.length * 180);
  const height = 240;
  const baseY = 120;

  return (
    <div className="rounded-xl border border-border bg-card p-5 card-shadow">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Skill Graph</h3>
          <p className="text-sm text-muted-foreground">
            Dependency map for {course.title}
          </p>
        </div>
        {onContinue && (
          <Button size="sm" onClick={onContinue}>
            Continue Course
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border px-2 py-1 bg-success/10 text-success border-success/30">Mastered</span>
        <span className="rounded-full border px-2 py-1 bg-warning/10 text-warning border-warning/30">Weak</span>
        <span className="rounded-full border px-2 py-1 bg-destructive/10 text-destructive border-destructive/30">Blocked</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <svg width={width} height={height} className="min-w-full">
          {graph.nodes.map((node, i) => {
            const x = 90 + i * 170;
            const y = baseY + (i % 2 === 0 ? -36 : 36);

            if (i === 0) return null;

            const prevX = 90 + (i - 1) * 170;
            const prevY = baseY + ((i - 1) % 2 === 0 ? -36 : 36);

            return (
              <path
                key={`edge-${node.id}`}
                d={`M ${prevX + 28} ${prevY} C ${prevX + 75} ${prevY}, ${x - 75} ${y}, ${x - 28} ${y}`}
                stroke="hsl(var(--muted-foreground) / 0.35)"
                strokeWidth="2"
                fill="none"
              />
            );
          })}

          {graph.nodes.map((node, i) => {
            const x = 90 + i * 170;
            const y = baseY + (i % 2 === 0 ? -36 : 36);

            return (
              <g key={node.id}>
                <circle cx={x} cy={y} r={26} fill={nodeFillByStatus[node.status]} opacity={0.18} />
                <circle cx={x} cy={y} r={17} fill={nodeFillByStatus[node.status]} />
                <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="white" fontWeight="700">
                  {Math.round(node.mastery * 100)}%
                </text>
                <text x={x} y={y + 42} textAnchor="middle" fontSize="11" fill="hsl(var(--foreground))" fontWeight="600">
                  {`S${i + 1}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skill Nodes</p>
          <div className="space-y-2">
            {graph.nodes.map((node, i) => (
              <div key={node.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] ${statusStyles[node.status]}`}>
                    S{i + 1}
                  </span>
                  <span className="truncate text-sm">{node.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(node.mastery * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guidance</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
              <p>
                Mastered: {graph.nodes.filter((node) => node.status === 'mastered').length} / {graph.nodes.length}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
              <p>
                Weak nodes: {graph.weakNodes.length}
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Link2 className="mt-0.5 h-4 w-4 text-destructive" />
              <p>
                {graph.mainBlocker
                  ? `Current blocker: strengthen "${graph.mainBlocker.label}" to unlock next skills.`
                  : 'No blocker detected. Keep progressing through weak nodes.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
