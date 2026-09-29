import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { getReviewStats } from "../lib/sm2";
import { getWeeklyData } from "../lib/storage";
import type { Card } from "../lib/sm2";
import type { StreakData, DailyReviewLog } from "../lib/storage";

interface ProgressStatsProps {
  cards: Card[];
  streak: StreakData;
  reviewLog: DailyReviewLog;
}

const dayUnit = (days: number) => (days === 1 ? "day" : "days");

function progressCopy(stats: ReturnType<typeof getReviewStats>) {
  if (stats.due > 0) {
    return {
      quote: '"Thy word have I hid in mine heart."',
      detail: `${stats.due} verse${stats.due === 1 ? "" : "s"} waiting for review.`,
    };
  }
  if (stats.mastered === stats.total) {
    return {
      quote: '"Well done, good and faithful servant!"',
      detail: `All ${stats.total} verses mastered.`,
    };
  }
  return {
    quote: '"Be diligent to present yourself approved."',
    detail: "Keep going, you're doing great.",
  };
}

export function ProgressStats({ cards, streak, reviewLog }: ProgressStatsProps) {
  const stats = getReviewStats(cards);
  const weeklyData = getWeeklyData(reviewLog);
  const maxWeekly = Math.max(...weeklyData.map((day) => day.count), 1);
  const message = progressCopy(stats);
  const libraryStats = [
    { label: "Mastered", count: stats.mastered, colour: "bg-foreground" },
    { label: "Learning", count: stats.learning, colour: "bg-yv-gray-25" },
    { label: "New", count: stats.new, colour: "bg-border" },
  ].map((item) => ({ ...item, percent: stats.total ? Math.round((item.count / stats.total) * 100) : 0 }));
  const masteredPercent = libraryStats[0].percent;
  const streakStats = [
    { label: "Streak", value: streak.currentStreak, unit: dayUnit(streak.currentStreak), flame: streak.currentStreak > 0 },
    { label: "Best", value: streak.longestStreak, unit: dayUnit(streak.longestStreak) },
    { label: "Reviews", value: streak.totalReviews, unit: "all time" },
  ];

  return (
    <div className="surface p-6 sm:p-8 space-y-8">
      <div className="pb-7 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground font-serif">This Week</h3>
          {stats.due > 0 && <span className="text-sm text-muted-foreground tabular-nums">{stats.due} due today</span>}
        </div>
        <div className="grid grid-cols-3 divide-x divide-border mb-6">
          {streakStats.map((s) => (
            <div key={s.label} className="px-3 first:pl-0 last:pr-0">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-3xl font-semibold text-foreground tabular-nums mt-1 flex items-baseline gap-1.5 font-serif">
                {s.value}
                {s.flame && <Flame className="w-4 h-4 text-yv-orange-30 self-center" />}
              </p>
              <p className="text-xs text-muted-foreground">{s.unit}</p>
            </div>
          ))}
        </div>
        <div className="flex items-end justify-between gap-2 h-24">
          {weeklyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className={`w-full rounded-t-sm min-h-[4px] ${d.count > 0 ? "bg-foreground" : "bg-border"}`}
                initial={false}
                animate={{ height: d.count > 0 ? `${(d.count / maxWeekly) * 80}px` : "4px" }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
              <span className="text-xs font-medium text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
      {stats.total > 0 && (
        <>
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h3 className="text-xl font-semibold text-foreground font-serif">Library</h3>
              <span className="text-sm text-muted-foreground tabular-nums">
                {stats.total} verse{stats.total !== 1 ? "s" : ""} · {masteredPercent}% mastered
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
              {libraryStats.map((item) => (
                <motion.div
                  key={item.label}
                  className={`h-full ${item.colour}`}
                  initial={false}
                  animate={{ width: `${item.percent}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs tabular-nums">
              {libraryStats.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.colour}`} />
                  <span className="text-muted-foreground">{item.label} {item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 border-t border-border">
            <p className="verse-text italic text-center text-foreground leading-[1.8]">{message.quote}</p>
            <p className="text-xs text-center text-muted-foreground mt-2">{message.detail}</p>
          </div>
        </>
      )}
    </div>
  );
}
